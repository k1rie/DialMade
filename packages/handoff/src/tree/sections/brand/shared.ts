// Shared pieces of the brand board builders: the numbered section shell (`BoardSection`), the panel tile
// (`BoardPanel`), the logo (`BrandMark`), a kit table (`dl-table`) and the board's number/contrast helpers that
// `@dialmade/sections/src/brand/lib` computes for the components.
import type { ResolvedTokens } from "@dialmade/doc";
import { localeTag, monogramOf, type RenderContext } from "@dialmade/sections";
import type { BuildContext } from "../../context";
import { column, frame, image, row, shape, text } from "../../nodes";
import type { ColorVar, DesignNode, FrameNode, ShapeNode, Space, TextNode, TextStyleId } from "../../types";
import { BOARD_SECTION_NAMES, COVER_TYPE } from "./copy";

type Locale = RenderContext["locale"];
type Mode = "light" | "dark";
type Children = (DesignNode | null | undefined | false)[];

/* ------------------------------------------------------------------------------------------------ */
/* Board numbering and formats (brand/lib/board.ts, brand/lib/format.ts)                             */
/* ------------------------------------------------------------------------------------------------ */

export interface BoardEntry {
  type: string;
  number: string;
  label: string;
  id?: string;
}

/** Visible numbered sections in page order: hidden sections and the cover do not count. */
export function boardIndex(ctx: Pick<RenderContext, "doc" | "locale">): BoardEntry[] {
  const page = ctx.doc?.pages.brand;
  const hidden = new Set(page?.hidden ?? []);
  const entries: { type: string; id?: string }[] = page
    ? (page.elements[page.root]?.children ?? []).filter((id) => !hidden.has(id)).map((id) => ({ type: page.elements[id]?.type ?? "", id }))
    : Object.keys(BOARD_SECTION_NAMES).map((type) => ({ type }));
  return entries
    .filter(({ type }) => type !== COVER_TYPE && type in BOARD_SECTION_NAMES)
    .map(({ type, id }, index) => ({
      type,
      number: String(index + 1).padStart(2, "0"),
      label: BOARD_SECTION_NAMES[type]![ctx.locale],
      ...(id && { id }),
    }));
}

export function boardNumberOf(ctx: Pick<RenderContext, "doc" | "locale">, elementId: string, type: string): string | undefined {
  const index = boardIndex(ctx);
  return (index.find((entry) => entry.id === elementId) ?? index.find((entry) => entry.type === type && !entry.id))?.number;
}

/** An optional text prop, or its localized default when empty. */
export const textOr = (value: unknown, fallback: string): string => (typeof value === "string" && value.trim() ? value : fallback);

export function formatNumber(value: number, locale: Locale, maxDigits = 2): string {
  return new Intl.NumberFormat(localeTag(locale), { maximumFractionDigits: maxDigits }).format(value);
}

/** `16` → `16 px`; a fluid size (`min < max`) → `34–56 px`. */
export function formatPx(px: number, locale: Locale, minPx?: number): string {
  if (minPx !== undefined && minPx < px) return `${formatNumber(minPx, locale, 1)}–${formatNumber(px, locale, 1)} px`;
  return `${formatNumber(px, locale, 1)} px`;
}

export const formatRatio = (ratio: number, locale: Locale): string => `${formatNumber(ratio, locale, 2)}:1`;
export const formatHex = (hex: string | undefined): string => (hex ? hex.toUpperCase() : "");

/** The tokens of a mode. */
export const tokensOf = (build: BuildContext, mode: Mode): ResolvedTokens => (mode === "dark" ? build.dark : build.light);

/** Width of the board's content at desktop: the container minus the 56 px gutters (`clamp(16px, 5cqi, 56px)`). */
export const boardWidth = (build: BuildContext): number => build.light.layout.container - 2 * BOARD_GUTTER;
export const BOARD_GUTTER = 56;

/** Pixels of a spacing step. */
export const spacePx = (build: BuildContext, step: number): number => build.light.space[step - 1] ?? 0;

/* ------------------------------------------------------------------------------------------------ */
/* Contrast (brand/lib/contrast.ts)                                                                 */
/* ------------------------------------------------------------------------------------------------ */

const toLinear = (channel: number) => {
  const c = channel / 255;
  return c <= 0.04045 ? c / 12.92 : ((c + 0.055) / 1.055) ** 2.4;
};
type Rgba = [number, number, number, number];
function rgba(hex: string): Rgba {
  const raw = hex.replace("#", "");
  const n = Number.parseInt(raw.slice(0, 6), 16);
  const alpha = raw.length === 8 ? Number.parseInt(raw.slice(6, 8), 16) / 255 : 1;
  return [(n >> 16) & 255, (n >> 8) & 255, n & 255, alpha];
}
const over = ([r, g, b, a]: Rgba, [br, bgc, bb]: Rgba): Rgba => [r * a + br * (1 - a), g * a + bgc * (1 - a), b * a + bb * (1 - a), 1];
const luminance = ([r, g, b]: Rgba) => 0.2126 * toLinear(r) + 0.7152 * toLinear(g) + 0.0722 * toLinear(b);

export function contrastRatio(fg: string, bg: string): number {
  const back = rgba(bg);
  const base = back[3] < 1 ? over(back, [255, 255, 255, 1]) : back;
  const front = rgba(fg);
  const la = luminance(front[3] < 1 ? over(front, base) : front);
  const lb = luminance(base);
  return (Math.max(la, lb) + 0.05) / (Math.min(la, lb) + 0.05);
}

/** `primaryForeground` → `primary-foreground`, `chart1` → `chart-1` (the CSS name of a role). */
export const roleCssName = (role: string): string => role.replace(/([a-z])([A-Z0-9])/g, "$1-$2").toLowerCase();

export interface ContrastRow {
  pair: string;
  fgRole: string;
  bgRole: string;
  ratio: number;
  required: number;
  pass: boolean;
}

/** The AA checks of one mode (`theme.contrast`), recomputed when the doc overrides that mode's colors. */
export function contrastRows(build: BuildContext, mode: Mode): ContrastRow[] {
  const colors = tokensOf(build, mode).colors;
  const overridden = Object.keys(build.doc.tokens.color[mode]).length > 0;
  return build.inputs.theme.contrast
    .filter((check) => check.mode === mode)
    .map((check) => {
      const [fgRole = "", bgRole = ""] = check.pair.split("/");
      if (!overridden) return { pair: check.pair, fgRole, bgRole, ratio: check.ratio, required: check.required, pass: check.pass };
      const fg = colors[roleCssName(fgRole)] ?? check.fg;
      const bg = colors[roleCssName(bgRole)] ?? check.bg;
      const ratio = Math.round(contrastRatio(fg, bg) * 100) / 100;
      return { pair: check.pair, fgRole, bgRole, ratio, required: check.required, pass: ratio >= check.required };
    });
}

/* ------------------------------------------------------------------------------------------------ */
/* Color variables                                                                                  */
/* ------------------------------------------------------------------------------------------------ */

/**
 * A role's swatch in `mode`: painted with the role variable inside a subtree pinned to that mode (an explicit
 * variable mode in Figma, `.dark`/`.light` in code), so the other mode's column binds the real variable. Its
 * edge uses a scale step, which reads the same in both modes.
 */
export function modeSwatch(name: string, cssName: string, mode: Mode, size: number, extra: Partial<ShapeNode> = {}): FrameNode {
  return frame({
    name: `${name} (${mode})`,
    mode,
    width: "hug",
    children: [shape({ name, width: size, height: size, radius: "sm", fill: { color: cssName }, stroke: { color: "color-neutral-950", opacity: 0.14, width: 1 }, ...extra })],
  });
}

/* ------------------------------------------------------------------------------------------------ */
/* Text helpers                                                                                     */
/* ------------------------------------------------------------------------------------------------ */

/** The board's mono labels (`code`, values, hex): caption size, or `mono` (small) where the CSS uses fs-small. */
export const mono = (
  value: unknown,
  color: ColorVar = "muted-foreground",
  options: Omit<TextNode, "type" | "text" | "style" | "color"> = {},
  style: "mono-caption" | "mono" = "mono-caption",
) => text(value, style, { color, tag: "code", ...options });

/** A text at `px`: the closest heading style (or strong body style), scaled to the exact size when it differs. */
export function sizedText(build: BuildContext, value: unknown, px: number, options: Omit<TextNode, "type" | "text" | "style"> = {}): TextNode | null {
  const style = styleForPx(build, px);
  const base = styleBasePx(build, style);
  const scale = Math.round((px / base) * 100) / 100;
  return text(value, style, { ...(Math.abs(scale - 1) > 0.04 && { scale }), ...options });
}

/** Font size in px of a style at desktop. */
export function styleBasePx(build: BuildContext, style: TextStyleId): number {
  const sizes = build.light.fontSizes;
  switch (style) {
    case "display":
    case "h1":
    case "h2":
    case "h3":
      return sizes[style].px;
    case "body-strong":
    case "body":
      return sizes.body.px;
    case "small-strong":
    case "small":
      return sizes.small.px;
    default:
      return sizes.caption.px;
  }
}

/** The heading text style closest to `px` (`display`…`h3`), or a strong body style below `h3`. */
export function styleForPx(build: BuildContext, px: number): TextStyleId {
  const sizes = build.light.fontSizes;
  const candidates: [TextStyleId, number][] = [
    ["display", sizes.display.px],
    ["h1", sizes.h1.px],
    ["h2", sizes.h2.px],
    ["h3", sizes.h3.px],
    ["body-strong", sizes.body.px],
    ["small-strong", sizes.small.px],
    ["caption-strong", sizes.caption.px],
  ];
  return candidates.reduce((best, entry) => (Math.abs(entry[1] - px) < Math.abs(best[1] - px) ? entry : best))[0];
}

/* ------------------------------------------------------------------------------------------------ */
/* BoardSection and BoardPanel                                                                      */
/* ------------------------------------------------------------------------------------------------ */

export interface BoardSectionInput {
  ctx: RenderContext;
  type: string;
  elementId: string;
  name: string;
  title: string;
  intro?: string;
  /** Extra content under the intro (summaries, legends). */
  aside?: Children;
  children: Children;
}

/** Shell of a numbered section: kicker with its number, title, intro on the right and the body below. */
export function boardSection({ ctx, type, elementId, name, title, intro, aside = [], children }: BoardSectionInput): FrameNode {
  const number = boardNumberOf(ctx, elementId, type);
  const kicker = BOARD_SECTION_NAMES[type]?.[ctx.locale];
  const asideKids = [text(intro, "body", { color: "muted-foreground", tag: "p" }), ...aside].filter(Boolean);
  const head = row(
    {
      name: "Head",
      tag: "header",
      align: "end",
      gap: 7,
      width: "fill",
      padding: { top: 4 },
      stroke: { color: "border-strong", width: 1, sides: ["top"] },
    },
    [
      column({ name: "Heading", width: "fill", gap: 3 }, [
        row({ name: "Kicker", gap: 3, align: "baseline" }, [
          text(number, "mono-caption", { color: "primary-text", tag: "span", weight: 600 }),
          text(kicker, "overline", { color: "muted-foreground", tag: "span" }),
        ]),
        text(title, "h2", { tag: "h2" }),
      ]),
      asideKids.length > 0 ? column({ name: "Aside", width: "fill", gap: 4, align: "start" }, asideKids) : null,
    ],
  );
  return column(
    { name, tag: "section", width: "fill", align: "center", padding: { y: { sectionPy: 0.5 } }, fill: { color: "background" } },
    [
      column({ name: "Inner", width: "fill", maxWidth: "container", padding: { x: { px: BOARD_GUTTER } }, gap: 6 }, [
        head,
        column({ name: "Body", width: "fill", gap: 5 }, children),
      ]),
    ],
  );
}

export interface BoardPanelOptions {
  label?: string;
  /** Small mono text on the label's end (a value, a count). */
  meta?: string;
  tone?: "card" | "muted" | "plain";
  width?: FrameNode["width"];
  gap?: Space;
}

/** `dl-board-panel`: a tile with the card surface of the theme and an optional label row. */
export function boardPanel(name: string, children: Children, { label, meta, tone = "card", width = "fill", gap = 4 }: BoardPanelOptions = {}): FrameNode {
  const surface =
    tone === "plain"
      ? {}
      : {
          padding: 5 as Space,
          fill: { color: tone === "muted" ? "muted" : "card" },
          stroke: { color: "border", card: true },
          radius: "card" as const,
          ...(tone === "card" && { shadow: "card" as const }),
        };
  const head =
    label || meta
      ? row({ name: "Panel head", width: "fill", justify: "between", align: "baseline", gap: 3, wrap: true }, [
          text(label, "small-strong", { color: tone === "card" ? "card-foreground" : "foreground", tag: "h3" }),
          mono(meta),
        ])
      : null;
  return column({ name, width, gap, ...surface }, [head, ...children]);
}

/* ------------------------------------------------------------------------------------------------ */
/* BrandMark                                                                                        */
/* ------------------------------------------------------------------------------------------------ */

export type MarkSurface = "auto" | "light" | "dark" | "brand";
export type MarkLayout = "lockup" | "stacked" | "symbol" | "wordmark";

const MARK_COLORS: Record<MarkSurface, { bg: ColorVar; fg: ColorVar; word: ColorVar }> = {
  auto: { bg: "primary", fg: "primary-foreground", word: "foreground" },
  light: { bg: "color-brand-600", fg: "color-neutral-50", word: "color-neutral-950" },
  dark: { bg: "color-brand-400", fg: "color-neutral-950", word: "color-neutral-50" },
  brand: { bg: "primary-foreground", fg: "primary", word: "primary-foreground" },
};

export interface BrandMarkInput {
  name: string;
  logoUrl?: string | undefined;
  surface?: MarkSurface;
  layout?: MarkLayout;
  /** The mark's font size in px (it scales with `font-size`). */
  em: number;
  /** Color of the word on an `auto` surface (`currentColor`). */
  word?: ColorVar;
}

const round = (value: number) => Math.round(value * 10) / 10;

/** `min(var(--dl-radius-lg), 30%)`: the radius token closest to that corner for a symbol of `box` px. */
function symbolRadius(build: BuildContext, box: number): "sm" | "md" | "lg" {
  const { radius } = build.light;
  const target = Math.min(radius.lg, box * 0.3);
  return (["sm", "md", "lg"] as const).reduce((best, name) => (Math.abs(radius[name] - target) < Math.abs(radius[best] - target) ? name : best));
}

/** The brand's logo: the uploaded image (a placeholder), or the monogram symbol plus the wordmark. */
export function brandMark(build: BuildContext, { name, logoUrl, surface = "auto", layout = "lockup", em, word }: BrandMarkInput): DesignNode {
  if (logoUrl) return image("Logo", { width: round(em * 2.4 * 3), height: round(em * 2.4), radius: "none", label: name });
  const colors = MARK_COLORS[surface];
  const symbolEm = layout === "symbol" ? em * 1.1 : em;
  const box = round(layout === "symbol" ? symbolEm * 2.4 : em * 1.8);
  const symbol =
    layout === "wordmark"
      ? null
      : column(
          { name: "Symbol", width: box, height: box, align: "center", justify: "center", radius: symbolRadius(build, box), fill: { color: colors.bg } },
          [sizedText(build, monogramOf(name), symbolEm, { color: colors.fg, align: "center", tag: "span", weight: 700 })],
        );
  const wordNode =
    layout === "symbol"
      ? null
      : sizedText(build, name, em, { color: surface === "auto" ? (word ?? colors.word) : colors.word, tag: "span", weight: build.light.heading.weight });
  const stacked = layout === "stacked";
  return (stacked ? column : row)(
    { name: "BrandMark", width: "hug", align: "center", gap: { px: round(em * (stacked ? 0.35 : 0.45)) } },
    [symbol, wordNode],
  );
}

/* ------------------------------------------------------------------------------------------------ */
/* Table (`dl-table` of @dialmade/ui)                                                               */
/* ------------------------------------------------------------------------------------------------ */

export interface TableColumnSpec {
  header: string;
  /** Pixels, or `fill` for the flexible column. */
  width: number | "fill";
  align?: "start" | "end";
}

export interface TableInput {
  name: string;
  caption?: string;
  columns: readonly TableColumnSpec[];
  rows: readonly (readonly Children[])[];
  compact?: boolean;
}

/** `dl-table`: a card-like wrap with its caption, a muted header row and rows of fixed height. */
export function dataTable(build: BuildContext, { name, caption, columns, rows, compact }: TableInput): FrameNode {
  const rowH = build.light.components.table.rowH;
  const bodyH = Math.round(compact ? rowH * 0.75 : rowH);
  const headH = Math.round(compact ? rowH * 0.75 : rowH * 0.8);
  const padX: Space = compact ? 3 : 4;
  const cell = (spec: TableColumnSpec, content: Children, height: number, key: string) =>
    row(
      {
        name: key,
        width: spec.width,
        minHeight: height,
        align: "center",
        justify: spec.align === "end" ? "end" : "start",
        padding: { x: padX },
        gap: 2,
      },
      content,
    );
  const head = row({ name: "Header", tag: "div", width: "fill", fill: { color: "muted" }, stroke: { color: "border", sides: ["bottom"] } }, [
    ...columns.map((spec) => cell(spec, [text(spec.header, "caption-strong", { color: "muted-foreground", tag: "th" })], headH, "th")),
  ]);
  const body = rows.map((cells, index) =>
    row(
      {
        name: "Row",
        width: "fill",
        ...(index < rows.length - 1 && { stroke: { color: "border", sides: ["bottom"] as const } }),
      },
      columns.map((spec, col) => cell(spec, cells[col] ?? [], bodyH, "td")),
    ),
  );
  return column(
    {
      name,
      tag: "table",
      width: "fill",
      fill: { color: "card" },
      stroke: { color: "border" },
      radius: "card",
      clip: true,
    },
    [
      caption
        ? column({ name: "Caption", width: "fill", padding: { top: 4, x: 4, bottom: 3 } }, [text(caption, "body-strong", { color: "card-foreground" })])
        : null,
      head,
      ...body,
    ],
  );
}
