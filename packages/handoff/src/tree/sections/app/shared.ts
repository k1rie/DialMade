// Pieces shared by the `app.*` builders: the widget header, delta badges, avatars, sparklines, icon buttons and
// form controls of @dialmade/ui as the dashboard widgets draw them, plus the app strings and formatters the
// sections use internally (not exported by @dialmade/sections, mirrored here).
import type { Locale } from "@dialmade/catalog";
import { orderedScreens, type DesignDoc } from "@dialmade/doc";
import { formatDelta, formatMoney, formatValue, type ValueFormat } from "@dialmade/sections";
import { colorIndexOf, initialsOf } from "@dialmade/ui";
import type { BuildContext } from "../../context";
import { column, frame, grid, icon, row, shape, text } from "../../nodes";
import type { ColorVar, DesignNode, FrameNode, ShapeNode, Size, TextNode, TextStyleId } from "../../types";

/* ------------------------------------------------------------------------------------------------ */
/* Strings (`appStrings` of @dialmade/sections/app/content)                                         */
/* ------------------------------------------------------------------------------------------------ */

const STRINGS = {
  es: {
    help: "Ayuda",
    export: "Exportar",
    filters: "Filtros",
    filterRows: "Filtrar…",
    viewAll: "Ver todo",
    searchShortcut: "⌘K",
    settings: {
      general: "General",
      generalHint: "Así te ven tu equipo y tus clientes.",
      notifications: "Notificaciones",
      notificationsHint: "Elige qué avisos recibe tu equipo.",
      name: "Nombre del espacio",
      email: "Correo de contacto",
      emailHint: "Aquí llegan las facturas y los avisos importantes.",
      language: "Idioma",
      timezone: "Zona horaria",
      about: "Descripción",
      cancel: "Cancelar",
      save: "Guardar cambios",
    },
    galleryEyebrow: (brand: string) => `${brand} · UI kit`,
  },
  en: {
    help: "Help",
    export: "Export",
    filters: "Filters",
    filterRows: "Filter…",
    viewAll: "View all",
    searchShortcut: "⌘K",
    settings: {
      general: "General",
      generalHint: "How your team and customers see you.",
      notifications: "Notifications",
      notificationsHint: "Choose which alerts your team gets.",
      name: "Workspace name",
      email: "Contact email",
      emailHint: "Invoices and important notices go here.",
      language: "Language",
      timezone: "Time zone",
      about: "Description",
      cancel: "Cancel",
      save: "Save changes",
    },
    galleryEyebrow: (brand: string) => `${brand} · UI kit`,
  },
} as const;

export const appStrings = (locale: Locale) => STRINGS[locale];

/** `LANGUAGE_OPTIONS` of the settings form. */
export const LANGUAGE_LABELS: Readonly<Record<string, string>> = { es: "Español", en: "English", pt: "Português", fr: "Français" };

/* ------------------------------------------------------------------------------------------------ */
/* Formatters (`ChartCard/summary.ts`)                                                              */
/* ------------------------------------------------------------------------------------------------ */

const ADDITIVE = new Set<ValueFormat>(["number", "compact", "currency", "decimal"]);

/** Headline of a chart: the period total (or the last value when the unit does not add up) and its change. */
export function chartSummary(values: readonly number[], format: ValueFormat, locale: Locale): { value: string; delta: number } {
  const last = values.at(-1) ?? 0;
  const previous = values.at(-2) ?? last;
  const headline = ADDITIVE.has(format) ? values.reduce((sum, value) => sum + value, 0) : last;
  const delta = previous === 0 ? 0 : Math.round(((last - previous) / Math.abs(previous)) * 1000) / 10;
  return { value: formatValue(headline, format === "number" ? "compact" : format, locale), delta };
}

/** Short tick labels: compact numbers, money with its currency. */
export function axisFormatter(format: ValueFormat, locale: Locale): (value: number) => string {
  if (format === "currency") return (value) => formatMoney(Math.round(value), locale);
  if (format === "percent" || format === "duration" || format === "ms") return (value) => formatValue(value, format, locale);
  return (value) => formatValue(value, "compact", locale);
}

/* ------------------------------------------------------------------------------------------------ */
/* Where an element sits (its width on the desktop frame)                                           */
/* ------------------------------------------------------------------------------------------------ */

/** Type of an element id in the document (app pages first, then screens). */
export function elementType(doc: DesignDoc, id: string | undefined): string | null {
  if (!id) return null;
  const app = doc.pages.app?.elements[id];
  if (app) return app.type;
  for (const screen of orderedScreens(doc)) {
    const element = screen.page.elements[id];
    if (element) return element.type;
  }
  return null;
}

/** Columns a widget spans in the shell's 12-column content grid (`.dl-app-shell__content` container queries). */
export const SHELL_SPANS: Readonly<Record<string, number>> = {
  "app.chartCard": 8,
  "app.activity": 4,
  "app.settingsForm": 7,
  "app.confirmDialog": 5,
};

/** Page padding and widget gap of the shell's density, as spacing steps (`--_app-pad`, `--_app-gap`). */
export function shellDensity(density: unknown): { pad: number; gap: number } {
  if (density === "compact") return { pad: 5, gap: 4 };
  if (density === "spacious") return { pad: 7, gap: 6 };
  return { pad: 6, gap: 5 };
}

/** Props of the `app.shell` around an element (its screen's frame, or the legacy dashboard's root), if any. */
export function shellAround(doc: DesignDoc, id: string): Record<string, unknown> | null {
  for (const screen of orderedScreens(doc)) {
    if (!screen.page.elements[id]) continue;
    const shell = Object.values(screen.page.elements).find((element) => element.type === "app.shell" && element.children.length > 0);
    return shell ? (shell.props as Record<string, unknown>) : null;
  }
  const elements = doc.pages.app?.elements ?? {};
  if (!elements[id]) return null;
  const shell = Object.values(elements).find((element) => element.type === "app.shell");
  return shell ? (shell.props as Record<string, unknown>) : null;
}

/** `--_app-gap` where a widget sits: the shell's density gap inside a shell, `--dl-space-5` elsewhere. */
export const appGap = (doc: DesignDoc, id: string): number => {
  const shell = shellAround(doc, id);
  return shell ? shellDensity(shell.density).gap : 5;
};

/**
 * Estimated desktop width of an element in px: its block's columns on a screen (app content beside the sidebar,
 * landing container), or its span in a legacy shell. Charts use it for bar widths and tick thinning.
 */
export function elementWidth(build: BuildContext, id: string, type: string): number {
  const space = (step: number) => build.light.space[step - 1] ?? 0;
  const doc = build.doc;
  for (const screen of orderedScreens(doc)) {
    const block = screen.layout.blocks[id];
    if (!block || !screen.page.elements[id]) continue;
    const span = Math.max(1, Math.min(12, block.rect.w));
    if (screen.kind === "app") {
      const shell = screen.page.elements.shell;
      const { pad, gap } = shellDensity(shell?.props.density);
      const side = shell && shell.props.variant !== "topnav" ? (shell.props.variant === "rail" ? 72 : build.light.components.sidebar.w) : 0;
      const content = Math.min(1440 - side, build.light.layout.container + 2 * space(pad)) - 2 * space(pad);
      return Math.round(((content - 11 * space(gap)) / 12) * span + (span - 1) * space(gap));
    }
    const content = Math.min(build.light.layout.container, 1440 - 2 * space(7));
    return Math.round(((content - 11 * space(5)) / 12) * span + (span - 1) * space(5));
  }
  const shell = Object.values(doc.pages.app?.elements ?? {}).find((element) => element.type === "app.shell");
  const { pad, gap } = shellDensity(shell?.props.density);
  const content = Math.min(1440 - build.light.components.sidebar.w, build.light.layout.container + 2 * space(pad)) - 2 * space(pad);
  const span = SHELL_SPANS[type] ?? 12;
  return Math.round(((content - 11 * space(gap)) / 12) * span + (span - 1) * space(gap));
}

/* ------------------------------------------------------------------------------------------------ */
/* Small pieces                                                                                     */
/* ------------------------------------------------------------------------------------------------ */

/** `WidgetHeader`: h2 and muted description on the start, actions on the end. */
export function widgetHeader(title: unknown, description: unknown, actions: (DesignNode | null | undefined | false)[] = []): FrameNode {
  const present = actions.filter((node): node is DesignNode => !!node);
  return row({ name: "Widget header", width: "fill", justify: "between", align: "start", gap: 3 }, [
    column({ name: "Heading", width: "fill", gap: { px: 2 } }, [
      text(title, "body-strong", { color: "card-foreground", tag: "h2" }),
      text(description, "small", { color: "muted-foreground", tag: "p" }),
    ]),
    present.length > 0 ? row({ name: "Actions", align: "center", gap: 2 }, present) : null,
  ]);
}

export type KitBadgeVariant = "default" | "neutral" | "success" | "warning" | "info" | "destructive" | "outline";

const KIT_BADGE: Record<KitBadgeVariant, { tone: ColorVar; text: ColorVar }> = {
  default: { tone: "primary", text: "primary-text" },
  neutral: { tone: "muted-foreground", text: "foreground" },
  success: { tone: "success", text: "success" },
  warning: { tone: "warning", text: "warning" },
  info: { tone: "info", text: "info" },
  destructive: { tone: "destructive", text: "destructive" },
  outline: { tone: "muted-foreground", text: "foreground" },
};

/** `Badge` of the kit (soft): tone at 13 %, caption 600, optional dot or leading icon. */
export function kitBadge(
  label: unknown,
  variant: KitBadgeVariant = "default",
  options: { dot?: boolean; icon?: string; size?: "sm" | "md"; solid?: boolean } = {},
): FrameNode | null {
  const { tone, text: fg } = KIT_BADGE[variant];
  const solid = options.solid === true && variant !== "outline";
  const color: ColorVar = solid ? (variant === "neutral" ? "background" : variant === "default" ? "primary-foreground" : `${tone}-foreground`) : fg;
  const content = text(label, "caption-strong", { color, tag: "span" });
  if (!content) return null;
  return row(
    {
      name: `Badge/${variant}`,
      align: "center",
      gap: 1,
      minHeight: options.size === "sm" ? 18 : 22,
      padding: { x: options.size === "sm" ? { px: 6 } : 2 },
      radius: "badge",
      ...(variant === "outline"
        ? { stroke: { color: "border-strong" } }
        : { fill: solid ? { color: variant === "neutral" ? "foreground" : tone } : { color: tone, opacity: 0.13 } }),
    },
    [
      options.dot ? shape({ name: "Dot", shape: "ellipse", width: 6, height: 6, fill: { color: solid ? color : tone }, role: "decor" }) : null,
      options.icon ? icon(options.icon, color, 13) : null,
      content,
    ],
  );
}

/** `DeltaBadge`: the signed change as a soft badge, green when it is good news. */
export function deltaBadge(delta: number, locale: Locale, invert = false, size: "sm" | "md" = "md"): FrameNode | null {
  const good = delta === 0 ? null : delta > 0 !== invert;
  const variant: KitBadgeVariant = good === null ? "neutral" : good ? "success" : "destructive";
  const node = kitBadge(formatDelta(delta, locale), variant, {
    size,
    ...(delta !== 0 && { icon: delta > 0 ? "arrow-up-right" : "arrow-down-right" }),
  });
  return node ? { ...node, name: "Delta" } : null;
}

/**
 * Inline text with mixed weights («**Actor** did something»): one text per word in a wrapping row with a
 * space-wide gap, so it wraps like a paragraph (the tree's texts have a single style; trailing spaces inside
 * texts would collapse in the TSX flex items).
 */
export function inlineText(name: string, parts: { text: string; style: TextStyleId; color?: ColorVar }[]): FrameNode {
  const words = parts.flatMap((part) => part.text.split(/\s+/).filter(Boolean).map((word) => ({ word, part })));
  return row(
    { name, width: "fill", wrap: true, gap: { px: 4 } },
    words.map(({ word, part }): TextNode => ({
      type: "text",
      text: word,
      style: part.style,
      color: part.color ?? "foreground",
      tag: "span",
    })),
  );
}

const AVATAR_PX = { xs: 24, sm: 32, md: 40 } as const;

/** `Avatar` without photo: initials on the tone of the name (`chart-1`…`chart-5` at 24 %). */
export function avatar(name: string, size: keyof typeof AVATAR_PX = "sm", square = false): FrameNode {
  const px = AVATAR_PX[size];
  // `color-mix(tone 24%, card)`: the tone at 24 % over a card-colored base.
  return row({ name: `Avatar/${size}`, width: px, height: px, radius: square ? "sm" : "full", fill: { color: "card" }, clip: true, label: name }, [
    row({ name: "Initials", width: px, height: px, align: "center", justify: "center", fill: { color: `chart-${colorIndexOf(name)}`, opacity: 0.24 } }, [
      text(initialsOf(name), "caption-strong", { color: "foreground", tag: "span" }),
    ]),
  ]);
}

/** Avatar with its status dot (sidebar user). */
export function avatarWithStatus(name: string, status: ColorVar = "success"): FrameNode {
  return frame({
    name: "Avatar with status",
    width: 32,
    layout: { kind: "tracks", columns: [1], rows: [32], areas: null },
    children: [
      { ...avatar(name, "sm"), area: CELL },
      {
        ...row({ name: "Status", width: 32, height: 32, align: "end", justify: "end" }, [
          shape({ name: "Status dot", shape: "ellipse", width: 10, height: 10, fill: { color: status }, stroke: { color: "background", width: 2 }, role: "decor" }),
        ]),
        area: CELL,
      },
    ],
  });
}

/** The single cell of an overlay (`tracks` with one column and one row): its children sit on top of each other. */
export const CELL = { name: "cell", colStart: 1, colEnd: 2, rowStart: 1, rowEnd: 2 } as const;

/** Children stacked in one place (later ones on top), `height` px tall. */
export function overlay(name: string, height: number, layers: (FrameNode | ShapeNode | null)[], options: { width?: Size; label?: string } = {}): FrameNode {
  return frame({
    name,
    width: options.width ?? "fill",
    ...(options.label && { label: options.label }),
    layout: { kind: "tracks", columns: [1], rows: [height], areas: null },
    children: layers.filter((layer): layer is FrameNode | ShapeNode => !!layer).map((layer) => ({ ...layer, area: CELL })),
  });
}

/** `IconButton` (ghost): a square of the button height with its icon. */
export function iconButton(name: string, glyph: string, color: ColorVar = "foreground", size: "sm" | "md" = "sm"): FrameNode {
  const px = size === "sm" ? 32 : 40;
  return row({ name: `Icon button/${name}`, tag: "button", width: px, height: px, align: "center", justify: "center", radius: "button", label: name }, [
    icon(glyph, color, size === "sm" ? 16 : 18),
  ]);
}

/** The menu glyph of the top bar (three lines; the kit has no `menu` icon). */
export function menuButton(color: ColorVar): FrameNode {
  const line = (i: number) => shape({ name: `Line ${i}`, width: 11, height: 1.5, radius: "full", fill: { color }, role: "decor" });
  return row({ name: "Icon button/menu", tag: "button", width: 32, height: 32, align: "center", justify: "center", radius: "button" }, [
    column({ name: "Menu glyph", width: 11, gap: { px: 2 } }, [line(1), line(2), line(3)]),
  ]);
}

/** `.dl-app-shell__mark`: the brand monogram on the primary color. */
export function brandMark(monogram: string, fill: ColorVar = "primary", color: ColorVar = "primary-foreground"): FrameNode {
  return row({ name: "Mark", width: 32, height: 32, align: "center", justify: "center", radius: "md", fill: { color: fill } }, [
    text(monogram, "caption-strong", { color, tag: "span" }),
  ]);
}

/* ------------------------------------------------------------------------------------------------ */
/* Sparkline                                                                                        */
/* ------------------------------------------------------------------------------------------------ */

/** Values sampled at `count` evenly spaced points (linear between the given ones). */
export function resample(values: readonly number[], count: number): number[] {
  if (values.length === 0) return [];
  if (values.length === 1) return Array.from({ length: count }, () => values[0]!);
  return Array.from({ length: count }, (_, k) => {
    const at = ((k + 0.5) / count) * (values.length - 1);
    const i = Math.min(values.length - 2, Math.floor(at));
    const t = at - i;
    return values[i]! + (values[i + 1]! - values[i]!) * smooth(t);
  });
}

/** Ease between two points so the stepped line reads like the kit's monotone curve. */
const smooth = (t: number) => t * t * (3 - 2 * t);

/**
 * One column of an area/line drawing: empty space down to the value, a `line` px cap in the series color and
 * the area under it (`area` paint, or nothing for a bare line).
 */
export function plotColumn(name: string, height: number, top: number, color: ColorVar, area: FrameNode["fill"] | null, line = 2): FrameNode {
  const y = Math.max(0, Math.min(height - line, Math.round(top * 10) / 10));
  return column({ name, width: "fill", height, justify: "end" }, [
    shape({ name: "Line", width: "fill", height: line, fill: { color }, role: "bar" }),
    area && height - y - line > 0 ? shape({ name: "Area", width: "fill", height: Math.round((height - y - line) * 10) / 10, fill: area, role: "bar" }) : null,
    !area && y + line < height ? shape({ name: "Gap", width: "fill", height: Math.round((height - y - line) * 10) / 10, role: "decor" }) : null,
  ]);
}

/** `Sparkline` of a stat card: a 40 px trend drawn as thin columns (area at 12 %, 2 px line). */
export function sparkline(values: readonly number[], sentiment: "positive" | "negative" | "neutral"): FrameNode | null {
  if (values.length < 2) return null;
  const height = 40;
  const color: ColorVar = sentiment === "negative" ? "destructive" : "chart-1";
  const min = Math.min(...values);
  const span = Math.max(...values) - min || 1;
  const samples = resample(values, 64);
  return row(
    { name: "Sparkline", width: "fill", height, align: "end", label: "trend" },
    samples.map((value, i) => plotColumn(`s${i}`, height, ((2 + (1 - (value - min) / span) * 28) / 32) * height, color, { color, opacity: 0.12 })),
  );
}

/* ------------------------------------------------------------------------------------------------ */
/* Form controls                                                                                    */
/* ------------------------------------------------------------------------------------------------ */

type ControlOptions = {
  label?: unknown;
  value?: unknown;
  placeholder?: unknown;
  hint?: unknown;
  leadingIcon?: string;
  trailingIcon?: string;
  trailing?: DesignNode | null;
  size?: "sm" | "md";
  width?: Size;
  multiline?: boolean;
  name?: string;
};

/** `Input` / `Select` / `Textarea` of the kit: label, the field box with its value (or placeholder) and a hint. */
export function control(options: ControlOptions): FrameNode {
  const size = options.size ?? "md";
  const style: TextStyleId = size === "sm" ? "caption" : "small";
  const value = text(options.value, style, { color: "foreground", width: "fill" });
  const box = row(
    {
      name: options.multiline ? "Textarea" : (options.name ?? "Input"),
      align: options.multiline ? "start" : "center",
      gap: 2,
      width: "fill",
      minHeight: options.multiline ? 94 : size === "sm" ? 32 : 40,
      padding: { x: size === "sm" ? 2 : 3, y: options.multiline ? 2 : 0 },
      fill: { color: "background" },
      stroke: { color: "input" },
      radius: "input",
    },
    [
      options.leadingIcon ? icon(options.leadingIcon, "muted-foreground", size === "sm" ? 14 : 16) : null,
      value ?? text(options.placeholder ?? " ", style, { color: "muted-foreground", width: "fill" }),
      options.trailing ?? null,
      options.trailingIcon ? icon(options.trailingIcon, "muted-foreground", 16) : null,
    ],
  );
  if (!options.label && !options.hint) return { ...box, width: options.width ?? "fill" };
  return column({ name: "Field", gap: 2, width: options.width ?? "fill", tag: "label" }, [
    text(options.label, "small-strong", { tag: "span" }),
    box,
    text(options.hint, "caption", { color: "muted-foreground" }),
  ]);
}

/** `Switch`: the 36×20 track with its thumb. */
export function switchTrack(on: boolean): FrameNode {
  return row(
    {
      name: on ? "Switch/on" : "Switch/off",
      width: 36,
      height: 20,
      align: "center",
      justify: on ? "end" : "start",
      padding: { px: 2 },
      radius: "full",
      fill: { color: on ? "primary" : "input" },
    },
    [shape({ name: "Thumb", shape: "ellipse", width: 16, height: 16, fill: { color: on ? "primary-foreground" : "background" }, shadow: "sm", role: "decor" })],
  );
}

/** `Checkbox` (unchecked or checked). */
export function checkbox(checked = false): ShapeNode | FrameNode {
  if (checked) {
    return row({ name: "Checkbox/checked", width: 18, height: 18, align: "center", justify: "center", radius: "sm", fill: { color: "primary" } }, [
      icon("check", "primary-foreground", 14),
    ]);
  }
  return shape({ name: "Checkbox", width: 18, height: 18, radius: "sm", fill: { color: "background" }, stroke: { color: "input", width: 1.5 } });
}

/** `Progress` (sm): a track and its value, as a share of 20 equal columns (the tree has no proportional widths). */
export function progressBar(value: number, tone: ColorVar = "primary", height = 6): FrameNode {
  const span = Math.max(0, Math.min(20, Math.round(Math.max(0, Math.min(100, value)) / 5)));
  return grid({ name: "Progress", columns: 20, gap: 0, height, radius: "full", fill: { color: tone, opacity: 0.16 }, clip: true }, [
    span > 0 ? { ...shape({ name: "Value", width: "fill", height, radius: "full", fill: { color: tone } }), place: { col: 0, span, row: 0 } } : null,
  ]);
}
