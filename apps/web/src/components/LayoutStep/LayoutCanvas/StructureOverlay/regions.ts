import type { GridRect, StructureNode } from "@dialmade/layout";

/** A region of the inferred structure, to outline in «Ver estructura». */
export type RegionOutline = { id: string; kind: "stack" | "row" | "grid"; rect: GridRect; depth: number };

/**
 * Every region (stack «Columna», row «Fila», grid «Rejilla») of a structure, parents before children,
 * with its nesting depth. Regions inside a block's content count one level deeper than the block's region.
 */
export function regionOutlines(root: StructureNode | null): RegionOutline[] {
  const out: RegionOutline[] = [];
  const visit = (node: StructureNode, depth: number) => {
    switch (node.kind) {
      case "block":
        if (node.content) visit(node.content, depth + 1);
        return;
      case "stack":
      case "row":
        out.push({ id: node.id, kind: node.kind, rect: node.rect, depth });
        for (const child of node.children) visit(child.node, depth + 1);
        return;
      case "grid":
        out.push({ id: node.id, kind: "grid", rect: node.rect, depth });
        for (const item of node.items) visit(item.node, depth + 1);
        return;
    }
  };
  if (root) visit(root, 0);
  return out;
}
