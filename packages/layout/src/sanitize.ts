import { LABEL_MAX, NOTE_MAX } from "./constants";

/** C0/C1 controls, DEL and the Unicode line/paragraph separators: they become a space. */
const BREAKING = /[\u0000-\u001f\u007f-\u009f\u2028\u2029]/g;
/** Bidi embedding/override/isolate marks and the BOM: removed (they can reorder what the user reads). */
const INVISIBLE = /[\u061c\u200e\u200f\u202a-\u202e\u2066-\u2069\ufeff]/g;

/**
 * One line of plain text: controls become spaces, bidi controls are removed, whitespace collapses, and the
 * result is cut to `max` UTF-16 code units without splitting a surrogate pair.
 */
export function sanitizeLine(raw: unknown, max: number): string {
  if (typeof raw !== "string") return "";
  const text = raw.replace(BREAKING, " ").replace(INVISIBLE, "").replace(/\s+/g, " ").trim();
  if (text.length <= max) return text;
  let end = Math.max(0, max);
  const last = text.charCodeAt(end - 1);
  if (last >= 0xd800 && last <= 0xdbff) end -= 1;
  return text.slice(0, end).trimEnd();
}

/** Block note: one line, ≤200 code units. Data, never instructions. */
export function sanitizeNote(raw: unknown): string {
  return sanitizeLine(raw, NOTE_MAX);
}

/** Block label: one line, ≤60 code units. */
export function sanitizeLabel(raw: unknown): string {
  return sanitizeLine(raw, LABEL_MAX);
}
