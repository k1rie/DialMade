// Design tree → figma-plan v1. Boxes become auto layout frames (columns VERTICAL, rows HORIZONTAL, the layout's
// 12-column regions rows of fixed-width children, bento regions absolute children), every color is bound to a
// variable of the color collection (Light and Dark modes), spacing and radii to the tokens collection, texts to
// text styles and shadows to effect styles. Deterministic: same document, same plan.
import { toFigmaNumberVars, type DesignDoc, type ResolvedTokens, type ShadowLayer } from "@dialmade/doc";
import { ICONS } from "@dialmade/ui";
import { TEXT_STYLES, resolveTextStyle, textStyle, type FontRole } from "../textStyles";
import { resolveColor, themeSnapshot, type ThemeSnapshot } from "../theme";
import { buildDesignTree, type DesignTreeOptions } from "../tree/build";
import type {
  DesignNode,
  DesignTree,
  FrameNode,
  GridPlace,
  IconNode,
  Padding,
  Paint,
  Radius,
  Shadow,
  ShapeNode,
  Size,
  Space,
  Stroke,
  TextNode,
} from "../tree/types";
import {
  FIGMA_PLAN_FORMAT,
  FIGMA_PLAN_VERSION,
  type FigmaPlan,
  type PlanCollection,
  type PlanEffectStyle,
  type PlanFrame,
  type PlanNode,
  type PlanPaint,
  type PlanTextStyle,
  type PlanVariable,
  type Rgba,
} from "./schema";

export type FigmaPlanOptions = DesignTreeOptions;

const MODES = { light: "Light", dark: "Dark" } as const;
const FALLBACK_FAMILY = "Inter";
/** Text styles, effect styles and collections are grouped under this prefix in Figma. */
export const FIGMA_PREFIX = "Dialmade";

type Bound = { value: number; variable?: string };
type Sizing = PlanFrame["sizing"];
type Mode = "light" | "dark";

const round = (value: number, digits = 2) => {
  const out = Number(value.toFixed(digits));
  return Object.is(out, -0) ? 0 : out;
};

function rgba(hex: string, alpha = 1): Rgba {
  const n = parseInt(hex.slice(1, 7), 16);
  return { r: round(((n >> 16) & 255) / 255, 4), g: round(((n >> 8) & 255) / 255, 4), b: round((n & 255) / 255, 4), a: round(alpha, 3) };
}

/** `color-brand-500` → `color/brand-500` (the names of `figma-*.tokens.json`); `primary` → `color/primary`. */
export const colorVariableName = (cssName: string) => `color/${cssName.replace(/^color-/, "")}`;

/** CSS variable of a number variable of `toFigmaNumberVars`. */
function numberCssVar(path: string): string {
  const [group, ...rest] = path.split("/");
  const name = rest.join("-");
  switch (group) {
    case "radius":
      return `--dl-radius-${name}`;
    case "space":
      return `--dl-space-${name}`;
    case "font-size":
      return `--dl-fs-${name}`;
    case "font-weight":
      return name === "heading" ? "--dl-heading-weight" : name === "button" ? "--dl-button-weight" : "--dl-font-weight-body";
    case "border-width":
      return "--dl-border-width";
    case "layout":
      return name === "section-py" ? "--dl-section-py" : "--dl-container";
    case "component": {
      const [component, key = ""] = rest;
      const short: Record<string, string> = { "height-sm": "h-sm", "height-md": "h-md", "height-lg": "h-lg", "padding-x": "px", "font-weight": "weight", height: "h", "row-height": "row-h", width: "w" };
      return `--dl-${component}-${short[key] ?? key}`;
    }
    default:
      return `--dl-${path.replace(/\//g, "-")}`;
  }
}

function colorCollection(snapshot: ThemeSnapshot): PlanCollection {
  const variables: PlanVariable[] = Object.keys(snapshot.colors.light).map((name) => {
    const value = (mode: Mode) => {
      const color = snapshot.colors[mode][name] ?? snapshot.colors.light[name]!;
      return "alias" in color ? { alias: colorVariableName(color.alias) } : rgba(color.hex, color.alpha);
    };
    return {
      name: colorVariableName(name),
      type: "COLOR",
      scopes: ["ALL_SCOPES"],
      cssVar: `--${name}`,
      values: { [MODES.light]: value("light"), [MODES.dark]: value("dark") },
    };
  });
  return { name: `${FIGMA_PREFIX} · Color`, modes: [MODES.light, MODES.dark], variables };
}

type NumberGroup = { [key: string]: unknown };

function tokensCollection(doc: DesignDoc, snapshot: ThemeSnapshot): PlanCollection {
  const variables: PlanVariable[] = [];
  const walk = (group: NumberGroup, path: string[]) => {
    for (const [key, entry] of Object.entries(group)) {
      const token = entry as { $type?: string; $value?: number; $extensions?: { "com.figma.scopes": string[] } };
      if (token.$type === "number" && typeof token.$value === "number") {
        const name = [...path, key].join("/");
        variables.push({
          name,
          type: "FLOAT",
          scopes: token.$extensions?.["com.figma.scopes"] ?? [],
          cssVar: numberCssVar(name),
          values: { Default: round(token.$value) },
        });
      } else if (entry && typeof entry === "object") {
        walk(entry as NumberGroup, [...path, key]);
      }
    }
  };
  walk(toFigmaNumberVars(doc, snapshot.inputs) as NumberGroup, []);
  return { name: `${FIGMA_PREFIX} · Tokens`, modes: ["Default"], variables };
}

const GENERIC = /^(serif|sans-serif|monospace|cursive|fantasy|system-ui|ui-[a-z-]+|-apple-system|blinkmacsystemfont|math|emoji|fangsong)$/i;

/** The family Figma should use for a font role: the token's web font, else the first named family of its stack. */
function familyOf(tokens: ResolvedTokens, role: FontRole): string {
  const font = tokens.fonts[role];
  if (font.family) return font.family;
  const named = font.stack
    .split(",")
    .map((part) => part.trim().replace(/^["']|["']$/g, ""))
    .find((part) => part && !GENERIC.test(part) && part !== "Segoe UI" && part !== "SFMono-Regular" && part !== "Menlo" && part !== "Consolas");
  return named ?? (role === "mono" ? "Roboto Mono" : FALLBACK_FAMILY);
}

function textStyles(tokens: ResolvedTokens): PlanTextStyle[] {
  return TEXT_STYLES.map((spec) => {
    const resolved = resolveTextStyle(spec, tokens);
    return {
      id: spec.id,
      name: `${FIGMA_PREFIX}/${spec.label}`,
      fontFamily: familyOf(tokens, spec.family),
      fallbackFamily: spec.family === "mono" ? "Roboto Mono" : FALLBACK_FAMILY,
      fontWeight: resolved.weight,
      fontSize: resolved.fontSize,
      lineHeight: round(resolved.lineHeight * 100, 1),
      letterSpacing: round(resolved.tracking * 100, 2),
      textCase: spec.uppercase ? "UPPER" : "ORIGINAL",
      ...(spec.scale === undefined && { fontSizeVariable: `font-size/${spec.size}` }),
    };
  });
}

const shadowEffects = (layers: readonly ShadowLayer[]) =>
  layers.map((layer) => ({
    type: "DROP_SHADOW" as const,
    color: rgba(layer.color, layer.alpha),
    offset: { x: layer.x, y: layer.y },
    radius: layer.blur,
    spread: layer.spread,
  }));

function effectStyles(tokens: ResolvedTokens): PlanEffectStyle[] {
  return (["sm", "md", "lg"] as const)
    .filter((name) => tokens.shadows[name].length > 0)
    .map((name) => ({ id: `shadow-${name}`, name: `${FIGMA_PREFIX}/Shadow ${name}`, effects: shadowEffects(tokens.shadows[name]) }));
}

/* ------------------------------------------------------------------------------------------------ */
/* Nodes                                                                                            */
/* ------------------------------------------------------------------------------------------------ */

type Emit = {
  snapshot: ThemeSnapshot;
  tokens: ResolvedTokens;
  mode: Mode;
  effects: ReadonlySet<string>;
  pages: ReadonlySet<string>;
};

/** What a parent gives a child: its id, the parent's direction and the room it has for a `fill` child. */
type Slot = {
  id: string;
  parent: "HORIZONTAL" | "VERTICAL" | "NONE" | "ROOT";
  /** Width a `fill` child takes; `null` when the parent hugs its content (unknown). */
  room: number | null;
  /** The parent stretches its children on the cross axis (rows of a landing grid). */
  stretch?: boolean;
  width?: number;
  height?: number;
  at?: { x: number; y: number };
};

function space(e: Emit, value: Space | undefined): Bound {
  if (value === undefined || value === 0) return { value: 0 };
  if (typeof value === "number") {
    const px = e.tokens.space[value - 1];
    return px === undefined ? { value: 0 } : { value: px, variable: `space/${value}` };
  }
  if ("px" in value) return { value: round(value.px) };
  return value.sectionPy === 1
    ? { value: e.tokens.layout.sectionPy, variable: "layout/section-py" }
    : { value: round(e.tokens.layout.sectionPy * value.sectionPy) };
}

function padding(e: Emit, value: Padding | undefined) {
  if (value === undefined || typeof value === "number" || "px" in value || "sectionPy" in value) {
    const all = space(e, value as Space | undefined);
    return { top: all, right: all, bottom: all, left: all };
  }
  const y = value.y;
  const x = value.x;
  return {
    top: space(e, value.top ?? y),
    right: space(e, value.right ?? x),
    bottom: space(e, value.bottom ?? y),
    left: space(e, value.left ?? x),
  };
}

function solid(e: Emit, color: string, opacity?: number): PlanPaint {
  const resolved = resolveColor(e.snapshot, e.mode, color);
  const known = resolved !== null;
  const value = resolved ?? resolveColor(e.snapshot, e.mode, "foreground") ?? { hex: "#000000", alpha: 1 };
  return {
    type: "SOLID",
    color: rgba(value.hex, value.alpha),
    ...(opacity !== undefined && opacity < 1 && { opacity: round(opacity, 3) }),
    ...(known && { variable: colorVariableName(color) }),
  };
}

function paint(e: Emit, value: Paint | undefined): PlanPaint[] {
  if (!value) return [];
  if ("color" in value) return [solid(e, value.color, value.opacity)];
  return [
    {
      type: "GRADIENT_LINEAR",
      angle: value.gradient.angle,
      stops: value.gradient.stops.map((stop) => {
        const color = resolveColor(e.snapshot, e.mode, stop.color) ?? { hex: "#000000", alpha: 1 };
        return {
          position: stop.at,
          color: rgba(color.hex, color.alpha * (stop.opacity ?? 1)),
          ...(resolveColor(e.snapshot, e.mode, stop.color) && { variable: colorVariableName(stop.color) }),
        };
      }),
    },
  ];
}

function radius(e: Emit, value: Radius | undefined): Bound | undefined {
  if (!value || value === "none") return undefined;
  const { components, radius: scale } = e.tokens;
  switch (value) {
    case "button":
    case "card":
    case "input":
    case "badge":
      return { value: round(components[value].radius.px), variable: `component/${value}/radius` };
    default:
      return { value: scale[value], variable: `radius/${value}` };
  }
}

function stroke(e: Emit, value: Stroke | undefined): PlanFrame["stroke"] {
  if (!value) return undefined;
  if (value.card) {
    const border = e.tokens.components.card.border;
    if (!border) return undefined;
    return { paint: solid(e, border.color), weight: border.width };
  }
  return {
    paint: solid(e, value.color, value.opacity),
    weight: value.width ?? e.tokens.borderWidth,
    ...(value.sides && { sides: [...value.sides] }),
    ...(value.dashed && { dashed: true }),
  };
}

function effect(e: Emit, value: Shadow | undefined): string | undefined {
  if (!value) return undefined;
  const ref = value === "button" ? e.tokens.components.button.shadow : value === "card" ? e.tokens.components.card.shadow : value;
  if (ref === "none") return undefined;
  const id = `shadow-${ref}`;
  return e.effects.has(id) ? id : undefined;
}

/** Horizontal sizing of a box or text from its `width` and its slot. */
function horizontal(width: Size | undefined, slot: Slot, isText: boolean): { mode: Sizing["horizontal"]; px: number | null } {
  if (slot.width !== undefined) return { mode: "FIXED", px: slot.width };
  if (typeof width === "number") return { mode: "FIXED", px: width };
  const wantsFill = width === "fill" || (width === undefined && (slot.parent === "VERTICAL" || slot.parent === "ROOT" || slot.parent === "NONE"));
  if (!wantsFill) return { mode: "HUG", px: null };
  if (slot.room === null) return { mode: "HUG", px: null };
  if (slot.parent === "ROOT" || slot.parent === "NONE") return { mode: "FIXED", px: slot.room };
  return { mode: isText && slot.parent === "HORIZONTAL" && width === undefined ? "HUG" : "FILL", px: slot.room };
}

const spacer = (id: string, axis: "vertical" | "horizontal", px: number): PlanFrame => ({
  type: "FRAME",
  id,
  name: "Spacer",
  sizing: axis === "vertical" ? { horizontal: "FIXED", vertical: "FIXED", width: 1, height: round(px) } : { horizontal: "FIXED", vertical: "FIXED", width: round(px), height: 1 },
  layout: {
    mode: "NONE",
    wrap: false,
    itemSpacing: { value: 0 },
    padding: { top: { value: 0 }, right: { value: 0 }, bottom: { value: 0 }, left: { value: 0 } },
    primaryAxisAlign: "MIN",
    counterAxisAlign: "MIN",
  },
  fills: [],
  clipsContent: false,
  children: [],
});

function plainFrame(id: string, name: string, mode: "HORIZONTAL" | "VERTICAL", sizing: Sizing, gap: Bound, children: PlanNode[], counter: PlanFrame["layout"]["counterAxisAlign"] = "MIN"): PlanFrame {
  return {
    type: "FRAME",
    id,
    name,
    sizing,
    layout: {
      mode,
      wrap: false,
      itemSpacing: gap,
      padding: { top: { value: 0 }, right: { value: 0 }, bottom: { value: 0 }, left: { value: 0 } },
      primaryAxisAlign: "MIN",
      counterAxisAlign: counter,
    },
    fills: [],
    clipsContent: false,
    children,
  };
}

const offsetOf = (node: DesignNode): Space | undefined => node.offsetTop;
const placeOf = (node: DesignNode): GridPlace | undefined => node.place;

function emitText(e: Emit, node: TextNode, slot: Slot): PlanNode {
  const h = horizontal(node.width, slot, true);
  const maxWidth = node.maxWidth;
  return {
    type: "TEXT",
    id: slot.id,
    name: node.name ?? node.text.slice(0, 48),
    sizing: {
      horizontal: h.mode,
      vertical: "HUG",
      width: round(h.px ?? 0),
      ...(maxWidth !== undefined && { maxWidth }),
    },
    ...(slot.at && { absolute: slot.at }),
    characters: node.text,
    textStyle: textStyle(node.style).id,
    fill: solid(e, node.color ?? "foreground", node.opacity),
    textAlign: node.align === "center" ? "CENTER" : node.align === "end" ? "RIGHT" : "LEFT",
    ...(node.strike && { strikethrough: true }),
  };
}

function iconSvg(name: string, size: number, hex: string): string {
  const paths = (ICONS as Record<string, readonly string[]>)[name] ?? ICONS["more"];
  const d = paths.map((path) => `<path d="${path}"/>`).join("");
  return `<svg xmlns="http://www.w3.org/2000/svg" width="${size}" height="${size}" viewBox="0 0 24 24" fill="none" stroke="${hex}" stroke-width="2" stroke-linecap="round" stroke-linejoin="round">${d}</svg>`;
}

function emitIcon(e: Emit, node: IconNode, slot: Slot): PlanNode {
  const size = node.size ?? 16;
  const color = solid(e, node.color);
  const hex = color.type === "SOLID" ? `#${[color.color.r, color.color.g, color.color.b].map((c) => Math.round(c * 255).toString(16).padStart(2, "0")).join("")}` : "#000000";
  return {
    type: "ICON",
    id: slot.id,
    name: `Icon/${node.name}`,
    sizing: { horizontal: "FIXED", vertical: "FIXED", width: size, height: size },
    ...(slot.at && { absolute: slot.at }),
    svg: iconSvg(node.name, size, hex),
    color,
  };
}

function boxHeight(node: FrameNode | ShapeNode, slot: Slot, width: number | null): { mode: Sizing["vertical"]; px?: number } {
  if (slot.height !== undefined) return { mode: "FIXED", px: slot.height };
  if (typeof node.height === "number") return { mode: "FIXED", px: node.height };
  if (node.aspect && width !== null) return { mode: "FIXED", px: round(width / node.aspect) };
  if (node.height === "fill" && (slot.parent === "HORIZONTAL" || slot.parent === "VERTICAL")) return { mode: "FILL" };
  if (slot.stretch && slot.parent === "HORIZONTAL") return { mode: "FILL" };
  return { mode: "HUG" };
}

function boxSizing(e: Emit, node: FrameNode | ShapeNode, slot: Slot): { sizing: Sizing; width: number | null } {
  const h = horizontal(node.width, slot, false);
  let width = h.px;
  let maxWidth: number | undefined;
  if (node.maxWidth !== undefined) {
    maxWidth = node.maxWidth === "container" ? e.tokens.layout.container : node.maxWidth;
    if (width !== null) width = Math.min(width, maxWidth);
  }
  const v = boxHeight(node, slot, width);
  const sizing: Sizing = {
    horizontal: h.mode,
    vertical: v.mode,
    width: round(width ?? 0),
    ...(v.px !== undefined && { height: round(v.px) }),
    ...(node.minHeight !== undefined && v.mode !== "FIXED" && { minHeight: node.minHeight }),
    ...(maxWidth !== undefined && h.mode !== "FIXED" && { maxWidth }),
  };
  return { sizing, width };
}

function emitShape(e: Emit, node: ShapeNode, slot: Slot): PlanNode {
  const { sizing } = boxSizing(e, node, slot);
  if (sizing.vertical === "HUG") {
    sizing.vertical = "FIXED";
    sizing.height = sizing.height ?? round(sizing.width * 0.6);
  }
  if (sizing.horizontal === "HUG") {
    sizing.horizontal = "FIXED";
    sizing.width = sizing.width || 24;
  }
  const corner = radius(e, node.radius);
  const s = stroke(e, node.stroke);
  return {
    type: node.shape === "ellipse" ? "ELLIPSE" : "RECTANGLE",
    id: slot.id,
    name: node.name,
    sizing,
    ...(node.opacity !== undefined && { opacity: node.opacity }),
    ...(slot.at && { absolute: slot.at }),
    fills: paint(e, node.fill),
    ...(s && { stroke: s }),
    ...(corner && { cornerRadius: corner }),
    ...(node.role === "image" && { image: true }),
  };
}

const PRIMARY = { start: "MIN", center: "CENTER", end: "MAX", between: "SPACE_BETWEEN" } as const;

function emitFrame(e: Emit, node: FrameNode, slot: Slot): PlanFrame {
  const { sizing, width } = boxSizing(e, node, slot);
  const pad = padding(e, node.padding);
  const inner = width === null ? null : Math.max(0, width - pad.left.value - pad.right.value);
  const layout = node.layout ?? { kind: "flex" as const, direction: "column" as const };
  const corner = radius(e, node.radius);
  const s = stroke(e, node.stroke);
  const fx = effect(e, node.shadow);
  const base: Omit<PlanFrame, "layout" | "children"> = {
    type: "FRAME",
    id: slot.id,
    name: node.name,
    sizing,
    ...(node.opacity !== undefined && { opacity: node.opacity }),
    ...(slot.at && { absolute: slot.at }),
    fills: paint(e, node.fill),
    ...(s && { stroke: s }),
    ...(corner && { cornerRadius: corner }),
    ...(fx && { effectStyle: fx }),
    clipsContent: node.clip === true || (corner !== undefined && node.fill !== undefined && layout.kind !== "flex"),
    ...(node.linkTo && e.pages.has(node.linkTo) && { navigateTo: pageFrameId(node.linkTo) }),
  };

  const flow = node.children.filter((child) => !(child.type === "frame" && child.absolute));
  const absolutes = node.children.filter((child): child is FrameNode => child.type === "frame" && child.absolute !== undefined);
  const overlay = (children: PlanNode[]) => [
    ...children,
    ...absolutes.map((child, i) => {
      const box = child.absolute!;
      const room = inner ?? width ?? 0;
      return emitNode(e, { ...child, width: undefined }, {
        id: `${slot.id}/a${i}`,
        parent: "VERTICAL",
        room,
        width: round(box.width * room),
        at: { x: round(pad.left.value + box.left * room), y: round(box.top) },
      });
    }),
  ];

  if (layout.kind === "flex") {
    const gap = space(e, layout.gap);
    const children: PlanNode[] = [];
    const isRow = layout.direction === "row";
    const stretch = isRow && layout.align === "stretch";
    const fills = isRow ? flow.filter((child) => child.type !== "icon" && (child as { width?: Size }).width === "fill").length : 0;
    const fixed = isRow
      ? flow.reduce((sum, child) => sum + (typeof (child as { width?: Size }).width === "number" ? ((child as { width: number }).width) : 0), 0)
      : 0;
    const others = isRow ? flow.length - fills : 0;
    const share =
      inner === null ? null : isRow ? (fills > 0 ? Math.max(0, (inner - fixed - gap.value * (flow.length - 1)) / (fills + others * 0.5)) : inner) : inner;
    flow.forEach((child, i) => {
      const offset = offsetOf(child);
      if (offset !== undefined && offset !== 0) {
        const px = space(e, offset).value;
        if (px > 0) children.push(spacer(`${slot.id}/s${i}`, isRow ? "horizontal" : "vertical", px));
      }
      children.push(
        emitNode(e, child, {
          id: `${slot.id}/${i}`,
          parent: isRow ? "HORIZONTAL" : "VERTICAL",
          room: share === null ? null : round(share),
          stretch,
        }),
      );
    });
    const align = layout.align ?? (isRow ? "start" : "stretch");
    return {
      ...base,
      layout: {
        mode: isRow ? "HORIZONTAL" : "VERTICAL",
        wrap: isRow && layout.wrap === true,
        itemSpacing: gap,
        ...(isRow && layout.wrap && { counterAxisSpacing: gap }),
        padding: pad,
        primaryAxisAlign: PRIMARY[layout.justify ?? "start"],
        counterAxisAlign: align === "center" ? "CENTER" : align === "end" ? "MAX" : align === "baseline" && isRow ? "BASELINE" : "MIN",
      },
      children: overlay(children),
    };
  }

  if (layout.kind === "grid") {
    const gap = space(e, layout.gap);
    const rowGap = layout.rowGap !== undefined ? space(e, layout.rowGap) : gap;
    const cols = Math.max(1, layout.columns);
    const colW = inner === null ? null : (inner - gap.value * (cols - 1)) / cols;
    const spanW = (span: number) => (colW === null ? null : round(span * colW + (span - 1) * gap.value));
    const stretch = layout.align !== "start";
    const placed = flow.some((child) => placeOf(child));
    const rows: { key: number; children: { node: DesignNode; index: number; place: GridPlace }[] }[] = [];
    flow.forEach((child, index) => {
      const place = placeOf(child) ?? { col: placed ? 0 : index % cols, span: placed ? cols : 1, row: placed ? index : Math.floor(index / cols) };
      const key = place.row ?? index;
      let entry = rows.find((r) => r.key === key);
      if (!entry) rows.push((entry = { key, children: [] }));
      entry.children.push({ node: child, index, place });
    });
    rows.sort((a, b) => a.key - b.key);
    const out: PlanNode[] = [];
    rows.forEach((entry, r) => {
      const items = [...entry.children].sort((a, b) => a.place.col - b.place.col);
      const rowOffsets = items.map((item) => (offsetOf(item.node) !== undefined ? space(e, offsetOf(item.node)).value : 0));
      const shared = items.length === 1 || rowOffsets.every((value) => value === rowOffsets[0]);
      const rowOffset = shared ? (rowOffsets[0] ?? 0) : 0;
      if (rowOffset > 0) out.push(spacer(`${slot.id}/s${r}`, "vertical", rowOffset));
      const only = items.length === 1 ? items[0]! : null;
      if (only && placed && only.place.col === 0 && only.place.span === cols) {
        out.push(emitNode(e, { ...only.node, offsetTop: undefined } as DesignNode, { id: `${slot.id}/${only.index}`, parent: "VERTICAL", room: inner }));
        return;
      }
      const rowChildren: PlanNode[] = [];
      let cursor = 0;
      const uniform = !placed;
      items.forEach((item, k) => {
        const start = colW === null ? 0 : item.place.col * (colW + gap.value);
        const lead = colW === null ? 0 : round(start - cursor);
        if (!uniform && lead > 0 && !(k > 0 && Math.abs(lead - gap.value) < 0.01)) rowChildren.push(spacer(`${slot.id}/r${r}s${k}`, "horizontal", lead));
        const w = spanW(item.place.span);
        const own = shared ? 0 : rowOffsets[k]!;
        const childSlot: Slot = {
          id: `${slot.id}/${item.index}`,
          parent: "HORIZONTAL",
          room: w,
          stretch,
          ...(w !== null && { width: w }),
        };
        const clean = { ...item.node, offsetTop: undefined } as DesignNode;
        if (own > 0) {
          rowChildren.push(
            plainFrame(
              `${slot.id}/w${item.index}`,
              "Offset",
              "VERTICAL",
              { horizontal: w === null ? "HUG" : "FIXED", vertical: stretch ? "FILL" : "HUG", width: w ?? 0 },
              { value: 0 },
              [spacer(`${slot.id}/w${item.index}s`, "vertical", own), emitNode(e, clean, { id: childSlot.id, parent: "VERTICAL", room: w })],
            ),
          );
        } else {
          rowChildren.push(emitNode(e, clean, childSlot));
        }
        cursor = start + (w ?? 0);
      });
      // Adjacent children use the row's spacing; explicit spacers already carry the empty columns.
      const allAdjacent = uniform || items.every((item, k) => k === 0 || item.place.col === items[k - 1]!.place.col + items[k - 1]!.place.span);
      const leadFree = uniform || items[0]!.place.col === 0;
      out.push(
        plainFrame(
          `${slot.id}/r${r}`,
          "Row",
          "HORIZONTAL",
          { horizontal: inner === null ? "HUG" : "FILL", vertical: "HUG", width: round(inner ?? 0) },
          allAdjacent && leadFree ? gap : { value: 0 },
          allAdjacent && leadFree ? rowChildren.filter((child) => child.name !== "Spacer") : rowChildren,
        ),
      );
    });
    return {
      ...base,
      layout: {
        mode: "VERTICAL",
        wrap: false,
        itemSpacing: placed ? { value: 0 } : rowGap,
        padding: pad,
        primaryAxisAlign: "MIN",
        counterAxisAlign: "MIN",
      },
      children: overlay(out),
    };
  }

  // Bento tracks: fixed cells at absolute positions (Figma's auto layout has no track grid here).
  const gap = space(e, layout.gap).value;
  const room = inner ?? 0;
  const totalFr = layout.columns.reduce((sum, n) => sum + n, 0) || 1;
  const usable = room - gap * Math.max(0, layout.columns.length - 1);
  const colX = [0];
  layout.columns.forEach((n, i) => colX.push(colX[i]! + (n / totalFr) * usable + gap));
  const rowY = [0];
  layout.rows.forEach((px, i) => rowY.push(rowY[i]! + px + gap));
  const height = (rowY[rowY.length - 1] ?? gap) - gap;
  const children = flow.map((child, i) => {
    const area = (child as FrameNode).area;
    if (!area) return emitNode(e, child, { id: `${slot.id}/${i}`, parent: "NONE", room });
    const x = colX[area.colStart - 1] ?? 0;
    const y = rowY[area.rowStart - 1] ?? 0;
    const w = (colX[area.colEnd - 1] ?? room + gap) - gap - x;
    const h = (rowY[area.rowEnd - 1] ?? height + gap) - gap - y;
    return emitNode(e, child, {
      id: `${slot.id}/${i}`,
      parent: "NONE",
      room: round(w),
      width: round(w),
      height: round(h),
      at: { x: round(pad.left.value + x), y: round(pad.top.value + y) },
    });
  });
  return {
    ...base,
    sizing: { ...sizing, vertical: "FIXED", height: round(height + pad.top.value + pad.bottom.value) },
    layout: {
      mode: "NONE",
      wrap: false,
      itemSpacing: { value: 0 },
      padding: pad,
      primaryAxisAlign: "MIN",
      counterAxisAlign: "MIN",
    },
    clipsContent: true,
    children: overlay(children),
  };
}

function emitNode(e: Emit, node: DesignNode, slot: Slot): PlanNode {
  switch (node.type) {
    case "frame":
      return emitFrame(e, node, slot);
    case "text":
      return emitText(e, node, slot);
    case "shape":
      return emitShape(e, node, slot);
    case "icon":
      return emitIcon(e, node, slot);
  }
}

export const pageFrameId = (pageId: string) => `page:${pageId}`;

/** The plan of a design tree against a theme. */
export function planFromTree(doc: DesignDoc, tree: DesignTree, snapshot: ThemeSnapshot): FigmaPlan {
  const tokens = tree.mode === "dark" ? snapshot.dark : snapshot.light;
  const effects = effectStyles(tokens);
  const e: Emit = {
    snapshot,
    tokens,
    mode: tree.mode,
    effects: new Set(effects.map((style) => style.id)),
    pages: new Set(tree.pages.map((page) => page.id)),
  };
  const styles = textStyles(tokens);
  const fonts = new Map<string, Set<number>>();
  for (const style of styles) fonts.set(style.fontFamily, (fonts.get(style.fontFamily) ?? new Set()).add(style.fontWeight));
  return {
    format: FIGMA_PLAN_FORMAT,
    version: FIGMA_PLAN_VERSION,
    name: tree.name,
    locale: tree.locale,
    defaultMode: MODES[tree.mode],
    collections: { color: colorCollection(snapshot), tokens: tokensCollection(doc, snapshot) },
    textStyles: styles,
    effectStyles: effects,
    fonts: [...fonts].map(([family, weights]) => ({ family, weights: [...weights].sort((a, b) => a - b) })),
    pages: tree.pages.map((page) => ({
      id: page.id,
      name: page.name,
      kind: page.kind,
      ...(page.route !== undefined && { route: page.route }),
      frame: emitFrame(e, page.root, { id: pageFrameId(page.id), parent: "ROOT", room: page.width }),
    })),
  };
}

/** figma-plan v1 of a document: its screens (or legacy pages) and its style guide, ready for the plugin. */
export function toFigmaPlan(doc: DesignDoc, options: FigmaPlanOptions = {}): FigmaPlan {
  const snapshot = themeSnapshot(doc, options);
  return planFromTree(doc, buildDesignTree(doc, options), snapshot);
}
