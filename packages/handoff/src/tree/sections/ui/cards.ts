// ui.cards (`Cards` + `CardsItem`): a grid of feature, compact or stat cards, one column per 240 px, capped by the
// block's width like the container queries do. Cards of a row share its height; the tag and link sit at the bottom.
import type { SectionBuilder } from "../../context";
import { card, column, grid, num, records, str, text } from "../../nodes";
import type { FrameNode } from "../../types";
import { blockGeometry, headingAtBody, iconTile, innerWidth, linkBox, metaPill, uiBlock, uiFrameOf, uiHead, uiLink } from "./shared";

/** Columns the grid shows: the stored ones (or `auto-fill` of 14 rem), capped by the block's width. */
export function cardColumns(columns: unknown, count: number, width: number | null): number {
  let cols = columns === "auto" || typeof columns !== "string" ? (width === null ? 3 : Math.max(1, Math.floor((width + 16) / 240))) : Number(columns) || 3;
  if (width !== null) {
    if (width < 704 && cols >= 4) cols = 3;
    if (width < 512 && cols > 1) cols = 2;
    if (width < 320) cols = 1;
  }
  return Math.max(1, Math.min(6, columns === "auto" ? Math.min(cols, Math.max(1, count)) : cols));
}

export const cardsBuilder: SectionBuilder = ({ id, props, variant, ctx, build }) => {
  const frameKind = uiFrameOf(props.frame);
  const geometry = blockGeometry(ctx, id);
  const width = innerWidth(geometry, frameKind, build);
  const items = records(props.items).slice(0, Math.max(1, num(props.count, 3)));
  const cols = cardColumns(props.columns, items.length, width);
  const action = str(props.action);
  const target = ctx.linkTarget?.(id) ?? null;
  const linked = target !== null;
  const hasLink = action !== "" || linked;
  const stat = variant === "stat";
  const compact = variant === "compact";
  const head = uiHead(build, { title: props.title, level: props.level });

  // App blocks have a drawn height: the rows of cards share it (`grid-auto-rows: 1fr; height: 100%`).
  let minHeight: number | undefined;
  if (geometry?.kind === "app" && geometry.heightPx !== null) {
    const rows = Math.ceil(items.length / cols);
    const pad = frameKind === "card" ? 2 * build.light.space[4]! : 0;
    const headPx = head ? 26 + build.light.space[3]! : 0;
    const per = Math.floor((geometry.heightPx - pad - headPx - build.light.space[3]! * (rows - 1)) / rows);
    if (per > (compact ? 72 : 160)) minHeight = per;
  }

  const cards = items.map((item, i): FrameNode => {
    const actionLink = hasLink && action !== "" && !compact;
    const titleLink = hasLink && linked && !actionLink;
    // Stat: a small 500 label; otherwise the heading family at the body size.
    const titleNode = text(item.title, stat ? "small" : "h3", {
      tag: "h3",
      color: stat ? "muted-foreground" : "card-foreground",
      name: "Title",
      ...(stat ? { weight: 500 } : { scale: headingAtBody(build) }),
      ...(compact && { width: "fill" as const }),
    });
    const title = titleLink && target ? linkBox(titleNode, target) : titleNode;
    const meta = str(item.meta);
    if (compact) {
      return card(`Card ${i + 1}`, [iconTile(str(item.icon) || "file", 32, 16), title, metaPill(meta)], {
        tag: "li",
        direction: "row",
        align: "center",
        ...(minHeight !== undefined && { minHeight }),
      });
    }
    const top = column({ name: "Top", width: "fill", gap: 3 }, [
      stat ? text(meta, "h2", { tag: "p", color: "card-foreground", name: "Figure" }) : iconTile(str(item.icon) || "file", 40, 18),
      column({ name: "Body", width: "fill", gap: 1 }, [title, text(item.description, "small", { color: "muted-foreground", tag: "p" })]),
    ]);
    const bottomChildren = [stat ? null : metaPill(meta), actionLink ? uiLink(action, target) : null].filter((node) => node !== null);
    return card(`Card ${i + 1}`, [top, bottomChildren.length > 0 ? column({ name: "Bottom", width: "fill", gap: 3, align: "start" }, bottomChildren) : null], {
      tag: "li",
      justify: "between",
      ...(minHeight !== undefined && { minHeight }),
    });
  });

  return uiBlock("Cards", frameKind, [head, grid({ name: "Grid", tag: "ul", columns: cols, gap: 4 }, cards)]);
};
