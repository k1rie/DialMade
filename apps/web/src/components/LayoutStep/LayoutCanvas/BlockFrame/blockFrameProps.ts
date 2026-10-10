import type { BlockId, LayoutFix, LayoutWarning, LayoutWarningCode } from "@dialmade/layout";
// Type-only and relative: vitest runs this module without the `@/` alias.
import type { BlockWarningView } from "./BlockWarnings/BlockWarnings";

/*
 * Pure helpers of BlockFrame: its warning views, its memo comparison and the classes of its surface.
 * No React, no DOM.
 */

const fixKey = (fix: LayoutFix): string => JSON.stringify(fix);

/** The texts a warning view needs (the layout dictionary's `warnings` and `fixes`). */
export type WarningTexts = {
  warnings: Readonly<Record<LayoutWarningCode, (names: readonly string[]) => string>>;
  fixes: Readonly<Record<LayoutFix["kind"], string>>;
};

/** A block's warnings ready to show: message with the blocks' names, and the labelled fixes. */
export function buildWarningViews(warnings: readonly LayoutWarning[], label: (id: BlockId) => string, text: WarningTexts): BlockWarningView[] {
  return warnings.map((warning, index) => ({
    key: `${warning.code}:${warning.ids.join(",")}:${index}`,
    message: text.warnings[warning.code](warning.ids.map(label)),
    fixes: warning.fixes.map((fix, fixIndex) => ({ key: `${fix.kind}:${fixIndex}`, label: text.fixes[fix.kind], fix })),
  }));
}

/**
 * Same warnings by content: keys, messages, fix labels and the fixes themselves. The structure is
 * recomputed on every edit, so the arrays are always new; comparing them by reference would re-render
 * every warned block on any unrelated edit.
 */
export function sameWarningViews(a: readonly BlockWarningView[] | undefined, b: readonly BlockWarningView[] | undefined): boolean {
  if (a === b) return true;
  if (!a || !b || a.length !== b.length) return false;
  return a.every((view, index) => {
    const other = b[index]!;
    if (view.key !== other.key || view.message !== other.message || view.fixes.length !== other.fixes.length) return false;
    return view.fixes.every((item, fixIndex) => {
      const otherItem = other.fixes[fixIndex]!;
      return item.key === otherItem.key && item.label === otherItem.label && fixKey(item.fix) === fixKey(otherItem.fix);
    });
  });
}

/** `memo` comparison of BlockFrame: shallow, except `warnings`, compared by content. */
export function blockFramePropsEqual<P extends { warnings?: readonly BlockWarningView[] | undefined }>(previous: P, next: P): boolean {
  const keys = Object.keys(next) as (keyof P)[];
  if (Object.keys(previous).length !== keys.length) return false;
  for (const key of keys) {
    if (key === "warnings") {
      if (!sameWarningViews(previous.warnings, next.warnings)) return false;
    } else if (!Object.is(previous[key], next[key])) {
      return false;
    }
  }
  return true;
}

export type BlockSurfaceInput = {
  container: boolean;
  free: boolean;
  hidden: boolean;
  /** Selected or the container a moving block would land in: the purple glow. */
  highlighted: boolean;
  dropTarget: boolean;
};

/**
 * Border and fill of a block, and the class of its name. Hidden blocks stay operable (focus, move,
 * edit), so they never fade: a dashed border, no fill, the eye-off icon and a muted, struck-through name
 * (like the layers row) keep every text at AA.
 */
export function blockSurface({ container, free, hidden, highlighted, dropTarget }: BlockSurfaceInput): { surface: string; name: string } {
  const dashed = container || free || hidden;
  const fill = dropTarget
    ? "bg-accent-soft"
    : hidden || container
      ? "bg-transparent"
      : free
        ? "bg-white/[0.02]"
        : highlighted
          ? "bg-surface"
          : "bg-surface hover:bg-surface-hover";
  const border = highlighted ? "glow-purple border-transparent" : "border-app-strong";
  return {
    surface: [dashed ? "border-dashed" : "", fill, border].filter(Boolean).join(" "),
    name: hidden ? "text-muted line-through decoration-white/30" : "text-fg",
  };
}
