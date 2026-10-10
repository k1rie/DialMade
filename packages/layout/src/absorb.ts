import { compareStrings } from "./ids";
import { prepare } from "./prepare";
import type { BlockId, LayoutBlock, LayoutDoc, LayoutWarning } from "./types";

export type AbsorbResult = {
  /**
   * The layout to infer and compile. The same object as the input when nothing changed (so a cached
   * structure stays valid); otherwise a copy where absorbed blocks are gone and the not-accepted ones moved.
   */
  layout: LayoutDoc;
  /** Absorbed block → the block that absorbed it (a hero absorbs its media). */
  absorbed: Record<BlockId, BlockId>;
  /** Children their parent cannot hold, moved to the parent's own scope (its parent, or the root). */
  unparented: BlockId[];
  /** One `not-accepted` warning per moved block, with the original parent and an `unparent` fix. */
  warnings: LayoutWarning[];
};

/**
 * Before compiling a layout to a page: a block that is not a container renders one section with a single
 * root element, so it cannot lay out children. Its accepted children (`accepts`: a media, text or form inside
 * a hero) are absorbed, so the parent's section adapts (the hero goes split) and they get no element. The
 * children it does not accept move to the parent's scope, with a `not-accepted` warning. Containers (and
 * modals) keep their children. Children of an absorbed block are judged against the block that absorbed it.
 * Missing parents and cycles are left alone (`inferStructure` reports them). Pure and deterministic; never
 * changes the input.
 */
export function absorbChildren(layout: LayoutDoc): AbsorbResult {
  const prepared = prepare(layout);
  const absorbed: Record<BlockId, BlockId> = {};
  const moved = new Map<BlockId, BlockId | null>();
  const warnings: LayoutWarning[] = [];
  const order = [...prepared.items.values()].sort((a, b) => a.depth - b.depth || compareStrings(a.id, b.id));

  for (const item of order) {
    if (item.parent === null) continue;
    const hostId = absorbed[item.parent] ?? item.parent;
    const host = prepared.items.get(hostId)!;
    if (host.def.container || host.def.accepts === "any") continue;
    if (host.def.accepts.includes(item.def.type)) {
      absorbed[item.id] = hostId;
      continue;
    }
    moved.set(item.id, moved.has(hostId) ? moved.get(hostId)! : host.parent);
    warnings.push({ code: "not-accepted", ids: [item.id, item.parent], fixes: [{ kind: "unparent", id: item.id }] });
  }

  const absorbedIds = Object.keys(absorbed);
  if (absorbedIds.length === 0 && moved.size === 0) return { layout, absorbed, unparented: [], warnings };

  const blocks: Record<BlockId, LayoutBlock> = {};
  for (const [id, block] of Object.entries(layout.blocks)) {
    if (Object.prototype.hasOwnProperty.call(absorbed, id)) continue;
    if (!moved.has(id)) {
      blocks[id] = block;
      continue;
    }
    const parentId = moved.get(id);
    const copy: LayoutBlock = { ...block };
    if (parentId) copy.parentId = parentId;
    else delete copy.parentId;
    blocks[id] = copy;
  }
  const unparented = [...moved.keys()].sort(compareStrings);
  return { layout: { ...layout, blocks }, absorbed, unparented, warnings };
}
