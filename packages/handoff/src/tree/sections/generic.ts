// Fallback of every section without its own builder (or whose builder failed): its copy as an outline inside a
// plain section box, so nothing the page shows is lost in Figma or in code.
import type { SectionBuilder } from "../context";
import { card, column, grid, text } from "../nodes";
import type { DesignNode } from "../types";

/** Keys that are not copy (links, ids, icons, flags, layout data). */
const NON_COPY = /^(id|key|href|url|src|icon|image|logo|avatar|variant|tone|color|kind|type|highlighted|featured|active|linkTo|route|screen|role|padding|layout|screenKind|align|emphasis|background|spacing|density|count|pageSize|level|visual)$/i;

const copyOf = (value: unknown): string[] => {
  if (typeof value === "string") return value.trim() ? [value.trim()] : [];
  if (typeof value === "number") return [String(value)];
  if (value && typeof value === "object" && !Array.isArray(value)) {
    return Object.entries(value)
      .filter(([key]) => !NON_COPY.test(key))
      .flatMap(([, field]) => copyOf(field));
  }
  return [];
};

export const genericSection: SectionBuilder = ({ props, children }) => {
  const texts: DesignNode[] = [];
  const lists: DesignNode[] = [];
  let first = true;
  for (const [key, value] of Object.entries(props)) {
    if (NON_COPY.test(key)) continue;
    if (typeof value === "string" && value.trim()) {
      const node = text(value, first ? "h3" : "body", { color: first ? "foreground" : "muted-foreground" });
      if (node) texts.push(node);
      first = false;
    } else if (Array.isArray(value) && value.some((item) => typeof item === "string" || (item && typeof item === "object"))) {
      const items = value.slice(0, 12).map((item, i) => {
        const lines = copyOf(item);
        return card(`${key} ${i + 1}`, lines.slice(0, 3).map((line, j) => text(line, j === 0 ? "body-strong" : "small", { color: j === 0 ? "card-foreground" : "muted-foreground" })));
      });
      lists.push(grid({ name: key, columns: Math.min(3, Math.max(1, items.length)), gap: 4 }, items));
    }
  }
  return column({ name: "Section", width: "fill", gap: 4, padding: 6 }, [...texts, ...lists, ...children]);
};
