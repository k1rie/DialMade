// `dialmade.css` of the TSX export: Tailwind v4, the theme (the contract's variables in light and `.dark`),
// role colors and fonts as Tailwind theme values, and one utility per text style of the design tree.
import { COLOR_VARS } from "@dialmade/ui/contract";
import { toThemeCss, type DesignDoc, type ExportOptions } from "@dialmade/doc";
import { TEXT_STYLES, type TextStyleSpec } from "../textStyles";

const FONT_SIZE_VAR: Record<string, string> = {
  display: "--dl-fs-display",
  h1: "--dl-fs-h1",
  h2: "--dl-fs-h2",
  h3: "--dl-fs-h3",
  body: "--dl-fs-body",
  small: "--dl-fs-small",
  caption: "--dl-fs-caption",
};

function utility(spec: TextStyleSpec, bodyWeight: number): string {
  const size = `var(${FONT_SIZE_VAR[spec.size]})`;
  const weight =
    spec.weight === "heading"
      ? "var(--dl-heading-weight)"
      : spec.weight === "button"
        ? "var(--dl-button-weight)"
        : spec.weight === "body"
          ? String(bodyWeight)
          : String(spec.weight);
  const lines = [
    `  font-family: var(--dl-font-${spec.family});`,
    `  font-size: ${spec.scale ? `calc(${size} * ${spec.scale})` : size};`,
    `  font-weight: ${weight};`,
    `  line-height: ${spec.lineHeight === "tight" ? "var(--dl-lh-tight)" : spec.lineHeight === "body" ? "var(--dl-lh-body)" : spec.lineHeight};`,
    `  letter-spacing: ${spec.tracking === "heading" ? "var(--dl-heading-tracking)" : spec.tracking === 0 ? "0" : `${spec.tracking}em`};`,
    ...(spec.uppercase ? ["  text-transform: uppercase;"] : []),
  ];
  return `@utility text-${spec.id} {\n${lines.join("\n")}\n}`;
}

/** The stylesheet the exported components need. Import it once, from the app's entry CSS. */
export function tsxCss(doc: DesignDoc, options: ExportOptions & { bodyWeight?: number } = {}): string {
  const colors = COLOR_VARS.map((name) => `  --color-${name.slice(2)}: var(${name});`);
  return [
    `/* ${doc.brand.name.replace(/\*\//g, "")} · Dialmade · Tailwind v4 */`,
    '@import "tailwindcss";',
    "",
    "@custom-variant dark (&:where(.dark, .dark *));",
    "",
    // `.light` forces the light values inside a dark page (a frame with `mode: "light"`).
    toThemeCss(doc, { ...options, selector: ":root, .light" }).trimEnd(),
    "",
    "@theme inline {",
    ...colors,
    "  --font-heading: var(--dl-font-heading);",
    "  --font-body: var(--dl-font-body);",
    "  --font-mono: var(--dl-font-mono);",
    "}",
    "",
    ...TEXT_STYLES.map((spec) => utility(spec, options.bodyWeight ?? 400)).flatMap((block) => [block, ""]),
    "@layer base {",
    "  body {",
    "    background: var(--background);",
    "    color: var(--foreground);",
    "    font-family: var(--dl-font-body);",
    "    line-height: var(--dl-lh-body);",
    "  }",
    "}",
    "",
  ].join("\n");
}
