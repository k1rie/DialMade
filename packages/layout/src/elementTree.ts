import type { BlockId, RegionId, Structure, StructureNode } from "./types";

/** How an element lays out its children. */
export type ElementLayout = "stack" | "row" | "grid";

/**
 * One DOM element of the layout contract: a block or an inferred region, carrying `data-dl-id`.
 * A block with content is also the container of its content group (there is no extra region element).
 */
export type LayoutElement = {
  id: BlockId | RegionId;
  role: "block" | "region";
  /** The region kind, the block's content kind (`stack` for a single child) or `null` for leaves. */
  layout: ElementLayout | null;
  /** Overlays are direct children of the scope element, absolutely positioned. */
  overlay: boolean;
  children: LayoutElement[];
};

function childNodes(node: StructureNode): StructureNode[] {
  switch (node.kind) {
    case "block":
      if (!node.content) return [];
      return node.content.kind === "block" ? [node.content] : childNodes(node.content);
    case "stack":
    case "row":
      return node.children.map((c) => c.node);
    case "grid":
      return node.items.map((i) => i.node);
  }
}

function toElement(node: StructureNode, overlay: boolean): LayoutElement {
  const children = childNodes(node).map((child) => toElement(child, false));
  if (node.kind === "block") {
    const layout = node.content ? (node.content.kind === "block" ? "stack" : node.content.kind) : null;
    return { id: node.id, role: "block", layout, overlay, children };
  }
  return { id: node.id, role: "region", layout: node.kind, overlay: false, children };
}

/**
 * The elements `toCss` expects inside the scope element, in DOM order: the root node (if any) and then the
 * overlays. Phase B compiles these to `ui.region` elements and sections.
 */
export function toElementTree(structure: Structure): LayoutElement[] {
  const out: LayoutElement[] = [];
  if (structure.root) out.push(toElement(structure.root, false));
  for (const overlay of structure.overlays) out.push(toElement(overlay, true));
  return out;
}
