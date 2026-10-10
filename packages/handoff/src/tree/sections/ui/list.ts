// ui.list (`List`): rows of a person, what they did and when — simple, with avatars or divided — under a title
// and a «Ver todo» link.
import type { SectionBuilder } from "../../context";
import { column, dot, num, records, row, str, text } from "../../nodes";
import type { Space } from "../../types";
import { avatar, blockGeometry, innerWidth, toneColor, uiBlock, uiFrameOf, uiHead, uiLink } from "./shared";

const GAPS: Record<string, Space> = { simple: 2, avatars: 4, divided: 0 };

export const listBuilder: SectionBuilder = ({ id, props, variant, ctx, build }) => {
  const frameKind = uiFrameOf(props.frame);
  const width = innerWidth(blockGeometry(ctx, id), frameKind, build);
  // `@container dl-ui-list (width < 18rem)`: the time goes under the text.
  const narrow = width !== null && width < 288;
  const items = records(props.items).slice(0, Math.max(1, num(props.count, 5)));
  const avatars = variant === "avatars" || props.showAvatars === true;
  const divided = variant === "divided";

  const rows = items.map((item, i) => {
    const primary = str(item.primary);
    const meta = text(item.meta, "caption", { color: "muted-foreground", tag: "span", name: "Meta" });
    const copy = column({ name: "Text", width: "fill", gap: { px: 2 } }, [
      text(primary, "small-strong", { tag: "p" }),
      text(item.secondary, "small", { color: "muted-foreground", tag: "p" }),
      narrow ? meta : null,
    ]);
    return row(
      {
        name: `Item ${i + 1}`,
        tag: "li",
        width: "fill",
        align: "center",
        gap: 3,
        ...(divided && i > 0 && { padding: { y: 3 }, stroke: { color: "border", sides: ["top"] as const } }),
        ...(divided && i === 0 && { padding: { bottom: 3 } }),
      },
      [
        avatars ? avatar(primary, variant === "avatars" ? 40 : 32) : dot("Dot", 8, toneColor(item.tone, "muted-foreground")),
        copy,
        narrow ? null : meta,
      ],
    );
  });

  return uiBlock("List", frameKind, [
    uiHead(build, { title: props.title, level: props.level, link: uiLink(props.action, ctx.linkTarget?.(id) ?? undefined) }),
    column({ name: "Items", tag: "ul", width: "fill", gap: GAPS[variant] ?? 3 }, rows),
  ]);
};
