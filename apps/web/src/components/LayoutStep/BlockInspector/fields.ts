import { MAX_HEIGHT_ROWS, MAX_ROW, type GridRect } from "@dialmade/layout";
import { nudgeGrid, ROW_UNIT_PX, type GridSize } from "@/lib/geometry";
import { MIN_BLOCK_SIZE } from "./constants";

/*
 * Numeric fields of the inspector («Posición y tamaño», «Cantidad», «Ajuste fino»). Users read 1-based
 * columns and px of the design (rows × 8); the model stores 0-based columns and rows. Pure, no DOM.
 */

/** «Columna», «Ancho», «Arriba», «Alto». */
export type RectField = "col" | "w" | "top" | "height";

/** Bounds of a field in the units the user reads. «Arriba» and «Alto» stop at the engine's `MAX_ROW` / `MAX_HEIGHT_ROWS`. */
export type FieldBounds = { min: number; max: number; step: number };

export type NudgeDirection = "left" | "right" | "up" | "down";
/** «Posición» moves the block, «Tamaño» moves its right/bottom edge. */
export type NudgeMode = "move" | "resize";

export const RECT_FIELDS: readonly RectField[] = ["col", "w", "top", "height"];

const NUMBER_RE = /^[-+]?(?:\d+(?:\.\d*)?|\.\d+)$/;

export const sameRect = (a: GridRect, b: GridRect): boolean => a.col === b.col && a.row === b.row && a.w === b.w && a.h === b.h;

const clamp = (value: number, min: number, max: number) => Math.min(max, Math.max(min, value));

/** What the user typed → a number; `null` when it is not one. Accepts spaces around it and a decimal comma. */
export function parseNumber(raw: string): number | null {
  const text = raw.trim().replace(",", ".");
  if (!NUMBER_RE.test(text)) return null;
  const value = Number(text);
  return Number.isFinite(value) ? value : null;
}

/** Value a field shows: column 1-based, width in columns, top and height in px of the design. */
export function fieldValue(rect: GridRect, field: RectField): number {
  switch (field) {
    case "col":
      return rect.col + 1;
    case "w":
      return rect.w;
    case "top":
      return rect.row * ROW_UNIT_PX;
    case "height":
      return rect.h * ROW_UNIT_PX;
  }
}

/** Valid range of a field for this rect: the column keeps the width inside the grid and the other way round. */
export function fieldBounds(rect: GridRect, field: RectField, columns = 12, min: GridSize = MIN_BLOCK_SIZE): FieldBounds {
  switch (field) {
    case "col":
      return { min: 1, max: Math.max(1, columns - rect.w + 1), step: 1 };
    case "w":
      return { min: min.w, max: Math.max(min.w, columns - rect.col), step: 1 };
    case "top":
      return { min: 0, max: MAX_ROW * ROW_UNIT_PX, step: ROW_UNIT_PX };
    case "height":
      return { min: min.h * ROW_UNIT_PX, max: MAX_HEIGHT_ROWS * ROW_UNIT_PX, step: ROW_UNIT_PX };
  }
}

/**
 * The rect with one field set from what the user typed: clamped into the field's bounds, px snapped to
 * the 8 px rows. `null` when the text is not a number; the same object when nothing changes.
 */
export function applyField(rect: GridRect, field: RectField, raw: string, columns = 12, min: GridSize = MIN_BLOCK_SIZE): GridRect | null {
  const value = parseNumber(raw);
  if (value === null) return null;
  const bounds = fieldBounds(rect, field, columns, min);
  const fit = (v: number) => clamp(v, bounds.min, bounds.max);
  let next: GridRect;
  switch (field) {
    case "col":
      next = { ...rect, col: fit(Math.round(value)) - 1 };
      break;
    case "w":
      next = { ...rect, w: fit(Math.round(value)) };
      break;
    case "top":
      next = { ...rect, row: Math.round(fit(value) / ROW_UNIT_PX) };
      break;
    case "height":
      next = { ...rect, h: Math.max(min.h, Math.round(fit(value) / ROW_UNIT_PX)) };
      break;
  }
  return sameRect(next, rect) ? rect : next;
}

const NUDGE_KEYS: Readonly<Record<NudgeDirection, string>> = {
  left: "ArrowLeft",
  right: "ArrowRight",
  up: "ArrowUp",
  down: "ArrowDown",
};

/**
 * «Ajuste fino»: one press = 1 column or 8 px. In «Tamaño» Right/Down grow and Left/Up shrink the block
 * from its top-left corner (the same rule as Shift+arrows on the canvas), never below the minimum size.
 */
export function nudgeRect(rect: GridRect, direction: NudgeDirection, mode: NudgeMode, columns = 12, min: GridSize = MIN_BLOCK_SIZE): GridRect {
  const next = nudgeGrid(rect, NUDGE_KEYS[direction], mode === "resize", columns, min);
  return sameRect(next, rect) ? rect : next;
}

/** ×N typed by the user, rounded and clamped to the block's bounds; `null` when it is not a number. */
export function parseCount(raw: string, bounds: { min: number; max: number }): number | null {
  const value = parseNumber(raw);
  return value === null ? null : clamp(Math.round(value), bounds.min, bounds.max);
}
