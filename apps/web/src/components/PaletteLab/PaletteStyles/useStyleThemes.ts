"use client";

import { PALETTE_STYLES, generateTheme, type PaletteStyleId, type Theme } from "@dialmade/palette";
import { useDeferredValue, useMemo } from "react";

/**
 * One theme per palette style for the current seeds, to preview each style's strip. Deferred, so
 * dragging the picker keeps the main preview responsive and the strips catch up a moment later.
 */
export function useStyleThemes(primary: string, secondary: string | undefined): Partial<Record<PaletteStyleId, Theme>> {
  const seeds = useDeferredValue(`${primary}|${secondary ?? ""}`);
  return useMemo(() => {
    const [p, s] = seeds.split("|");
    const themes: Partial<Record<PaletteStyleId, Theme>> = {};
    for (const style of PALETTE_STYLES) {
      try {
        themes[style.id] = generateTheme({ primary: p!, ...(s && { secondary: s }), style: style.id });
      } catch {
        // An invalid seed leaves that strip as a placeholder.
      }
    }
    return themes;
  }, [seeds]);
}
