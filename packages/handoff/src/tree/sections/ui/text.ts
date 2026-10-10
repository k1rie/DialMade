// ui.text (`Text`): eyebrow, heading, paragraphs and an action, as a heading, prose or a tinted callout.
import type { SectionBuilder } from "../../context";
import { button, column, icon, row, str, text } from "../../nodes";
import type { TextStyleId } from "../../types";
import { blockGeometry, chWidth, fontPx, innerWidth, uiBlock, uiFrameOf } from "./shared";

/** Paragraphs of the body: a blank line starts a new one. */
const paragraphsOf = (body: string) =>
  body
    .split(/\n\s*\n/)
    .map((paragraph) => paragraph.trim())
    .filter(Boolean);

export const textBuilder: SectionBuilder = ({ id, props, variant, ctx, build }) => {
  const frameKind = uiFrameOf(props.frame);
  const callout = variant === "callout";
  const level = props.level === "h1" || props.level === "h3" ? props.level : "h2";
  const centered = props.align === "center";
  const width = innerWidth(blockGeometry(ctx, id), frameKind, build);
  // `@container dl-ui-text (width < 28rem)`: one step smaller headings, the callout stacks.
  const narrow = width !== null && width < 448;

  let style: TextStyleId = level;
  if (variant === "prose") style = level === "h1" ? "h2" : "h3";
  if (callout) style = "h3";
  if (narrow && !(variant === "prose" && level === "h1")) style = "h3";

  const align = centered ? ("center" as const) : ("start" as const);
  const paragraphs = props.showBody === false ? [] : paragraphsOf(str(props.body));
  const action = props.showAction === false ? "" : str(props.action);
  const titleSize = style === "h1" || style === "h2" || style === "h3" ? style : "h2";

  const copy = column({ name: "Copy", width: "fill", gap: 3, align: centered ? "center" : "start" }, [
    // Eyebrow: small size, 600, uppercase.
    callout
      ? null
      : text(props.eyebrow, "overline", { color: "primary-text", tag: "p", align, name: "Eyebrow", scale: Math.round((fontPx(build, "small") / fontPx(build, "caption")) * 1000) / 1000 }),
    text(props.title, style, { tag: level, align, maxWidth: chWidth(40, fontPx(build, titleSize)), name: "Title" }),
    ...paragraphs.map((paragraph) =>
      text(paragraph, "body", {
        tag: "p",
        align,
        color: variant === "prose" ? "foreground" : "muted-foreground",
        maxWidth: chWidth(65, fontPx(build, "body")),
      }),
    ),
    // `margin-top: var(--dl-space-2)` on top of the gap (a spacer would add the gap twice).
    action
      ? column({ name: "Action", width: "hug", padding: { top: 2 } }, [
          button(action, { variant: callout ? "primary" : "outline", linkTo: ctx.linkTarget?.(id) ?? undefined }),
        ])
      : null,
  ]);

  const box = callout
    ? (narrow ? column : row)(
        {
          name: "Callout",
          width: "fill",
          gap: 4,
          align: "start",
          padding: narrow ? 4 : 5,
          radius: "lg",
          fill: { color: "primary", opacity: 0.08 },
          stroke: { color: "primary", opacity: 0.3 },
        },
        [
          row({ name: "Icon", width: 36, height: 36, align: "center", justify: "center", radius: "full", fill: { color: "primary", opacity: 0.16 } }, [
            icon("info", "primary-text", 18),
          ]),
          copy,
        ],
      )
    : copy;

  return uiBlock("Text", frameKind, [box], { justify: "center" });
};
