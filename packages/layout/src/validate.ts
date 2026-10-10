import {
  DESKTOP_COLUMNS,
  LABEL_MAX,
  LOOSE_COUNT_MAX,
  MAX_BLOCKS,
  MAX_HEIGHT_ROWS,
  MAX_ROW,
  NOTE_MAX,
  ROW_UNIT,
} from "./constants";
import { isIntegerRect } from "./geometry";
import { compareStrings, ELEMENT_ID_RE, REGION_PREFIX, RESERVED_BLOCK_IDS } from "./ids";
import { getBlockDef, isLibraryBlockType } from "./library";
import type { LayoutDoc } from "./types";

export type LayoutIssueCode =
  | "version"
  | "columns"
  | "row-unit"
  | "too-many-blocks"
  | "invalid-id"
  | "reserved-id"
  | "unknown-type"
  | "invalid-rect"
  | "missing-parent"
  | "self-parent"
  | "cycle"
  | "invalid-count"
  | "note-too-long"
  | "label-too-long"
  | "invalid-z";

/** A hard error of a `LayoutDoc` (for Phase B's `superRefine`: `path` is relative to the layout). */
export type LayoutIssue = { code: LayoutIssueCode; path: (string | number)[]; message: string };


/**
 * Hard errors only (soft problems such as overlaps are `inferStructure` warnings): version, grid, ids,
 * rects (inside the 12 columns, row ≤ `MAX_ROW`, h ≤ `MAX_HEIGHT_ROWS`), types, parents, cycles, `count`,
 * note and label length, `z` and the 200-block cap.
 * Blocks are checked in id order, so the result does not depend on key order.
 */
export function validateLayout(layout: LayoutDoc): LayoutIssue[] {
  const issues: LayoutIssue[] = [];
  const add = (code: LayoutIssueCode, path: (string | number)[], message: string) => issues.push({ code, path, message });
  if (!layout || typeof layout !== "object") {
    add("version", [], "Layout must be an object");
    return issues;
  }
  if (layout.version !== 1) add("version", ["version"], "Layout version must be 1");
  if (layout.columns !== DESKTOP_COLUMNS) add("columns", ["columns"], `Layout must have ${DESKTOP_COLUMNS} columns`);
  if (layout.rowUnit !== ROW_UNIT) add("row-unit", ["rowUnit"], `Row unit must be ${ROW_UNIT}`);
  const blocks = layout.blocks && typeof layout.blocks === "object" ? layout.blocks : null;
  if (!blocks) {
    add("version", ["blocks"], "Layout blocks must be a record");
    return issues;
  }
  const ids = Object.keys(blocks).sort(compareStrings);
  if (ids.length > MAX_BLOCKS) add("too-many-blocks", ["blocks"], `At most ${MAX_BLOCKS} blocks`);

  for (const id of ids) {
    const block = blocks[id];
    const at = (...rest: (string | number)[]) => ["blocks", id, ...rest];
    if (!ELEMENT_ID_RE.test(id)) add("invalid-id", at(), `Invalid block id ${JSON.stringify(id)}`);
    else if (id.startsWith(REGION_PREFIX)) add("reserved-id", at(), `Block ids cannot start with "${REGION_PREFIX}"`);
    else if (RESERVED_BLOCK_IDS.includes(id)) add("reserved-id", at(), `Block id ${JSON.stringify(id)} is reserved`);
    if (!block || typeof block !== "object") {
      add("unknown-type", at(), "Block must be an object");
      continue;
    }
    const known = isLibraryBlockType(block.type);
    if (!known) add("unknown-type", at("type"), `Unknown block type ${JSON.stringify(block.type)}`);

    const rect = block.rect;
    if (!isIntegerRect(rect)) {
      add("invalid-rect", at("rect"), "Rect must be integers with w ≥ 1 and h ≥ 1");
    } else if (rect.col < 0 || rect.row < 0 || rect.col + rect.w > DESKTOP_COLUMNS) {
      add("invalid-rect", at("rect"), `Rect must fit the ${DESKTOP_COLUMNS}-column grid`);
    } else if (rect.row > MAX_ROW || rect.h > MAX_HEIGHT_ROWS) {
      add("invalid-rect", at("rect"), `Rect row must be at most ${MAX_ROW} and h at most ${MAX_HEIGHT_ROWS}`);
    }

    if (block.parentId !== undefined) {
      if (block.parentId === id) add("self-parent", at("parentId"), "A block cannot be its own parent");
      else if (typeof block.parentId !== "string" || !Object.prototype.hasOwnProperty.call(blocks, block.parentId)) {
        add("missing-parent", at("parentId"), `Parent ${JSON.stringify(block.parentId)} does not exist`);
      }
    }

    if (block.count !== undefined) {
      const repeatable = known ? getBlockDef(block.type).repeatable : null;
      const [min, max] = repeatable ? [repeatable.min, repeatable.max] : [1, LOOSE_COUNT_MAX];
      if (!Number.isInteger(block.count) || block.count < min || block.count > max) {
        add("invalid-count", at("count"), `Count must be an integer between ${min} and ${max}`);
      }
    }
    if (block.note !== undefined && (typeof block.note !== "string" || block.note.length > NOTE_MAX)) {
      add("note-too-long", at("note"), `Note must be a string of at most ${NOTE_MAX} characters`);
    }
    if (typeof block.label !== "string" || block.label.length > LABEL_MAX) {
      add("label-too-long", at("label"), `Label must be a string of at most ${LABEL_MAX} characters`);
    }
    if (!Number.isInteger(block.z)) add("invalid-z", at("z"), "z must be an integer");
  }

  // Cycles (self-parents are reported above).
  const reported = new Set<string>();
  for (const id of ids) {
    const seen: string[] = [];
    let current: string | undefined = id;
    while (current !== undefined && !seen.includes(current)) {
      seen.push(current);
      const parentId: unknown = blocks[current]?.parentId;
      current = typeof parentId === "string" && parentId !== current && Object.prototype.hasOwnProperty.call(blocks, parentId)
        ? parentId
        : undefined;
    }
    if (current === undefined) continue;
    const members = seen.slice(seen.indexOf(current)).sort(compareStrings);
    const key = members.join(",");
    if (reported.has(key)) continue;
    reported.add(key);
    add("cycle", ["blocks", members[0]!, "parentId"], `Parent cycle between ${members.join(", ")}`);
  }
  return issues;
}
