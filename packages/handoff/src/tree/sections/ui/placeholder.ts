// ui.placeholder (`Placeholder`): the slot of a free block or a «Pronto» one — its name, its note (user data, shown
// as plain text) and, in the skeleton style, lines of skeleton. The editor-only vote link is left out.
import type { SectionBuilder } from "../../context";
import { badge, column, num, row, shape, str, text } from "../../nodes";
import { blockGeometry, headingAtBody, iconTile, innerWidth, uiBlock, uiFrameOf, uiStrings } from "./shared";

export const placeholderBuilder: SectionBuilder = ({ id, props, variant, ctx, build }) => {
  const frameKind = uiFrameOf(props.frame);
  const strings = uiStrings(ctx.locale);
  const soon = props.soon === true;
  const count = num(props.count, 0);
  const label = str(props.blockLabel).trim() || (soon ? strings.soonBlock : strings.freeBlock);
  const note = str(props.blockNote).trim() || strings.placeholderHint;
  const skeleton = variant === "skeleton";
  const geometry = blockGeometry(ctx, id);
  const width = innerWidth(geometry, frameKind, build);
  // App blocks have a drawn height: the box fills it (`flex: 1 1 auto`).
  const pad = frameKind === "card" ? 2 * build.light.space[4]! : 0;
  const minHeight = geometry?.kind === "app" && geometry.heightPx !== null ? Math.max(96, geometry.heightPx - pad) : 96;
  const lineWidth = Math.min(512, Math.max(120, (width ?? 512) - 2 * build.light.space[4]! - 2));
  const lines = Math.min(6, Math.max(3, count));

  const box = column(
    {
      name: "Box",
      width: "fill",
      minHeight,
      justify: "center",
      gap: 3,
      padding: 5,
      radius: "lg",
      stroke: skeleton ? { color: "border" } : { color: "border-strong", width: 1, dashed: true },
      fill: skeleton ? { color: "card" } : { color: "muted", opacity: 0.35 },
    },
    [
      row({ name: "Head", width: "fill", align: "center", gap: 2, wrap: true }, [
        iconTile(soon ? "sparkle" : "edit", 32, 16),
        text(label, "h3", { tag: "p", name: "Label", scale: headingAtBody(build) }),
        count > 1 ? text(`×${count}`, "body", { color: "muted-foreground", tag: "span" }) : null,
        soon ? badge(strings.soon, "neutral") : null,
      ]),
      text(note, "small", { color: "muted-foreground", tag: "p", maxWidth: 560 }),
      skeleton
        ? column(
            { name: "Skeleton", width: "fill", gap: { px: 8 } },
            Array.from({ length: lines }, (_, i) =>
              shape({
                name: "Line",
                width: i === lines - 1 ? Math.round(lineWidth * 0.62) : lineWidth,
                height: 10,
                radius: "full",
                fill: { color: "muted" },
              }),
            ),
          )
        : null,
    ],
  );
  return uiBlock("Placeholder", frameKind, [box]);
};
