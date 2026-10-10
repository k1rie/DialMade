"use client";

import { motion, useReducedMotion } from "motion/react";
import { AiIsland } from "@/components/AiIsland";
import { tween } from "@/lib/motion";

export type AiSurfaceIslandProps = {
  blockId: string;
  /** Validated surface classes of the container (spec §1 [C15]). */
  surfaceClasses: readonly string[];
  css: string;
  vars: Readonly<Record<string, string>>;
  mode: "light" | "dark";
  fontsHref: string | null;
  lang: "es" | "en";
  title: string;
};

/** The surface HTML of a container: one empty box that fills the island (its children are other blocks). */
export const surfaceHtml = (blockId: string, classes: readonly string[]) => `<div data-block-id="${blockId}" class="${["absolute", "inset-6", ...classes].join(" ")}"></div>`;

/**
 * A container's AI surface (spec §15.3: `underlay`): its own island painted under the container's children, never
 * the app's DOM (the AI CSS stays out of the app). Decorative and click-through: the children stay selectable.
 */
export function AiSurfaceIsland({ blockId, surfaceClasses, css, vars, mode, fontsHref, lang, title }: AiSurfaceIslandProps) {
  const reduce = useReducedMotion();
  return (
    <motion.div
      aria-hidden
      data-dl-ai-surface-island=""
      className="pointer-events-none absolute inset-0"
      initial={reduce ? false : { opacity: 0 }}
      animate={{ opacity: 1 }}
      transition={tween(0.32)}
    >
      <AiIsland
        blockId={blockId}
        html={surfaceHtml(blockId, surfaceClasses)}
        css={css}
        vars={vars}
        mode={mode}
        fontsHref={fontsHref}
        editable={false}
        lang={lang}
        title={title}
        className="h-[calc(100%+48px)]!"
      />
    </motion.div>
  );
}
