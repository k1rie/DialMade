"use client";

// Optional copy generation with the Anthropic API (CLAUDE.md, INFORME §5 and §15.2). Two paths:
// - hosted: POST /api/ai/copy, under the server's hard monthly budget (DIALMADE_AI_MONTHLY_BUDGET_USD);
// - BYOK: when the user pasted their key (AiKeyDialog), the browser calls api.anthropic.com directly
//   with the same prompt and validation (@/lib/ai/browser, loaded on demand); no server budget.
// The model only returns text for the page's text props; the result is an RFC 6902 patch already
// validated against the DesignDoc and the section schemas. The hook does NOT apply it: the caller
// previews it and commits it with `useDesignDocActions().applyPatch`. Without AI the app works fully
// (`available: false`).
import type { OutputKind } from "@dialmade/catalog";
import type { PatchOperation } from "@dialmade/doc";
import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import { useOptionalDesignDocStore } from "@/hooks/useDesignDoc";
import { useDictionary } from "@/i18n";
import { ai } from "@/i18n/ai";
import {
  COPY_ENDPOINT,
  STATUS_ENDPOINT,
  isCopyApiErrorCode,
  type AiStatus,
  type CopyApiErrorCode,
  type CopyApiSuccess,
} from "@/lib/ai/api";
import { getByokKey, useByokKey } from "@/lib/ai/byokKey";
import { DEFAULT_AI_MODEL, MAX_INSTRUCTIONS_LENGTH, MAX_SECTION_IDS } from "@/lib/ai/config";

export type AiCopyRequest = {
  kind: OutputKind;
  /** Element ids of that page to rewrite. Default: every visible section. */
  sectionIds?: readonly string[];
  /** Free text from the user («más directo», «para devs»). */
  instructions?: string;
};

export type AiUsage = {
  inputTokens: number;
  outputTokens: number;
  model: string;
};

export type AiCopyResult = {
  /** Ops on `/pages/{kind}/elements/{id}/props/…` (and `/brand/tagline`), already validated. */
  patches: PatchOperation[];
  usage: AiUsage;
  costUsd: number;
};

export type AiCopyStatus = "idle" | "loading" | "success" | "error";

export type AiCopyErrorCode =
  | "not-implemented"
  | "unavailable"
  | "no-document"
  | "budget-exceeded"
  | "invalid-response"
  | "network"
  | "aborted";

/** Finer cause behind `code` (e.g. code "budget-exceeded", reason "daily-limit"). */
export type AiCopyErrorReason = CopyApiErrorCode | AiCopyErrorCode;

export class AiCopyError extends Error {
  constructor(
    readonly code: AiCopyErrorCode,
    /** Localized, ready to show. */
    message: string = code,
    readonly reason: AiCopyErrorReason = code,
  ) {
    super(message);
    this.name = "AiCopyError";
  }
}

export type AiCopySource = "hosted" | "byok";

export type UseAiCopy = {
  /** Resolves with the validated patch; rejects with `AiCopyError`. */
  generateCopy: (request: AiCopyRequest) => Promise<AiCopyResult>;
  status: AiCopyStatus;
  error: AiCopyError | undefined;
  /** Hosted budget left this month in USD; `null` while unknown (or with BYOK). */
  remainingBudgetUsd: number | null;
  /** False when AI cannot be used (not configured, budget spent): hide or disable the AI affordances. */
  available: boolean;
  /** Aborts the request in flight (rejects it with code "aborted"). */
  cancel: () => void;
  /** Back to "idle" and clears the error. */
  reset: () => void;
  /** Where the next request goes: the user's key (BYOK) or the hosted route; `null` = neither works. */
  source: AiCopySource | null;
  /** Model that will write the copy (the server's `DIALMADE_AI_MODEL`, also used with BYOK). */
  model: string;
};

const CODE_OF: Record<CopyApiErrorCode, AiCopyErrorCode> = {
  "ai-not-configured": "unavailable",
  "invalid-request": "unavailable",
  "payload-too-large": "unavailable",
  "no-page": "no-document",
  "no-fields": "no-document",
  "budget-exceeded": "budget-exceeded",
  "daily-limit": "budget-exceeded",
  "rate-limited": "unavailable",
  overloaded: "unavailable",
  refused: "invalid-response",
  "invalid-response": "invalid-response",
  "invalid-key": "unavailable",
  "upstream-error": "unavailable",
  network: "network",
  aborted: "aborted",
};

const OFFLINE: AiStatus = { configured: false, model: DEFAULT_AI_MODEL, remainingBudgetUsd: null, minRequestUsd: 0 };

// One status request per page load, shared by every hook instance.
let statusCache: AiStatus | null = null;
let statusRequest: Promise<AiStatus> | null = null;

function loadAiStatus(): Promise<AiStatus> {
  statusRequest ??= fetch(STATUS_ENDPOINT, { cache: "no-store" })
    .then((response) => (response.ok ? (response.json() as Promise<AiStatus>) : OFFLINE))
    .catch(() => OFFLINE)
    .then((status) => (statusCache = status));
  return statusRequest;
}

const isAbort = (error: unknown) => error instanceof DOMException && error.name === "AbortError";

export function useAiCopy(): UseAiCopy {
  const t = useDictionary(ai);
  const store = useOptionalDesignDocStore();
  const byok = useByokKey();
  const [hosted, setHosted] = useState<AiStatus | null>(statusCache);
  const [status, setStatus] = useState<AiCopyStatus>("idle");
  const [error, setError] = useState<AiCopyError | undefined>(undefined);
  const controller = useRef<AbortController | null>(null);
  const texts = useRef(t);
  const hostedRef = useRef(hosted);

  useEffect(() => {
    texts.current = t;
    hostedRef.current = hosted;
  });

  useEffect(() => {
    let active = true;
    void loadAiStatus().then((loaded) => active && setHosted(loaded));
    return () => {
      active = false;
    };
  }, []);

  useEffect(() => () => controller.current?.abort(), []);

  const updateRemaining = useCallback((remainingBudgetUsd: number) => {
    setHosted((current) => {
      const next = { ...(current ?? OFFLINE), remainingBudgetUsd };
      statusCache = next;
      statusRequest = Promise.resolve(next);
      return next;
    });
  }, []);

  const generateCopy = useCallback(
    async (request: AiCopyRequest): Promise<AiCopyResult> => {
      const failure = (reason: AiCopyErrorReason) => {
        const code = reason in CODE_OF ? CODE_OF[reason as CopyApiErrorCode] : (reason as AiCopyErrorCode);
        return new AiCopyError(code, texts.current.errors[reason], reason);
      };

      const doc = store?.getState().doc ?? null;
      if (!doc) {
        const missing = failure("no-document");
        setError(missing);
        setStatus("error");
        throw missing;
      }

      controller.current?.abort();
      const own = new AbortController();
      controller.current = own;
      setStatus("loading");
      setError(undefined);

      const sectionIds = request.sectionIds ? [...new Set(request.sectionIds)].slice(0, MAX_SECTION_IDS) : undefined;
      const instructions = request.instructions?.trim().slice(0, MAX_INSTRUCTIONS_LENGTH) || undefined;

      try {
        let result: CopyApiSuccess;
        const apiKey = getByokKey();
        if (apiKey) {
          const { ByokCopyError, generateByokCopy } = await import("@/lib/ai/browser");
          try {
            result = await generateByokCopy(
              { doc, kind: request.kind, ...(sectionIds && { sectionIds }), ...(instructions && { instructions }) },
              { apiKey, model: hostedRef.current?.model ?? DEFAULT_AI_MODEL, signal: own.signal },
            );
          } catch (byokError) {
            throw byokError instanceof ByokCopyError ? failure(byokError.code) : byokError;
          }
        } else {
          const current = hostedRef.current ?? (await loadAiStatus());
          if (!current.configured) throw failure("ai-not-configured");
          const response = await fetch(COPY_ENDPOINT, {
            method: "POST",
            headers: { "Content-Type": "application/json" },
            body: JSON.stringify({
              doc,
              kind: request.kind,
              ...(sectionIds && { sectionIds }),
              ...(instructions && { instructions }),
              locale: doc.brief.locale,
            }),
            signal: own.signal,
          });
          const body: unknown = await response.json().catch(() => null);
          const data = (body ?? {}) as Partial<CopyApiSuccess> & { code?: unknown };
          if (typeof data.remainingBudgetUsd === "number") updateRemaining(data.remainingBudgetUsd);
          if (!response.ok) throw failure(isCopyApiErrorCode(data.code) ? data.code : "upstream-error");
          if (!Array.isArray(data.patches) || !data.usage) throw failure("invalid-response");
          result = data as CopyApiSuccess;
        }

        if (controller.current === own) setStatus("success");
        return { patches: result.patches, usage: result.usage, costUsd: result.costUsd };
      } catch (caught) {
        const aborted = own.signal.aborted || isAbort(caught);
        const failed =
          caught instanceof AiCopyError
            ? caught
            : failure(aborted ? "aborted" : caught instanceof TypeError ? "network" : "upstream-error");
        if (controller.current === own) {
          setStatus(failed.code === "aborted" ? "idle" : "error");
          setError(failed.code === "aborted" ? undefined : failed);
        }
        throw failed;
      } finally {
        if (controller.current === own) controller.current = null;
      }
    },
    [store, updateRemaining],
  );

  const cancel = useCallback(() => controller.current?.abort(), []);

  const reset = useCallback(() => {
    setStatus("idle");
    setError(undefined);
  }, []);

  // Below the reservation of a typical request the server can only answer 402: offer BYOK instead.
  const remaining = hosted?.remainingBudgetUsd ?? 0;
  const hostedAvailable = !!hosted?.configured && remaining > 0 && remaining >= (hosted.minRequestUsd ?? 0);
  const source: AiCopySource | null = byok.active ? "byok" : hostedAvailable ? "hosted" : null;
  const model = hosted?.model ?? DEFAULT_AI_MODEL;

  return useMemo(
    () => ({
      generateCopy,
      status,
      error,
      remainingBudgetUsd: byok.active ? null : (hosted?.remainingBudgetUsd ?? null),
      available: source !== null,
      cancel,
      reset,
      source,
      model,
    }),
    [generateCopy, status, error, byok.active, hosted, source, cancel, reset, model],
  );
}
