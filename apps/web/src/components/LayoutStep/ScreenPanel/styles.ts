/*
 * Field look of the screen panel: the same strings as `BlockInspector/styles.ts` (folders cannot share
 * private modules), which match the Composer's knob fields.
 */

export const FIELD_LABEL = "text-caption font-medium text-muted";

export const FIELD_CONTROL =
  "w-full rounded-control border border-app-strong bg-white/[0.03] px-2.5 text-small text-fg transition-[border-color] duration-150 " +
  "placeholder:text-subtle hover:border-white/25 disabled:pointer-events-none disabled:opacity-45";

export const FIELD_HINT = "text-caption text-subtle";
