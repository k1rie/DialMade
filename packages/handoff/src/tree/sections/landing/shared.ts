// Shared pieces of the landing builders: the `LandingSection` outer box (background, rhythm, centered container),
// `SectionHeading`, `BrandMark`, avatars, the decorative charts of the mockups and the interface strings the
// landing sections render (`landing/lib/strings.ts` of @dialmade/sections, which the package does not export).
import { monogramOf } from "@dialmade/sections";
import type { Locale } from "@dialmade/catalog";
import { column, frame, row, shape, text } from "../../nodes";
import type { ResolvedTokens } from "@dialmade/doc";
import type { ColorVar, DesignNode, FrameNode, Paint, SemanticTag, Space, Stroke, TextNode, TextStyleId } from "../../types";

type FontSizes = ResolvedTokens["fontSizes"];

/** `scale` that makes a text style's size `px` (the CSS's `calc(var(--dl-fs-body) * 1.125)` on a heading font). */
export const scaleTo = (fontSizes: FontSizes, size: keyof FontSizes, px: number): number => Math.round((px / fontSizes[size].px) * 1000) / 1000;

/** A wrapping row whose lines are `crossGap` apart (CSS `gap: <row> <column>`). */
export const withCrossGap = (node: FrameNode, crossGap: Space): FrameNode =>
  node.layout && node.layout.kind === "flex" ? { ...node, layout: { ...node.layout, crossGap } } : node;

export type Align = "start" | "center";
export type Emphasis = "subtle" | "default" | "bold";
export type Background = "plain" | "subtle" | "brand-gradient";
export type Spacing = "compact" | "normal" | "roomy";

/** The section-wide knobs every landing section has (`sectionStyleShape`). */
export interface SectionStyle {
  align: Align;
  emphasis: Emphasis;
  background: Background;
  spacing: Spacing;
}

export function styleOf(props: Record<string, unknown>, fallback: Partial<SectionStyle> = {}): SectionStyle {
  const pick = <T extends string>(value: unknown, options: readonly T[], def: T): T =>
    options.includes(value as T) ? (value as T) : def;
  return {
    align: pick(props.align, ["start", "center"] as const, fallback.align ?? "center"),
    emphasis: pick(props.emphasis, ["subtle", "default", "bold"] as const, fallback.emphasis ?? "default"),
    background: pick(props.background, ["plain", "subtle", "brand-gradient"] as const, fallback.background ?? "plain"),
    spacing: pick(props.spacing, ["compact", "normal", "roomy"] as const, fallback.spacing ?? "normal"),
  };
}

/** `--_lp-k` of `LandingSection.css`. */
export const SPACING_K: Record<Spacing, number> = { compact: 0.6, normal: 1, roomy: 1.4 };

/** `data-bg` of `LandingSection.css` as one paint (the radial gradients become a vertical brand wash). */
export function backgroundPaint(background: Background): Paint {
  if (background === "subtle") return { color: "muted", opacity: 0.62 };
  if (background === "brand-gradient") {
    return {
      gradient: {
        angle: 180,
        stops: [
          { color: "brand", opacity: 0.16, at: 0 },
          { color: "brand", opacity: 0.06, at: 0.45 },
          { color: "background", at: 0.85 },
        ],
      },
    };
  }
  return { color: "background" };
}

export interface LandingSectionOptions {
  /** Root name (it stays the frame's name: the walker keeps names other than `Section`). */
  name: string;
  style: SectionStyle;
  tag?: SemanticTag;
  /** `none` drops the vertical padding (navbar). */
  padding?: "section" | "none";
  /** Share of the section padding at the top / bottom (the centered hero with a visual trims the bottom). */
  top?: Space;
  bottom?: Space;
  /** The inner container's own gap and alignment (`.dl-landing__inner` is a flex column in some sections). */
  gap?: Space;
  align?: "start" | "center" | "stretch";
  stroke?: Stroke;
  clip?: boolean;
}

/**
 * `LandingSection`: a full-bleed box with the section background and rhythm (`--dl-section-py` × the spacing
 * knob) and the centered container (`--dl-container`, gutters of step 7) inside.
 */
export function landingSection(options: LandingSectionOptions, children: (DesignNode | null | undefined | false)[]): FrameNode {
  const k = options.padding === "none" ? 0 : SPACING_K[options.style.spacing];
  const py: Space = k === 0 ? 0 : { sectionPy: k };
  return column(
    {
      name: options.name,
      tag: options.tag ?? "section",
      width: "fill",
      align: "center",
      padding: { x: 7, top: options.top ?? py, bottom: options.bottom ?? py },
      fill: backgroundPaint(options.style.background),
      ...(options.stroke && { stroke: options.stroke }),
      ...(options.clip && { clip: true }),
    },
    [
      // A row centers the container (a `fill` box with a max width in a column would sit at the start).
      row({ name: "Center", width: "fill", justify: "center" }, [
        column(
          {
            name: "Container",
            width: "fill",
            maxWidth: "container",
            ...(options.gap !== undefined && { gap: options.gap }),
            ...(options.align && { align: options.align }),
          },
          children,
        ),
      ]),
    ],
  );
}

/**
 * The measure of a `text-wrap: balance` headline: at most `maxCh` characters, narrowed so its lines come out about
 * even (an estimate from the character count and the font size).
 */
export function balancedWidth(value: string, fontPx: number, maxCh: number, chEm = 0.65): number {
  const width = value.length * 0.45 * fontPx;
  const max = maxCh * chEm * fontPx;
  if (width <= max) return Math.round(max);
  const lines = Math.ceil(width / max);
  return Math.round(Math.min(max, width / lines + 0.3 * fontPx));
}

/** A box or text of at most `maxWidth` px, centered (or at the start) of the row it fills. */
export function centered(child: FrameNode | TextNode | null, align: Align, maxWidth: number, name = "Measure"): FrameNode | null {
  if (!child) return null;
  return row({ name, width: "fill", justify: align === "center" ? "center" : "start" }, [{ ...child, width: "fill", maxWidth }]);
}

const HEADING_STYLE: Record<Emphasis, TextStyleId> = { subtle: "h3", default: "h2", bold: "h1" };

/** `SectionHeading`: eyebrow, title and subtitle; empty texts disappear. */
export function sectionHeading(
  props: Record<string, unknown>,
  align: Align,
  options: { emphasis?: Emphasis; level?: "h1" | "h2" } = {},
): FrameNode | null {
  const emphasis = options.emphasis ?? "default";
  const textAlign = align === "center" ? "center" : "start";
  const heading = column({ name: "SectionHeading", gap: 3, align: align === "center" ? "center" : "start" }, [
    text(props.eyebrow, "small-strong", { name: "Eyebrow", color: "primary-text", align: textAlign, tag: "p" }),
    text(props.title, HEADING_STYLE[emphasis], { name: "Title", align: textAlign, tag: options.level ?? "h2" }),
    centered(text(props.subtitle, "lead", { name: "Subtitle", color: "muted-foreground", align: textAlign, tag: "p" }), align, 608, "Subtitle"),
  ]);
  return centered(heading, align, emphasis === "bold" ? 832 : 736, "SectionHeading");
}

// `border-radius: min(--dl-radius-md, size × 0.3)`: the small mark takes the smaller radius.
const MARK: Record<"sm" | "md" | "lg", { size: number; mono: TextStyleId; name: TextStyleId; radius: "sm" | "md" }> = {
  sm: { size: 22, mono: "caption-strong", name: "small-strong", radius: "sm" },
  md: { size: 28, mono: "caption-strong", name: "body-strong", radius: "md" },
  lg: { size: 36, mono: "small-strong", name: "h3", radius: "md" },
};

/**
 * `BrandMark` without a logo: the monogram in a rounded `primary` square, then the brand name (heading font at
 * 0.62 × the mark, when the font sizes are given).
 */
export function brandMark(name: string, size: "sm" | "md" | "lg" = "md", showName = true, fontSizes?: FontSizes): FrameNode {
  const spec = MARK[size];
  return row({ name: "BrandMark", align: "center", gap: 2, width: "hug" }, [
    row(
      {
        name: "Mark",
        width: spec.size,
        height: spec.size,
        align: "center",
        justify: "center",
        radius: spec.radius,
        fill: { gradient: { angle: 140, stops: [{ color: "primary", at: 0 }, { color: "primary", at: 0.55 }, { color: "cta", opacity: 0.85, at: 1 }] } },
        label: showName ? undefined : name,
      },
      [text(monogramOf(name), spec.mono, { color: "primary-foreground", tag: "span" })],
    ),
    showName
      ? text(name, fontSizes ? "h3" : spec.name, {
          name: "Name",
          color: "foreground",
          tag: "span",
          ...(fontSizes && { scale: scaleTo(fontSizes, "h3", spec.size * 0.62) }),
        })
      : null,
  ]);
}

/** `colorIndexOf` of the kit's Avatar (not exported by @dialmade/ui). */
function colorIndexOf(name: string): number {
  let hash = 0;
  for (const char of name) hash = (hash * 31 + char.charCodeAt(0)) >>> 0;
  return (hash % 5) + 1;
}

function initialsOf(name: string): string {
  const words = name.trim().split(/\s+/).filter(Boolean);
  const first = words[0]?.[0] ?? "";
  const last = words.length > 1 ? (words[words.length - 1]?.[0] ?? "") : (words[0]?.[1] ?? "");
  return (first + last).toUpperCase();
}

const AVATAR_PX = { xs: 24, sm: 32, md: 40, lg: 48 } as const;

/** `Avatar` with initials: a circle tinted with the person's chart color. */
export function avatar(name: string, size: keyof typeof AVATAR_PX = "md"): FrameNode {
  const px = AVATAR_PX[size];
  return row(
    {
      name: "Avatar",
      width: px,
      height: px,
      align: "center",
      justify: "center",
      radius: "full",
      fill: { color: `chart-${colorIndexOf(name)}`, opacity: 0.24 },
    },
    [text(initialsOf(name), size === "xs" || size === "sm" ? "caption-strong" : size === "md" ? "small-strong" : "body-strong", { color: "foreground", tag: "span" })],
  );
}

/** Text and icons of a built box in other colors (buttons and badges over a `primary` panel). */
export function recolor(node: FrameNode, colors: { fill?: Paint | null; text?: ColorVar; stroke?: Stroke | null }): FrameNode {
  const { fill, stroke, ...rest } = node;
  return {
    ...rest,
    ...(colors.fill === undefined ? fill && { fill } : colors.fill && { fill: colors.fill }),
    ...(colors.stroke === undefined ? stroke && { stroke } : colors.stroke && { stroke: colors.stroke }),
    children: node.children.map((child) => {
      if (child.type === "text" && colors.text) return { ...child, color: colors.text };
      if (child.type === "icon" && colors.text) return { ...child, color: colors.text };
      return child;
    }),
  };
}

/** A box that opens a screen (a nav or footer link): its text inside an `<a>`. */
export function linkBox(label: string, style: TextStyleId, color: ColorVar, linkTo: string | undefined, options: { padding?: FrameNode["padding"]; minHeight?: number; weight?: number } = {}): FrameNode | null {
  const content = text(label, style, { color, tag: "span", ...(options.weight && { weight: options.weight }) });
  if (!content) return null;
  return row(
    {
      name: "Link",
      tag: "a",
      width: "hug",
      align: "center",
      ...(options.padding !== undefined && { padding: options.padding }),
      ...(options.minHeight !== undefined && { minHeight: options.minHeight }),
      ...(linkTo && { linkTo }),
    },
    [content],
  );
}

/** Values resampled to `n` points by linear interpolation (the smooth area of a chart drawn as bars). */
export function resample(values: readonly number[], n: number): number[] {
  if (values.length === 0) return [];
  if (values.length === 1) return Array.from({ length: n }, () => values[0]!);
  return Array.from({ length: n }, (_, i) => {
    const t = (i / (n - 1)) * (values.length - 1);
    const lo = Math.floor(t);
    const hi = Math.min(values.length - 1, lo + 1);
    return values[lo]! + (values[hi]! - values[lo]!) * (t - lo);
  });
}

/** One series as a run of bars (an area chart or a sparkline drawn with shapes). */
export function areaBars(name: string, values: readonly number[], options: { height: number; max: number; min?: number; color: ColorVar; bars?: number; opacity?: number; gap?: number }): FrameNode {
  const min = options.min ?? 0;
  const span = Math.max(1e-9, options.max - min);
  const points = resample(values, options.bars ?? 36);
  return row(
    { name, width: "fill", height: options.height, align: "end", gap: options.gap === undefined ? 0 : { px: options.gap } },
    points.map((value, i) =>
      shape({
        name: `Bar ${i + 1}`,
        role: "bar",
        width: "fill",
        height: Math.max(2, Math.round(((value - min) / span) * options.height)),
        fill: {
          gradient: {
            angle: 180,
            stops: [
              { color: options.color, opacity: options.opacity ?? 0.42, at: 0 },
              { color: options.color, opacity: (options.opacity ?? 0.42) * 0.25, at: 1 },
            ],
          },
        },
      }),
    ),
  );
}

/** An area chart of up to two series (the second drawn over the first), with the category labels below. */
export function areaChart(series: readonly { values: readonly number[] }[], categories: readonly string[], height: number, label: string): FrameNode {
  const all = series.flatMap((entry) => entry.values);
  const max = Math.max(1, ...all) * 1.12;
  const [first, second] = series;
  const plot = frame({
    name: "Plot",
    width: "fill",
    layout: { kind: "flex", direction: "column" },
    stroke: { color: "border", sides: ["bottom"] },
    children: [
      first ? areaBars("Series 1", first.values, { height, max, color: "chart-1" }) : null,
      second ? { ...areaBars("Series 2", second.values, { height, max, color: "chart-2", opacity: 0.36 }), absolute: { left: 0, top: 0, width: 1 } } : null,
    ].filter((node): node is FrameNode => !!node),
  });
  return column({ name: "Chart", gap: 2, label }, [
    plot,
    row(
      { name: "Categories", width: "fill", justify: "between" },
      categories.map((category) => text(category, "caption", { color: "muted-foreground" })),
    ),
  ]);
}

/** The interface strings of `landing/lib/strings.ts` the builders need. */
const STRINGS = {
  es: { perMonth: "/mes", billedYearly: "facturado anualmente", billedMonthly: "facturado mensualmente", from: "desde", free: "Gratis", monthly: "Mensual", yearly: "Anual", save: (p: number) => `−${p} %`, emailPlaceholder: "tu@correo.com", overview: "Resumen", search: "Buscar…", create: "Nuevo", recent: "Actividad reciente", rights: (year: number, name: string, text: string) => `© ${year} ${name}. ${text}` },
  en: { perMonth: "/mo", billedYearly: "billed yearly", billedMonthly: "billed monthly", from: "from", free: "Free", monthly: "Monthly", yearly: "Yearly", save: (p: number) => `−${p}%`, emailPlaceholder: "you@company.com", overview: "Overview", search: "Search…", create: "New", recent: "Recent activity", rights: (year: number, name: string, text: string) => `© ${year} ${name}. ${text}` },
} as const;

export const landingStrings = (locale: Locale) => STRINGS[locale] ?? STRINGS.en;

/** `count` of a counted list (at least `min`). */
export const visibleCount = (count: unknown, min = 1): number => Math.max(min, typeof count === "number" && Number.isFinite(count) ? Math.floor(count) : min);
