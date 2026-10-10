import { COL_PX, ROW_UNIT } from "./constants";
import { clamp, roundRect } from "./geometry";
import { blockDefOrFree } from "./library";
import { parseNote } from "./note";
import type { BlockId, ContentEstimate, LayoutBlock, LayoutDoc } from "./types";

const COUNT_UNITS = {
  kpis: "items",
  cards: "items",
  features: "items",
  testimonials: "items",
  pricing: "plans",
  logos: "logos",
} as const;

/** Media ratios the canvas offers, in this order (ties keep the earlier one). */
export const MEDIA_RATIOS: readonly (readonly [string, number])[] = [
  ["1:1", 1],
  ["4:3", 4 / 3],
  ["3:2", 3 / 2],
  ["16:9", 16 / 9],
  ["21:9", 21 / 9],
  ["3:4", 3 / 4],
  ["9:16", 9 / 16],
];

/**
 * The ×N of a repeatable block as the chip reads it: `block.count`, else the note's number, clamped to the
 * library's range; `undefined` when neither is set or the block is not repeatable.
 */
export function blockCount(block: LayoutBlock): number | undefined {
  const def = blockDefOrFree(block.type);
  if (!def.repeatable) return undefined;
  const raw = block.count ?? parseNote(block.note).count;
  if (raw === undefined || !Number.isFinite(raw)) return undefined;
  return clamp(Math.round(raw), def.repeatable.min, def.repeatable.max);
}

function findId(block: LayoutBlock, layout: LayoutDoc): BlockId | undefined {
  for (const [id, candidate] of Object.entries(layout.blocks)) if (candidate === block) return id;
  return undefined;
}

/**
 * What the block's chip says it will generate («Tabla · 8 filas», «Calendario · semana»), from its size,
 * `count` and note; `null` when there is nothing useful to say. Pass `layout` (and `id` when the block
 * object is a copy) so a hero can see its children.
 */
export function estimateContent(block: LayoutBlock, layout?: LayoutDoc, id?: BlockId): ContentEstimate | null {
  const def = blockDefOrFree(block.type);
  const { w, h } = roundRect(block.rect);
  const hpx = h * ROW_UNIT;
  const note = parseNote(block.note);
  const has = (keyword: (typeof note.keywords)[number]) => note.keywords.includes(keyword);
  const repeatCount = (): number | null => {
    if (!def.repeatable) return null;
    const raw = block.count ?? note.count ?? def.repeatable.default;
    return clamp(Math.round(raw), def.repeatable.min, def.repeatable.max);
  };

  switch (def.type) {
    case "table":
      return { kind: "count", unit: "rows", value: clamp(Math.floor((hpx - 120) / 48), 3, 10) };
    case "kpis":
    case "cards":
    case "features":
    case "testimonials":
    case "pricing":
    case "logos": {
      const value = repeatCount();
      return value === null ? null : { kind: "count", unit: COUNT_UNITS[def.type], value };
    }
    case "activity":
    case "list":
      return { kind: "count", unit: "items", value: clamp(Math.floor((hpx - 64) / 56), 3, 8) };
    case "form":
      return { kind: "count", unit: "fields", value: clamp(Math.floor((hpx - 112) / 72), 2, 6) };
    case "settings":
      return { kind: "count", unit: "fields", value: clamp(Math.floor((hpx - 120) / 72), 2, 8) };
    case "footer":
      return { kind: "count", unit: "columns", value: w >= 8 ? 3 : 1 };
    case "navbar": {
      const links = w >= 9 ? 4 : w >= 6 ? 3 : null;
      return links === null ? null : { kind: "count", unit: "links", value: links };
    }
    case "calendar": {
      let value: string;
      if (has("weekly")) value = "week";
      else if (has("monthly")) value = "month";
      else if (has("agenda") || has("daily")) value = "agenda";
      else if (w <= 3) value = "mini";
      else if (w >= 6 && hpx >= 400) value = "month";
      else if (w >= 6) value = "week";
      else value = "agenda";
      return { kind: "variant", value };
    }
    case "chart":
      return { kind: "variant", value: (w * COL_PX) / hpx >= 1.6 ? "area" : "bar" };
    case "hero": {
      const heroId = layout ? (id ?? findId(block, layout)) : undefined;
      const splitChild =
        layout !== undefined &&
        heroId !== undefined &&
        Object.values(layout.blocks).some(
          (child) => child?.parentId === heroId && (child.type === "media" || child.type === "form"),
        );
      return { kind: "variant", value: splitChild || has("split") || w <= 8 ? "split" : "centered" };
    }
    case "media": {
      const ratio = (w * COL_PX) / hpx;
      let best = MEDIA_RATIOS[0]!;
      for (const candidate of MEDIA_RATIOS) {
        if (Math.abs(candidate[1] - ratio) < Math.abs(best[1] - ratio)) best = candidate;
      }
      return { kind: "ratio", value: best[0] };
    }
    default: {
      if (def.status === "soon" && def.repeatable) {
        const value = repeatCount();
        return value === null ? null : { kind: "count", unit: "items", value };
      }
      return null;
    }
  }
}
