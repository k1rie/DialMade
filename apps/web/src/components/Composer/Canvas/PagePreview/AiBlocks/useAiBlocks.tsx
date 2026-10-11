"use client";

import { AI_SHELL_ELEMENT_ID, AI_SHELL_NAV_ID, chromeLabel, chromePieceOf } from "@dialmade/ai-render";
import type { DesignDoc, Screen } from "@dialmade/doc";
import { useCallback, useMemo, type ReactNode } from "react";
import { toast } from "sonner";
import { useOptionalDesignDocStore } from "@/hooks/useDesignDoc";
import { useAiIslandHandlers } from "@/hooks/useAiBlockEdit";
import { useDictionary } from "@/i18n";
import { ai as aiText } from "@/i18n/ai";
import { composer } from "@/i18n/composer";
import { useByokKey } from "@/lib/ai/byokKey";
import { focusAiControlAfterSwap } from "@/lib/ai/render/focus";
import { responsiveGateOps, useAiGeneration } from "@/lib/ai/render/generation";
import { cellWidths, type ResponsiveVerdict } from "@/lib/ai/render/responsive";
import { isAiBusy, showsAi, useAiView } from "@/lib/ai/render/view";
import { aiRenderAvailable } from "@/lib/ai/render/preview";
import { deriveDesign } from "@/lib/design-derived";
import { AiBlockIsland } from "./AiBlockIsland";
import { AiSurfaceIsland, surfaceHtml } from "./AiSurfaceIsland";
import type { AiCellMark } from "./AiBlocks";
import { classTokens, useAiCss } from "./useAiCss";

export type UseAiBlocksOptions = {
  doc: DesignDoc;
  screen: Screen | null;
  mode: "light" | "dark";
  /** Ajustar (selection, chips and badges); `false` in «Probar». */
  editable: boolean;
  selectedId: string | null;
  onSelect: (id: string) => void;
  onNavigate?: ((screenId: string) => void) | undefined;
  /** Inline text edits of an island (Track B: `src/lib/ai/render/edit.ts`). */
  onTextEdit?: ((blockId: string, t: number, text: string) => void) | undefined;
};

export type AiBlockLayers = {
  /** Element id → its AI island (PageRenderer `replace`). */
  replace: ReadonlyMap<string, ReactNode> | undefined;
  /** Container id → its AI surface (PageRenderer `underlay`). */
  underlay: ReadonlyMap<string, ReactNode> | undefined;
  /** The app frame's AI pieces (`shell-nav`, `shell-bar`) → their islands (PageRenderer `chrome`). */
  chrome: ReadonlyMap<string, ReactNode> | undefined;
  /** Badges on base cells: designing, failed, back on the base design. */
  marks: readonly AiCellMark[];
};

const NONE: AiBlockLayers = { replace: undefined, underlay: undefined, chrome: undefined, marks: [] };
const RUNNING = new Set(["session", "direction", "screens"]);

/**
 * The AI blocks of the screen shown in Ajustar (spec §6.1 [C21], §8.1): every ACTIVE `AiBlock` replaces its section
 * with an island (containers get their surface as an underlay), once the screen's CSS covers its classes. The live
 * generation adds its marks on the base cells: a shimmer while a block is on its way, «La IA falló aquí ·
 * Reintentar», and «Usar IA otra vez» on a block sent back to the base design. Without a preview origin nothing of
 * this exists (the feature is not offered).
 */
export function useAiBlocks({ doc, screen, mode, editable, selectedId, onSelect, onNavigate, onTextEdit }: UseAiBlocksOptions): AiBlockLayers {
  const t = useDictionary(aiText).aiRender.block;
  const composerT = useDictionary(composer);
  const byok = useByokKey().active;
  const available = aiRenderAvailable();
  const screenId = screen?.id ?? null;
  const run = useAiGeneration((state) => (screenId ? state.screens[screenId] : undefined));
  const running = useAiGeneration((state) => RUNNING.has(state.phase));
  const actions = useAiGeneration((state) => state.actions);

  // Track B: «Base | IA», the selected text, inline edits and the shimmer of a block action in flight.
  const view = useAiView((state) => state);
  const handlers = useAiIslandHandlers(screenId);
  const textEdit = onTextEdit ?? handlers.onTextEdit;
  // Track D's gate 5: the verdict of the island's measurements into the block's gates (not an undo step).
  const docStore = useOptionalDesignDocStore();
  const writeVerdict = useCallback(
    (blockId: string, verdict: ResponsiveVerdict) => {
      if (!docStore) return;
      const current = docStore.getState().doc;
      const ops = current && screenId ? responsiveGateOps(current, screenId, blockId, verdict) : null;
      if (!ops) return;
      const history = docStore.temporal.getState();
      history.pause();
      try {
        docStore.getState().actions.applyPatch(ops);
      } finally {
        history.resume();
      }
    },
    [docStore, screenId],
  );
  // «Volver al diseño base» / «Usar IA otra vez» on the canvas: one undo step, said aloud like the card's (toast) and
  // focus on the control that replaces the pressed one.
  const setActive = useCallback(
    (blockId: string, label: string, active: boolean) => {
      if (!screenId) return;
      const from = typeof document === "undefined" ? null : document.activeElement;
      if (!actions.setBlockActive(screenId, blockId, active)) return;
      const undo = docStore ? { label: composerT.undoAction, onClick: () => docStore.temporal.getState().undo() } : undefined;
      toast(active ? composerT.aiBlock.aiDone(label) : composerT.aiBlock.baseDone(label), undo ? { action: undo } : {});
      focusAiControlAfterSwap(blockId, from);
    },
    [actions, composerT, docStore, screenId],
  );
  const retry = useCallback(
    async (blockId: string) => {
      if (!screenId) return;
      const from = typeof document === "undefined" ? null : document.activeElement;
      await actions.retryBlock(screenId, blockId);
      focusAiControlAfterSwap(blockId, from);
    },
    [actions, screenId],
  );

  const blocks = screen?.aiRender?.blocks;
  // The screen's theme (its dials included), as ThemeScope paints the base sections around the islands.
  const derived = useMemo(() => (available && screenId && blocks ? deriveDesign(doc, screenId) : null), [available, doc, screenId, blocks]);
  const tokens = useMemo(() => {
    if (!available || !blocks) return [];
    // Page-mode sections bring their own CSS: their class names are not Tailwind's (a `container` of theirs is not Tailwind's).
    return Object.entries(blocks).flatMap(([id, block]) =>
      block.active && block.mode !== "page" ? (block.surfaceClasses ? classTokens(surfaceHtml(id, block.surfaceClasses)) : classTokens(block.html)) : [],
    );
  }, [available, blocks]);
  const css = useAiCss(tokens);

  return useMemo(() => {
    if (!available || !screen || !screenId) return NONE;
    const vars = derived?.vars[mode] ?? {};
    const fontsHref = derived?.fontsUrl?.startsWith("https://fonts.googleapis.com/") ? derived.fontsUrl : null;
    const lang = doc.brief.locale;
    const labelOf = (id: string) => {
      const piece = chromePieceOf(screen, id);
      return piece ? chromeLabel(piece.type, lang) : (screen.layout.blocks[id]?.label ?? id);
    };
    // The app frame's pieces have no cell of their own: their marks show on the frame (one at a time).
    const cellOf = (id: string) => (chromePieceOf(screen, id) ? { cellId: AI_SHELL_ELEMENT_ID } : {});
    const onFrame = (id: string) => chromePieceOf(screen, id) !== undefined && marks.some((mark) => mark.cellId === AI_SHELL_ELEMENT_ID);
    const replace = new Map<string, ReactNode>();
    const underlay = new Map<string, ReactNode>();
    const chrome = new Map<string, ReactNode>();
    const marks: AiCellMark[] = [];

    for (const [id, block] of Object.entries(blocks ?? {})) {
      const piece = chromePieceOf(screen, id);
      if (!piece && !screen.page.elements[id]) continue;
      if (!block.active) {
        if (editable && !onFrame(id)) marks.push({ id, ...cellOf(id), kind: "inactive", label: labelOf(id), onAction: () => setActive(id, labelOf(id), true) });
        continue;
      }
      // «Base» in the comparator: the base section paints, nothing else changes.
      if (!showsAi(view, screenId, id)) continue;
      const pending = (running && (run?.blocks[id]?.phase === "waiting" || run?.blocks[id]?.phase === "processing")) || isAiBusy(view, screenId, id);
      if (block.surfaceClasses) {
        if (!css?.covers(classTokens(surfaceHtml(id, block.surfaceClasses)))) continue;
        underlay.set(
          id,
          <AiSurfaceIsland key={id} blockId={id} surfaceClasses={block.surfaceClasses} css={css.css} vars={vars} mode={mode} fontsHref={fontsHref} lang={lang} title={t.island(labelOf(id))} />,
        );
        continue;
      }
      if (piece) {
        // The app frame's sidebar and top bar: they paint in its slots; a click selects the frame.
        if (!block.html || !css || !css.covers(classTokens(block.html))) continue;
        chrome.set(
          id,
          <AiBlockIsland
            key={id}
            blockId={id}
            label={labelOf(id)}
            html={block.html}
            css={css.css}
            {...(piece.id === AI_SHELL_NAV_ID && { fill: true })}
            vars={vars}
            mode={mode}
            fontsHref={fontsHref}
            lang={lang}
            editable={editable}
            selected={false}
            pending={pending}
            onSelect={() => onSelect(AI_SHELL_ELEMENT_ID)}
            onSelectText={editable ? (t, text) => handlers.onSelect(id, t, text) : undefined}
            onNavigate={onNavigate}
            onTextEdit={editable ? (t, text) => textEdit(id, t, text) : undefined}
            onUseBase={() => setActive(id, labelOf(id), false)}
            edit={editable && view.editRequest?.screenId === screenId && view.editRequest.blockId === id ? { n: view.editRequest.n, t: view.editRequest.t } : null}
          />,
        );
        continue;
      }
      const page = block.mode === "page";
      if (!block.html || !css || (!page && !css.covers(classTokens(block.html)))) continue;
      replace.set(
        id,
        <AiBlockIsland
          key={id}
          blockId={id}
          label={labelOf(id)}
          html={block.html}
          css={css.css}
          {...(page && { page: true, pageCss: screen.aiRender?.pageCss ?? "" })}
          vars={vars}
          mode={mode}
          fontsHref={fontsHref}
          lang={lang}
          editable={editable}
          selected={selectedId === id}
          pending={pending}
          onSelect={onSelect}
          onSelectText={editable ? (t, text) => handlers.onSelect(id, t, text) : undefined}
          widths={editable ? cellWidths(screen, id) : undefined}
          onVerdict={editable ? (verdict) => writeVerdict(id, verdict) : undefined}
          onNavigate={onNavigate}
          onTextEdit={editable ? (t, text) => textEdit(id, t, text) : undefined}
          onUseBase={() => setActive(id, labelOf(id), false)}
          edit={editable && view.editRequest?.screenId === screenId && view.editRequest.blockId === id ? { n: view.editRequest.n, t: view.editRequest.t } : null}
        />,
      );
    }

    // The live run on the base cells.
    for (const [id, state] of Object.entries(run?.blocks ?? {})) {
      const piece = chromePieceOf(screen, id);
      if (replace.has(id) || chrome.has(id) || (!piece && !screen.page.elements[id]) || !editable || onFrame(id)) continue;
      if (blocks?.[id] && !blocks[id]!.active) continue;
      if (running && (state.phase === "waiting" || state.phase === "processing")) marks.push({ id, ...cellOf(id), kind: "designing", label: labelOf(id) });
      else if (state.phase === "failed") marks.push({ id, ...cellOf(id), kind: "failed", label: labelOf(id), busy: state.retrying === true, byok, onAction: () => void retry(id) });
    }

    return { replace: replace.size > 0 ? replace : undefined, underlay: underlay.size > 0 ? underlay : undefined, chrome: chrome.size > 0 ? chrome : undefined, marks };
  }, [available, screen, screenId, derived, mode, doc.brief.locale, blocks, css, editable, selectedId, running, run, onSelect, onNavigate, textEdit, handlers, view, writeVerdict, t, setActive, retry, byok]);
}
