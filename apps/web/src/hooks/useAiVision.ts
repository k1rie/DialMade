"use client";

// Optional style fingerprint of the user's own screenshots (importar-guia-spec.md §5), under the AI
// access policy: the free tier (POST /api/ai/fingerprint) → then BYOK (the browser calls Anthropic
// with the user's key, same prompt and Zod) or «Copiar prompt para mi Claude» (`manualJob`). The
// screenshots are re-encoded in the tab (JPEG, ≤ 1280 px, no EXIF) before they leave it. The AI
// answers with swatch indexes, never with colors. Nothing is applied here: the caller attaches each
// fingerprint with `attachFingerprint(brand, sourceId, fingerprint, model)` of @dialmade/import, which
// adds unlocked `method: "ai"` chips that never override declared values.
import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import { useDictionary } from "@/i18n";
import { ai, type AiDictionary } from "@/i18n/ai";
import { isAiApiErrorCode, type AiApiErrorCode } from "@/lib/ai/api";
import { getByokKey, useByokKey } from "@/lib/ai/byokKey";
import type { FingerprintApiSuccess, FingerprintConfigResponse } from "@/lib/ai/vision/api";
import {
  MANUAL_MODEL,
  toVisionResult,
  visionCacheKey,
  visionResultCache,
  type AiVisionResult,
  type VisionScreenshot,
  type VisionScreenshotDraft,
} from "@/lib/ai/vision/client";
import { FINGERPRINT_ENDPOINT, VISION_MAX_IMAGES, VISION_MAX_SWATCHES } from "@/lib/ai/vision/constants";
import { estimateVisionCostUsd } from "@/lib/ai/vision/estimate";
import { VisionImageError, prepareVisionImages, type EncodedImage } from "@/lib/ai/vision/image";
import type { ManualJob } from "@/lib/ai/manual";
import { visionManualJob } from "@/lib/ai/vision/manual";
import { aiSourceFor, countersFrom, fallbackReasonOf, hostedBlocker, modelFor, type AiFallbackReason, type AiSource } from "@/lib/ai/policy";
import type { VisionPromptImage } from "@/lib/ai/vision/prompt";
import { normalizeFingerprintAnswer } from "@/lib/ai/vision/schema";
import { loadAiStatus, updateAiCounters, useAiStatus } from "@/hooks/useAiStatus";

export type { AiVisionFingerprint, AiVisionResult, VisionScreenshot, VisionScreenshotDraft } from "@/lib/ai/vision/client";
export type { ManualJob } from "@/lib/ai/manual";
export type { AiFallbackReason } from "@/lib/ai/policy";

export type AiVisionErrorCode = AiApiErrorCode | "image-failed" | "images-too-large" | "no-screenshots";

export class AiVisionError extends Error {
  constructor(
    readonly code: AiVisionErrorCode,
    /** Localized, ready to show. */
    message: string = code,
    /** Set when the way out is BYOK or «mi Claude» (no free uses, budget or daily limit, AI off). */
    readonly fallback: AiFallbackReason | null = null,
  ) {
    super(message);
    this.name = "AiVisionError";
  }
}

export type AiVisionStatus = "idle" | "preparing" | "loading" | "success" | "error";

export type AiVisionRequest = {
  /** Own screenshots only (rights confirmed), in the order shown to the user. */
  screenshots: readonly VisionScreenshot[];
  /** Skip this tab's result cache (a manual «Reintentar»). */
  force?: boolean;
};

export type UseAiVision = {
  /** Resolves with the fingerprints; rejects with `AiVisionError`. Also calls `onResult`. */
  analyze: (request: AiVisionRequest) => Promise<AiVisionResult>;
  /** Runs the last request again, skipping the cache (e.g. right after saving a key). */
  retry: () => Promise<AiVisionResult | undefined>;
  /** Aborts the request in flight (rejects it with code "aborted"). */
  cancel: () => void;
  /** Back to "idle", clears the error and the result. */
  reset: () => void;
  /** «Copiar prompt para mi Claude» for these screenshots; `parse` validates the pasted JSON with the same Zod. `null` without screenshots. */
  manualJob: (request: Pick<AiVisionRequest, "screenshots">) => ManualJob<AiVisionResult> | null;
  /** Takes a result from `manualJob(...).parse`: sets `result` and calls `onResult`. */
  acceptResult: (result: AiVisionResult) => void;
  /** USD before calling, for the model the next request would use. */
  estimateUsd: (screenshots: readonly VisionScreenshotDraft[]) => number;
  status: AiVisionStatus;
  error: AiVisionError | undefined;
  result: AiVisionResult | undefined;
  /** Where the next request goes: the user's key or the free tier; `null` = neither works now. */
  source: AiSource | null;
  /** Model of the next request (free tier: DIALMADE_AI_FREE_MODEL; BYOK: DIALMADE_AI_MODEL). */
  model: string;
  /** When `source` is `null`: why, so the UI opens AiKeyDialog with its two ways out. */
  fallbackReason: AiFallbackReason | null;
  /** `null` while unknown or with BYOK. */
  freeUsesRemaining: number | null;
  freeUsesTotal: number | null;
  /** Screenshots per request on this server (1–4). */
  maxImages: number;
};

export type UseAiVisionOptions = {
  /** Every result (API, cache or «mi Claude»). */
  onResult?: (result: AiVisionResult) => void;
};

let configRequest: Promise<number> | null = null;

function loadMaxImages(): Promise<number> {
  configRequest ??= fetch(FINGERPRINT_ENDPOINT, { cache: "no-store" })
    .then((response) => (response.ok ? (response.json() as Promise<Partial<FingerprintConfigResponse>>) : null))
    .then((body) => {
      const max = body?.maxImages;
      return typeof max === "number" && Number.isInteger(max) && max >= 1 ? Math.min(max, VISION_MAX_IMAGES) : VISION_MAX_IMAGES;
    })
    .catch(() => VISION_MAX_IMAGES);
  return configRequest;
}

const REASON_CODE: Record<AiFallbackReason, AiApiErrorCode> = {
  "free-tier-exhausted": "free-tier-exhausted",
  "budget-exceeded": "budget-exceeded",
  "daily-limit": "daily-limit",
  "not-configured": "ai-not-configured",
};

function messageFor(t: AiDictionary, code: AiVisionErrorCode): string {
  const vision: Record<string, string> = t.vision.errors;
  return vision[code] ?? (t.errors as Record<string, string>)[code] ?? t.errors["upstream-error"];
}

const isAbort = (error: unknown) => error instanceof DOMException && error.name === "AbortError";

const promptImages = (images: readonly EncodedImage[], shots: readonly VisionScreenshot[]): VisionPromptImage[] =>
  images.map((image, i) => ({ mediaType: image.mediaType, data: image.data, swatches: (shots[i]?.swatches ?? []).slice(0, VISION_MAX_SWATCHES) }));

export function useAiVision(options: UseAiVisionOptions = {}): UseAiVision {
  const t = useDictionary(ai);
  const byok = useByokKey();
  const { status: hosted } = useAiStatus();
  const [maxImages, setMaxImages] = useState(VISION_MAX_IMAGES);
  const [status, setStatus] = useState<AiVisionStatus>("idle");
  const [error, setError] = useState<AiVisionError | undefined>(undefined);
  const [result, setResult] = useState<AiVisionResult | undefined>(undefined);
  const controller = useRef<AbortController | null>(null);
  const last = useRef<AiVisionRequest | null>(null);
  const texts = useRef(t);
  const hostedRef = useRef(hosted);
  const onResult = useRef(options.onResult);

  useEffect(() => {
    texts.current = t;
    hostedRef.current = hosted;
    onResult.current = options.onResult;
  });

  useEffect(() => {
    let active = true;
    void loadMaxImages().then((max) => active && setMaxImages(max));
    return () => {
      active = false;
    };
  }, []);

  useEffect(() => () => controller.current?.abort(), []);

  const deliver = useCallback((next: AiVisionResult) => {
    setResult(next);
    setError(undefined);
    setStatus("success");
    onResult.current?.(next);
  }, []);

  const analyze = useCallback(
    async (request: AiVisionRequest): Promise<AiVisionResult> => {
      const fail = (code: AiVisionErrorCode, fallback: AiFallbackReason | null = null) => new AiVisionError(code, messageFor(texts.current, code), fallback);
      last.current = request;
      controller.current?.abort();
      controller.current = null;

      if (request.screenshots.length === 0) {
        const missing = fail("no-screenshots");
        setError(missing);
        setStatus("error");
        throw missing;
      }

      const max = await loadMaxImages();
      const shots = request.screenshots.slice(0, max);
      const skipped = request.screenshots.slice(max).map((shot) => shot.sourceId);
      const key = visionCacheKey(shots);
      const hit = request.force ? undefined : visionResultCache.get(key);
      if (hit) {
        const cached: AiVisionResult = { ...hit, skipped, cached: true, costUsd: 0 };
        deliver(cached);
        return cached;
      }

      const own = new AbortController();
      controller.current = own;
      setStatus("preparing");
      setError(undefined);

      try {
        const apiKey = getByokKey();
        const current = hostedRef.current ?? (await loadAiStatus());
        if (!apiKey) {
          const blocker = hostedBlocker(current);
          if (blocker) throw fail(REASON_CODE[blocker], blocker);
        }

        let encoded: EncodedImage[];
        try {
          encoded = await prepareVisionImages(
            shots.map((shot) => shot.file),
            { signal: own.signal },
          );
        } catch (caught) {
          if (caught instanceof VisionImageError) throw fail(caught.code === "too-large" ? "images-too-large" : "image-failed");
          throw caught;
        }
        const images = promptImages(encoded, shots);
        if (controller.current === own) setStatus("loading");

        let next: AiVisionResult;
        if (apiKey) {
          const { ByokVisionError, generateByokFingerprint } = await import("@/lib/ai/vision/browser");
          try {
            const generated = await generateByokFingerprint(images, { apiKey, model: current.model, signal: own.signal });
            next = toVisionResult(shots, generated, { skipped, model: generated.usage.model, costUsd: generated.costUsd, source: "byok", cached: false });
          } catch (caught) {
            throw caught instanceof ByokVisionError ? fail(caught.code) : caught;
          }
        } else {
          const response = await fetch(FINGERPRINT_ENDPOINT, {
            method: "POST",
            headers: { "Content-Type": "application/json" },
            body: JSON.stringify({ images }),
            signal: own.signal,
          });
          const body: unknown = await response.json().catch(() => null);
          updateAiCounters(countersFrom(body));
          const data = (body ?? {}) as Partial<FingerprintApiSuccess> & { code?: unknown };
          if (!response.ok) {
            const code = isAiApiErrorCode(data.code) ? data.code : "upstream-error";
            throw fail(code, fallbackReasonOf(code));
          }
          const normalized = normalizeFingerprintAnswer(
            data.fingerprint,
            images.map((image) => image.swatches.length),
          );
          if (!normalized.ok) throw fail("invalid-response");
          next = toVisionResult(
            shots,
            { fingerprints: normalized.fingerprints, dropped: (data.dropped ?? 0) + normalized.dropped },
            { skipped, model: data.usage?.model ?? current.freeModel, costUsd: data.costUsd ?? 0, source: "hosted", cached: data.cached === true },
          );
        }

        visionResultCache.set(key, next);
        if (controller.current === own) deliver(next);
        return next;
      } catch (caught) {
        const aborted = own.signal.aborted || isAbort(caught);
        const failed =
          caught instanceof AiVisionError ? caught : fail(aborted ? "aborted" : caught instanceof TypeError ? "network" : "upstream-error");
        if (controller.current === own) {
          setStatus(failed.code === "aborted" ? "idle" : "error");
          setError(failed.code === "aborted" ? undefined : failed);
        }
        throw failed;
      } finally {
        if (controller.current === own) controller.current = null;
      }
    },
    [deliver],
  );

  const retry = useCallback(async () => (last.current ? analyze({ ...last.current, force: true }) : undefined), [analyze]);

  const cancel = useCallback(() => controller.current?.abort(), []);

  const reset = useCallback(() => {
    controller.current?.abort();
    setStatus("idle");
    setError(undefined);
    setResult(undefined);
  }, []);

  const manualJob = useCallback((request: Pick<AiVisionRequest, "screenshots">): ManualJob<AiVisionResult> | null => {
    const shots = request.screenshots.slice(0, VISION_MAX_IMAGES);
    if (shots.length === 0) return null;
    const skipped = request.screenshots.slice(VISION_MAX_IMAGES).map((shot) => shot.sourceId);
    const job = visionManualJob(shots.map((shot) => ({ ...(shot.fileName && { fileName: shot.fileName }), swatches: shot.swatches.slice(0, VISION_MAX_SWATCHES) })));
    return {
      prompt: job.prompt,
      attachments: job.attachments,
      parse(text) {
        const parsed = job.parse(text);
        if (!parsed.ok) return parsed;
        return {
          ok: true,
          value: toVisionResult(shots, parsed.value, { skipped, model: MANUAL_MODEL, costUsd: 0, source: "claude", cached: false }),
          dropped: parsed.dropped,
        };
      },
    };
  }, []);

  const acceptResult = useCallback(
    (next: AiVisionResult) => {
      controller.current?.abort();
      deliver(next);
    },
    [deliver],
  );

  const source = aiSourceFor(hosted, byok.active);
  const model = modelFor(source, hosted);
  const fallbackReason = source === null && hosted ? hostedBlocker(hosted) : null;

  const estimateUsd = useCallback(
    (screenshots: readonly VisionScreenshotDraft[]) => estimateVisionCostUsd(model, screenshots.slice(0, maxImages)),
    [model, maxImages],
  );

  return useMemo(
    () => ({
      analyze,
      retry,
      cancel,
      reset,
      manualJob,
      acceptResult,
      estimateUsd,
      status,
      error,
      result,
      source,
      model,
      fallbackReason,
      freeUsesRemaining: byok.active || !hosted?.configured ? null : hosted.freeUsesRemaining,
      freeUsesTotal: hosted?.configured ? hosted.freeUsesTotal : null,
      maxImages,
    }),
    [analyze, retry, cancel, reset, manualJob, acceptResult, estimateUsd, status, error, result, source, model, fallbackReason, byok.active, hosted, maxImages],
  );
}
