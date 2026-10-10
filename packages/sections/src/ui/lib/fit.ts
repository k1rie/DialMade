import {
  COL_PX,
  MEDIA_RATIOS,
  ROW_UNIT,
  type ContentEstimate,
  type MobileBehavior,
  type NoteKeyword,
} from "@dialmade/layout";
import type { FitInput } from "../../types";

/**
 * Size helpers shared by the `fit()` of the ui.* sections. `fit` maps what the canvas chip promised
 * (`input.estimate`, from `estimateContent`); the fallbacks below repeat the same formulas for callers
 * that pass no estimate, and a test checks that both always agree.
 */

/** Outer box of a ui block: nothing, a card surface, or landing gutters around a centered container. */
export const UI_FRAMES = ["plain", "card", "section"] as const;
export type UiFrame = (typeof UI_FRAMES)[number];

/** Media ratios offered by the canvas (`MEDIA_RATIOS` of @dialmade/layout), as a Zod-friendly tuple. */
export const MEDIA_RATIO_IDS = MEDIA_RATIOS.map(([id]) => id) as [string, ...string[]];

export type SizeClass = "narrow" | "medium" | "wide";

/** Width class of a block from its desktop columns: ≤3 narrow, ≤7 medium, else wide. */
export function sizeClass(w: number): SizeClass {
  const cols = gridCols(w);
  return cols <= 3 ? "narrow" : cols <= 7 ? "medium" : "wide";
}

export const clampInt = (value: number, min: number, max: number): number =>
  Math.min(max, Math.max(min, Math.round(Number.isFinite(value) ? value : min)));

/** Rect sizes the way `estimateContent` reads them: integers, at least 1. */
const gridCols = (w: number) => Math.max(1, Math.round(Number.isFinite(w) ? w : 1));
const gridRows = (h: number) => Math.max(1, Math.round(Number.isFinite(h) ? h : 1));
const heightOf = (input: Pick<FitInput, "h">) => gridRows(input.h) * ROW_UNIT;
const widthOf = (input: Pick<FitInput, "w">) => gridCols(input.w) * COL_PX;

const has = (input: Pick<FitInput, "note">, keyword: NoteKeyword) => input.note.keywords.includes(keyword);

/** The estimate's value when it has the expected kind (and unit), else `null`. */
function countEstimate(estimate: ContentEstimate | null, unit: string): number | null {
  return estimate?.kind === "count" && estimate.unit === unit ? estimate.value : null;
}

/** ×N of a repeatable block: `block.count ?? note count ?? default`, clamped like the library. */
export function repeatCount(input: Pick<FitInput, "count" | "note" | "estimate">, bounds: { min: number; max: number; default: number }) {
  const promised = countEstimate(input.estimate, "items");
  const raw = promised ?? input.count ?? input.note.count ?? bounds.default;
  return clampInt(raw, bounds.min, bounds.max);
}

/** Items of a list / activity block: one per 56 px after a 64 px header, 3–8 (`estimateContent`). */
export function listItemsFor(input: Pick<FitInput, "h" | "estimate">): number {
  return countEstimate(input.estimate, "items") ?? clampInt(Math.floor((heightOf(input) - 64) / 56), 3, 8);
}

/** Fields of a form block: one per 72 px after a 112 px header and footer, 2–6 (`estimateContent`). */
export function formFieldsFor(input: Pick<FitInput, "h" | "estimate">): number {
  return countEstimate(input.estimate, "fields") ?? clampInt(Math.floor((heightOf(input) - 112) / 72), 2, 6);
}

export type CalendarView = "month" | "week" | "agenda" | "mini";
const CALENDAR_VIEWS: ReadonlySet<string> = new Set<CalendarView>(["month", "week", "agenda", "mini"]);

/** Calendar view: note keywords first, then the size (`estimateContent`). */
export function calendarViewFor(input: Pick<FitInput, "w" | "h" | "note" | "estimate">): CalendarView {
  const promised = input.estimate?.kind === "variant" ? input.estimate.value : null;
  if (promised !== null && CALENDAR_VIEWS.has(promised)) return promised as CalendarView;
  const w = gridCols(input.w);
  const hpx = heightOf(input);
  if (has(input, "weekly")) return "week";
  if (has(input, "monthly")) return "month";
  if (has(input, "agenda") || has(input, "daily")) return "agenda";
  if (w <= 3) return "mini";
  if (w >= 6 && hpx >= 400) return "month";
  if (w >= 6) return "week";
  return "agenda";
}

/** Nearest offered media ratio to the block's shape; ties keep the earlier one (`estimateContent`). */
export function mediaRatioFor(input: Pick<FitInput, "w" | "h" | "estimate">): string {
  if (input.estimate?.kind === "ratio" && MEDIA_RATIO_IDS.includes(input.estimate.value)) return input.estimate.value;
  const ratio = widthOf(input) / heightOf(input);
  let best = MEDIA_RATIOS[0]!;
  for (const candidate of MEDIA_RATIOS) {
    if (Math.abs(candidate[1] - ratio) < Math.abs(best[1] - ratio)) best = candidate;
  }
  return best[0];
}

/** Numeric value of a ratio id («16:9» → 1.777…). */
export function ratioValue(id: string): number {
  return MEDIA_RATIOS.find(([candidate]) => candidate === id)?.[1] ?? 1;
}

/** Columns of a card grid: one per 240 px of block width, never more than the cards (spec §4). */
export function cardColumns(input: Pick<FitInput, "w" | "widthPx">, count: number, max: number): number {
  const px = Number.isFinite(input.widthPx) && input.widthPx > 0 ? input.widthPx : widthOf(input);
  return clampInt(Math.floor(px / 240), 1, Math.max(1, Math.min(count, max)));
}

/**
 * Frame of a ui block: full-width blocks of a landing screen get the landing gutters and centered
 * container (`section`), like the landing sections; everything else keeps its widget look.
 */
export function frameFor(input: Pick<FitInput, "kind" | "w">, widget: UiFrame): UiFrame {
  return input.kind === "landing" && gridCols(input.w) >= 12 ? "section" : widget;
}

/** Mobile behavior picked in the canvas inspector (`input.mobile`); otherwise the note («carrusel») decides. */
export function mobileBehaviorOf(input: FitInput): MobileBehavior | null {
  return input.mobile ?? (has(input, "carousel") ? "carousel" : null);
}
