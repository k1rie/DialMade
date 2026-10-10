import type { Confidence, Fingerprint, FontSizeName, IMPORT_SOURCE_KINDS, ImportMethod, Ownership } from "@dialmade/doc";
import type { Oklch, RoleKey } from "@dialmade/palette";

export type { Confidence, ImportMethod as Method, Ownership, RoleKey };

export type Mode = "light" | "dark";

/** `paste` … `font-name` are v1; `tailwind-config` … `url` arrive later (same list as @dialmade/doc). */
export type ImportSourceKind = (typeof IMPORT_SOURCE_KINDS)[number];

/** The parsers of this version. Each lives in `src/parsers/<id>/`. */
export type ParserId = "paste" | "css" | "tokens" | "design-md" | "screenshot" | "fonts";

/**
 * Formats the detector and the parsers report (lowercase slugs, as @dialmade/doc stores them).
 * `figma-rest` is detected only to say it is not supported (Enterprise-only API, out of v1).
 */
export type KnownFormat =
  | "color-list"
  | "coolors"
  | "text"
  | "shadcn-oklch"
  | "shadcn-hsl"
  | "tailwind-v4"
  | "css-compiled"
  | "css"
  | "dtcg-2025.10"
  | "dtcg"
  | "dtcg-resolver"
  | "figma-native"
  | "figma-rest"
  | "tokens-studio"
  | "style-dictionary"
  | "json"
  | "design-md"
  | "markdown"
  | "font-names"
  | "next-font"
  | "png"
  | "jpeg"
  | "webp"
  | "gif"
  | "avif"
  | "heic"
  | "bmp"
  | "svg"
  | "pdf"
  | "ase"
  | "aco"
  | "gpl"
  | "scss"
  | "tailwind-config"
  | "woff2"
  | "woff"
  | "otf"
  | "ttf"
  | "zip"
  | "empty"
  | "binary"
  | "unknown";

/** One imported file or paste. The file itself is never kept: only its name, size and SHA-256. */
export interface ImportSource {
  /** Stable per content: `<kind>-<first 10 hex of sha256>` (a re-import of the same file keeps it). */
  id: string;
  kind: ImportSourceKind;
  format: string;
  fileName: string;
  sha256: string;
  bytes: number;
  /** `css@1.0.0` */
  parser: string;
  ownership: Ownership;
  /** ISO date of «Es mi marca o tengo permiso de su titular» (own sources only). */
  rightsConfirmedAt?: string;
}

/** Where a value came from. `locator`: `globals.css:12 --primary`, `#/color/brand/500`, `captura 2`. */
export interface Prov {
  sourceId: string;
  locator: string;
  confidence: Confidence;
  method: ImportMethod;
}

/** A detection the user can accept, edit, dismiss or lock in «Esto detectamos». */
export interface Detected extends Prov {
  /** Unique in the batch: `<sourceId>:<item>`. Selections refer to it. */
  id: string;
  /** Near-identical detections merged into this one (other files or variables), strongest first. */
  also?: Prov[];
}

export interface ImportedColor extends Detected {
  /** Opaque `#rrggbb`. */
  hex: string;
  oklch: Oklch;
  /** 0–1, only when below 1 (shadcn's dark `--border` is white at 0.1). */
  alpha?: number;
  /** Variable or token name as written (`--primary`, `color.brand.500`), cleaned. */
  name?: string;
  mode?: Mode;
  role?: RoleKey;
  /** 50–950 (Tailwind), 1–12 (Radix) or 0–100 (Material). */
  scale?: { group: string; step: number };
  /** Same value as Tailwind's or shadcn's default theme: «no es tu marca». */
  isFrameworkDefault?: boolean;
  /** Another detection holds the same role and mode with more precedence. */
  overriddenBy?: string;
}

export type FontRole = "heading" | "body" | "mono";

/**
 * `system`: only system or generic families (`-apple-system`, `system-ui`); they go to the fallback stack.
 * `metric-compatible`: free family with the same metrics (Arial → Arimo).
 */
export type FontMatchKind = "google" | "alias" | "metric-compatible" | "style-alt" | "system" | "none";

export interface FontMatch {
  kind: FontMatchKind;
  /** The Google Fonts family to load (canonical name), when there is one. */
  family?: string;
  /** Up to 3 when a fuzzy search is not unique. */
  candidates?: string[];
}

export interface ImportedFont extends Detected {
  /** As declared (cleaned), e.g. `Inter`, `Brand Grotesk`, `-apple-system`. */
  family: string;
  role: FontRole;
  weights: number[];
  /** The rest of the stack, in order (system families and generic keywords). */
  fallback: string[];
  match: FontMatch;
  overriddenBy?: string;
}

export type DimUnit = "px" | "rem" | "em";

/** A dimension; `px` is computed (rem/em with a 16 px base, then `assumed`). */
export interface Dim {
  value: number;
  unit: DimUnit;
  px: number;
  assumed?: boolean;
}

export interface ShadowLayerValue {
  x: number;
  y: number;
  blur: number;
  spread: number;
  /** Opaque `#rrggbb`; transparency goes to `alpha`. */
  color: string;
  alpha: number;
  inset?: boolean;
}

export interface Shadow {
  /** `sm`, `md`, `lg`, `xl`… as declared (`--shadow-md` → `md`; bare `--shadow` → `DEFAULT`). */
  name: string;
  layers: ShadowLayerValue[];
}

export interface TypeStyle {
  /** As declared: `h1`, `display`, `text-xl`, `heading.large`. */
  name: string;
  /** The DesignDoc step it maps to, when known. */
  step?: FontSizeName;
  fontSize?: Dim;
  /** Unitless. */
  lineHeight?: number;
  /** In em. */
  letterSpacing?: number;
  weight?: number;
  family?: string;
}

export interface ImportedShape {
  /** Base radius (shadcn `--radius`). */
  radius?: Dim & Detected;
  /** Named radii (`sm`, `md`, `lg`, `xl`, `2xl`, `full`…). */
  radii?: Record<string, Dim & Detected>;
  shadows?: (Shadow & Detected)[];
  borderWidth?: Dim & Detected;
}

export interface ImportedSpacing {
  /** Tailwind v4 `--spacing` (the unit of `p-1`). */
  base?: Dim & Detected;
  /** Named steps (`1`, `2`, `4`, `sm`, `md`…). */
  scale?: Record<string, Dim & Detected>;
}

export interface ScreenshotSummary {
  sourceId: string;
  width: number;
  height: number;
  mode: Mode | "ambiguous";
  neutralTint: { h: number; c: number };
  vibrancy: { c: number; l: number };
  accentCandidate?: string;
  /** Up to 12 opaque swatches; the vision AI refers to them by index (it never returns hex). */
  swatches: string[];
  /** Style fingerprint (pixel heuristics or the vision AI). */
  fingerprint?: Fingerprint;
}

export type WarningCode =
  | "too-many-files"
  | "too-many-images"
  | "file-too-large"
  | "image-too-large"
  | "empty-file"
  | "duplicate-file"
  | "unsupported-format"
  | "logo-file"
  | "invalid-utf8"
  | "parse-error"
  | "parser-not-implemented"
  | "non-color"
  | "transparent"
  | "invalid-color"
  | "invalid-value"
  | "dangerous-key"
  | "too-deep"
  | "too-many-nodes"
  | "too-many-tokens"
  | "line-truncated"
  | "name-truncated"
  | "overridden"
  | "framework-default-theme"
  | "mode-generated"
  | (string & {});

export interface ImportWarning {
  /** The file's source id, or `batch` for the batch itself. */
  sourceId: string;
  code: WarningCode;
  detail?: string;
}

/** Why a value was not read, for the UI to translate (the `reason` text stays as an English detail). */
export type UnresolvedCode =
  | "not-evaluated"
  | "alias-cycle"
  | "missing-ref"
  | "remote-ref"
  | "too-deep"
  | "invalid-value"
  | "missing-file"
  | "other";

export interface Unresolved {
  sourceId: string;
  /** Where in the file: `--ring`, `theme.extend.colors.brand`, `#/color/accent`. */
  path: string;
  /** `color-mix() is not evaluated`, `alias cycle`, `missing file colors.json`. */
  reason: string;
  code: UnresolvedCode;
}

export type LogoChoice = "guide" | "logo" | "guide-primary-logo-secondary";

/** The imported guide and the logo disagree (ΔEok > 0.06): the card offers three choices, «guide» first. */
export interface LogoConflict {
  role: "primary" | "secondary";
  /** Id of the guide's color. */
  guideId: string;
  guide: string;
  logo: string;
  deltaE: number;
  choices: LogoChoice[];
}

export interface RecipeMatch {
  /** Closest of the 12 catalog recipes (always one: imported values override it at compile time). */
  id: string;
  /** 0 (identical) – 1. */
  distance: number;
  /** Below `RECIPE_CLOSE_DISTANCE`. */
  close: boolean;
  /** Top 3, closest first. */
  ranking: { id: string; distance: number }[];
  /** Features that were compared. */
  basis: string[];
}

/** A DesignDoc `system` value a guide implies (`/system/button/shape`), e.g. from DESIGN.md `components`. */
export interface SystemHint {
  component: "button" | "input" | "badge";
  key: "shape" | "weight";
  value: "square" | "rounded" | "pill" | number;
}

export type FileStatus = "parsed" | "skipped" | "failed";

/** One line per input file, so the panel shows errors per file without blocking the rest. */
export interface ImportFileReport {
  index: number;
  name: string;
  sourceId: string;
  status: FileStatus;
  format: string;
  parserId?: ParserId;
  code?: WarningCode;
  detail?: string;
}

/** Everything detected in a batch, before the user reviews it. Nothing here is applied yet. */
export interface ImportedBrand {
  version: 1;
  sources: ImportSource[];
  files: ImportFileReport[];
  colors: ImportedColor[];
  fonts: ImportedFont[];
  shape: ImportedShape;
  spacing?: ImportedSpacing;
  typeScale?: (TypeStyle & Detected)[];
  /** Component shapes and weights (`/system/*`); never locked by default. */
  system?: (SystemHint & Detected)[];
  screenshots?: ScreenshotSummary[];
  /** DESIGN.md prose (Overview, Do's and Don'ts), uninterpreted. */
  notes: string[];
  warnings: ImportWarning[];
  unresolved: Unresolved[];
  conflicts: LogoConflict[];
  recipe?: RecipeMatch;
}

// ── parser output ───────────────────────────────────────────────────────────────
// Parsers return fragments without `sourceId` and ids: the core stamps them, normalizes colors and
// matches fonts, so a parser cannot spoof another source.

export type ProvInput = Omit<Prov, "sourceId">;

export interface ParsedColor extends ProvInput {
  /** Any CSS color (`oklch(1 0 0 / 10%)`, `hsl(222.2 84% 4.9%)`, `#3a5bd9`, `color(display-p3 …)`). */
  value: string;
  name?: string;
  mode?: Mode;
  role?: RoleKey;
  scale?: { group: string; step: number };
}

export interface FontCandidate extends ProvInput {
  role: FontRole;
  /** A CSS `font-family` value or its entries in order. Undefined `var(--font-x)` are left as is. */
  stack: string | readonly string[];
  weights?: readonly number[];
}

export type ParsedDim = Dim & ProvInput;

export interface ParseOutput {
  /** The format, refined by the parser (`shadcn-hsl` instead of `css`). */
  format?: string;
  colors?: ParsedColor[];
  fonts?: FontCandidate[];
  shape?: {
    radius?: ParsedDim;
    radii?: Record<string, ParsedDim>;
    shadows?: (Shadow & ProvInput)[];
    borderWidth?: ParsedDim;
  };
  spacing?: { base?: ParsedDim; scale?: Record<string, ParsedDim> };
  typeScale?: (TypeStyle & ProvInput)[];
  system?: (SystemHint & ProvInput)[];
  screenshot?: Omit<ScreenshotSummary, "sourceId">;
  notes?: string[];
  warnings?: { code: WarningCode; detail?: string }[];
  /** `code` is inferred from `reason` when the parser does not give one. */
  unresolved?: { path: string; reason: string; code?: UnresolvedCode }[];
}
