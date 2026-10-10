// The Tailwind v4 `@theme` of AI blocks («tema Dialmade», spec §2.2). It declares ONLY the vocabulary of
// ./vocabulary, every value pointing at a variable of the theme contract (@dialmade/ui/contract) and nothing of
// Tailwind's default theme (no palette, no type scale, no radii, no shadows): a class outside the vocabulary has no
// theme value and compiles to nothing. `inline reference`: the utilities read the contract variables directly and no
// theme variable is emitted (the scales are already called `--color-brand-500`, emitting them would make a cycle).
import { CONTAINER_SIZES, ROLE_COLORS, SCALE_COLORS, TYPE_SIZES } from "./vocabulary";

/** rem of Tailwind's container scale (the `@sm:` … `@7xl:` container queries and `max-w-*`). */
const CONTAINER_REM: Readonly<Record<(typeof CONTAINER_SIZES)[number], number>> = {
  "3xs": 16,
  "2xs": 18,
  xs: 20,
  sm: 24,
  md: 28,
  lg: 32,
  xl: 36,
  "2xl": 42,
  "3xl": 48,
  "4xl": 56,
  "5xl": 64,
  "6xl": 72,
  "7xl": 80,
};

const TIGHT_SIZES = new Set(["display", "h1", "h2", "h3"]);

function themeLines(): string[] {
  const lines: string[] = ["--spacing: 0.25rem;"];
  for (const [name, rem] of Object.entries(CONTAINER_REM)) lines.push(`--container-${name}: ${rem}rem;`);
  lines.push("--container-container: var(--dl-container);", "--container-prose: 65ch;");
  for (const color of ROLE_COLORS) lines.push(`--color-${color}: var(--${color});`);
  for (const color of SCALE_COLORS) lines.push(`--color-${color}: var(--color-${color});`);
  for (const size of TYPE_SIZES) {
    lines.push(`--text-${size}: var(--dl-fs-${size});`);
    lines.push(`--text-${size}--line-height: var(--dl-lh-${TIGHT_SIZES.has(size) ? "tight" : "body"});`);
  }
  lines.push(
    "--font-heading: var(--dl-font-heading);",
    "--font-body: var(--dl-font-body);",
    "--font-mono: var(--dl-font-mono);",
    "--font-weight-light: 300;",
    "--font-weight-normal: 400;",
    "--font-weight-medium: 500;",
    "--font-weight-semibold: 600;",
    "--font-weight-bold: 700;",
    "--font-weight-extrabold: 800;",
    "--font-weight-black: 900;",
    "--leading-tight: var(--dl-lh-tight);",
    "--leading-body: var(--dl-lh-body);",
    "--leading-none: 1;",
    "--leading-snug: 1.375;",
    "--leading-normal: 1.5;",
    "--leading-relaxed: 1.625;",
    "--tracking-tighter: -0.05em;",
    "--tracking-tight: var(--dl-heading-tracking);",
    "--tracking-normal: 0em;",
    "--tracking-wide: 0.025em;",
    "--tracking-wider: 0.05em;",
    "--tracking-widest: 0.1em;",
    "--radius-sm: var(--dl-radius-sm);",
    "--radius-md: var(--dl-radius-md);",
    "--radius-lg: var(--dl-radius-lg);",
    "--radius-xl: var(--dl-radius-xl);",
    "--radius-card: var(--dl-card-radius);",
    "--radius-button: var(--dl-button-radius);",
    "--radius-input: var(--dl-input-radius);",
    "--radius-badge: var(--dl-badge-radius);",
    "--shadow-sm: var(--dl-shadow-sm);",
    "--shadow-md: var(--dl-shadow-md);",
    "--shadow-lg: var(--dl-shadow-lg);",
    "--shadow-card: var(--dl-card-shadow);",
    "--shadow-button: var(--dl-button-shadow);",
    "--spacing-section: var(--dl-section-py);",
    "--ease-dl: var(--dl-ease);",
    "--ease-in: cubic-bezier(0.4, 0, 1, 1);",
    "--ease-out: cubic-bezier(0, 0, 0.2, 1);",
    "--ease-in-out: cubic-bezier(0.4, 0, 0.2, 1);",
    "--default-transition-duration: var(--dl-duration-fast);",
    "--default-transition-timing-function: var(--dl-ease);",
    "--aspect-video: 16 / 9;",
  );
  for (let step = 1; step <= 10; step++) lines.push(`--spacing-dl-${step}: var(--dl-space-${step});`);
  return lines;
}

/** `@theme inline reference { … }` of the vocabulary. */
export function themeBlock(): string {
  return `@theme inline reference {\n${themeLines()
    .map((line) => `  ${line}`)
    .join("\n")}\n}\n`;
}

/** Input of `compile()` (./css): the theme plus the utilities layer. Preflight is added by the caller. */
export const AI_TAILWIND_INPUT = `${themeBlock()}@tailwind utilities;\n`;

/**
 * `theme.css` of the TSX export (spec §2.4): paste it after `@import "tailwindcss"` in a Tailwind v4 project that
 * also loads Dialmade's own theme.css (the variables). Same vocabulary, so the copied components look the same.
 */
export function exportThemeCss(): string {
  return [
    "/* Dialmade · «Diseño con IA»: the Tailwind v4 vocabulary of the AI blocks. */",
    "/* Load after @import \"tailwindcss\" and Dialmade's theme.css (which defines the variables). */",
    themeBlock(),
  ].join("\n");
}
