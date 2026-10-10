// Tailwind v4 classes of the design tree. Every value stays a theme reference: role colors are utilities mapped
// to the contract's variables in `@theme inline` (`bg-primary`), scale colors and tokens are CSS variables
// (`bg-(--color-brand-500)`, `gap-(--dl-space-5)`, `rounded-(--dl-card-radius)`).
import { textStyle } from "../textStyles";
import type { DesignNode, FrameNode, Padding, Paint, Radius, Shadow, Size, Space, Stroke, TextNode } from "../tree/types";

/** Container query of the phone breakpoint (the layout's `(width < 40rem)`). */
export const MOBILE = "@max-[40rem]:";
/** Container query of the tablet breakpoint (the layout's `(width < 64rem)`). */
export const TABLET = "@max-5xl:";

const fmt = (value: number) => String(Number(value.toFixed(3)));

/** `primary` → `primary`, `color-brand-500` → `(--color-brand-500)`. */
export function colorRef(color: string): string {
  return color.startsWith("color-") ? `(--${color})` : color;
}

const alpha = (opacity: number | undefined) => (opacity !== undefined && opacity < 1 ? `/${Math.round(opacity * 100)}` : "");

export function colorClass(prefix: "bg" | "text" | "border" | "from" | "via" | "to", color: string, opacity?: number): string {
  return `${prefix}-${colorRef(color)}${alpha(opacity)}`;
}

export function paintClasses(paint: Paint | undefined): string[] {
  if (!paint) return [];
  if ("color" in paint) return [colorClass("bg", paint.color, paint.opacity)];
  const { angle, stops } = paint.gradient;
  const out = [`bg-linear-${fmt(angle)}`];
  const [first, ...rest] = stops;
  if (first) out.push(colorClass("from", first.color, first.opacity), ...(first.at > 0 ? [`from-${fmt(first.at * 100)}%`] : []));
  const last = rest.pop();
  for (const stop of rest) out.push(colorClass("via", stop.color, stop.opacity), `via-${fmt(stop.at * 100)}%`);
  if (last) out.push(colorClass("to", last.color, last.opacity), ...(last.at < 1 ? [`to-${fmt(last.at * 100)}%`] : []));
  return out;
}

/** A spacing value as the inside of a utility: `(--dl-space-5)`, `[12px]`, `[calc(var(--dl-section-py)*0.5)]`. */
export function spaceValue(value: Space): string | null {
  if (value === 0) return "0";
  if (typeof value === "number") return value >= 1 && value <= 10 ? `(--dl-space-${value})` : null;
  if ("px" in value) return `[${fmt(value.px)}px]`;
  return value.sectionPy === 1 ? "(--dl-section-py)" : `[calc(var(--dl-section-py)*${fmt(value.sectionPy)})]`;
}

const spaceClass = (prefix: string, value: Space | undefined) => {
  if (value === undefined) return [];
  const inner = spaceValue(value);
  return inner === null || inner === "0" ? [] : [`${prefix}-${inner}`];
};

export function paddingClasses(padding: Padding | undefined): string[] {
  if (padding === undefined) return [];
  if (typeof padding === "number" || "px" in padding || "sectionPy" in padding) return spaceClass("p", padding as Space);
  const { x, y, top, right, bottom, left } = padding;
  return [
    ...(top === undefined && bottom === undefined ? spaceClass("py", y) : [...spaceClass("pt", top ?? y), ...spaceClass("pb", bottom ?? y)]),
    ...(left === undefined && right === undefined ? spaceClass("px", x) : [...spaceClass("pl", left ?? x), ...spaceClass("pr", right ?? x)]),
  ];
}

const RADIUS: Record<Radius, string | null> = {
  none: null,
  sm: "rounded-(--dl-radius-sm)",
  md: "rounded-(--dl-radius-md)",
  lg: "rounded-(--dl-radius-lg)",
  xl: "rounded-(--dl-radius-xl)",
  full: "rounded-full",
  button: "rounded-(--dl-button-radius)",
  card: "rounded-(--dl-card-radius)",
  input: "rounded-(--dl-input-radius)",
  badge: "rounded-(--dl-badge-radius)",
};

const SHADOW: Record<Shadow, string> = {
  sm: "shadow-(--dl-shadow-sm)",
  md: "shadow-(--dl-shadow-md)",
  lg: "shadow-(--dl-shadow-lg)",
  button: "shadow-(--dl-button-shadow)",
  card: "shadow-(--dl-card-shadow)",
};

export function strokeClasses(stroke: Stroke | undefined): string[] {
  if (!stroke) return [];
  if (stroke.card) return ["[border:var(--dl-card-border)]"];
  const width = stroke.width !== undefined ? `[${fmt(stroke.width)}px]` : "(length:--dl-border-width)";
  const sides = stroke.sides ?? [];
  const widthClasses =
    sides.length === 0 ? [`border-${width}`] : sides.map((side) => `border-${{ top: "t", right: "r", bottom: "b", left: "l" }[side]}-${width}`);
  return [...widthClasses, colorClass("border", stroke.color, stroke.opacity), ...(stroke.dashed ? ["border-dashed"] : [])];
}

type Parent = "row" | "column" | "grid" | "tracks" | "root";

/** Width, height and box classes shared by frames and shapes. */
export function boxClasses(node: FrameNode | Extract<DesignNode, { type: "shape" }>, parent: Parent): string[] {
  const out: string[] = [];
  out.push(...widthClasses(node.width, parent, false));
  out.push(...heightClasses(node.height, parent));
  if (node.minHeight !== undefined) out.push(`min-h-[${fmt(node.minHeight)}px]`);
  if (node.maxWidth !== undefined) out.push(node.maxWidth === "container" ? "max-w-(--dl-container)" : `max-w-[${fmt(node.maxWidth)}px]`);
  if (node.maxWidth !== undefined && parent === "column") out.push("mx-auto");
  if (node.aspect !== undefined) out.push(`aspect-[${fmt(node.aspect)}]`);
  out.push(...paintClasses(node.fill));
  out.push(...strokeClasses(node.stroke));
  if (node.radius) {
    const radius = RADIUS[node.radius];
    if (radius) out.push(radius);
  }
  if (node.shadow) out.push(SHADOW[node.shadow]);
  if (node.opacity !== undefined && node.opacity < 1) out.push(`opacity-${Math.round(node.opacity * 100)}`);
  out.push(...placeClasses(node));
  return out;
}

export function widthClasses(width: Size | undefined, parent: Parent, isText: boolean): string[] {
  if (typeof width === "number") return [`w-[${fmt(width)}px]`, "shrink-0"];
  if (width === "hug") return parent === "row" ? ["shrink-0"] : ["w-fit"];
  if (width === "fill") return parent === "row" ? ["min-w-0", "flex-1"] : parent === "grid" || parent === "tracks" ? ["min-w-0"] : ["w-full"];
  // Defaults: fill in a column, hug in a row.
  if (parent === "row") return isText ? [] : ["shrink-0"];
  return [];
}

export function heightClasses(height: Size | undefined, parent: Parent): string[] {
  if (typeof height === "number") return [`h-[${fmt(height)}px]`];
  if (height === "fill") return parent === "column" ? ["flex-1"] : ["self-stretch"];
  return [];
}

export function placeClasses(node: DesignNode): string[] {
  const out: string[] = [];
  if (node.offsetTop !== undefined) out.push(...spaceClass("mt", node.offsetTop));
  if (node.place) {
    out.push(`col-start-${node.place.col + 1}`, `col-span-${node.place.span}`);
    if (node.place.row !== undefined) out.push(`row-start-${node.place.row + 1}`);
  }
  if ((node.type === "frame" || node.type === "shape") && node.area) {
    const { colStart, colEnd, rowStart, rowEnd } = node.area;
    out.push(`col-[${colStart}/${colEnd}]`, `row-[${rowStart}/${rowEnd}]`);
  }
  if (node.type === "frame" && node.absolute) {
    const { left, top, width } = node.absolute;
    out.push("absolute", `left-[${fmt(left * 100)}%]`, `top-[${fmt(top)}px]`, `w-[${fmt(width * 100)}%]`, `${MOBILE}left-0`, `${MOBILE}w-full`);
  }
  return out;
}

const ALIGN = { start: "items-start", center: "items-center", end: "items-end", stretch: "items-stretch", baseline: "items-baseline" } as const;
const JUSTIFY = { start: null, center: "justify-center", end: "justify-end", between: "justify-between" } as const;

/** Layout classes of a frame; `layoutRegion` frames (the layout's 12-column regions) stack on phones. */
export function layoutClasses(node: FrameNode): string[] {
  const layout = node.layout ?? { kind: "flex" as const, direction: "column" as const };
  const out: string[] = [];
  if (layout.kind === "flex") {
    out.push("flex", ...(layout.direction === "column" ? ["flex-col"] : []));
    if (layout.wrap) out.push("flex-wrap");
    if (layout.wrap && layout.crossGap !== undefined) out.push(...spaceClass("gap-x", layout.gap), ...spaceClass("gap-y", layout.crossGap));
    else out.push(...spaceClass("gap", layout.gap));
    const align = layout.align ?? (layout.direction === "row" ? "start" : "stretch");
    if (align !== "stretch") out.push(ALIGN[align]);
    const justify = JUSTIFY[layout.justify ?? "start"];
    if (justify) out.push(justify);
    return out;
  }
  if (layout.kind === "grid") {
    const placed = node.children.some((child) => child.place);
    out.push("grid", `grid-cols-${layout.columns}`);
    if (layout.rowGap !== undefined && layout.rowGap !== layout.gap) out.push(...spaceClass("gap-x", layout.gap), ...spaceClass("gap-y", layout.rowGap));
    else if (placed && layout.rowGap !== undefined) out.push(...spaceClass("gap", layout.gap));
    else out.push(...spaceClass(placed ? "gap-x" : "gap", layout.gap));
    if (layout.align === "start") out.push("items-start");
    if (placed) out.push(`${MOBILE}flex`, `${MOBILE}flex-col`, ...spaceClass(`${MOBILE}gap-y`, layout.gap));
    else if (layout.columns > 2) out.push(`${TABLET}grid-cols-2`, `${MOBILE}grid-cols-1`);
    else if (layout.columns === 2) out.push(`${MOBILE}grid-cols-1`);
    return out;
  }
  out.push(
    "grid",
    `grid-cols-[${layout.columns.map((n) => `minmax(0,${fmt(n)}fr)`).join("_")}]`,
    `grid-rows-[${layout.rows.map((px) => `minmax(${fmt(px)}px,auto)`).join("_")}]`,
    ...spaceClass("gap", layout.gap),
    `${MOBILE}flex`,
    `${MOBILE}flex-col`,
  );
  return out;
}

const TEXT_ALIGN = { start: null, center: "text-center", end: "text-right" } as const;

const WEIGHTS: Record<number, string> = {
  100: "font-thin",
  200: "font-extralight",
  300: "font-light",
  400: "font-normal",
  500: "font-medium",
  600: "font-semibold",
  700: "font-bold",
  800: "font-extrabold",
  900: "font-black",
};

const FONT_SIZE_VAR: Record<string, string> = {
  display: "--dl-fs-display",
  h1: "--dl-fs-h1",
  h2: "--dl-fs-h2",
  h3: "--dl-fs-h3",
  body: "--dl-fs-body",
  small: "--dl-fs-small",
  caption: "--dl-fs-caption",
};

export function textClasses(node: TextNode, parent: Parent): string[] {
  const out = [`text-${node.style}`, colorClass("text", node.color ?? "foreground", node.opacity)];
  if (node.scale !== undefined && node.scale !== 1) {
    const spec = textStyle(node.style);
    const factor = fmt((spec.scale ?? 1) * node.scale);
    out.push(`text-[length:calc(var(${FONT_SIZE_VAR[spec.size]})*${factor})]`);
  }
  if (node.weight !== undefined) out.push(WEIGHTS[Math.round(node.weight / 100) * 100] ?? "font-normal");
  out.push(...widthClasses(node.width, parent, true));
  if (node.maxWidth !== undefined) out.push(`max-w-[${fmt(node.maxWidth)}px]`);
  const align = TEXT_ALIGN[node.align ?? "start"];
  if (align) out.push(align);
  if (node.strike) out.push("line-through");
  out.push(...placeClasses(node));
  return out;
}
