"use client";

import type { DesignDoc, Screen } from "@dialmade/doc";
import { useMemo, type ReactNode } from "react";
import { useDictionary } from "@/i18n";
import { ai as aiText } from "@/i18n/ai";
import { useAiGeneration } from "@/lib/ai/render/generation";
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
};

export type AiBlockLayers = {
  /** Element id → its AI island (PageRenderer `replace`). */
  replace: ReadonlyMap<string, ReactNode> | undefined;
  /** Container id → its AI surface (PageRenderer `underlay`). */
  underlay: ReadonlyMap<string, ReactNode> | undefined;
  /** Badges on base cells: designing, failed, back on the base design. */
  marks: readonly AiCellMark[];
};

const NONE: AiBlockLayers = { replace: undefined, underlay: undefined, marks: [] };
const RUNNING = new Set(["session", "direction", "screens"]);

/**
 * The AI blocks of the screen shown in Ajustar (spec §6.1 [C21], §8.1): every ACTIVE `AiBlock` replaces its section
 * with an island (containers get their surface as an underlay), once the screen's CSS covers its classes. The live
 * generation adds its marks on the base cells: a shimmer while a block is on its way, «La IA falló aquí ·
 * Reintentar», and «Usar IA otra vez» on a block sent back to the base design. Without a preview origin nothing of
 * this exists (the feature is not offered).
 */
export function useAiBlocks({ doc, screen, mode, editable, selectedId, onSelect, onNavigate }: UseAiBlocksOptions): AiBlockLayers {
  const t = useDictionary(aiText).aiRender.block;
  const available = aiRenderAvailable();
  const screenId = screen?.id ?? null;
  const run = useAiGeneration((state) => (screenId ? state.screens[screenId] : undefined));
  const running = useAiGeneration((state) => RUNNING.has(state.phase));
  const actions = useAiGeneration((state) => state.actions);

  const blocks = screen?.aiRender?.blocks;
  // The screen's theme (its dials included), as ThemeScope paints the base sections around the islands.
  const derived = useMemo(() => (available && screenId && blocks ? deriveDesign(doc, screenId) : null), [available, doc, screenId, blocks]);
  const tokens = useMemo(() => {
    if (!available || !blocks) return [];
    return Object.entries(blocks).flatMap(([id, block]) =>
      block.active ? (block.surfaceClasses ? classTokens(surfaceHtml(id, block.surfaceClasses)) : classTokens(block.html)) : [],
    );
  }, [available, blocks]);
  const css = useAiCss(tokens);

  return useMemo(() => {
    if (!available || !screen || !screenId) return NONE;
    const vars = derived?.vars[mode] ?? {};
    const fontsHref = derived?.fontsUrl?.startsWith("https://fonts.googleapis.com/") ? derived.fontsUrl : null;
    const lang = doc.brief.locale;
    const labelOf = (id: string) => screen.layout.blocks[id]?.label ?? id;
    const replace = new Map<string, ReactNode>();
    const underlay = new Map<string, ReactNode>();
    const marks: AiCellMark[] = [];

    for (const [id, block] of Object.entries(blocks ?? {})) {
      if (!screen.page.elements[id]) continue;
      if (!block.active) {
        if (editable) marks.push({ id, kind: "inactive", label: labelOf(id), onAction: () => actions.setBlockActive(screenId, id, true) });
        continue;
      }
      const pending = running && (run?.blocks[id]?.phase === "waiting" || run?.blocks[id]?.phase === "processing");
      if (block.surfaceClasses) {
        if (!css?.covers(classTokens(surfaceHtml(id, block.surfaceClasses)))) continue;
        underlay.set(
          id,
          <AiSurfaceIsland key={id} blockId={id} surfaceClasses={block.surfaceClasses} css={css.css} vars={vars} mode={mode} fontsHref={fontsHref} lang={lang} title={t.island(labelOf(id))} />,
        );
        continue;
      }
      if (!block.html || !css?.covers(classTokens(block.html))) continue;
      replace.set(
        id,
        <AiBlockIsland
          key={id}
          blockId={id}
          label={labelOf(id)}
          html={block.html}
          css={css.css}
          vars={vars}
          mode={mode}
          fontsHref={fontsHref}
          lang={lang}
          editable={editable}
          selected={selectedId === id}
          pending={pending}
          onSelect={onSelect}
          onNavigate={onNavigate}
          onUseBase={() => actions.setBlockActive(screenId, id, false)}
        />,
      );
    }

    // The live run on the base cells.
    for (const [id, state] of Object.entries(run?.blocks ?? {})) {
      if (replace.has(id) || !screen.page.elements[id] || !editable) continue;
      if (blocks?.[id] && !blocks[id]!.active) continue;
      if (running && (state.phase === "waiting" || state.phase === "processing")) marks.push({ id, kind: "designing", label: labelOf(id) });
      else if (state.phase === "failed") marks.push({ id, kind: "failed", label: labelOf(id), busy: state.retrying === true, onAction: () => void actions.retryBlock(screenId, id) });
    }

    return { replace: replace.size > 0 ? replace : undefined, underlay: underlay.size > 0 ? underlay : undefined, marks };
  }, [available, screen, screenId, derived, mode, doc.brief.locale, blocks, css, editable, selectedId, running, run, actions, onSelect, onNavigate, t]);
}
