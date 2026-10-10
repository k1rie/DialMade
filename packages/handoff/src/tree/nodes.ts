// Small constructors of the design tree shared by every section builder: boxes, texts, buttons, badges, cards,
// images and inputs that mirror the components of @dialmade/ui (`dl-button`, `dl-badge`, `dl-card`…).
import type {
  ColorVar,
  DesignNode,
  FlexLayout,
  FrameNode,
  IconNode,
  ShapeNode,
  Size,
  Space,
  TextNode,
  TextStyleId,
} from "./types";

type FrameInput = Omit<FrameNode, "type" | "children"> & { children?: (DesignNode | null | undefined | false)[] };

const kids = (children: FrameInput["children"]): DesignNode[] =>
  (children ?? []).filter((child): child is DesignNode => !!child);

export function frame(input: FrameInput): FrameNode {
  const { children, ...rest } = input;
  return { type: "frame", ...rest, children: kids(children) };
}

type StackOptions = Omit<FrameInput, "layout" | "children"> &
  Partial<Pick<FlexLayout, "gap" | "align" | "justify" | "wrap" | "crossGap">>;

function flex(direction: "row" | "column", options: StackOptions, children: FrameInput["children"]): FrameNode {
  const { gap, align, justify, wrap, crossGap, ...rest } = options;
  const layout: FlexLayout = { kind: "flex", direction };
  if (crossGap !== undefined) layout.crossGap = crossGap;
  if (gap !== undefined) layout.gap = gap;
  if (align) layout.align = align;
  if (justify) layout.justify = justify;
  if (wrap) layout.wrap = wrap;
  return frame({ ...rest, layout, children });
}

/** Children top to bottom. */
export const column = (options: StackOptions, children: FrameInput["children"]) => flex("column", options, children);
/** Children left to right. */
export const row = (options: StackOptions, children: FrameInput["children"]) => flex("row", options, children);

/** Equal columns; children fill one cell each. */
export function grid(
  options: Omit<FrameInput, "layout" | "children"> & { columns: number; gap?: Space; rowGap?: Space },
  children: FrameInput["children"],
): FrameNode {
  const { columns, gap, rowGap, ...rest } = options;
  return frame({
    width: "fill",
    ...rest,
    layout: { kind: "grid", columns, ...(gap !== undefined && { gap }), ...(rowGap !== undefined && { rowGap }) },
    children,
  });
}

type TextOptions = Omit<TextNode, "type" | "text" | "style">;

/** A text; `null` when it is empty, so optional copy simply disappears (like the sections do). */
export function text(value: unknown, style: TextStyleId, options: TextOptions = {}): TextNode | null {
  if (typeof value !== "string" && typeof value !== "number") return null;
  const content = String(value).trim();
  if (!content) return null;
  return { type: "text", text: content, style, ...options };
}

export const icon = (name: string, color: ColorVar, size = 16): IconNode => ({ type: "icon", name, color, size });

export function shape(input: Omit<ShapeNode, "type" | "shape"> & { shape?: ShapeNode["shape"] }): ShapeNode {
  return { type: "shape", shape: "rect", ...input };
}

/** An image placeholder (the sections draw illustrations or photos there). */
export function image(name: string, options: { width?: Size; height?: Size; aspect?: number; radius?: ShapeNode["radius"]; label?: string } = {}): ShapeNode {
  return shape({
    name,
    role: "image",
    width: options.width ?? "fill",
    ...(options.height !== undefined && { height: options.height }),
    ...(options.aspect !== undefined && { aspect: options.aspect }),
    radius: options.radius ?? "lg",
    fill: { gradient: { angle: 135, stops: [{ color: "muted", at: 0 }, { color: "accent", at: 1 }] } },
    ...(options.label && { label: options.label }),
  });
}

/** A round dot or avatar. */
export const dot = (name: string, size: number, color: ColorVar, opacity?: number): ShapeNode =>
  shape({ name, shape: "ellipse", width: size, height: size, fill: { color, ...(opacity !== undefined && { opacity }) }, role: "decor" });

export type ButtonVariant = "primary" | "cta" | "secondary" | "outline" | "ghost" | "link" | "destructive";
export type ButtonSize = "sm" | "md" | "lg";

const BUTTON_COLORS: Record<ButtonVariant, { fill?: ColorVar; text: ColorVar; stroke?: ColorVar }> = {
  primary: { fill: "primary", text: "primary-foreground" },
  cta: { fill: "cta", text: "cta-foreground" },
  secondary: { fill: "secondary", text: "secondary-foreground" },
  outline: { text: "foreground", stroke: "border-strong" },
  ghost: { text: "foreground" },
  link: { text: "primary-text" },
  destructive: { fill: "destructive", text: "destructive-foreground" },
};

/** Heights of `--dl-button-h-*` resolve per emitter: the size name is kept in the node name. */
export const BUTTON_STYLE: Record<ButtonSize, TextStyleId> = { sm: "button-sm", md: "button", lg: "button-lg" };

/** `dl-button`: a label (and an optional trailing icon) in a pill of the recipe's button radius. */
export function button(
  label: unknown,
  options: { variant?: ButtonVariant; size?: ButtonSize; icon?: string; leadingIcon?: string; linkTo?: string | null; width?: Size; key?: string } = {},
): FrameNode | null {
  const content = text(label, BUTTON_STYLE[options.size ?? "md"], {
    color: BUTTON_COLORS[options.variant ?? "primary"].text,
    tag: "span",
  });
  if (!content) return null;
  const variant = options.variant ?? "primary";
  const size = options.size ?? "md";
  const colors = BUTTON_COLORS[variant];
  const iconSize = size === "lg" ? 18 : size === "sm" ? 14 : 16;
  return row(
    {
      name: `Button/${variant}/${size}`,
      tag: options.linkTo ? "a" : "button",
      align: "center",
      justify: "center",
      gap: size === "sm" ? 1 : 2,
      width: options.width ?? "hug",
      padding: variant === "link" ? 0 : { x: size === "sm" ? 3 : size === "lg" ? 5 : 4 },
      minHeight: variant === "link" ? undefined : size === "sm" ? 32 : size === "lg" ? 48 : 40,
      radius: variant === "link" ? undefined : "button",
      ...(colors.fill && { fill: { color: colors.fill } }),
      ...(colors.stroke && { stroke: { color: colors.stroke } }),
      ...(variant !== "link" && variant !== "ghost" && variant !== "outline" && { shadow: "button" as const }),
      ...(options.linkTo && { linkTo: options.linkTo }),
      ...(options.key && { key: options.key }),
    },
    [
      options.leadingIcon ? icon(options.leadingIcon, colors.text, iconSize) : null,
      content,
      options.icon ? icon(options.icon, colors.text, iconSize) : null,
    ],
  );
}

export type BadgeTone = "neutral" | "primary" | "success" | "warning" | "destructive" | "info" | "outline";

const BADGE_COLORS: Record<BadgeTone, { fill?: ColorVar; text: ColorVar; opacity?: number; stroke?: ColorVar }> = {
  neutral: { fill: "secondary", text: "secondary-foreground" },
  primary: { fill: "primary", text: "primary-text", opacity: 0.12 },
  success: { fill: "success", text: "success", opacity: 0.14 },
  warning: { fill: "warning", text: "warning", opacity: 0.16 },
  destructive: { fill: "destructive", text: "destructive", opacity: 0.12 },
  info: { fill: "info", text: "info", opacity: 0.14 },
  outline: { text: "foreground", stroke: "border" },
};

/** `dl-badge`: caption text in a small pill. */
export function badge(label: unknown, tone: BadgeTone = "neutral", leadingIcon?: string): FrameNode | null {
  const content = text(label, "caption-strong", { color: BADGE_COLORS[tone].text, tag: "span" });
  if (!content) return null;
  const colors = BADGE_COLORS[tone];
  return row(
    {
      name: `Badge/${tone}`,
      align: "center",
      gap: 1,
      width: "hug",
      padding: { x: 2, y: { px: 2 } },
      radius: "badge",
      ...(colors.fill && { fill: { color: colors.fill, ...(colors.opacity !== undefined && { opacity: colors.opacity }) } }),
      ...(colors.stroke && { stroke: { color: colors.stroke } }),
    },
    [leadingIcon ? icon(leadingIcon, colors.text, 12) : null, content],
  );
}

/** `dl-card`: card surface, border and shadow of the recipe, padding `--dl-card-padding` (step 5). */
export function card(
  name: string,
  children: FrameInput["children"],
  options: Omit<StackOptions, "name"> & { padding?: FrameNode["padding"]; direction?: "row" | "column" } = {},
): FrameNode {
  const { direction = "column", ...rest } = options;
  return flex(
    direction,
    {
      name,
      gap: 3,
      padding: 5,
      fill: { color: "card" },
      stroke: { color: "border", card: true },
      radius: "card",
      shadow: "card",
      width: "fill",
      ...rest,
    },
    children,
  );
}

/** `dl-input` (or a select / textarea): label above a field box with a placeholder. */
export function field(label: unknown, placeholder: unknown, options: { multiline?: boolean; trailingIcon?: string; hint?: unknown } = {}): FrameNode {
  return column({ name: "Field", gap: 2, width: "fill", tag: "label" }, [
    text(label, "small-strong", { tag: "span" }),
    row(
      {
        name: options.multiline ? "Textarea" : "Input",
        align: options.multiline ? "start" : "center",
        justify: "between",
        width: "fill",
        minHeight: options.multiline ? 96 : 40,
        padding: { x: 3, y: options.multiline ? 2 : 0 },
        fill: { color: "background" },
        stroke: { color: "input" },
        radius: "input",
      },
      [
        text(placeholder ?? " ", "small", { color: "muted-foreground", width: "fill" }),
        options.trailingIcon ? icon(options.trailingIcon, "muted-foreground", 16) : null,
      ],
    ),
    text(options.hint, "caption", { color: "muted-foreground" }),
  ]);
}

/** A thin rule (`<hr>`, table borders). */
export const divider = (name = "Divider"): ShapeNode =>
  shape({ name, role: "decor", width: "fill", height: 1, fill: { color: "border" } });

/** Strings of a list prop (`["a", "b"]` or `[{ label: "a" }]`): `pick` reads an object item. */
export function strings(value: unknown, pick: (item: Record<string, unknown>) => unknown = (item) => item.label ?? item.title ?? item.name): string[] {
  if (!Array.isArray(value)) return [];
  return value
    .map((item) => (typeof item === "string" ? item : item && typeof item === "object" ? pick(item as Record<string, unknown>) : null))
    .filter((item): item is string => typeof item === "string" && item.trim().length > 0);
}

/** The objects of a list prop. */
export const records = (value: unknown): Record<string, unknown>[] =>
  Array.isArray(value) ? value.filter((item): item is Record<string, unknown> => !!item && typeof item === "object" && !Array.isArray(item)) : [];

export const str = (value: unknown): string => (typeof value === "string" ? value : typeof value === "number" ? String(value) : "");
export const num = (value: unknown, fallback: number): number => (typeof value === "number" && Number.isFinite(value) ? value : fallback);
export const bool = (value: unknown): boolean => value === true;
