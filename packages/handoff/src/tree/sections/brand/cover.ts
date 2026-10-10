// 00 · Cover of the style guide (`brand/Cover`): eyebrow rule, the name and tagline, the logo large (split) or
// the whole cover on the brand color (centered), then the board's contents and the key facts.
import type { SectionBuilder } from "../../context";
import { bool, column, dot, grid, row, str, text } from "../../nodes";
import type { ColorVar } from "../../types";
import { COVER_COPY } from "./copy";
import { boardIndex, boardWidth, BOARD_GUTTER, brandMark, formatHex, spacePx, textOr, tokensOf } from "./shared";

export const coverBuilder: SectionBuilder = ({ props, variant, ctx, build }) => {
  const copy = COVER_COPY[ctx.locale];
  const centered = variant === "centered";
  const brandName = str(props.brandName);
  const logoUrl = ctx.brand.logoUrl;
  const index = bool(props.showIndex) ? boardIndex(ctx) : [];
  const { pairing, recipe, motionTier } = build.inputs;
  const facts = bool(props.showFacts)
    ? [
        { label: copy.type, value: pairing.heading.family === pairing.body.family ? pairing.heading.family : `${pairing.heading.family} + ${pairing.body.family}` },
        { label: copy.style, value: recipe.label[ctx.locale] },
        { label: copy.primary, value: formatHex(tokensOf(build, ctx.mode).colors.primary), swatch: true },
        { label: copy.motion, value: motionTier.label[ctx.locale] },
      ]
    : [];

  // On the centered cover everything sits on the brand color.
  const ink: ColorVar = centered ? "primary-foreground" : "foreground";
  const muted: ColorVar = centered ? "primary-foreground" : "muted-foreground";
  const accent: ColorVar = centered ? "primary-foreground" : "primary-text";
  const rule = centered ? { color: "primary-foreground", opacity: 0.35 } : { color: "border-strong" };

  const width = boardWidth(build);
  const gap7 = spacePx(build, 7);

  const top = row(
    { name: "Top", width: "fill", justify: "between", gap: 5, wrap: true, padding: { bottom: 3 }, stroke: { ...rule, width: 1, sides: ["bottom"] } },
    [text(textOr(props.eyebrow, copy.eyebrow), "overline", { color: muted, tag: "span" }), text(ctx.productType.label[ctx.locale], "overline", { color: muted, tag: "span" })],
  );

  const nameAndTagline = column(
    { name: "Text", width: "fill", gap: 4, ...(centered && { align: "center", padding: { y: 8 } }) },
    [
      centered
        ? column({ name: "Emblem", width: "hug", padding: { bottom: 3 } }, [
            brandMark(build, { name: brandName, logoUrl, surface: logoUrl ? "light" : "brand", layout: "symbol", em: 52 }),
          ])
        : null,
      // `clamp(h1, 10cqi, display × 1.6)`: the top of the clamp at desktop.
      text(brandName, "display", { color: ink, tag: "h1", scale: 1.6, ...(centered && { align: "center" }) }),
      // Body font at the h3 size, regular weight.
      text(props.tagline, "body", {
        color: muted,
        tag: "p",
        scale: Math.round((build.light.fontSizes.h3.px / build.light.fontSizes.body.px) * 100) / 100,
        ...(centered && { align: "center", opacity: 0.92 }),
      }),
    ],
  );

  const art = centered
    ? null
    : column(
        {
          name: "Art",
          width: Math.round(((width - gap7) * 5) / 12),
          aspect: 1,
          align: "center",
          justify: "center",
          radius: "xl",
          clip: true,
          fill: logoUrl
            ? { color: "color-neutral-50" }
            : {
                gradient: {
                  angle: 225,
                  stops: [
                    { color: "color-brand-300", at: 0 },
                    { color: "primary", at: 0.42 },
                    { color: "primary", at: 0.7 },
                    { color: "color-brand-800", at: 1 },
                  ],
                },
              },
        },
        [brandMark(build, { name: brandName, logoUrl, surface: logoUrl ? "light" : "brand", layout: "symbol", em: 84 })],
      );

  const main = centered
    ? nameAndTagline
    : row({ name: "Main", width: "fill", align: "end", gap: 7 }, [nameAndTagline, art]);

  const indexNode =
    index.length > 0
      ? grid(
          { name: "Index", tag: "ol", columns: 3, gap: 5, rowGap: 2 },
          index.map((entry) =>
            row({ name: entry.label, tag: "li", gap: 2, align: "baseline" }, [
              text(entry.number, "mono-caption", { color: accent, tag: "span", weight: 600 }),
              text(entry.label, "small", { color: ink, tag: "span" }),
            ]),
          ),
        )
      : null;
  const factsNode =
    facts.length > 0
      ? grid(
          { name: "Facts", columns: 2, gap: 5, rowGap: 4 },
          facts.map((fact) =>
            column({ name: fact.label, gap: 1 }, [
              text(fact.label, "overline", { color: muted, tag: "span" }),
              row({ name: "Value", gap: 2, align: "center" }, [
                fact.swatch ? { ...dot("Swatch", 14, "primary"), stroke: { color: centered ? "primary-foreground" : "foreground", opacity: centered ? 1 : 0.18, width: centered ? 1.5 : 1 } } : null,
                text(fact.value, "small", { color: ink, tag: "span", weight: 500 }),
              ]),
            ]),
          ),
        )
      : null;
  const meta =
    indexNode || factsNode
      ? row(
          { name: "Meta", width: "fill", gap: 7, padding: { top: 4 }, stroke: { ...rule, width: 1, sides: ["top"] } },
          [indexNode ? { ...indexNode, width: "fill" as const } : null, factsNode ? { ...factsNode, width: "fill" as const } : null],
        )
      : null;

  const frameNode = column(
    {
      name: "Frame",
      width: "fill",
      gap: 8,
      ...(centered && { padding: { px: 72 }, radius: "xl" as const, fill: { color: "primary" }, clip: true }),
    },
    [top, main, meta],
  );

  return column(
    {
      name: "Cover",
      tag: "section",
      width: "fill",
      align: "center",
      padding: { top: { sectionPy: 0.5 }, bottom: { sectionPy: 0.25 } },
      fill: { color: "background" },
    },
    [column({ name: "Inner", width: "fill", maxWidth: "container", padding: { x: { px: BOARD_GUTTER } } }, [frameNode])],
  );
};
