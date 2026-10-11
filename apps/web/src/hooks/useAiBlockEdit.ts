"use client";

// «Diseño con IA» in «Ajustar» (track B), shared by the «Bloque de IA» card, the screen's redo notice and the islands
// (track A's `AiBlocks`): block actions («Otra versión», «Pedir cambio», the quick chips) and the islands' inline
// text edits and selection. Every write is ONE validated patch = one undo step, applied to the LIVE document when it
// lands (the user may have edited meanwhile).
import type { DesignDoc, PatchResult } from "@dialmade/doc";
import { useMemo, useRef, useState } from "react";
import { toast } from "sonner";
import { useDesignDocActions, useDesignDocStore, useOptionalDesignDocStore } from "@/hooks/useDesignDoc";
import { useDictionary } from "@/i18n";
import { ai as aiTexts } from "@/i18n/ai";
import { composer } from "@/i18n/composer";
import { isAiApiErrorCode } from "@/lib/ai/api";
import { loadAiStatus, useAiStatus } from "@/hooks/useAiStatus";
import { getByokKey, useByokKey } from "@/lib/ai/byokKey";
import {
  BlockActionError,
  blockTransportFrom,
  openFreeSession,
  runBlockAction,
  type BlockActionRequest,
  type BlockActionTransport,
} from "@/lib/ai/render/blockAction";
import { setAiBlockActiveOps, setAiBlockOps, textEditOps } from "@/lib/ai/render/edit";
import { useByokRenderModel } from "@/lib/ai/render/byokModel";
import { useFullAccessRenderModel } from "@/lib/ai/render/fullAccessModelStore";
import { useRenderTier } from "@/lib/ai/render/renderTier";
import { createRenderTransport, fullAccessChoice } from "@/lib/ai/render/transport";
import { getLiveSession, setLiveSession, updateLiveSessionCounters } from "@/lib/ai/render/liveSession";
import { aiViewStore, setAiBusy, setAiTarget } from "@/lib/ai/render/view";
import { processBlockOffThread } from "@/lib/ai/render/worker";

/** The document passes its 1 MB of AI blocks (`documentSizeIssues` reports it under `aiRender`). */
const overCap = (result: PatchResult) => !result.ok && result.error.reason === "invalid-document" && (result.error.issues ?? []).some((issue) => issue.path[0] === "aiRender");

export type AiBlockRun = { screenId: string; blockId: string; kind: BlockActionRequest["kind"] };

export type UseAiBlockActions = {
  /** The path the next action takes: the free tier spends the live session's actions; BYOK needs no session. */
  transport: Pick<BlockActionTransport, "path" | "usesSession" | "model">;
  /** The action in flight on this hook (one at a time), or null. */
  running: AiBlockRun | null;
  opening: boolean;
  /** «Otra versión» / «Pedir cambio» of one block: 1 action of the session. Resolves `true` when it was applied. */
  run: (screenId: string, blockId: string, label: string, request: BlockActionRequest, options?: { quiet?: boolean }) => Promise<boolean>;
  /** Opens a design session (1 free use) when none is alive. */
  openSession: () => Promise<boolean>;
  /** Free tier: stops waiting (the call already runs and counts; its result is dropped). BYOK: aborts it. */
  stop: () => void;
  /** «Usar diseño base» (`false`) / «Usar IA otra vez» (`true`): one undo step. */
  setActive: (screenId: string, blockId: string, label: string, active: boolean) => void;
};

/**
 * The block actions' transport right now (Track C): the tab's key (with the model chosen in the key dialog), else the
 * free tier and its live session.
 */
function useBlockTransport(): BlockActionTransport {
  const byok = useByokKey();
  const byokModel = useByokRenderModel();
  const { status } = useAiStatus();
  // A full-access account's model and finish travel with each call (read when the transport is made).
  const fullAccessModel = useFullAccessRenderModel();
  const tier = useRenderTier();
  return useMemo(
    () => blockTransportFrom(createRenderTransport(byok.active ? "byok" : "free", { status, byokModel, getKey: getByokKey })),
    // eslint-disable-next-line react-hooks/exhaustive-deps -- the choice is read inside createRenderTransport
    [byok.active, byokModel, status, fullAccessModel, tier],
  );
}

export function useAiBlockActions(override?: BlockActionTransport): UseAiBlockActions {
  const current = useBlockTransport();
  const transport = override ?? current;
  const store = useDesignDocStore();
  const actions = useDesignDocActions();
  const t = useDictionary(composer);
  const aiT = useDictionary(aiTexts);
  const [running, setRunning] = useState<AiBlockRun | null>(null);
  const [opening, setOpening] = useState(false);
  const abort = useRef<AbortController | null>(null);

  return useMemo(() => {
    const texts = t.aiBlock;
    const undo = { label: t.undoAction, onClick: () => store.temporal.getState().undo() };
    const live = (): DesignDoc | null => store.getState().doc;

    const errorText = (error: unknown): string => {
      if (!(error instanceof BlockActionError)) return texts.errors.generic;
      const code = error.code;
      if (code in texts.errors) return texts.errors[code as keyof typeof texts.errors];
      if (isAiApiErrorCode(code)) return aiT.errors[code];
      return texts.errors.generic;
    };

    const openSession = async () => {
      setOpening(true);
      try {
        const opened = await openFreeSession(undefined, fullAccessChoice(await loadAiStatus()));
        setLiveSession({ sessionId: opened.sessionId, counters: opened.session });
        return true;
      } catch (error) {
        toast.error(errorText(error));
        return false;
      } finally {
        setOpening(false);
      }
    };

    const run: UseAiBlockActions["run"] = async (screenId, blockId, label, request, options = {}) => {
      const doc = live();
      if (!doc || abort.current) return false;
      const session = transport.usesSession ? getLiveSession() : null;
      if (transport.usesSession && !session) {
        toast.error(texts.errors["no-session"]);
        return false;
      }
      const controller = new AbortController();
      abort.current = controller;
      setRunning({ screenId, blockId, kind: request.kind });
      setAiBusy(screenId, blockId, true);
      try {
        const result = await runBlockAction(doc, screenId, blockId, request, {
          transport,
          sessionId: session?.sessionId ?? null,
          process: processBlockOffThread,
          signal: controller.signal,
        });
        if (session && result.session) updateLiveSessionCounters(session.sessionId, result.session);
        if (controller.signal.aborted) return false;
        const current = live();
        if (!current) return false;
        const applied = actions.applyPatch(setAiBlockOps(current, screenId, blockId, result.block));
        if (!applied.ok) {
          toast.error(overCap(applied) ? texts.errors.tooLarge : texts.errors.generic);
          return false;
        }
        if (!options.quiet) toast.success(request.kind === "reroll" ? texts.done.reroll(label) : texts.done.change(label), { action: undo });
        return true;
      } catch (error) {
        if (session && error instanceof BlockActionError && error.session) updateLiveSessionCounters(session.sessionId, error.session);
        if (error instanceof BlockActionError && error.code === "aborted") return false;
        if (session && error instanceof BlockActionError && (error.code === "session-expired" || error.code === "session-not-found")) setLiveSession(null);
        if (!controller.signal.aborted) toast.error(errorText(error));
        return false;
      } finally {
        if (abort.current === controller) abort.current = null;
        setAiBusy(screenId, blockId, false);
        setRunning(null);
      }
    };

    const stop = () => {
      const controller = abort.current;
      if (!controller) return;
      controller.abort();
      abort.current = null;
      setRunning(null);
      if (transport.path === "free") toast(texts.stopped);
    };

    const setActive: UseAiBlockActions["setActive"] = (screenId, blockId, label, active) => {
      const doc = live();
      if (!doc) return;
      const ops = setAiBlockActiveOps(doc, screenId, blockId, active);
      if (ops.length === 0 || !actions.applyPatch(ops).ok) return;
      toast(active ? texts.aiDone(label) : texts.baseDone(label), { action: undo });
    };

    return { transport: { path: transport.path, usesSession: transport.usesSession, model: transport.model }, running, opening, run, openSession, stop, setActive };
  }, [store, actions, t, aiT, transport, running, opening]);
}

export type AiIslandHandlers = {
  /** `select {t, text}` from an island: the «Pedir cambio» target (the Composer selects the block itself). */
  onSelect: (blockId: string, t: number | null, text: string | null) => void;
  /** `textEdit {t, text}` from an island: ONE replace of the block's HTML (one undo step). */
  onTextEdit: (blockId: string, t: number, text: string) => void;
};

/**
 * What an island of `screenId` wires to (track A's `AiBlocks` passes these to `AiIsland`): the selection target and
 * the inline text edit. The text is replaced in the sanitized tree and escaped (never parsed as HTML).
 */
export function useAiIslandHandlers(screenId: string | null): AiIslandHandlers {
  // Optional: the canvas also renders without a provider (tests, previews); then edits have nowhere to go.
  const store = useOptionalDesignDocStore();
  const t = useDictionary(composer);
  return useMemo(
    () => ({
      onSelect: (blockId, index, text) => {
        if (screenId) setAiTarget({ screenId, blockId, t: index, text });
      },
      onTextEdit: (blockId, index, text) => {
        const doc = store?.getState().doc;
        if (!store || !doc || !screenId) return;
        const actions = store.getState().actions;
        const ops = textEditOps(doc, screenId, blockId, index, text);
        if (ops === null) {
          toast.error(t.aiBlock.errors.text);
          return;
        }
        if (ops.length > 0 && !actions.applyPatch(ops).ok) {
          toast.error(t.aiBlock.errors.text);
          return;
        }
        // The «Pedir cambio» target follows the text it points at.
        const target = aiViewStore.getState().target;
        if (target?.screenId === screenId && target.blockId === blockId && target.t === index) setAiTarget({ ...target, text: text.slice(0, 200) });
      },
    }),
    [store, screenId, t],
  );
}
