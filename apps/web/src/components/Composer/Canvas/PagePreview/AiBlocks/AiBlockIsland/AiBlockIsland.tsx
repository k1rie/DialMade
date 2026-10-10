"use client";

import { motion, useReducedMotion } from "motion/react";
import type { MouseEvent } from "react";
import { AiIsland } from "@/components/AiIsland";
import { useDictionary } from "@/i18n";
import { ai as aiText } from "@/i18n/ai";
import { cn } from "@/lib/cn";
import { tween } from "@/lib/motion";
import { AiCellBadge } from "../AiCellBadge";

export type AiBlockIslandProps = {
  blockId: string;
  /** Block label of the layout («Hero»): the island's accessible name and the chip's. */
  label: string;
  html: string;
  css: string;
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
  onNavigate?: ((screenId: string) => void) | undefined;
  /** «Volver al diseño base». */
  onUseBase: () => void;
};

/**
 * One active AI block in its grid cell (spec §6.1 [C21], §10.2): the sandboxed island of the preview origin, faded
 * in once (≤ 400 ms; a direct swap with reduced motion), and in Ajustar the «IA · Volver al diseño base» chip, shown
 * on hover, focus or selection. The chip is a real button of the app (Tab reaches it after the block). A click in the
 * island selects the block like a click on a base section.
 */
export function AiBlockIsland({ blockId, label, html, css, vars, mode, fontsHref, lang, editable, selected, pending, onSelect, onNavigate, onUseBase }: AiBlockIslandProps) {
  const t = useDictionary(aiText).aiRender.block;
  const reduce = useReducedMotion();
  const stop = (event: MouseEvent) => event.stopPropagation();
  return (
    <motion.div
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
        vars={vars}
        mode={mode}
        fontsHref={fontsHref}
        editable={editable}
        lang={lang}
        title={t.island(label)}
        onSelect={() => onSelect(blockId)}
        {...(onNavigate && { onNavigate })}
      />
      {pending && <AiCellBadge kind="designing" label={label} />}
      {editable && (
        <div className="app-chrome pointer-events-none absolute top-2 right-2 z-10 flex">
          <button
            type="button"
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
