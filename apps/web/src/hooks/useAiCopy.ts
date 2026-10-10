"use client";

// Optional copy generation with the Anthropic API, under the AI access policy (importar-guia.md,
// «Política de acceso a la IA»):
// - hosted free tier: POST /api/ai/copy, N free uses per device per month (DIALMADE_AI_FREE_MODEL)
//   inside the server's hard monthly budget;
// - then BYOK: with the user's key (AiKeyDialog) the browser calls api.anthropic.com directly with the
//   same prompt and validation (@/lib/ai/browser, loaded on demand), with DIALMADE_AI_MODEL;
// - or «Copiar prompt para mi Claude» (`manualJob`): the pasted JSON goes through the same validation.
// The model only returns text for the page's text props; the result is an RFC 6902 patch already
// validated against the DesignDoc and the section schemas. A request is one page (`kind`) or several
// screens at once (`screens`, Modo Layout: one «Generar» = one request = one free use). The answer is built
// against the document as it was when the request started; the result keeps only the ops whose value is
// still the same in the current document (the user may keep editing while it runs), so it never
// overwrites a newer edit. The hook does NOT apply it: the caller commits it with
// `useDesignDocActions().applyPatch` (one undo step), right after the promise resolves; `useLayoutAiCopy`
// does that for the layout step. Without AI the app works fully (`available: false`).
import type { OutputKind } from "@dialmade/catalog";
import { safeParseDesignDoc, type DesignDoc, type PatchOperation, type Screen } from "@dialmade/doc";
import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import { loadAiStatus, updateAiCounters, useAiStatus } from "@/hooks/useAiStatus";
import { useOptionalDesignDocStore } from "@/hooks/useDesignDoc";
import { useDictionary } from "@/i18n";
import { ai } from "@/i18n/ai";
import { COPY_ENDPOINT, isAiApiErrorCode, type AiApiErrorCode, type CopyApiSuccess } from "@/lib/ai/api";
import { getByokKey, useByokKey } from "@/lib/ai/byokKey";
import { MAX_INSTRUCTIONS_LENGTH, MAX_SECTION_IDS } from "@/lib/ai/config";
import { collectCopyFields, collectScreenCopyFields, type CopyField, type ScreenCopyTarget } from "@/lib/ai/fields";
import { normalizeScreenTargets } from "@/lib/ai/layoutCopy";
import type { ManualJob } from "@/lib/ai/manual";
import { copyManualJob } from "@/lib/ai/manualCopy";
import { dropStaleOps } from "@/lib/ai/patches";
import { aiSourceFor, countersFrom, fallbackReasonOf, hostedBlocker, modelFor, type AiFallbackReason } from "@/lib/ai/policy";
import { MANUAL_MODEL } from "@/lib/ai/vision/client";

export type AiCopyRequest =
  | {
      kind: OutputKind;
      /** Element ids of that page to rewrite. Default: every visible section. */
      sectionIds?: readonly string[];
      /** Free text from the user («más directo», «para devs»). */
      instructions?: string;
      screens?: never;
    }
  | {
      /**
       * Several screens in ONE request (Modo Layout): each whole or only some sections (block ids). Over
       * `MAX_SECTION_IDS` ids in total, every screen is sent whole (`normalizeScreenTargets`).
       */
      screens: readonly ScreenCopyTarget[];
      instructions?: string;
      kind?: never;
      sectionIds?: never;
    };

export type AiUsage = {
  inputTokens: number;
  outputTokens: number;
  model: string;
};

export type AiCopyResult = {
  /**
   * Ops on `/pages/{kind}/elements/{id}/props/…` or `/screens/{sid}/page/elements/{id}/props/…` (and
   * `/brand/tagline`), already validated, minus the stale ones: they all apply together on the current doc.
   */
  patches: PatchOperation[];
  usage: AiUsage;
  costUsd: number;
  /** Edits of the model dropped by validation. */
  rejected: number;
  /** Field ids (`f12`) of those edits: map them to sections with `fields`. */
  rejectedIds: string[];
  /** Valid ops dropped because their value changed while the request ran (a user edit, a deleted block). */
  stale: number;
  /** The fields that were offered, as the request saw them (ids, pointers, sections and screens). */
  fields: readonly CopyField[];
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

/** Finer cause behind `code` (e.g. code "budget-exceeded", reason "free-tier-exhausted" or "daily-limit"). */
export type AiCopyErrorReason = AiApiErrorCode | AiCopyErrorCode;

export class AiCopyError extends Error {
  constructor(
    readonly code: AiCopyErrorCode,
    /** Localized, ready to show. */
    message: string = code,
    readonly reason: AiCopyErrorReason = code,
    /** Set when the way out is BYOK or «mi Claude» (AiKeyDialog with `reason` and `manual`). */
    readonly fallback: AiFallbackReason | null = null,
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
  /** False when AI cannot be used (no free uses, budget spent, not configured, no key): offer BYOK or «mi Claude». */
  available: boolean;
  /** Aborts the request in flight (rejects it with code "aborted"). */
  cancel: () => void;
  /** Back to "idle" and clears the error. */
  reset: () => void;
  /** Where the next request goes: the user's key (BYOK) or the hosted free tier; `null` = neither works. */
  source: AiCopySource | null;
  /** Model of the next request: the free tier's (DIALMADE_AI_FREE_MODEL) or, with BYOK, DIALMADE_AI_MODEL. */
  model: string;
  /** Free uses left this month for this device; `null` while unknown, with BYOK or when the hosted AI is off. */
  freeUsesRemaining: number | null;
  freeUsesTotal: number | null;
  /** When `available` is false: why (for AiKeyDialog's `reason`). */
  fallbackReason: AiFallbackReason | null;
  /** «Copiar prompt para mi Claude» for that request: same prompt and validation. `null` without a doc or text to write. */
  manualJob: (request: AiCopyRequest) => ManualJob<AiCopyResult> | null;
};

/** Wire codes → the coarse codes the Composer branches on; `reason` keeps the exact one. */
const CODE_OF: Record<AiApiErrorCode, AiCopyErrorCode> = {
  "ai-not-configured": "unavailable",
  "invalid-request": "unavailable",
  "payload-too-large": "unavailable",
  "no-page": "no-document",
  "no-fields": "no-document",
  "budget-exceeded": "budget-exceeded",
  "daily-limit": "budget-exceeded",
  "free-tier-exhausted": "budget-exceeded",
  "rate-limited": "unavailable",
  overloaded: "unavailable",
  refused: "invalid-response",
  "invalid-response": "invalid-response",
  "invalid-key": "unavailable",
  "upstream-error": "unavailable",
  network: "network",
  aborted: "aborted",
};

const isAbort = (error: unknown) => error instanceof DOMException && error.name === "AbortError";

export type CleanTarget = { kind: OutputKind; sectionIds?: string[]; screens?: never } | { screens: ScreenCopyTarget[]; kind?: never; sectionIds?: never };

/** The request as the wire takes it: deduplicated ids within the caps, trimmed instructions. */
function cleanRequest(request: AiCopyRequest): { target: CleanTarget; instructions: string | undefined } {
  const instructions = request.instructions?.trim().slice(0, MAX_INSTRUCTIONS_LENGTH) || undefined;
  if (request.screens) return { target: { screens: normalizeScreenTargets(request.screens) }, instructions };
  const sectionIds = request.sectionIds ? [...new Set(request.sectionIds)].slice(0, MAX_SECTION_IDS) : undefined;
  return { target: { kind: request.kind, ...(sectionIds && { sectionIds }) }, instructions };
}

/** Why the request cannot be sent: no page of that kind or an unknown screen (`no-page`), no screen at all (`no-fields`). */
function targetProblem(doc: DesignDoc, target: CleanTarget): "no-page" | "no-fields" | null {
  if (!target.screens) return doc.pages[target.kind] ? null : "no-page";
  if (target.screens.length === 0) return "no-fields";
  return target.screens.some((screen) => !Object.hasOwn(doc.screens, screen.id)) ? "no-page" : null;
}

/** A screen the request does not target: what keeps links, routes and the shared navigation valid, nothing else. */
function stubScreen(screen: Screen): Screen {
  const { page } = screen;
  const root = Object.hasOwn(page.elements, page.root) ? page.elements[page.root] : undefined;
  return {
    ...screen,
    layout: { ...screen.layout, blocks: {} },
    page: {
      kind: page.kind,
      layoutId: page.layoutId,
      root: page.root,
      elements: root ? { [page.root]: { ...root, children: [] } } : {},
    },
  };
}

/**
 * The document the hosted route gets (review B #21: the whole document of a 4×200 project is over the 1 MB
 * body limit, even for one section). The route reads the brand, the brief and the requested screens (or the
 * requested page) and validates the answer against them, so the rest goes as little as the schema allows:
 * every other screen keeps its id, name, kind, route and frame (links, routes and the shared navigation stay
 * valid; the prompt names a linked screen) with no blocks and a bare page root; the requested screens lose
 * only their stash of absorbed blocks; a screens request drops the legacy pages (the style guide), and
 * `screenStash` (never sent to the AI) goes. Same fields, same field ids and the same prompt as the whole
 * document. When the reduced document would not validate, the whole document goes, as before.
 */
export function aiRequestDoc(doc: DesignDoc, target: CleanTarget): DesignDoc {
  const screenIds = Object.keys(doc.screens);
  if (screenIds.length === 0 && doc.screenStash === undefined) return doc;
  const wanted = new Set(target.screens?.map((screen) => screen.id) ?? []);
  const screens: Record<string, Screen> = {};
  for (const id of screenIds) {
    const screen = doc.screens[id]!;
    if (!wanted.has(id)) screens[id] = stubScreen(screen);
    else if (screen.page.stash === undefined) screens[id] = screen;
    else {
      const page = { ...screen.page };
      delete page.stash;
      screens[id] = { ...screen, page };
    }
  }
  const reduced: DesignDoc = { ...doc, screens, ...(target.screens && { pages: {} }) };
  delete reduced.screenStash;
  return safeParseDesignDoc(reduced).success ? reduced : doc;
}

/** The fields the request offers, computed with the same pure collector as the server. */
const offeredFields = (doc: DesignDoc, target: CleanTarget): CopyField[] =>
  target.screens ? collectScreenCopyFields(doc, target.screens) : collectCopyFields(doc, target.kind, target.sectionIds ? { sectionIds: target.sectionIds } : {});

/** The answer as the caller applies it: only the ops still fresh on the current document. */
function freshResult(before: DesignDoc, now: DesignDoc | null, target: CleanTarget, answer: Omit<AiCopyResult, "stale" | "fields">): AiCopyResult {
  const { patches, stale } = dropStaleOps(before, now, answer.patches);
  return { ...answer, patches, stale: stale.length, fields: offeredFields(before, target) };
}

export function useAiCopy(): UseAiCopy {
  const t = useDictionary(ai);
  const store = useOptionalDesignDocStore();
  const byok = useByokKey();
  const { status: hosted } = useAiStatus();
  const [status, setStatus] = useState<AiCopyStatus>("idle");
  const [error, setError] = useState<AiCopyError | undefined>(undefined);
  const controller = useRef<AbortController | null>(null);
  const texts = useRef(t);
  const hostedRef = useRef(hosted);

  useEffect(() => {
    texts.current = t;
    hostedRef.current = hosted;
  });

  useEffect(() => () => controller.current?.abort(), []);

  const generateCopy = useCallback(
    async (request: AiCopyRequest): Promise<AiCopyResult> => {
      const failure = (reason: AiCopyErrorReason) => {
        const code = isAiApiErrorCode(reason) ? CODE_OF[reason] : (reason as AiCopyErrorCode);
        const fallback = isAiApiErrorCode(reason) ? fallbackReasonOf(reason) : null;
        return new AiCopyError(code, texts.current.errors[reason], reason, fallback);
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

      const { target, instructions } = cleanRequest(request);

      try {
        const problem = targetProblem(doc, target);
        if (problem) throw failure(problem);
        let result: CopyApiSuccess;
        const apiKey = getByokKey();
        const current = hostedRef.current ?? (await loadAiStatus());
        if (apiKey) {
          const { ByokCopyError, generateByokCopy } = await import("@/lib/ai/browser");
          try {
            result = await generateByokCopy({ doc, ...target, ...(instructions && { instructions }) }, { apiKey, model: current.model, signal: own.signal });
          } catch (byokError) {
            throw byokError instanceof ByokCopyError ? failure(byokError.code) : byokError;
          }
        } else {
          const blocker = hostedBlocker(current);
          if (blocker) {
            throw failure(blocker === "not-configured" ? "ai-not-configured" : blocker);
          }
          const response = await fetch(COPY_ENDPOINT, {
            method: "POST",
            headers: { "Content-Type": "application/json" },
            body: JSON.stringify({ doc: aiRequestDoc(doc, target), ...target, ...(instructions && { instructions }), locale: doc.brief.locale }),
            signal: own.signal,
          });
          const body: unknown = await response.json().catch(() => null);
          updateAiCounters(countersFrom(body));
          const data = (body ?? {}) as Partial<CopyApiSuccess> & { code?: unknown };
          if (!response.ok) throw failure(isAiApiErrorCode(data.code) ? data.code : "upstream-error");
          if (!Array.isArray(data.patches) || !data.usage) throw failure("invalid-response");
          result = data as CopyApiSuccess;
        }

        const fresh = freshResult(doc, store?.getState().doc ?? null, target, {
          patches: result.patches,
          usage: result.usage,
          costUsd: result.costUsd,
          rejected: result.rejected ?? 0,
          rejectedIds: Array.isArray(result.rejectedIds) ? result.rejectedIds : [],
        });
        if (controller.current === own) setStatus("success");
        return fresh;
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
    [store],
  );

  const manualJob = useCallback(
    (request: AiCopyRequest): ManualJob<AiCopyResult> | null => {
      const doc = store?.getState().doc ?? null;
      if (!doc) return null;
      const { target, instructions } = cleanRequest(request);
      if (targetProblem(doc, target)) return null;
      const job = copyManualJob({ doc, ...target, ...(instructions && { instructions }) });
      if (!job) return null;
      return {
        prompt: job.prompt,
        attachments: job.attachments,
        parse(text) {
          const parsed = job.parse(text);
          if (!parsed.ok) return parsed;
          // The answer is pasted later: drop what the user changed since the prompt was copied.
          const value = freshResult(doc, store?.getState().doc ?? null, target, {
            patches: parsed.value.patches,
            usage: { inputTokens: 0, outputTokens: 0, model: MANUAL_MODEL },
            costUsd: 0,
            rejected: parsed.value.rejected,
            rejectedIds: parsed.value.rejectedIds,
          });
          if (value.patches.length === 0) return { ok: false, error: "no-result" };
          return { ok: true, value, dropped: parsed.dropped + value.stale };
        },
      };
    },
    [store],
  );

  const cancel = useCallback(() => controller.current?.abort(), []);

  const reset = useCallback(() => {
    setStatus("idle");
    setError(undefined);
  }, []);

  const source = aiSourceFor(hosted, byok.active);
  const model = modelFor(source, hosted);
  const fallbackReason = source === null && hosted ? hostedBlocker(hosted) : null;

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
      freeUsesRemaining: byok.active || !hosted?.configured ? null : hosted.freeUsesRemaining,
      freeUsesTotal: hosted?.configured ? hosted.freeUsesTotal : null,
      fallbackReason,
      manualJob,
    }),
    [generateCopy, status, error, byok.active, hosted, source, cancel, reset, model, fallbackReason, manualJob],
  );
}
