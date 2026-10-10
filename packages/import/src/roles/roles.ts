import { ROLE_KEYS, SCALE_STEPS, cssVarName, type RoleKey } from "@dialmade/palette";
import { cleanName } from "../sanitize";
import type { Confidence, Mode } from "../types";

/**
 * Whose names a file uses. `shadcn`: has `--popover` and `--card-foreground` (then `accent` is the
 * hover surface). `dialmade`: our own export (also has `--primary-text` and `--border-strong`).
 */
export type Vocabulary = "shadcn" | "dialmade";

export interface RoleContext {
  vocabulary?: Vocabulary;
}

export interface RoleMatch {
  role: RoleKey;
  /** exact: shadcn/Dialmade name; high: Bootstrap or a deterministic rule (accent → cta); medium: heuristic. */
  confidence: Confidence;
  source: "shadcn" | "dialmade" | "bootstrap" | "heuristic";
  /** A mode found in the name (`color.dark.background`). */
  mode?: Mode;
}

export interface TokenName {
  /** Meaningful segments, lowercase, without prefixes (`--color-primary-foreground` → `primary`, `foreground`). */
  segments: string[];
  /** `segments` joined with `-`. */
  key: string;
  mode?: Mode;
  /** The name had a Bootstrap prefix (`--bs-*`). */
  bootstrap: boolean;
}

const PREFIXES = new Set(["color", "colors", "colour", "colours", "tw", "theme", "semantic", "sys", "palette", "dl", "global", "tokens", "token"]);
const MODE_WORDS: Readonly<Record<string, Mode>> = {
  dark: "dark",
  night: "dark",
  darkmode: "dark",
  light: "light",
  day: "light",
  lightmode: "light",
};

/** `--color-primaryForeground`, `color.dark.primary.DEFAULT`, `$brand_blue` → segments, key and mode. */
export function normalizeTokenName(name: string): TokenName {
  const clean = cleanName(name, 128).value.replace(/^#\//, "").replace(/^[-$@]+/, "");
  const words = clean
    .replace(/([a-z0-9])([A-Z])/g, "$1-$2")
    .toLowerCase()
    .split(/[\s./_:\\-]+/)
    .filter(Boolean);
  let mode: Mode | undefined;
  let bootstrap = false;
  const segments: string[] = [];
  words.forEach((word, i) => {
    if (i === 0 && word === "bs") {
      bootstrap = true;
      return;
    }
    const asMode = MODE_WORDS[word];
    if (asMode) {
      mode ??= asMode;
      return;
    }
    if ((word === "mode" || word === "theme") && i > 0 && MODE_WORDS[words[i - 1]!]) return;
    if (segments.length === 0 && PREFIXES.has(word)) return;
    segments.push(word);
  });
  if (segments.length > 1 && segments[segments.length - 1] === "default") segments.pop();
  return { segments, key: segments.join("-"), bootstrap, ...(mode && { mode }) };
}

/** shadcn and Dialmade CSS names → role (`primary-foreground` → `primaryForeground`). */
const EXACT: ReadonlyMap<string, RoleKey> = new Map(ROLE_KEYS.map((role) => [cssVarName(role), role]));
const SHADCN_ROLES: ReadonlySet<RoleKey> = new Set(ROLE_KEYS.slice(0, ROLE_KEYS.indexOf("chart5") + 1));

const BOOTSTRAP: Readonly<Record<string, RoleKey>> = {
  primary: "primary",
  secondary: "secondary",
  success: "success",
  info: "info",
  warning: "warning",
  danger: "destructive",
  "body-bg": "background",
  "body-color": "foreground",
  "border-color": "border",
  "secondary-color": "mutedForeground",
  "tertiary-bg": "muted",
  "focus-ring-color": "ring",
  "link-color": "primaryText",
};

const HEURISTIC: Readonly<Record<string, RoleKey>> = {
  bg: "background",
  "bg-default": "background",
  "bg-primary": "background",
  "background-default": "background",
  "background-primary": "background",
  canvas: "background",
  page: "background",
  "page-bg": "background",
  base: "background",
  "body-bg": "background",
  surface: "card",
  "surface-default": "card",
  "surface-container": "card",
  "bg-surface": "card",
  panel: "card",
  paper: "card",
  text: "foreground",
  "text-default": "foreground",
  "text-primary": "foreground",
  fg: "foreground",
  "fg-default": "foreground",
  ink: "foreground",
  "on-background": "foreground",
  "on-surface": "cardForeground",
  "body-color": "foreground",
  "text-muted": "mutedForeground",
  "text-secondary": "mutedForeground",
  "text-subtle": "mutedForeground",
  "fg-muted": "mutedForeground",
  "muted-text": "mutedForeground",
  "on-surface-variant": "mutedForeground",
  "bg-muted": "muted",
  "bg-subtle": "muted",
  subtle: "muted",
  "surface-variant": "muted",
  brand: "primary",
  "brand-primary": "primary",
  "primary-color": "primary",
  main: "primary",
  "on-primary": "primaryForeground",
  "primary-contrast": "primaryForeground",
  "text-on-primary": "primaryForeground",
  "primary-inverse": "primaryForeground",
  "brand-secondary": "secondary",
  "secondary-color": "secondary",
  "on-secondary": "secondaryForeground",
  "call-to-action": "cta",
  action: "cta",
  highlight: "cta",
  "on-accent": "ctaForeground",
  danger: "destructive",
  error: "destructive",
  negative: "destructive",
  critical: "destructive",
  "on-error": "destructiveForeground",
  "on-danger": "destructiveForeground",
  positive: "success",
  "on-success": "successForeground",
  caution: "warning",
  attention: "warning",
  "on-warning": "warningForeground",
  informative: "info",
  notice: "info",
  "on-info": "infoForeground",
  outline: "border",
  stroke: "border",
  divider: "border",
  separator: "border",
  line: "border",
  "border-default": "border",
  "outline-variant": "border",
  "border-input": "input",
  "input-border": "input",
  focus: "ring",
  "focus-ring": "ring",
  "outline-focus": "ring",
  link: "primaryText",
  "text-link": "primaryText",
  "text-brand": "primaryText",
};

/**
 * The role a color name stands for, or `null` (scale steps, sidebar variables and unknown names).
 * shadcn's `accent` is the hover surface; in any other file it is the call to action, so it maps to
 * `cta` (INFORME §4.3).
 */
export function mapRoleName(name: string, ctx: RoleContext = {}): RoleMatch | null {
  const { key, segments, mode, bootstrap } = normalizeTokenName(name);
  const stepLike = /^\d+$/.test(segments[segments.length - 1] ?? "") && !/^chart-[1-5]$/.test(key);
  if (!key || segments[0] === "sidebar" || stepLike) return null;
  const withMode = (match: RoleMatch): RoleMatch => (mode ? { ...match, mode } : match);

  if (bootstrap) {
    const role = BOOTSTRAP[key];
    return role ? withMode({ role, confidence: "high", source: "bootstrap" }) : null;
  }
  if ((key === "accent" || key === "accent-foreground") && ctx.vocabulary === undefined) {
    return withMode({ role: key === "accent" ? "cta" : "ctaForeground", confidence: "high", source: "heuristic" });
  }
  if (key === "brand" && ctx.vocabulary !== "dialmade") {
    return withMode({ role: "primary", confidence: "medium", source: "heuristic" });
  }
  const exact = EXACT.get(key) ?? (/^chart[1-5]$/.test(key) ? EXACT.get(`chart-${key.slice(5)}`) : undefined);
  if (exact) {
    return withMode({ role: exact, confidence: "exact", source: SHADCN_ROLES.has(exact) ? "shadcn" : "dialmade" });
  }
  const heuristic = HEURISTIC[key];
  return heuristic ? withMode({ role: heuristic, confidence: "medium", source: "heuristic" }) : null;
}

export type ScaleSystem = "tailwind" | "radix" | "material";

/** `--color-brand-500`, `blue.9`, `primary/40` → `{ group, step }`; `null` when the name has no step. */
export function parseScaleName(name: string): { group: string; step: number } | null {
  const { segments } = normalizeTokenName(name);
  if (segments.length < 2) return null;
  const last = segments[segments.length - 1]!;
  if (!/^\d{1,4}$/.test(last)) return null;
  const group = segments.slice(0, -1).join("-");
  const step = Number(last);
  if (group === "chart" || step > 1000) return null;
  return { group, step };
}

const TAILWIND_STEPS: ReadonlySet<number> = new Set(SCALE_STEPS);

/** Which scale convention a group of steps follows (`null` when they mix). */
export function scaleSystem(steps: Iterable<number>): ScaleSystem | null {
  const list = [...steps];
  if (list.length === 0) return null;
  if (list.every((s) => TAILWIND_STEPS.has(s as (typeof SCALE_STEPS)[number]))) return "tailwind";
  if (list.every((s) => Number.isInteger(s) && s >= 1 && s <= 12)) return "radix";
  if (list.every((s) => Number.isInteger(s) && s >= 0 && s <= 100)) return "material";
  return null;
}

/** shadcn when the names include `popover` and `card-foreground`; dialmade when they also have our extras. */
export function detectVocabulary(names: Iterable<string>): Vocabulary | undefined {
  const keys = new Set<string>();
  for (const name of names) keys.add(normalizeTokenName(name).key);
  if (!keys.has("popover") || !keys.has("card-foreground")) return undefined;
  return keys.has("primary-text") && keys.has("border-strong") ? "dialmade" : "shadcn";
}

const DARK_SELECTOR = /\.(?:dark|theme-dark|dark-mode|dark-theme)(?![\w-])|\[data-(?:theme|mode|color-scheme|bs-theme)=["']?dark(?![\w-])|prefers-color-scheme:\s*dark/;
const LIGHT_SELECTOR =
  /:root(?![\w-])|:host(?![\w-])|(?:^|[\s,>+~(])(?:html|body)(?![\w-])|\.(?:light|theme-light|light-mode|light-theme)(?![\w-])|\[data-(?:theme|mode|color-scheme|bs-theme)=["']?light(?![\w-])|prefers-color-scheme:\s*light|^\s*@theme(?![\w-])/;

/** The mode a CSS selector (or at-rule prelude) declares: `.dark`, `[data-theme="dark"]`, `:root`, `@theme`… */
export function modeFromSelector(selector: string): Mode | undefined {
  const s = cleanName(selector, 256).value.toLowerCase();
  if (DARK_SELECTOR.test(s)) return "dark";
  return LIGHT_SELECTOR.test(s) ? "light" : undefined;
}

/** `Light.tokens.json`, `theme-dark.json`, a Figma mode name → mode. */
export function modeFromName(name: string): Mode | undefined {
  const words = cleanName(name, 128).value.toLowerCase().split(/[^a-z]+/);
  for (const word of words) {
    const mode = MODE_WORDS[word];
    if (mode) return mode;
  }
  return undefined;
}
