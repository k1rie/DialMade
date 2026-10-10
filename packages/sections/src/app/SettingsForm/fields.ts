import { ROW_UNIT } from "@dialmade/layout";
import type { FitInput } from "../../types";
import { clampInt } from "../../ui/lib/fit";

/** The text and select fields of the form, in the order they show (and are cut by `count`). */
export const SETTINGS_GENERAL_FIELDS = ["workspaceName", "email", "language", "timezone", "about"] as const;
export type SettingsGeneralField = (typeof SETTINGS_GENERAL_FIELDS)[number];

/** Stored `count` when nothing cuts the form: the five fields and the three default switches (today's form). */
export const SETTINGS_DEFAULT_COUNT = 8;
/** Five fields and the six switches the schema allows. */
export const SETTINGS_MAX_COUNT = 11;
/** The canvas chip promises 2–8 fields («Ajustes · 6 campos»): the knob offers the same range. */
export const SETTINGS_CHIP_RANGE = { min: 2, max: 8 } as const;

/** What `count` shows: the first `count` fields, then the switches (`count - 5` of them). */
export function settingsShown(count: number, toggles: number): { fields: readonly SettingsGeneralField[]; toggles: number } {
  const shown = clampInt(Math.floor(count), 1, SETTINGS_MAX_COUNT);
  return {
    fields: SETTINGS_GENERAL_FIELDS.slice(0, shown),
    toggles: Math.max(0, Math.min(toggles, shown - SETTINGS_GENERAL_FIELDS.length)),
  };
}

/** Fields promised by the chip (`estimateContent`): one per 72 px after a 120 px header and footer, 2–8. */
export function settingsFieldsFor(input: Pick<FitInput, "h" | "estimate">): number {
  const { estimate } = input;
  if (estimate?.kind === "count" && estimate.unit === "fields") return estimate.value;
  const rows = Math.max(1, Math.round(Number.isFinite(input.h) ? input.h : 1));
  return clampInt(Math.floor((rows * ROW_UNIT - 120) / 72), SETTINGS_CHIP_RANGE.min, SETTINGS_CHIP_RANGE.max);
}

/**
 * `visible` hook: the stored props as the form shows them. Fields past `count` are left out and the switches
 * are cut to what is left (`count - 5`). Untouched when `count` is not a finite number.
 */
export function visibleSettings(stored: Readonly<Record<string, unknown>>): Record<string, unknown> {
  const { count, notifications } = stored;
  if (typeof count !== "number" || !Number.isFinite(count)) return { ...stored };
  const toggles = Array.isArray(notifications) ? notifications : [];
  const shown = settingsShown(count, toggles.length);
  const out: Record<string, unknown> = { ...stored };
  for (const key of SETTINGS_GENERAL_FIELDS.slice(shown.fields.length)) delete out[key];
  if (Array.isArray(notifications)) out.notifications = notifications.slice(0, shown.toggles);
  return out;
}
