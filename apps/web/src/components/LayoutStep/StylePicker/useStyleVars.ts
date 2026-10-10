"use client";

import type { DesignDoc } from "@dialmade/doc";
import type { ColorMode } from "@dialmade/palette";
import { useMemo, type CSSProperties } from "react";
import type { StyleChoice } from "../types";
import { getStyleVars, type StyleVars } from "./styleVars";

export type StyleVarsResult = StyleVars & {
  /** Inline style of the preview root: the variables plus `color-scheme`. Stable per theme + option + mode. */
  style: CSSProperties;
};

const styles = new WeakMap<StyleVars, CSSProperties>();

/**
 * Theme variables of one style option («guide» = the doc's own inputs), compiled with the recipe like
 * the real theme. Cached by value (`getStyleVars`), so unrelated doc or store changes return the same
 * objects and the memoized preview does not re-render. `doc: null` (previews not rendered yet) compiles
 * nothing and returns `null`.
 */
export function useStyleVars(doc: DesignDoc | null, choice: StyleChoice, mode?: ColorMode): StyleVarsResult | null {
  return useMemo(() => {
    if (!doc) return null;
    const result = getStyleVars(doc, choice, mode);
    let style = styles.get(result);
    if (!style) {
      style = { ...result.vars, colorScheme: result.mode } as CSSProperties;
      styles.set(result, style);
    }
    return { ...result, style };
  }, [doc, choice, mode]);
}
