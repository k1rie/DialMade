import type { LayoutDoc, ScreenId } from "@dialmade/layout";
import type { GenerateResult } from "../../types";

/** Sub-tabs of a screen in the report, in order. */
export const REPORT_VIEWS = ["wireframe", "css", "json", "warnings"] as const;
export type ReportView = (typeof REPORT_VIEWS)[number];

/**
 * The screen the report shows: the current pick while it is still in the result, else the preferred
 * one (the active screen), else the first; `null` for an empty result.
 */
export function pickScreenId(result: GenerateResult | null, preferred: ScreenId | null, current?: ScreenId | null): ScreenId | null {
  const screens = result?.screens ?? [];
  const has = (id: ScreenId | null | undefined): id is ScreenId => !!id && screens.some((screen) => screen.screenId === id);
  if (has(current)) return current;
  if (has(preferred)) return preferred;
  return screens[0]?.screenId ?? null;
}

/** The layout document as the JSON tab shows and copies it. */
export const layoutJson = (layout: LayoutDoc): string => JSON.stringify(layout, null, 2);

/** Whether a layout has any block (the wireframe and CSS tabs say so instead of showing an empty frame). */
export const hasBlocks = (layout: LayoutDoc): boolean => Object.keys(layout.blocks).length > 0;
