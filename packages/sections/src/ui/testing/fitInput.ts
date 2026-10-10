import {
  COL_PX,
  ROW_UNIT,
  estimateContent,
  getBlockDef,
  parseNote,
  type LayoutBlock,
  type LibraryBlockType,
  type ScreenKind,
} from "@dialmade/layout";
import type { FitInput } from "../../types";

export interface FitInputOptions {
  kind?: ScreenKind;
  note?: string;
  count?: number;
  /** Pass `null` to test the fallbacks (no estimate from the caller). */
  estimate?: "auto" | null;
}

/** The `FitInput` buildPageFromLayout would pass for a lone block of `type` sized `w × h` (grid units). */
export function fitInputFor(type: LibraryBlockType, w: number, h: number, options: FitInputOptions = {}): FitInput {
  const { kind = "app", note, count, estimate = "auto" } = options;
  const block: LayoutBlock = {
    type,
    label: type,
    rect: { col: 0, row: 0, w, h },
    z: 0,
    ...(note !== undefined && { note }),
    ...(count !== undefined && { count }),
  };
  const parsed = parseNote(note);
  const repeatable = getBlockDef(type).repeatable;
  const raw = count ?? parsed.count;
  const clamped = raw === undefined ? undefined : repeatable ? Math.min(repeatable.max, Math.max(repeatable.min, raw)) : raw;
  return {
    w,
    h,
    widthPx: w * COL_PX,
    heightPx: h * ROW_UNIT,
    ...(clamped !== undefined && { count: clamped }),
    note: parsed,
    estimate: estimate === "auto" ? estimateContent(block) : null,
    absorbed: [],
    kind,
    blockId: "b-test01",
  };
}

/** Sizes of the grid tests: every width × heights of 4–80 rows. */
export const SIZE_GRID: readonly (readonly [w: number, h: number])[] = Array.from({ length: 12 }, (_, i) => i + 1).flatMap((w) =>
  Array.from({ length: 77 }, (_, j) => [w, j + 4] as const),
);
