import type { Adjustment, BlockId } from "@dialmade/layout";
import type { LayoutDictionary } from "@/i18n/layout";

/** Texts of «Ajustado · Deshacer» (`t.adjusted`). */
export type AdjustedText = Pick<LayoutDictionary["adjusted"], "clamp" | "clip" | "nest" | "unnest" | "many">;

/** Most telling first: a block that changed container says more than one that was trimmed to the grid. */
const RANK: Readonly<Record<Adjustment["kind"], number>> = { nest: 0, unnest: 1, clip: 2, clamp: 3 };

/**
 * One sentence for what `normalizeDrop` changed after a canvas drop or an inspector edit («Ajustado ·
 * Deshacer» and the announcement): the most telling adjustment of a single block («Hero ahora está dentro de Contenedor.»), or «Se ajustaron N bloques.» when several blocks
 * changed. `null` when nothing was adjusted.
 */
export function describeAdjustments(adjustments: readonly Adjustment[], nameOf: (id: BlockId) => string, text: AdjustedText): string | null {
  if (adjustments.length === 0) return null;
  const blocks = new Set(adjustments.map((adjustment) => adjustment.id));
  if (blocks.size > 1) return text.many(blocks.size);
  const top = [...adjustments].sort((a, b) => RANK[a.kind] - RANK[b.kind])[0]!;
  const name = nameOf(top.id);
  switch (top.kind) {
    case "nest":
      return text.nest(name, nameOf(top.parentId));
    case "unnest":
      return text.unnest(name, nameOf(top.parentId));
    case "clip":
      return text.clip(name);
    case "clamp":
      return text.clamp(name);
  }
}
