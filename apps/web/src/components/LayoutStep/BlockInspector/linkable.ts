import { absorbChildren, isLinkableBlockType, type BlockId, type LayoutDoc } from "@dialmade/layout";

/**
 * How «Enlaza a» shows for a block (review B #11):
 * - `link`: its section (or, for a block absorbed by another, the section that absorbs it) draws a primary
 *   action that follows `linkTo` in the preview and the export;
 * - `orphan`: nothing would follow the link, but the block keeps one (its type changed, or it was set before):
 *   the field stays so the user sees it and can clear it; the link is never dropped behind their back;
 * - `none`: no field.
 */
export type LinkFieldMode = "link" | "orphan" | "none";

/** `absorbed` is `absorbChildren(layout).absorbed`, when the caller already has it. */
export function linkFieldMode(layout: LayoutDoc, id: BlockId, absorbed: Readonly<Record<BlockId, BlockId>> = absorbChildren(layout).absorbed): LinkFieldMode {
  const block = Object.hasOwn(layout.blocks, id) ? layout.blocks[id] : undefined;
  if (!block) return "none";
  // An absorbed block has no element: its link goes to the block that absorbs it (decision 81).
  const host = Object.hasOwn(absorbed, id) ? layout.blocks[absorbed[id]!] : undefined;
  if (isLinkableBlockType((host ?? block).type)) return "link";
  return block.linkTo !== undefined ? "orphan" : "none";
}
