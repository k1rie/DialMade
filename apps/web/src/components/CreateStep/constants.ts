import { OUTPUT_KINDS, outputKindOptions, type Locale, type OutputKind } from "@dialmade/catalog";

/** DnD type of the output cards; only the canvas slot accepts it. */
export const KIND_DRAG_TYPE = "output-kind";
export const CANVAS_SLOT_ID = "create-canvas";

/** Design size of the minis (@dialmade/sections); they are scaled to fit their box. */
export const MINI_SIZE = { width: 320, height: 200 } as const;

export const kindDragId = (kind: OutputKind) => `output-kind-${kind}`;

export const kindLabel = (kind: OutputKind, locale: Locale): string =>
  outputKindOptions.find((option) => option.id === kind)?.label[locale] ?? kind;

/** The `kind` carried by a dragged card (`{ kind }` payload), or null. */
export function kindOf(data: unknown): OutputKind | null {
  const kind = (data as { kind?: unknown } | null | undefined)?.kind;
  return (OUTPUT_KINDS as readonly unknown[]).includes(kind) ? (kind as OutputKind) : null;
}
