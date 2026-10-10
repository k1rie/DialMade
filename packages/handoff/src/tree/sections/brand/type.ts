// 03 · Typography (`brand/Type`): the pairing as two specimen cards, every step of the scale with its sample in
// its own text style, the heading weights and the characters.
import type { ResolvedTokens } from "@dialmade/doc";
import { featureList, heroCopy, relativeTime, sectionHeading } from "@dialmade/sections";
import type { SectionBuilder } from "../../context";
import { bool, column, grid, row, text } from "../../nodes";
import type { FrameNode, TextStyleId } from "../../types";
import { GLYPHS, TYPE_COPY } from "./copy";
import { boardPanel, boardSection, boardWidth, formatNumber, formatPx, mono, spacePx, textOr, tokensOf } from "./shared";

type Copy = (typeof TYPE_COPY)["es" | "en"];
type StepId = "display" | "h1" | "h2" | "h3" | "body" | "small" | "caption";
const HEADING_STEPS = new Set<StepId>(["display", "h1", "h2", "h3"]);
const STEP_IDS: readonly StepId[] = ["display", "h1", "h2", "h3", "body", "small", "caption"];

function categoryOf(fallback: string, copy: Copy): string {
  if (/monospace/.test(fallback)) return copy.categories.mono;
  if (/(^|[\s,])serif/.test(fallback.replace(/sans-serif/g, ""))) return copy.categories.serif;
  if (/cursive|fantasy/.test(fallback)) return copy.categories.display;
  return copy.categories.sans;
}

function stepMeta(id: StepId, tokens: ResolvedTokens, locale: "es" | "en"): string {
  const size = tokens.fontSizes[id];
  const heading = HEADING_STEPS.has(id);
  const lineHeight = heading ? tokens.lineHeights.tight : tokens.lineHeights.body;
  const weight = heading ? tokens.heading.weight : tokens.bodyWeight;
  return `${formatPx(size.px, locale, size.minPx)} · ${formatNumber(lineHeight, locale)} · ${weight}`;
}

/** `FontCard`: a large «Aa» in the family, its role and weights. */
function fontCard(role: "heading" | "body", roleLabel: string, family: string, details: string | undefined, weight: number, glyphScale: number): FrameNode {
  const heading = role === "heading";
  return column(
    {
      name: `Font ${role}`,
      tag: "article",
      width: "fill",
      justify: "between",
      gap: 5,
      minHeight: 260,
      padding: 5,
      radius: "card",
      shadow: "card",
      stroke: { color: "border", card: true },
      fill: heading ? { gradient: { angle: 160, stops: [{ color: "accent", at: 0 }, { color: "card", at: 0.55 }] } } : { color: "card" },
    },
    [
      // `clamp(88px, 16cqi, 168px)`: 168 px at desktop.
      text("Aa", "display", { color: heading ? "primary-text" : "card-foreground", tag: "span", scale: glyphScale, weight }),
      column({ name: "Meta", gap: { px: 2 } }, [
        text(roleLabel, "overline", { color: "muted-foreground", tag: "p", weight: 400 }),
        text(family, "h3", { color: "card-foreground", tag: "h3" }),
        mono(details),
      ]),
    ],
  );
}

export const typeBuilder: SectionBuilder = ({ id, props, variant, ctx, build }) => {
  const copy = TYPE_COPY[ctx.locale];
  const specimen = variant !== "scale";
  const { pairing } = build.inputs;
  const tokens = tokensOf(build, ctx.mode);
  const fonts = tokens.fonts;
  const single = pairing.heading.family === pairing.body.family;
  const hero = heroCopy(ctx);
  const features = featureList(ctx, 2);
  const samples: Record<StepId, string> = {
    display: textOr(props.sample, ctx.brand.name),
    h1: hero.title,
    h2: sectionHeading(ctx, "features").title,
    h3: features[0]?.title ?? hero.title,
    body: hero.subtitle,
    small: features[1]?.description ?? hero.subtitle,
    caption: `${hero.eyebrow} · ${relativeTime(12, ctx.locale)}`,
  };
  const glyphScale = Math.round((168 / tokens.fontSizes.display.px) * 100) / 100;
  const details = (role: "heading" | "body") => [categoryOf(pairing[role].fallback, copy), fonts[role].weights.join(" · ")].join(" · ");

  const scale = boardPanel(
    "Scale",
    [
      column(
        { name: "Steps", tag: "ol", width: "fill" },
        STEP_IDS.map((step, index) =>
          row(
            {
              name: copy.steps[step],
              tag: "li",
              width: "fill",
              align: "baseline",
              gap: 5,
              padding: { top: index === 0 ? 0 : 4, bottom: 4 },
              ...(index > 0 && { stroke: { color: "border", width: 1, sides: ["top"] as const } }),
            },
            [
              column({ name: "Meta", width: 168, gap: { px: 2 } }, [
                text(copy.steps[step], "small-strong", { color: "card-foreground", tag: "span" }),
                mono(stepMeta(step, tokens, ctx.locale)),
              ]),
              text(samples[step], step as TextStyleId, {
                color: step === "caption" ? "muted-foreground" : "card-foreground",
                width: "fill",
                tag: "p",
                ...((step === "body" || step === "small") && { maxWidth: 680 }),
              }),
            ],
          ),
        ),
      ),
    ],
    { label: copy.scale },
  );

  const headingWeights = fonts.heading.weights;
  const extrasWidth = (boardWidth(build) - spacePx(build, 4)) / 2 - 2 * spacePx(build, 5);
  const weightColumns = Math.max(1, Math.floor((extrasWidth + spacePx(build, 3)) / (96 + spacePx(build, 3))));
  const extras = specimen
    ? [
        headingWeights.length > 0
          ? boardPanel(
              "Weights",
              [
                grid(
                  { name: "Weights", tag: "ul", columns: weightColumns, gap: 3, rowGap: 4 },
                  headingWeights.map((weight) =>
                    column({ name: String(weight), tag: "li", gap: 1 }, [
                      text("Aa", "display", { color: "card-foreground", tag: "span", name: `Aa ${weight}`, weight }),
                      mono(`${weight} ${copy.weightNames[weight] ?? ""}`.trim()),
                    ]),
                  ),
                ),
              ],
              { label: copy.weights, meta: pairing.heading.family },
            )
          : null,
        bool(props.showGlyphs)
          ? boardPanel(
              "Glyphs",
              [
                column({ name: "Glyphs", width: "fill", gap: 1 }, GLYPHS.map((line) => text(line, "h3", { color: "card-foreground", tag: "p", weight: tokens.bodyWeight }))),
                row(
                  { name: "Mono", width: "fill", justify: "between", align: "baseline", gap: 3, wrap: true, padding: { top: 3 }, stroke: { color: "border", width: 1, sides: ["top"] } },
                  [
                    text(fonts.mono.family ? `${copy.mono} · ${fonts.mono.family}` : copy.systemMono, "caption", { color: "muted-foreground", tag: "span" }),
                    mono(["--primary", tokens.colors.primary?.toUpperCase(), "16px", "0.2s"].filter(Boolean).join(" · "), "card-foreground", {}, "mono"),
                  ],
                ),
              ],
              { label: copy.glyphs, meta: pairing.body.family },
            )
          : null,
      ].filter((panel): panel is FrameNode => !!panel)
    : [];

  return boardSection({
    ctx,
    type: "brand.type",
    elementId: id,
    name: "Type",
    title: textOr(props.title, copy.title),
    intro: textOr(props.intro, copy.intro),
    aside: specimen ? [] : [mono(single ? pairing.heading.family : `${pairing.heading.family} + ${pairing.body.family}`, "foreground", { tag: "p" }, "mono")],
    children: [
      specimen
        ? grid({ name: "Fonts", columns: 2, gap: 4 }, [
            fontCard("heading", `${copy.headings} · ${tokens.heading.weight}`, pairing.heading.family, details("heading"), tokens.heading.weight, glyphScale),
            fontCard("body", `${copy.body} · ${tokens.bodyWeight}`, pairing.body.family, details("body"), tokens.bodyWeight, glyphScale),
          ])
        : null,
      scale,
      extras.length > 0 ? grid({ name: "Extras", columns: 2, gap: 4 }, extras) : null,
    ],
  });
};
