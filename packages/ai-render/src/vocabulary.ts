// The «tema Dialmade» vocabulary (spec §2.2): the Tailwind v4 classes an AI block may use. Every color, radius,
// shadow, font and type size names a token of the theme contract (@dialmade/ui/contract), so palette, recipe and
// light/dark changes repaint the block without regenerating it. The grammar is checked token by token BEFORE the CSS
// is compiled: a class outside it is dropped (it would not paint anything either, see ./theme) and counted.
import { COLOR_VARS } from "@dialmade/ui/contract";

/** Color names of the contract (`--primary` → `primary`) plus the 50–950 scales of @dialmade/palette. */
export const SCALE_GROUPS = ["brand", "cta", "neutral", "success", "warning", "error", "info"] as const;
export const SCALE_STEPS = ["50", "100", "200", "300", "400", "500", "600", "700", "800", "900", "950"] as const;
export const ROLE_COLORS: readonly string[] = COLOR_VARS.map((name) => name.slice(2));
export const SCALE_COLORS: readonly string[] = SCALE_GROUPS.flatMap((group) => SCALE_STEPS.map((step) => `${group}-${step}`));
/** Keywords Tailwind resolves without the theme. Named colors (`white`, `red-500`) are not here on purpose. */
const KEYWORD_COLORS = ["transparent", "current", "inherit"] as const;
const COLOR_SET: ReadonlySet<string> = new Set([...ROLE_COLORS, ...SCALE_COLORS, ...KEYWORD_COLORS]);

export const TYPE_SIZES = ["display", "h1", "h2", "h3", "body", "small", "caption"] as const;
export const FONT_FAMILIES = ["heading", "body", "mono"] as const;
export const RADII = ["none", "sm", "md", "lg", "xl", "full", "card", "button", "input", "badge"] as const;
export const SHADOWS = ["none", "sm", "md", "lg", "card", "button"] as const;
export const CONTAINER_SIZES = ["3xs", "2xs", "xs", "sm", "md", "lg", "xl", "2xl", "3xl", "4xl", "5xl", "6xl", "7xl"] as const;

/** The numeric spacing scale (× 0.25rem) plus `px`, the theme's `dl-1…10` steps and `section`. */
const SPACE_STEPS = [
  "0", "px", "0.5", "1", "1.5", "2", "2.5", "3", "3.5", "4", "5", "6", "7", "8", "9", "10", "11", "12", "14", "16",
  "20", "24", "28", "32", "36", "40", "44", "48", "52", "56", "60", "64", "72", "80", "96",
];
const SPACE = `(?:${SPACE_STEPS.map((s) => s.replace(".", "\\.")).join("|")}|dl-(?:[1-9]|10)|section)`;
const FRACTION = "(?:1/2|1/3|2/3|1/4|3/4|1/5|2/5|3/5|4/5|1/6|5/6|full)";
const OPACITY = "(?:0|5|10|15|20|25|30|35|40|45|50|55|60|65|70|75|80|85|90|95|100)";
const COLOR_PREFIXES = "bg|text|border|border-[trblxyse]|ring|ring-offset|outline|divide|from|via|to|fill|stroke|decoration|placeholder|caret|accent|shadow";

/**
 * Variants an AI class may carry. No viewport variants (`sm:`, `md:`): blocks answer to the width of their cell
 * through container queries (`@md:`). No `dark:`: dark mode comes from the tokens. No arbitrary variants.
 */
const STATE_VARIANTS = new Set([
  "hover", "focus", "focus-visible", "focus-within", "active", "disabled", "first", "last", "odd", "even",
  "group-hover", "group-focus-within", "group-focus-visible", "placeholder", "motion-safe", "motion-reduce",
  "aria-selected", "aria-expanded", "aria-pressed", "aria-checked", "aria-disabled",
]);
const CONTAINER_VARIANT = new RegExp(`^@(?:${CONTAINER_SIZES.join("|")})$`);
const MAX_VARIANTS = 3;

/** Static utilities (exact names). */
const STATIC = new Set([
  // display & layout
  "block", "inline-block", "inline", "flex", "inline-flex", "grid", "inline-grid", "hidden", "contents", "flow-root",
  "table", "table-row", "table-cell", "list-item", "isolate", "@container",
  "flex-row", "flex-col", "flex-row-reverse", "flex-col-reverse", "flex-wrap", "flex-nowrap", "flex-wrap-reverse",
  "flex-1", "flex-auto", "flex-none", "flex-initial", "grow", "grow-0", "shrink", "shrink-0",
  "grid-flow-row", "grid-flow-col", "grid-flow-dense", "auto-rows-fr", "auto-rows-min", "auto-rows-auto", "auto-cols-fr",
  "relative", "absolute", "static", "overflow-hidden", "overflow-auto", "overflow-clip", "overflow-visible",
  "overflow-x-auto", "overflow-y-auto", "overflow-x-hidden", "overflow-y-hidden",
  "mx-auto", "my-auto", "ml-auto", "mr-auto", "ms-auto", "me-auto", "mt-auto", "mb-auto",
  "w-full", "w-auto", "w-fit", "w-min", "w-max", "min-w-0", "min-w-full", "max-w-full", "max-w-none", "max-w-prose",
  "max-w-container", "h-full", "h-auto", "h-fit", "h-px", "min-h-0", "min-h-full", "max-h-full", "size-full", "size-auto",
  "inset-0", "inset-x-0", "inset-y-0", "top-0", "right-0", "bottom-0", "left-0", "z-0", "z-10",
  "aspect-square", "aspect-video", "aspect-auto",
  // typography
  "uppercase", "lowercase", "capitalize", "normal-case", "italic", "not-italic", "underline", "no-underline",
  "line-through", "underline-offset-2", "underline-offset-4", "truncate", "text-ellipsis", "text-clip",
  "whitespace-normal", "whitespace-nowrap", "whitespace-pre-line", "break-words", "break-all", "wrap-break-word",
  "tabular-nums", "oldstyle-nums", "lining-nums", "slashed-zero", "ordinal", "antialiased", "subpixel-antialiased",
  "text-left", "text-center", "text-right", "text-start", "text-end", "text-justify", "text-balance", "text-pretty",
  "text-wrap", "text-nowrap", "list-disc", "list-decimal", "list-none", "list-inside", "list-outside",
  "align-top", "align-middle", "align-bottom", "align-baseline",
  // borders & effects
  "border", "border-0", "border-2", "border-4", "border-solid", "border-dashed", "border-dotted", "border-none",
  "border-collapse", "border-separate", "ring", "ring-0", "ring-1", "ring-2", "ring-4", "ring-inset",
  "ring-offset-0", "ring-offset-1", "ring-offset-2", "ring-offset-4",
  "outline", "outline-none", "outline-hidden", "outline-0", "outline-1", "outline-2", "outline-offset-0", "outline-offset-2", "outline-offset-4",
  "divide-x", "divide-y", "divide-x-0", "divide-y-0", "divide-x-2", "divide-y-2", "divide-solid", "divide-dashed",
  "bg-none", "bg-radial", "bg-conic", "bg-cover", "bg-center",
  "transition", "transition-all", "transition-colors", "transition-opacity", "transition-shadow", "transition-transform", "transition-none",
  "ease-dl", "ease-linear", "ease-in", "ease-out", "ease-in-out",
  "duration-75", "duration-100", "duration-150", "duration-200", "duration-300",
  "cursor-pointer", "cursor-default", "cursor-not-allowed", "select-none", "select-text", "pointer-events-none",
  "pointer-events-auto", "sr-only", "not-sr-only", "appearance-none", "resize-none", "resize-y",
  "object-cover", "object-contain", "object-center", "object-top", "group", "peer", "scroll-smooth",
  "table-auto", "table-fixed", "caption-bottom",
]);

/** Families checked by pattern: [regex, name]. */
const PATTERNS: readonly (readonly [RegExp, string])[] = [
  [new RegExp(`^(?:p|px|py|pt|pr|pb|pl|ps|pe)-${SPACE}$`), "padding"],
  [new RegExp(`^(?:m|mx|my|mt|mr|mb|ml|ms|me)-${SPACE}$`), "margin"],
  [new RegExp(`^(?:gap|gap-x|gap-y)-${SPACE}$`), "gap"],
  [new RegExp(`^space-[xy]-${SPACE}$`), "space"],
  [new RegExp(`^(?:w|min-w|h|min-h|max-h|size)-${SPACE}$`), "size"],
  [new RegExp(`^(?:w|h|basis)-${FRACTION}$`), "fraction"],
  [new RegExp(`^basis-(?:${SPACE}|auto)$`), "basis"],
  [new RegExp(`^max-w-(?:${CONTAINER_SIZES.join("|")})$`), "max-width"],
  [new RegExp(`^(?:inset|inset-x|inset-y|top|right|bottom|left|start|end)-${SPACE}$`), "inset"],
  [/^-?translate-[xy]-(?:0|px|0\.5|1|1\.5|2|3|4)$/, "translate"],
  [/^-?rotate-(?:0|1|2|3|6|12)$/, "rotate"],
  [/^scale-(?:95|98|100|102|105)$/, "scale"],
  [/^opacity-(?:0|5|10|20|25|30|40|50|60|70|75|80|90|95|100)$/, "opacity"],
  [/^grid-cols-(?:[1-9]|1[0-2]|none|subgrid)$/, "grid-cols"],
  [/^grid-rows-(?:[1-6]|none|subgrid)$/, "grid-rows"],
  [/^col-(?:span-(?:[1-9]|1[0-2]|full)|start-(?:[1-9]|1[0-3]|auto)|end-(?:[1-9]|1[0-3]|auto)|auto)$/, "col"],
  [/^row-(?:span-(?:[1-6]|full)|start-[1-7]|end-[1-7]|auto)$/, "row"],
  [/^order-(?:first|last|none|[1-6])$/, "order"],
  [/^(?:items|self)-(?:start|end|center|baseline|stretch|auto)$/, "align"],
  [/^(?:justify|content)-(?:start|end|center|between|around|evenly|stretch|normal)$/, "justify"],
  [/^(?:justify-items|justify-self|place-items|place-content|place-self)-(?:start|end|center|stretch|auto|between|around|evenly)$/, "place"],
  [/^line-clamp-(?:[1-6]|none)$/, "line-clamp"],
  [/^aspect-(?:4\/3|3\/2|16\/9|3\/4|2\/3|21\/9)$/, "aspect"],
  [/^bg-linear-to-(?:t|tr|r|br|b|bl|l|tl)$/, "gradient"],
  [/^(?:from|via|to)-(?:0|10|20|25|30|40|50|60|70|75|80|90|100)%$/, "gradient-stop"],
  [/^(?:border|border-[trblxyse])-(?:0|2|4)$/, "border-width"],
  [/^stroke-(?:0|1|2)$/, "stroke-width"],
  [new RegExp(`^font-(?:${FONT_FAMILIES.join("|")})$`), "font-family"],
  [/^font-(?:light|normal|medium|semibold|bold|extrabold|black)$/, "font-weight"],
  [new RegExp(`^text-(?:${TYPE_SIZES.join("|")})$`), "type-size"],
  [/^leading-(?:tight|body|none|snug|normal|relaxed)$/, "leading"],
  [/^tracking-(?:tighter|tight|normal|wide|wider|widest)$/, "tracking"],
  [new RegExp(`^rounded(?:-(?:t|r|b|l|s|e|tl|tr|bl|br|ss|se|es|ee))?(?:-(?:${RADII.join("|")}))?$`), "radius"],
  [new RegExp(`^shadow(?:-(?:${SHADOWS.join("|")}))?$`), "shadow"],
];

const COLOR_UTILITY = new RegExp(`^(${COLOR_PREFIXES})-(.+?)(?:/(${OPACITY}))?$`);

export type ClassCheck = { ok: true } | { ok: false; reason: ClassRejection };
export type ClassRejection = "arbitrary" | "important" | "variant" | "color" | "position" | "negative" | "z-index" | "unknown";

const REJECT = (reason: ClassRejection): ClassCheck => ({ ok: false, reason });

/** Utility part (no variants) against the vocabulary. */
function checkUtility(utility: string): ClassCheck {
  if (STATIC.has(utility)) return { ok: true };
  if (utility === "fixed" || utility === "sticky") return REJECT("position");
  if (/^-?z-/.test(utility)) return REJECT("z-index");
  if (utility.startsWith("-") && !/^-(?:translate|rotate)-/.test(utility)) return REJECT("negative");
  for (const [pattern] of PATTERNS) if (pattern.test(utility)) return { ok: true };
  const color = COLOR_UTILITY.exec(utility);
  if (color) {
    const name = color[2]!;
    if (COLOR_SET.has(name)) return { ok: true };
    // `text-h1` and friends are type sizes, matched above; anything else with a color prefix is an unknown color.
    return REJECT("color");
  }
  return REJECT("unknown");
}

/** One class token of an AI block against the grammar of spec §2.2. */
export function checkClass(token: string): ClassCheck {
  if (token.length === 0 || token.length > 64) return REJECT("unknown");
  if (/[[\](){}\\'"`;<>]|url/i.test(token)) return REJECT("arbitrary");
  if (token.includes("!")) return REJECT("important");
  const parts = token.split(":");
  const utility = parts.pop()!;
  if (parts.length > MAX_VARIANTS) return REJECT("variant");
  for (const variant of parts) {
    if (!STATE_VARIANTS.has(variant) && !CONTAINER_VARIANT.test(variant)) return REJECT("variant");
  }
  return checkUtility(utility);
}

/** `true` when the class names a color of the theme (used by the contrast gate and the coherence gate). */
export function colorOfClass(utility: string): { prefix: string; color: string; opacity: number | null } | null {
  const match = COLOR_UTILITY.exec(utility);
  if (!match || !COLOR_SET.has(match[2]!)) return null;
  return { prefix: match[1]!, color: match[2]!, opacity: match[3] === undefined ? null : Number(match[3]) };
}

/** Splits a class token into its variants and utility (no validation). */
export function splitClass(token: string): { variants: string[]; utility: string } {
  const parts = token.split(":");
  const utility = parts.pop() ?? "";
  return { variants: parts, utility };
}

/** A short description of the vocabulary for the prompt (kept next to the grammar so both change together). */
export const VOCABULARY_SUMMARY = {
  colors: ROLE_COLORS,
  scales: `${SCALE_GROUPS.join(", ")} × ${SCALE_STEPS.join("/")}`,
  typeSizes: TYPE_SIZES,
  fonts: FONT_FAMILIES,
  radii: RADII,
  shadows: SHADOWS,
  containers: CONTAINER_SIZES,
  space: SPACE_STEPS,
  opacity: OPACITY,
};
