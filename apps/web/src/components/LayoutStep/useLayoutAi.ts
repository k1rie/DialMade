"use client";

// The layout AI of Modo Layout v1.1 («Describe tu producto», «Sugerir con IA» for free blocks) under the AI access
// policy: the hosted free tier (POST /api/ai/layout, ONE free use per request) → then BYOK (the browser calls
// Anthropic with the user's key, same prompt and Zod) or «Copiar prompt para mi Claude» (`manualJob`). The hook only
// returns validated answers; the callers normalize them (`normalizeProposals`, `normalizeMapAnswer`) before anything
// is drawn, and apply them through the layout store as one undo step. Without AI everything here is optional:
// «Describe» has its deterministic fallback and a free block can always be typed by hand.
//
// The key dialog lives in LayoutStep (`LayoutAiDialogProvider`): the «¿Qué es esto?» popover closes as soon as the
// dialog takes the pointer, so it cannot own it.
import { createContext, createElement, useCallback, useContext, useEffect, useMemo, useRef, type ReactNode } from "react";
import { loadAiStatus, updateAiCounters, useAiStatus } from "@/hooks/useAiStatus";
import { useDictionary, useI18n } from "@/i18n";
import { ai as aiText, type AiDictionary } from "@/i18n/ai";
import { isAiApiErrorCode, type AiApiErrorCode } from "@/lib/ai/api";
import { getByokKey, useByokKey } from "@/lib/ai/byokKey";
import type { LayoutAnswer, LayoutApiSuccess, LayoutRequestBody } from "@/lib/ai/layout/api";
import { LAYOUT_AI_ENDPOINT } from "@/lib/ai/layout/constants";
import { estimateLayoutCostUsd } from "@/lib/ai/layout/estimate";
import { parseLayoutAnswer } from "@/lib/ai/layout/generate";
import { layoutManualJob } from "@/lib/ai/layout/manual";
import type { ManualJob } from "@/lib/ai/manual";
import { aiSourceFor, countersFrom, fallbackReasonOf, hostedBlocker, modelFor, type AiFallbackReason, type AiSource } from "@/lib/ai/policy";
import { MANUAL_MODEL } from "@/lib/ai/vision/client";
import { formatUsd } from "@/lib/money";
import type { AiKeyDialogView } from "@/components/AiKeyDialog";

export type LayoutAiSource = AiSource | "claude";

/** A validated answer and where it came from. */
export type LayoutAiResult = {
  answer: LayoutAnswer;
  /** Entries past the limits, cut by the shared parser. */
  dropped: number;
  source: LayoutAiSource;
  /** Model that answered («claude.ai» for «mi Claude»). */
  model: string;
  costUsd: number;
};

export class LayoutAiError extends Error {
  constructor(
    readonly code: AiApiErrorCode,
    /** Localized, ready to show. */
    message: string = code,
    /** Set when the way out is BYOK or «mi Claude» (no free uses, budget, daily limit, AI off). */
    readonly fallback: AiFallbackReason | null = null,
  ) {
    super(message);
    this.name = "LayoutAiError";
  }
}

const REASON_CODE: Record<AiFallbackReason, AiApiErrorCode> = {
  "free-tier-exhausted": "free-tier-exhausted",
  "budget-exceeded": "budget-exceeded",
  "daily-limit": "daily-limit",
  "not-configured": "ai-not-configured",
};

function messageFor(t: AiDictionary, code: AiApiErrorCode): string {
  const own: Record<string, string> = t.layoutAi.errors;
  return own[code] ?? (t.errors as Record<string, string>)[code] ?? t.errors["upstream-error"];
}

const isAbort = (error: unknown) => error instanceof DOMException && error.name === "AbortError";

export type UseLayoutAi = {
  /**
   * ONE request (BYOK when a key is set, else the free tier). Resolves with the validated answer; rejects with
   * `LayoutAiError` («aborted» when `signal` aborts: on the free tier the use is already spent).
   */
  request: (body: LayoutRequestBody, options?: { signal?: AbortSignal }) => Promise<LayoutAiResult>;
  /** «Copiar prompt para mi Claude» for `body`: `parse` validates the pasted JSON with the same Zod. */
  manualJob: (body: LayoutRequestBody) => ManualJob<LayoutAiResult>;
  /** The line shown before calling: «≈ $0,002 · te quedan 4 usos gratis», «con tu key» or why the free tier is off. */
  costLine: (body: LayoutRequestBody | null, options?: { compact?: boolean }) => string;
  /** Where the next request goes; `null` = neither the free tier nor a key can take it now. */
  source: AiSource | null;
  model: string;
  /** Known to be blocked: offer «Usar mi propia key», «mi Claude» or the way without AI. */
  fallbackReason: AiFallbackReason | null;
};

export function useLayoutAi(): UseLayoutAi {
  const t = useDictionary(aiText);
  const { locale } = useI18n();
  const byok = useByokKey();
  const { status: hosted } = useAiStatus();
  const texts = useRef(t);
  const hostedRef = useRef(hosted);
  useEffect(() => {
    texts.current = t;
    hostedRef.current = hosted;
  });

  const source = aiSourceFor(hosted, byok.active);
  const model = modelFor(source, hosted);
  const fallbackReason = source === null && hosted ? hostedBlocker(hosted) : null;

  const request = useCallback(async (body: LayoutRequestBody, options: { signal?: AbortSignal } = {}): Promise<LayoutAiResult> => {
    const fail = (code: AiApiErrorCode, fallback: AiFallbackReason | null = null) => new LayoutAiError(code, messageFor(texts.current, code), fallback);
    const { signal } = options;
    try {
      const apiKey = getByokKey();
      const current = hostedRef.current ?? (await loadAiStatus());
      if (!apiKey) {
        const blocker = hostedBlocker(current);
        if (blocker) throw fail(REASON_CODE[blocker], blocker);
      }
      if (apiKey) {
        const { ByokLayoutError, generateByokLayout } = await import("@/lib/ai/layout/browser");
        try {
          const generated = await generateByokLayout(body, { apiKey, model: current.model, ...(signal && { signal }) });
          const answer: LayoutAnswer = generated.task === "propose" ? { task: "propose", answer: generated.answer } : { task: "map", answer: generated.answer };
          return { answer, dropped: generated.dropped, source: "byok", model: generated.usage.model, costUsd: generated.costUsd };
        } catch (caught) {
          throw caught instanceof ByokLayoutError ? fail(caught.code) : caught;
        }
      }
      const response = await fetch(LAYOUT_AI_ENDPOINT, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(body),
        ...(signal && { signal }),
      });
      const payload: unknown = await response.json().catch(() => null);
      updateAiCounters(countersFrom(payload));
      const data = (payload ?? {}) as Partial<LayoutApiSuccess> & { code?: unknown };
      if (!response.ok) {
        const code = isAiApiErrorCode(data.code) ? data.code : "upstream-error";
        throw fail(code, fallbackReasonOf(code));
      }
      // The server validated it; the browser validates again with the same schema (never trust the wire).
      if (data.task !== body.task) throw fail("invalid-response");
      const parsed = parseLayoutAnswer(body.task, data.answer);
      if (!parsed.ok) throw fail("invalid-response");
      return {
        answer: parsed.value,
        dropped: (data.dropped ?? 0) + parsed.dropped,
        source: "hosted",
        model: data.usage?.model ?? current.freeModel,
        costUsd: data.costUsd ?? 0,
      };
    } catch (caught) {
      if (caught instanceof LayoutAiError) throw caught;
      const aborted = signal?.aborted || isAbort(caught);
      throw fail(aborted ? "aborted" : caught instanceof TypeError ? "network" : "upstream-error");
    }
  }, []);

  const manualJob = useCallback((body: LayoutRequestBody): ManualJob<LayoutAiResult> => {
    const job = layoutManualJob(body);
    return {
      prompt: job.prompt,
      attachments: job.attachments,
      parse(text) {
        const parsed = job.parse(text);
        if (!parsed.ok) return parsed;
        return { ok: true, value: { answer: parsed.value, dropped: parsed.dropped, source: "claude", model: MANUAL_MODEL, costUsd: 0 }, dropped: parsed.dropped };
      },
    };
  }, []);

  const costLine = useCallback(
    (body: LayoutRequestBody | null, options: { compact?: boolean } = {}) => {
      const l = t.layoutAi;
      if (source === null) return fallbackReason ? l.blocked[fallbackReason] : "";
      const cost = body ? l.estimate(formatUsd(estimateLayoutCostUsd(model, body), locale)) : null;
      const tail = source === "byok" ? l.withKey : hosted?.configured ? (options.compact ? l.usesShort : l.usesLeft)(hosted.freeUsesRemaining) : "";
      return [cost, tail].filter(Boolean).join(" · ");
    },
    [t, source, fallbackReason, model, locale, hosted],
  );

  return useMemo(() => ({ request, manualJob, costLine, source, model, fallbackReason }), [request, manualJob, costLine, source, model, fallbackReason]);
}

/* ---- The key dialog of the layout AI (rendered once by LayoutStep) ---- */

export type LayoutAiDialogRequest = {
  view: AiKeyDialogView;
  /** Why the free tier cannot answer (shown on top). */
  reason: AiFallbackReason | null;
  /** «mi Claude» for the pending request. */
  manual: ManualJob<LayoutAiResult> | null;
  /** The pasted answer, validated. */
  onManualResult?: (result: LayoutAiResult) => void;
  /** A key was saved: run the pending request again. */
  onKeySaved?: () => void;
};

export type LayoutAiDialog = { open: (request: LayoutAiDialogRequest) => void };

const LayoutAiDialogContext = createContext<LayoutAiDialog | null>(null);

export function LayoutAiDialogProvider({ value, children }: { value: LayoutAiDialog; children: ReactNode }) {
  return createElement(LayoutAiDialogContext.Provider, { value }, children);
}

/** `null` outside LayoutStep (the parts then offer no AI way out). */
export function useLayoutAiDialog(): LayoutAiDialog | null {
  return useContext(LayoutAiDialogContext);
}
