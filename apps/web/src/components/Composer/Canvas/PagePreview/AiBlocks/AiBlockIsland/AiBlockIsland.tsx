"use client";

import { motion, useReducedMotion } from "motion/react";
import { useRef, type MouseEvent } from "react";
import { AiIsland, useResponsiveGate } from "@/components/AiIsland";
import type { CellWidths, ResponsiveVerdict } from "@/lib/ai/render/responsive";
import { useDictionary } from "@/i18n";
import { ai as aiText } from "@/i18n/ai";
import { cn } from "@/lib/cn";
import { tween } from "@/lib/motion";
import { AiCellBadge } from "../AiCellBadge";

/** The island's own color-scheme, equal to the one its runtime sets, so the frame stays transparent. */
export const islandScheme = (mode: "light" | "dark") => (mode === "dark" ? "scheme-dark!" : "scheme-light!");

export type AiBlockIslandProps = {
  blockId: string;
  /** Block label of the layout («Hero»): the island's accessible name and the chip's. */
  label: string;
  html: string;
  css: string;
  /** Page mode: a section of the screen's page, styled by the page stylesheet. */
  page?: boolean;
  pageCss?: string;
  vars: Readonly<Record<string, string>>;
  mode: "light" | "dark";
  fontsHref: string | null;
  lang: "es" | "en";
  /** Ajustar (selection, chips); off in «Probar». */
  editable: boolean;
  selected: boolean;
  /** A new version of this block is on its way (a running generation asked for it again). */
  pending: boolean;
  onSelect: (blockId: string) => void;
  /** The text the user clicked inside the island (Track B's «Pedir cambio» target). */
  onSelectText?: ((t: number | null, text: string | null) => void) | undefined;
  /** Gate 5 (Track D): the block's cell width on each device; the island measures at each one after a render. */
  widths?: CellWidths | undefined;
  onVerdict?: ((verdict: ResponsiveVerdict) => void) | undefined;
  onNavigate?: ((screenId: string) => void) | undefined;
  /** Inline text edit inside the island (Track B turns it into one `replace` patch). */
  onTextEdit?: ((t: number, text: string) => void) | undefined;
  /** «Volver al diseño base». */
  onUseBase: () => void;
  /** «Editar textos» of the «Bloque de IA» card for this block (keyboard way into the inline edit). */
  edit?: { n: number; t: number | null } | null;
};

/**
 * One active AI block in its grid cell (spec §6.1 [C21], §10.2): the sandboxed island of the preview origin, faded
 * in once (≤ 400 ms; a direct swap with reduced motion), and in Ajustar the «IA · Volver al diseño base» chip, shown
 * on hover, focus or selection. The chip is a real button of the app (Tab reaches it after the block). A click in the
 * island selects the block like a click on a base section.
 */
const NO_WIDTHS: CellWidths = {};
const ignore = () => {};

export function AiBlockIsland({ blockId, label, html, css, page, pageCss, vars, mode, fontsHref, lang, editable, selected, pending, onSelect, onSelectText, widths, onVerdict, onNavigate, onTextEdit, onUseBase, edit }: AiBlockIslandProps) {
  const root = useRef<HTMLDivElement>(null);
  const t = useDictionary(aiText).aiRender.block;
  const onMeasure = useResponsiveGate(widths ?? NO_WIDTHS, undefined, onVerdict ?? ignore);
  const measureWidths = widths && onVerdict ? [...new Set(Object.values(widths))].sort((a, b) => b - a) : undefined;
  const reduce = useReducedMotion();
  const stop = (event: MouseEvent) => event.stopPropagation();
  return (
    <motion.div
      ref={root}
      data-dl-ai-island=""
      className="group/ai relative min-h-0 flex-1"
      initial={reduce ? false : { opacity: 0 }}
      animate={{ opacity: 1 }}
      transition={tween(0.32)}
    >
      <AiIsland
        blockId={blockId}
        html={html}
        css={css}
        {...(page && { page: true, pageCss: pageCss ?? "" })}
        vars={vars}
        mode={mode}
        fontsHref={fontsHref}
        editable={editable}
        lang={lang}
        title={t.island(label)}
        // The 24 px bleed overlaps the neighbours: the frame must stay transparent there. Chrome paints an opaque
        // backdrop when the frame's color-scheme («normal» → the app's dark) differs from its document's (`mode`).
        className={islandScheme(mode)}
        onSelect={(index, text) => {
          onSelect(blockId);
          onSelectText?.(index, text);
        }}
        {...(measureWidths && measureWidths.length > 0 && { measureWidths, onMeasure })}
        {...(onNavigate && { onNavigate })}
        {...(onTextEdit && { onTextEdit })}
        edit={edit ?? null}
        // A keyboard edit ended: focus goes back to the block's cell (the frame the user selected it from).
        onEditEnd={() => root.current?.closest<HTMLElement>("[data-dl-id][tabindex]")?.focus({ preventScroll: true })}
      />
      {pending && <AiCellBadge kind="designing" label={label} />}
      {editable && (
        <div className="app-chrome pointer-events-none absolute top-2 right-2 z-10 flex">
          <button
            type="button"
            data-ai-focus={blockId}
            aria-label={t.toBaseLabel(label)}
            onClick={(event) => {
              stop(event);
              onUseBase();
            }}
            className={cn(
              "glass pointer-events-auto inline-flex h-7 items-center gap-1.5 rounded-chip border border-app px-2.5 text-caption font-medium text-fg shadow-lift",
              "opacity-0 transition-opacity duration-150 group-hover/ai:opacity-100 focus-visible:opacity-100",
              selected && "opacity-100",
            )}
          >
            <span aria-hidden className="rounded-[6px] bg-accent-soft px-1.5 font-semibold text-fg">
              {t.tag}
            </span>
            {t.toBase}
          </button>
        </div>
      )}
    </motion.div>
  );
}
