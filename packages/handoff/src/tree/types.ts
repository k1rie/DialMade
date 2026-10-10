/**
 * The design tree: a neutral description of a page as nested auto layout boxes, built from the DesignDoc
 * (`buildDesignTree`) and turned into a Figma plan (`toFigmaPlan`) or into React + Tailwind code (`toTsx`).
 *
 * Every value is a theme reference, never a resolved color or size: colors are the CSS variables of the
 * contract of `@dialmade/ui` (without `--`), spacing is a step of `--dl-space-*`, radii and shadows are token
 * names. Each emitter resolves them its own way (Figma variables, Tailwind classes over the CSS variables).
 * Plain JSON: deterministic and comparable in golden tests.
 */

/** A color variable of the theme contract without `--`: `primary`, `card-foreground`, `chart-1`, `color-brand-500`. */
export type ColorVar = string;

export type SolidPaint = { color: ColorVar; opacity?: number };
export type GradientPaint = {
  /** CSS angle in degrees (`135` goes from the top left to the bottom right). */
  angle: number;
  stops: { color: ColorVar; opacity?: number; at: number }[];
};
export type Paint = SolidPaint | { gradient: GradientPaint };

/**
 * A step of the spacing scale (`1` is `--dl-space-1`; `0` is none), literal pixels, or a share of the section
 * rhythm (`--dl-section-py`, the padding of landing sections).
 */
export type Space = number | { px: number } | { sectionPy: number };

export type Radius = "none" | "sm" | "md" | "lg" | "xl" | "full" | "button" | "card" | "input" | "badge";
export type Shadow = "sm" | "md" | "lg" | "button" | "card";

/** `fill` takes the room its parent gives it, `hug` its content, a number is fixed pixels. */
export type Size = "fill" | "hug" | number;

export type Padding = Space | { x?: Space; y?: Space; top?: Space; right?: Space; bottom?: Space; left?: Space };

export type Align = "start" | "center" | "end" | "stretch" | "baseline";
export type Justify = "start" | "center" | "end" | "between";

/** Flex box: children one after another. */
export type FlexLayout = {
  kind: "flex";
  direction: "row" | "column";
  gap?: Space;
  /** Rows: children move to a new line when they do not fit (`gap` between lines too). */
  wrap?: boolean;
  /** Cross axis. Default `stretch` in columns and `start` in rows. */
  align?: Align;
  /** Main axis. Default `start`. */
  justify?: Justify;
};

/**
 * Grid of equal columns. Children without `place` flow in reading order, one cell each (cards, logos); with
 * `place` they take explicit columns (the layout's 12-column regions).
 */
export type GridLayout = {
  kind: "grid";
  columns: number;
  /** Between columns (and between rows when `rowGap` is absent). */
  gap?: Space;
  rowGap?: Space;
  /** Cross axis of each line. Default `stretch`. */
  align?: "start" | "stretch";
};

/**
 * Tracks of a bento region (no clean cut): columns in grid columns, rows in px. Children carry `area`.
 */
export type TrackLayout = { kind: "tracks"; columns: number[]; rows: number[]; gap?: Space; areas: string[] | null };

export type Layout = FlexLayout | GridLayout | TrackLayout;

/** Where a child sits in a `grid` parent: 0-based column and span; `row` is 0-based (default: its own line in order). */
export type GridPlace = { col: number; span: number; row?: number };

/** A cell of a `tracks` parent (1-based lines, like CSS). */
export type TrackArea = { name: string; colStart: number; colEnd: number; rowStart: number; rowEnd: number };

export type SemanticTag =
  | "div"
  | "section"
  | "header"
  | "footer"
  | "nav"
  | "main"
  | "aside"
  | "article"
  | "ul"
  | "ol"
  | "li"
  | "form"
  | "figure"
  | "table"
  | "button"
  | "a"
  | "label"
  | "dialog";

export type Stroke = {
  color: ColorVar;
  opacity?: number;
  /** Pixels; default the theme's border width. */
  width?: number;
  /** Default all sides. */
  sides?: readonly ("top" | "right" | "bottom" | "left")[];
  dashed?: boolean;
  /** The recipe's card border (`--dl-card-border`): its own width and color, or none when the recipe has no border. */
  card?: boolean;
};

type BoxBase = {
  name: string;
  /** Element id of the page (`hero-1`, a block id): the anchor of prototype links and of the TSX components. */
  key?: string;
  width?: Size;
  height?: Size;
  minHeight?: number;
  /** `container`: `--dl-container`. */
  maxWidth?: "container" | number;
  /** Width / height. With a known width, the height follows. */
  aspect?: number;
  fill?: Paint;
  stroke?: Stroke;
  radius?: Radius;
  shadow?: Shadow;
  opacity?: number;
  /** Space above this child inside a column (the layout's vertical gaps, which vary child by child). */
  offsetTop?: Space;
  place?: GridPlace;
  area?: TrackArea;
};

export type FrameNode = BoxBase & {
  type: "frame";
  tag?: SemanticTag;
  /** Default: flex column. */
  layout?: Layout;
  padding?: Padding;
  clip?: boolean;
  /**
   * Overlays (modal): out of the flow. `left` and `width` are fractions of the parent's width, `top` is pixels
   * from the parent's top.
   */
  absolute?: { left: number; top: number; width: number };
  /** Screen this box opens (`linkTo`): a prototype link in Figma, an `<a href>` in code. */
  linkTo?: string;
  /** Accessible name of a box without visible text (an image, a chart). */
  label?: string;
  children: DesignNode[];
};

export type TextStyleId =
  | "display"
  | "h1"
  | "h2"
  | "h3"
  | "lead"
  | "body"
  | "body-strong"
  | "small"
  | "small-strong"
  | "caption"
  | "caption-strong"
  | "overline"
  | "button"
  | "button-sm"
  | "button-lg"
  | "mono";

export type TextTag = "h1" | "h2" | "h3" | "h4" | "p" | "span" | "label" | "strong" | "small" | "th" | "td" | "code";

export type TextNode = {
  type: "text";
  name?: string;
  text: string;
  style: TextStyleId;
  /** Default `foreground`. */
  color?: ColorVar;
  opacity?: number;
  align?: "start" | "center" | "end";
  /** Default `hug` in rows, `fill` in columns. */
  width?: Size;
  maxWidth?: number;
  tag?: TextTag;
  strike?: boolean;
  offsetTop?: Space;
  place?: GridPlace;
};

export type ShapeNode = BoxBase & {
  type: "shape";
  shape: "rect" | "ellipse";
  /** `image` becomes an image placeholder, `decor` is hidden from assistive tech. */
  role?: "image" | "decor" | "bar";
  /** Alt text of an image placeholder. */
  label?: string;
};

/** An icon of `@dialmade/ui` (24×24 strokes). */
export type IconNode = {
  type: "icon";
  name: string;
  /** Pixels. Default 16. */
  size?: number;
  /** Default `currentColor` of the parent text: give it explicitly. */
  color: ColorVar;
  offsetTop?: Space;
  place?: GridPlace;
};

export type DesignNode = FrameNode | TextNode | ShapeNode | IconNode;

/** One screen, the style guide or a legacy page. */
export type DesignPage = {
  /** Stable id: a screen id, `brand`, or a legacy page kind. */
  id: string;
  name: string;
  kind: "screen" | "style-guide" | "page";
  /** `landing` or `app` for screens and legacy pages; `brand` for the style guide. */
  pageKind: "landing" | "app" | "brand";
  route?: string;
  /** Width of the desktop frame in px. */
  width: number;
  root: FrameNode;
};

export type DesignTree = {
  name: string;
  locale: "es" | "en";
  /** The mode the pages are shown in first (both modes exist as variables). */
  mode: "light" | "dark";
  pages: DesignPage[];
};
