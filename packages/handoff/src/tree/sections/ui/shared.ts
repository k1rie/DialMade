// Pieces shared by the `ui.*` builders: the block's outer box (`UiBlock`: plain, card or the landing frame), the
// title row of the widget-like blocks (`dl-ui__head`), their trailing link, tones, avatars, the kit's form
// controls and the block's desktop size read from its layout rect (the sections switch looks by container width).
import type { Locale } from "@dialmade/catalog";
import { COL_PX, DESKTOP_COLUMNS, ROW_UNIT } from "@dialmade/layout";
import type { RenderContext } from "@dialmade/sections";
import { colorIndexOf, initialsOf } from "@dialmade/ui";
import type { BuildContext } from "../../context";
import { column, frame, icon, row, shape, text } from "../../nodes";
import type { ColorVar, DesignNode, FrameNode, Justify, SemanticTag, Space, TextStyleId } from "../../types";

/* ------------------------------------------------------------------------------------------------ */
/* Block size                                                                                       */
/* ------------------------------------------------------------------------------------------------ */

export interface BlockGeometry {
  kind: "landing" | "app";
  /** Desktop width of the block's box in px (its grid columns at 1440 px). */
  widthPx: number;
  /** Height the layout draws (app screens give blocks this height); `null` on landing screens. */
  heightPx: number | null;
}

const PAGE_PX = DESKTOP_COLUMNS * COL_PX;
/** Gap between the layout's columns (`--dl-space-5`). */
const LAYOUT_GAP = 24;
/** `--dl-sidebar-w` and twice `--_app-pad` of the app shell at desktop width. */
const SIDEBAR_PX = 256;
const APP_PAD_PX = 32;

/**
 * Desktop size of an element's block, from the layout rect of the screen that holds it (the walker gives
 * builders no size). `null` for elements outside a layout (style guide, legacy pages) or without a doc.
 */
export function blockGeometry(ctx: RenderContext, id: string): BlockGeometry | null {
  const doc = ctx.doc;
  if (!doc) return null;
  for (const screenId of doc.screenOrder) {
    const screen = Object.hasOwn(doc.screens, screenId) ? doc.screens[screenId] : undefined;
    const block = screen && Object.hasOwn(screen.layout.blocks, id) ? screen.layout.blocks[id] : undefined;
    if (!screen || !block || !Object.hasOwn(screen.page.elements, id)) continue;
    const w = Math.max(1, Math.min(DESKTOP_COLUMNS, Math.round(block.rect.w)));
    if (screen.kind === "app") {
      const content = PAGE_PX - (screen.shell && screen.shell.nav === "sidebar" ? SIDEBAR_PX : 0) - 2 * APP_PAD_PX;
      const widthPx = Math.round((w / DESKTOP_COLUMNS) * (content + LAYOUT_GAP) - LAYOUT_GAP);
      return { kind: "app", widthPx, heightPx: Math.max(1, Math.round(block.rect.h)) * ROW_UNIT };
    }
    return { kind: "landing", widthPx: w >= DESKTOP_COLUMNS ? PAGE_PX : w * COL_PX - LAYOUT_GAP / 2, heightPx: null };
  }
  return null;
}

export type UiFrame = "plain" | "card" | "section";

export const uiFrameOf = (value: unknown): UiFrame => (value === "card" || value === "section" ? value : "plain");

/** Width of the block's content: its box minus the frame's padding (or the centered container). */
export function innerWidth(geometry: BlockGeometry | null, frameKind: UiFrame, build: BuildContext): number | null {
  if (!geometry) return null;
  if (frameKind === "section") return Math.min(build.light.layout.container, geometry.widthPx - 2 * build.light.space[6]!);
  if (frameKind === "card") return geometry.widthPx - 2 * build.light.space[4]!;
  return geometry.widthPx;
}

/** px of a font size token at desktop width. */
export const fontPx = (build: BuildContext, size: "display" | "h1" | "h2" | "h3" | "body" | "small" | "caption") =>
  build.light.fontSizes[size].px;

/** Rough width of `ch` characters of a font size (`max-width: 40ch`). */
export const chWidth = (chars: number, px: number) => Math.round(chars * px * 0.55);

/** One-line text that ends in «…» when it would not fit `widthPx` (`text-overflow: ellipsis`). */
export function ellipsis(value: string, widthPx: number | null, px: number): string {
  if (widthPx === null) return value;
  const max = Math.max(3, Math.floor(widthPx / (px * 0.56)));
  return value.length <= max ? value : `${value.slice(0, Math.max(1, max - 1)).trimEnd()}…`;
}

/* ------------------------------------------------------------------------------------------------ */
/* Outer box and head                                                                               */
/* ------------------------------------------------------------------------------------------------ */

interface BlockOptions {
  tag?: SemanticTag;
  /** Main axis of the inner box (`justify-content: center` of text and form blocks). */
  justify?: Justify;
  gap?: Space;
  label?: string;
}

/**
 * `UiBlock`: the inner box (gap 4) inside nothing, a card surface, or the landing frame (background, gutters,
 * a full section of rhythm and the centered container).
 */
export function uiBlock(name: string, frameKind: UiFrame, children: (DesignNode | null | undefined | false)[], options: BlockOptions = {}): FrameNode {
  const gap = options.gap ?? 4;
  const tag = options.tag ?? "section";
  const label = options.label ? { label: options.label } : {};
  if (frameKind === "section") {
    return column({ name, tag, width: "fill", fill: { color: "background" }, align: "center", padding: { x: 7, y: { sectionPy: 1 } }, ...label }, [
      column({ name: "Inner", width: "fill", maxWidth: "container", gap, ...(options.justify && { justify: options.justify }) }, children),
    ]);
  }
  if (frameKind === "card") {
    return column(
      {
        name,
        tag,
        width: "fill",
        gap,
        padding: 5,
        fill: { color: "card" },
        stroke: { color: "border", card: true },
        radius: "card",
        shadow: "card",
        ...(options.justify && { justify: options.justify }),
        ...label,
      },
      children,
    );
  }
  return column({ name, tag, width: "fill", gap, ...(options.justify && { justify: options.justify }), ...label }, children);
}

/** Scale of the heading styles that brings `h3` (heading family and weight) to `factor` × the body size. */
export const headingAtBody = (build: BuildContext, factor = 1) =>
  Math.round(((fontPx(build, "body") * factor) / fontPx(build, "h3")) * 1000) / 1000;

/** `dl-ui__title`: the block's title (heading family, body size × 1.0625, heading weight). */
export const uiTitle = (value: unknown, level: unknown, build: BuildContext) =>
  text(value, "h3", { tag: level === "h1" ? "h1" : "h2", name: "Title", scale: headingAtBody(build, 1.0625) });

/** `dl-ui__link`: small primary text with a trailing arrow; `linkTo` is the screen the block opens. */
export function uiLink(label: unknown, linkTo: string | null | undefined): FrameNode | null {
  const content = text(label, "small", { color: "primary-text", tag: "span", weight: 500 });
  if (!content) return null;
  return row({ name: "Link", tag: "a", align: "center", gap: 1, width: "hug", ...(linkTo && { linkTo }) }, [content, icon("arrow-right", "primary-text", 14)]);
}

/** `dl-ui__head`: title (and subtitle) on the left, an optional link on the right. `null` when all are empty. */
export function uiHead(build: BuildContext, options: { title?: unknown; level?: unknown; subtitle?: unknown; link?: FrameNode | null }): FrameNode | null {
  const title = uiTitle(options.title, options.level, build);
  const subtitle = text(options.subtitle, "small", { color: "muted-foreground", tag: "p", name: "Subtitle" });
  if (!title && !subtitle && !options.link) return null;
  return row({ name: "Head", width: "fill", justify: "between", align: "center", gap: 4 }, [
    column({ name: "Heading", width: "fill", gap: { px: 2 } }, [title, subtitle]),
    options.link,
  ]);
}

/* ------------------------------------------------------------------------------------------------ */
/* Tones, avatars, icon tiles                                                                       */
/* ------------------------------------------------------------------------------------------------ */

/** `--_ui-tone` of a data tone. */
export function toneColor(tone: unknown, fallback: ColorVar = "primary"): ColorVar {
  switch (tone) {
    case "success":
    case "warning":
    case "info":
    case "destructive":
      return tone;
    case "neutral":
      return "muted-foreground";
    default:
      return fallback;
  }
}

/** `Avatar` of the kit: initials on the person's chart tone (24 % over the card). */
export function avatar(name: string, size: number): FrameNode {
  const style: TextStyleId = size >= 40 ? "small-strong" : "caption-strong";
  return row(
    {
      name: "Avatar",
      width: size,
      height: size,
      align: "center",
      justify: "center",
      radius: "full",
      fill: { color: `chart-${colorIndexOf(name)}`, opacity: 0.24 },
    },
    [text(initialsOf(name), style, { tag: "span" })],
  );
}

/** A square icon on a primary tint (`dl-ui-card__icon`, `dl-ui-placeholder__icon`). */
export function iconTile(name: string, size: number, iconSize: number, radius: "md" | "full" = "md", opacity = 0.12): FrameNode {
  return row(
    { name: "Icon", width: size, height: size, align: "center", justify: "center", radius, fill: { color: "primary", opacity } },
    [icon(name, "primary-text", iconSize)],
  );
}

/** Tag pill of the cards (`dl-ui-card__meta`): caption on muted. */
export function metaPill(value: unknown): FrameNode | null {
  const content = text(value, "caption", { color: "muted-foreground", tag: "span", weight: 500 });
  if (!content) return null;
  return row({ name: "Meta", width: "hug", padding: { x: 2, y: { px: 2 } }, radius: "badge", fill: { color: "muted" } }, [content]);
}

/* ------------------------------------------------------------------------------------------------ */
/* Form controls of the kit                                                                         */
/* ------------------------------------------------------------------------------------------------ */

export type ControlKind = "text" | "email" | "password" | "tel" | "search" | "textarea" | "select" | "checkbox";

export interface ControlSpec {
  label: string;
  kind: ControlKind;
  placeholder: string;
  required: boolean;
}

/** `dl-field__label`: the label and a red asterisk when required. */
function fieldLabel(spec: ControlSpec): FrameNode {
  return row({ name: "Label", align: "center", gap: 2, width: "fill" }, [
    text(spec.label || " ", "small-strong", { tag: "span" }),
    spec.required ? text("*", "small-strong", { color: "destructive", tag: "span" }) : null,
  ]);
}

/** `Input`, `Select`, `Textarea` or `Checkbox` of the kit, with its label above (or beside, for checkboxes). */
export function control(spec: ControlSpec): FrameNode {
  if (spec.kind === "checkbox") {
    return row({ name: "Checkbox", tag: "label", align: "center", gap: 3, width: "fill" }, [
      shape({ name: "Box", width: 18, height: 18, radius: "sm", fill: { color: "background" }, stroke: { color: "input", width: 1.5 } }),
      text(spec.label, "small", { tag: "span", width: "fill", weight: 500 }),
      spec.required ? text("*", "small-strong", { color: "destructive", tag: "span" }) : null,
    ]);
  }
  const multiline = spec.kind === "textarea";
  const leading = spec.kind === "search" ? "search" : spec.kind === "email" ? "mail" : null;
  const trailing = spec.kind === "select" ? "chevron-down" : null;
  const placeholder = spec.placeholder.trim() ? spec.placeholder : " ";
  return column({ name: "Field", gap: 2, width: "fill", tag: "label" }, [
    fieldLabel(spec),
    row(
      {
        name: multiline ? "Textarea" : spec.kind === "select" ? "Select" : "Input",
        align: multiline ? "start" : "center",
        gap: 2,
        width: "fill",
        minHeight: multiline ? 80 : 40,
        padding: { x: 3, y: multiline ? 2 : 0 },
        fill: { color: "background" },
        stroke: { color: "input" },
        radius: "input",
      },
      [
        leading ? icon(leading, "muted-foreground", 16) : null,
        text(placeholder, "small", { color: "muted-foreground", width: "fill" }),
        trailing ? icon(trailing, "muted-foreground", 16) : null,
      ],
    ),
  ]);
}

/* ------------------------------------------------------------------------------------------------ */
/* Copy                                                                                             */
/* ------------------------------------------------------------------------------------------------ */

/** The interface strings of the ui.* sections the builders show (`uiStrings` of @dialmade/sections). */
const STRINGS = {
  es: {
    today: "Hoy",
    tomorrow: "Mañana",
    moreEvents: (count: number) => `+${count} más`,
    noEvents: "Sin eventos próximos",
    nextEvent: "Próximo",
    soon: "Pronto",
    freeBlock: "Bloque libre",
    soonBlock: "Bloque en camino",
    placeholderHint: "Aún no hay una sección para este bloque.",
  },
  en: {
    today: "Today",
    tomorrow: "Tomorrow",
    moreEvents: (count: number) => `+${count} more`,
    noEvents: "No upcoming events",
    nextEvent: "Next",
    soon: "Soon",
    freeBlock: "Free block",
    soonBlock: "Block on the way",
    placeholderHint: "This block has no section yet.",
  },
} as const;

export const uiStrings = (locale: Locale) => STRINGS[locale];

/** A box that wraps a text so it can carry a link (the title of a linked card). */
export const linkBox = (child: DesignNode | null, linkTo: string): FrameNode | null =>
  child ? frame({ name: "Link", tag: "a", width: "fill", linkTo, children: [child] }) : null;
