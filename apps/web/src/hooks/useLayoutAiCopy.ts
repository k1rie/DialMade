"use client";

// Optional AI copy for the layout step (Modo Layout, critique #7). One «Generar» = ONE request to
// /api/ai/copy (or BYOK, or «mi Claude») with every requested screen, the blocks' labels and notes as data,
// and so ONE free use. The deterministic copy is already in the document; the AI only rewrites text:
// - `estimate(targets)`: cost, fields, the «La IA reescribe los primeros 160 textos» flag and free uses,
//   shown before calling;
// - `run(targets)`: the request; every offered block is «Escribiendo», then «Listo», «Sin cambios» or
//   «Error · Reintentar». The answer is applied as one undo step, without the ops whose value the user
//   changed meanwhile;
// - `cancel()`: aborts and applies nothing (on the hosted free tier the use is already spent);
// - `retryTargets()`: the blocks in «Error», for a new `run`.
import type { DesignDoc } from "@dialmade/doc";
import { useCallback, useMemo, useRef, useState } from "react";
import { estimateScreensCopyCost } from "@/lib/ai/estimate";
import {
  AiCopyError,
  useAiCopy,
  type AiCopyErrorReason,
  type AiCopyResult,
  type AiCopySource,
  type AiCopyStatus,
  type AiUsage,
} from "@/hooks/useAiCopy";
import { useOptionalDesignDocStore } from "@/hooks/useDesignDoc";
import { MAX_COPY_FIELDS } from "@/lib/ai/config";
import { screenCopyPlan, type ScreenCopyTarget } from "@/lib/ai/fields";
import {
  allBlocks,
  blockKey,
  copyBlockStates,
  normalizeScreenTargets,
  retryTargets as errorTargets,
  type CopyBlockState,
} from "@/lib/ai/layoutCopy";
import type { ManualJob } from "@/lib/ai/manual";
import type { AiFallbackReason } from "@/lib/ai/policy";

export type { CopyBlockState } from "@/lib/ai/layoutCopy";
export type { ScreenCopyTarget } from "@/lib/ai/fields";

export type LayoutAiEstimate = {
  /** Rough USD of the request (prompt overhead once). */
  costUsd: number;
  /** Texts sent (at most `maxFields`, the brand tagline included when offered). */
  fields: number;
  /** Texts before the cap. */
  totalFields: number;
  /** More than `maxFields` texts: show «La IA reescribe los primeros 160 textos» (`ai.layoutCopy.truncated`). */
  truncated: boolean;
  maxFields: number;
  /** Blocks with at least one text in the request. */
  blocks: number;
};

export type LayoutAiRun = {
  /** Blocks with new copy. */
  done: number;
  /** Ops dropped because the user edited that text while the request ran. */
  stale: number;
  /** Model edits that did not pass validation. */
  rejected: number;
  costUsd: number;
  usage: AiUsage;
};

export type UseLayoutAiCopy = {
  /**
   * `null` without a document or when the targets have no text to write. Cached per document and targets. `doc`
   * estimates another document than the store's: the one «Generar» is about to write, so the cost shows before
   * the deterministic pass runs.
   */
  estimate: (targets: readonly ScreenCopyTarget[], doc?: DesignDoc | null) => LayoutAiEstimate | null;
  /**
   * ONE request for every target screen. Resolves with the summary once the answer is applied (one undo
   * step), `null` when cancelled (nothing applied); rejects with `AiCopyError`: the blocks turn «Error» when a
   * retry can help (network, overload, unusable answer), and lose their state otherwise (no free uses, no key:
   * open the AI menu with `fallbackReason`).
   */
  run: (targets: readonly ScreenCopyTarget[], options?: { instructions?: string }) => Promise<LayoutAiRun | null>;
  /** Aborts the request in flight: nothing is applied and the blocks lose their state. */
  cancel: () => void;
  /** State per block, keyed by `blockKey(screenId, elementId)`. Empty before the first run and after a cancel. */
  blocks: Readonly<Record<string, CopyBlockState>>;
  blockState: (screenId: string, elementId: string) => CopyBlockState | undefined;
  /** «Reintentar»: the blocks in «Error», grouped by screen (empty when none). */
  retryTargets: () => ScreenCopyTarget[];
  /** «Copiar prompt para mi Claude» for the same request (same prompt and validation); apply its result with `applyResult`. */
  manualJob: (targets: readonly ScreenCopyTarget[], options?: { instructions?: string }) => ManualJob<AiCopyResult> | null;
  /** Applies a validated result (from `manualJob`) as one undo step and sets the block states. */
  applyResult: (result: AiCopyResult) => LayoutAiRun;
  /** Clears the block states and the error. */
  reset: () => void;
  status: AiCopyStatus;
  error: AiCopyError | undefined;
  /** False when AI cannot be used: offer BYOK or «mi Claude» (`fallbackReason`). */
  available: boolean;
  source: AiCopySource | null;
  model: string;
  /** Hosted free tier: uses left this month (a run spends one); `null` with BYOK or when unknown. */
  freeUsesRemaining: number | null;
  freeUsesTotal: number | null;
  fallbackReason: AiFallbackReason | null;
};

/** Failures a second request may fix (the blocks show «Reintentar»). */
const RETRYABLE: ReadonlySet<AiCopyErrorReason> = new Set<AiCopyErrorReason>([
  "network",
  "upstream-error",
  "overloaded",
  "rate-limited",
  "invalid-response",
  "refused",
  "unavailable",
]);

const isRetryable = (error: unknown) => !(error instanceof AiCopyError) || RETRYABLE.has(error.reason);

type EstimateCache = { doc: DesignDoc; key: string; model: string; value: LayoutAiEstimate | null };

export function useLayoutAiCopy(): UseLayoutAiCopy {
  const ai = useAiCopy();
  const store = useOptionalDesignDocStore();
  const [blocks, setBlocks] = useState<Readonly<Record<string, CopyBlockState>>>({});
  const cache = useRef<EstimateCache | null>(null);
  const runId = useRef(0);
  const { generateCopy, cancel: cancelRequest, reset: resetRequest, manualJob: manualCopyJob, model } = ai;

  const estimate = useCallback(
    (targets: readonly ScreenCopyTarget[], explicit?: DesignDoc | null): LayoutAiEstimate | null => {
      const doc = explicit ?? store?.getState().doc ?? null;
      if (!doc) return null;
      const screens = normalizeScreenTargets(targets);
      const key = JSON.stringify(screens);
      const cached = cache.current;
      if (cached && cached.doc === doc && cached.key === key && cached.model === model) return cached.value;
      const plan = screenCopyPlan(doc, screens);
      const value: LayoutAiEstimate | null =
        plan.fields.length === 0
          ? null
          : {
              costUsd: estimateScreensCopyCost(doc, screens, model),
              fields: plan.fields.length,
              totalFields: plan.total,
              truncated: plan.truncated,
              maxFields: MAX_COPY_FIELDS,
              blocks: new Set(plan.fields.flatMap((field) => (field.elementId && field.screenId ? [blockKey(field.screenId, field.elementId)] : []))).size,
            };
      cache.current = { doc, key, model, value };
      return value;
    },
    [store, model],
  );

  const applyResult = useCallback(
    (result: AiCopyResult): LayoutAiRun => {
      const actions = store?.getState().actions;
      const applied = result.patches.length > 0 && actions ? actions.applyPatch(result.patches).ok : result.patches.length === 0;
      const states = applied ? copyBlockStates(result.fields, result.patches, result.rejectedIds) : allBlocks(result.fields, "error");
      setBlocks(states);
      return {
        done: Object.values(states).filter((state) => state === "done").length,
        stale: result.stale,
        rejected: result.rejected,
        costUsd: result.costUsd,
        usage: result.usage,
      };
    },
    [store],
  );

  const run = useCallback(
    async (targets: readonly ScreenCopyTarget[], options: { instructions?: string } = {}): Promise<LayoutAiRun | null> => {
      const id = ++runId.current;
      const doc = store?.getState().doc ?? null;
      const screens = normalizeScreenTargets(targets);
      const offered = doc ? screenCopyPlan(doc, screens).fields : [];
      setBlocks(allBlocks(offered, "writing"));
      try {
        const result = await generateCopy({ screens, ...(options.instructions && { instructions: options.instructions }) });
        if (id !== runId.current) return null;
        return applyResult(result);
      } catch (error) {
        // Cancelled, or replaced by a newer run: that one owns the block states.
        if (id !== runId.current) return null;
        const aborted = error instanceof AiCopyError && error.code === "aborted";
        // «Error · Reintentar» on the blocks only when trying again can help; no free uses, no key or no
        // configuration go to the AI menu instead (BYOK or «mi Claude»), with no block state.
        setBlocks(!aborted && isRetryable(error) ? allBlocks(offered, "error") : {});
        if (aborted) return null;
        throw error;
      }
    },
    [store, generateCopy, applyResult],
  );

  const cancel = useCallback(() => {
    runId.current++;
    setBlocks({});
    cancelRequest();
  }, [cancelRequest]);

  const reset = useCallback(() => {
    runId.current++;
    setBlocks({});
    resetRequest();
  }, [resetRequest]);

  const blockState = useCallback((screenId: string, elementId: string) => blocks[blockKey(screenId, elementId)], [blocks]);
  const retryTargets = useCallback(() => errorTargets(blocks), [blocks]);
  const manualJob = useCallback(
    (targets: readonly ScreenCopyTarget[], options: { instructions?: string } = {}) =>
      manualCopyJob({ screens: targets, ...(options.instructions && { instructions: options.instructions }) }),
    [manualCopyJob],
  );

  return useMemo(
    () => ({
      estimate,
      run,
      cancel,
      blocks,
      blockState,
      retryTargets,
      manualJob,
      applyResult,
      reset,
      status: ai.status,
      error: ai.error,
      available: ai.available,
      source: ai.source,
      model: ai.model,
      freeUsesRemaining: ai.freeUsesRemaining,
      freeUsesTotal: ai.freeUsesTotal,
      fallbackReason: ai.fallbackReason,
    }),
    [estimate, run, cancel, blocks, blockState, retryTargets, manualJob, applyResult, reset, ai],
  );
}
