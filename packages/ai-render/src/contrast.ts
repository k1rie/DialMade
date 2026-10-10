// Gate 4, contrast (spec §7) — on TOKENS, not on pixels. AI blocks can only name theme colors (./vocabulary), so the
// text and background of every element are known from its classes and its ancestors': this resolves them with the
// document's theme in light AND dark, composites opacity modifiers and samples both ends of gradients, and checks
// WCAG AA with @dialmade/palette (4.5:1, 3:1 for display/h1–h3 sizes, 3:1 for focus outlines against the parent).
// A failure is fixed at the token level with fixed rules (a paired `*-foreground`, `text-foreground`, a gradient end
// moved to the start's hover token…), never by changing the palette. What no rule fixes becomes a warning.
// Deviation from the spec (which measured with getComputedStyle in the iframe): same result inside the vocabulary,
// deterministic, testable without a browser, and re-runnable on every palette change.
import { compositeOver, contrastRatio, parseColorWithAlpha } from "@dialmade/palette";
import { attr, type AiElement } from "./tree";
import { ROLE_COLORS, colorOfClass, splitClass } from "./vocabulary";

/** Color name (`primary`, `brand-500`) → `#rrggbb` / `#rrggbbaa`, per mode. */
export type ThemeColors = { light: Record<string, string>; dark: Record<string, string> };
export type ContrastMode = keyof ThemeColors;
const MODES: readonly ContrastMode[] = ["light", "dark"];

const TEXT_AA = 4.5;
const LARGE_AA = 3;
const UI_AA = 3;
const LARGE_SIZES = new Set(["text-display", "text-h1", "text-h2", "text-h3"]);
const SMALL_SIZES = new Set(["text-body", "text-small", "text-caption"]);

/**
 * Theme variables (`compileThemeVars` of @dialmade/doc: `--primary`, `--color-brand-500`, any CSS color, `var()`
 * references between them) → the color names of the vocabulary as hex.
 */
export function themeColorsFromVars(vars: Readonly<Record<string, string>>): Record<string, string> {
  const resolve = (value: string, depth = 0): string | null => {
    const ref = /^var\((--[\w-]+)\)$/.exec(value.trim());
    if (ref) return depth > 8 || vars[ref[1]!] === undefined ? null : resolve(vars[ref[1]!]!, depth + 1);
    return parseColorWithAlpha(value);
  };
  const out: Record<string, string> = {};
  for (const [name, value] of Object.entries(vars)) {
    const hex = resolve(value);
    if (!hex) continue;
    if (name.startsWith("--color-")) out[name.slice(8)] = hex;
    else if (ROLE_COLORS.includes(name.slice(2))) out[name.slice(2)] = hex;
  }
  return out;
}

type Paint = { color: string; opacity: number | null };
type Background = { kind: "flat"; paint: Paint } | { kind: "gradient"; stops: Paint[] };

type ElementStyle = {
  text: Paint | null;
  bg: Background | null;
  hoverText: Paint | null;
  hoverBg: Paint | null;
  size: "large" | "small" | null;
  focus: { token: string; paint: Paint } | null;
};

function styleOf(element: AiElement): ElementStyle {
  const style: ElementStyle = { text: null, bg: null, hoverText: null, hoverBg: null, size: null, focus: null };
  const stops: { from?: Paint; via?: Paint; to?: Paint } = {};
  let gradient = false;
  let flat: Paint | null = null;
  for (const token of (attr(element, "class") ?? "").split(/\s+/).filter(Boolean)) {
    const { variants, utility } = splitClass(token);
    if (variants.length === 0) {
      if (/^bg-(?:linear-to-|radial|conic)/.test(utility)) gradient = true;
      if (LARGE_SIZES.has(utility)) style.size = "large";
      if (SMALL_SIZES.has(utility)) style.size = "small";
    }
    const color = colorOfClass(utility);
    if (!color) continue;
    const paint = { color: color.color, opacity: color.opacity };
    if (variants.length === 0) {
      if (color.prefix === "text") style.text = paint;
      else if (color.prefix === "bg") flat = paint;
      else if (color.prefix === "from" || color.prefix === "via" || color.prefix === "to") stops[color.prefix] = paint;
    } else if (variants.length === 1 && variants[0] === "hover") {
      if (color.prefix === "text") style.hoverText = paint;
      else if (color.prefix === "bg") style.hoverBg = paint;
    } else if (variants.length === 1 && (variants[0] === "focus-visible" || variants[0] === "focus") && (color.prefix === "outline" || color.prefix === "ring")) {
      style.focus = { token, paint };
    }
  }
  if (gradient) {
    const transparent = { color: "transparent", opacity: null };
    style.bg = { kind: "gradient", stops: [stops.from ?? transparent, ...(stops.via ? [stops.via] : []), stops.to ?? transparent] };
  } else if (flat) style.bg = { kind: "flat", paint: flat };
  return style;
}

/** A paint as `#rrggbbaa` in `mode` (opacity modifier applied). `current` is the text color. */
function hexOf(paint: Paint, colors: Record<string, string>, current: string): string | null {
  let hex: string | undefined;
  if (paint.color === "transparent") hex = "#00000000";
  else if (paint.color === "current" || paint.color === "inherit") hex = current;
  else hex = colors[paint.color];
  if (!hex) return null;
  if (paint.opacity === null || paint.opacity >= 100) return hex;
  const base = hex.length === 9 ? Number.parseInt(hex.slice(7), 16) / 255 : 1;
  const alpha = Math.round(base * (paint.opacity / 100) * 255);
  return `${hex.slice(0, 7)}${alpha.toString(16).padStart(2, "0")}`;
}

/** Opaque samples of an element's background over its parent's samples (gradients: every stop). */
function backgroundSamples(bg: Background | null, parent: readonly string[], colors: Record<string, string>, fg: string): string[] {
  if (!bg) return [...parent];
  const paints = bg.kind === "flat" ? [bg.paint] : bg.stops;
  const out: string[] = [];
  for (const paint of paints) {
    const hex = hexOf(paint, colors, fg);
    if (!hex) return [...parent];
    for (const base of parent) out.push(compositeOver(hex, base));
  }
  return [...new Set(out)];
}

const worst = (fg: string, samples: readonly string[]) => Math.min(...samples.map((bg) => contrastRatio(fg, bg)));

export type ContrastIssue = {
  element: AiElement;
  kind: "text" | "hover" | "focus";
  mode: ContrastMode;
  ratio: number;
  need: number;
};

type Context = { fg: Record<ContrastMode, string>; bg: Record<ContrastMode, string[]>; size: "large" | "small" | null; text: Paint };

const hasOwnText = (element: AiElement) => element.children.some((child) => child.type === "text" && child.value.trim() !== "");

/** Every contrast problem of a block in both modes (no fixes). */
export function contrastIssues(root: AiElement, theme: ThemeColors): ContrastIssue[] {
  const issues: ContrastIssue[] = [];
  const start: Context = {
    fg: { light: theme.light.foreground ?? "#000000", dark: theme.dark.foreground ?? "#ffffff" },
    bg: { light: [theme.light.background ?? "#ffffff"], dark: [theme.dark.background ?? "#000000"] },
    size: null,
    text: { color: "foreground", opacity: null },
  };
  const visit = (element: AiElement, parent: Context) => {
    const style = styleOf(element);
    const context: Context = { fg: { ...parent.fg }, bg: { ...parent.bg }, size: style.size ?? parent.size, text: style.text ?? parent.text };
    for (const mode of MODES) {
      const colors = theme[mode];
      if (style.text) context.fg[mode] = hexOf(style.text, colors, parent.fg[mode]) ?? parent.fg[mode];
      context.bg[mode] = backgroundSamples(style.bg, parent.bg[mode], colors, context.fg[mode]);
      if (element.tag === "i" && attr(element, "data-icon") !== undefined) continue;
      const need = context.size === "large" ? LARGE_AA : TEXT_AA;
      if (hasOwnText(element) || element.tag === "input" || element.tag === "textarea") {
        const ratio = worst(context.fg[mode], context.bg[mode]);
        if (ratio < need - 0.005) issues.push({ element, kind: "text", mode, ratio, need });
        if (style.hoverBg || style.hoverText) {
          const fg = style.hoverText ? (hexOf(style.hoverText, colors, context.fg[mode]) ?? context.fg[mode]) : context.fg[mode];
          const bgs = style.hoverBg ? backgroundSamples({ kind: "flat", paint: style.hoverBg }, parent.bg[mode], colors, fg) : context.bg[mode];
          const hover = worst(fg, bgs);
          if (hover < need - 0.005) issues.push({ element, kind: "hover", mode, ratio: hover, need });
        }
      }
      if (style.focus) {
        const ring = hexOf(style.focus.paint, colors, context.fg[mode]);
        if (ring) {
          const ratio = worst(ring, parent.bg[mode]);
          if (ratio < UI_AA - 0.005) issues.push({ element, kind: "focus", mode, ratio, need: UI_AA });
        }
      }
    }
    for (const child of element.children) if (child.type === "element") visit(child, context);
  };
  visit(root, start);
  return issues;
}

// ── fixes ─────────────────────────────────────────────────────────────────────────

const classesOf = (element: AiElement) => (attr(element, "class") ?? "").split(/\s+/).filter(Boolean);
function setClasses(element: AiElement, classes: readonly string[]) {
  const rest = element.attrs.filter(([name]) => name !== "class");
  element.attrs = classes.length > 0 ? [["class", classes.join(" ")], ...rest] : rest;
}

/** `primary` → `primary-foreground` when the theme has it (also card, popover, accent, cta, success…). */
function pairedForeground(color: string, colors: Record<string, string>): string | null {
  if (color === "background" || color === "muted") return "foreground";
  const pair = `${color}-foreground`;
  return colors[pair] ? pair : null;
}

/** The nearest flat background color of an element or its ancestors (from the root down to it). */
function nearestBackground(path: readonly AiElement[]): string | null {
  for (let i = path.length - 1; i >= 0; i--) {
    const bg = styleOf(path[i]!).bg;
    if (bg?.kind === "flat") return bg.paint.color;
    if (bg?.kind === "gradient") return bg.stops[0]?.color ?? null;
  }
  return null;
}

function pathTo(root: AiElement, target: AiElement): AiElement[] {
  const walk = (element: AiElement, path: AiElement[]): AiElement[] | null => {
    const next = [...path, element];
    if (element === target) return next;
    for (const child of element.children) {
      if (child.type !== "element") continue;
      const found = walk(child, next);
      if (found) return found;
    }
    return null;
  };
  return walk(root, []) ?? [target];
}

/** The gradient of an element or its nearest ancestor that has one. */
function gradientOwner(path: readonly AiElement[]): AiElement | null {
  for (let i = path.length - 1; i >= 0; i--) if (styleOf(path[i]!).bg?.kind === "gradient") return path[i]!;
  return null;
}

const STATE_OF: Readonly<Record<string, string>> = { primary: "primary-hover", secondary: "secondary-hover", cta: "cta-hover", destructive: "destructive-hover" };

export type ContrastResult = { status: "ok" | "fixed" | "warn"; fixed: number; remaining: ContrastIssue[] };

/**
 * Checks `root` in both modes and fixes what the rules can, in place: (1) a gradient whose end breaks the text moves
 * that end to the start's state token (`to-accent` → `to-primary-hover`) or to the start itself; (2) the text takes
 * the foreground paired with its background (`text-primary-foreground` on `bg-primary`), else `text-foreground`,
 * else the first of a few safe pairs that passes in BOTH modes; (3) a hover fill gets the same treatment on
 * `hover:text-*`; (4) a focus outline that does not show becomes `outline-foreground`. Never touches the palette.
 */
export function fixContrast(root: AiElement, theme: ThemeColors): ContrastResult {
  let fixed = 0;
  const passes = (element: AiElement, kind: ContrastIssue["kind"]) => !contrastIssues(root, theme).some((issue) => issue.element === element && issue.kind === kind);
  const tryClasses = (element: AiElement, kind: ContrastIssue["kind"], candidates: readonly string[][]): boolean => {
    const original = classesOf(element);
    for (const classes of candidates) {
      setClasses(element, classes);
      if (passes(element, kind)) return true;
    }
    setClasses(element, original);
    return false;
  };

  for (let round = 0; round < 3; round++) {
    const issues = contrastIssues(root, theme);
    if (issues.length === 0) break;
    const handled = new Set<AiElement>();
    for (const issue of issues) {
      const element = issue.element;
      if (handled.has(element)) continue;
      handled.add(element);
      const classes = classesOf(element);
      const path = pathTo(root, element);
      if (issue.kind === "focus") {
        const swap = (color: string) =>
          classes.map((token) => {
            const { variants, utility } = splitClass(token);
            const paint = variants.length === 1 && (variants[0] === "focus-visible" || variants[0] === "focus") ? colorOfClass(utility) : null;
            return paint && (paint.prefix === "outline" || paint.prefix === "ring") ? `${variants[0]}:${paint.prefix}-${color}` : token;
          });
        if (tryClasses(element, "focus", ["foreground", "primary", "background"].map(swap))) fixed++;
        continue;
      }
      if (issue.kind === "hover") {
        const hoverBg = styleOf(element).hoverBg?.color;
        // A scale step used as a hover fill (`hover:bg-cta-600`) becomes the state token (`hover:bg-cta-hover`): the
        // normative token, kept even when the text still needs a fix below.
        const group = hoverBg ? /^(brand|cta)-\d+$/.exec(hoverBg)?.[1] : undefined;
        let current = classes;
        if (group) {
          current = classes.map((token) => (/^hover:bg-/.test(token) ? `hover:bg-${group === "brand" ? "primary" : group}-hover` : token));
          setClasses(element, current);
          fixed++;
          if (passes(element, "hover")) continue;
        }
        const options: string[][] = [];
        const swapped = styleOf(element).hoverBg?.color ?? hoverBg;
        const pair = swapped ? pairedForeground(swapped.replace(/-hover$/, ""), theme.light) : null;
        const base = current.filter((token) => !/^hover:text-/.test(token));
        for (const color of [pair, "foreground", "background"]) if (color) options.push([...base, `hover:text-${color}`]);
        if (tryClasses(element, "hover", options)) fixed++;
        continue;
      }
      // (1) gradient ends
      const owner = gradientOwner(path);
      if (owner) {
        const ownerClasses = classesOf(owner);
        const from = ownerClasses.map((token) => colorOfClass(splitClass(token).utility)).find((color) => color?.prefix === "from")?.color;
        const replacements = [from && STATE_OF[from], from].filter((value): value is string => !!value);
        let done = false;
        for (const replacement of replacements) {
          const next = ownerClasses.map((token) => {
            const color = splitClass(token).variants.length === 0 ? colorOfClass(splitClass(token).utility) : null;
            return color && (color.prefix === "to" || color.prefix === "via") ? `${color.prefix}-${replacement}` : token;
          });
          const before = classesOf(owner);
          setClasses(owner, next);
          if (passes(element, "text")) {
            done = true;
            break;
          }
          setClasses(owner, before);
        }
        if (done) {
          fixed++;
          continue;
        }
      }
      // (2) the text color
      const bg = nearestBackground(path);
      const pair = bg ? pairedForeground(bg, theme.light) : null;
      const base = classes.filter((token) => !(splitClass(token).variants.length === 0 && colorOfClass(splitClass(token).utility)?.prefix === "text"));
      const colors = [pair, "foreground", "primary-foreground", "background", "card-foreground"].filter((value, i, all): value is string => !!value && all.indexOf(value) === i);
      // A translucent tint of the element itself (`bg-primary-foreground/15` on a badge) that lowers the contrast goes.
      const untinted = classes.filter((token) => {
        const color = splitClass(token).variants.length === 0 ? colorOfClass(splitClass(token).utility) : null;
        return !(color?.prefix === "bg" && color.opacity !== null && color.opacity < 100);
      });
      const options = [...colors.map((color) => [...base, `text-${color}`]), ...(untinted.length < classes.length ? [untinted] : [])];
      if (tryClasses(element, "text", options)) fixed++;
    }
  }
  const remaining = contrastIssues(root, theme);
  return { status: remaining.length > 0 ? "warn" : fixed > 0 ? "fixed" : "ok", fixed, remaining };
}
