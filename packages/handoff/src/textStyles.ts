// The text styles of the design tree, as the kit's CSS sets them (`dl-button`, `dl-badge`, section headings).
// Both emitters read this table: Figma text styles and the `text-*` utilities of the exported Tailwind CSS.
import type { FontSizeName, ResolvedTokens } from "@dialmade/doc";
import type { TextStyleId } from "./tree/types";

export type FontRole = "heading" | "body" | "mono";

export interface TextStyleSpec {
  id: TextStyleId;
  /** Figma style name (`Dialmade/H1`) and the Tailwind utility (`text-h1`). */
  label: string;
  family: FontRole;
  size: FontSizeName;
  /** Multiplier of the font size token (the kit's `calc(var(--dl-fs-body) * 1.0625)`). */
  scale?: number;
  weight: "heading" | "body" | "button" | number;
  lineHeight: "tight" | "body" | number;
  /** `heading`: `--dl-heading-tracking`; a number is em. */
  tracking: "heading" | number;
  uppercase?: boolean;
}

export const TEXT_STYLES: readonly TextStyleSpec[] = [
  { id: "display", label: "Display", family: "heading", size: "display", weight: "heading", lineHeight: "tight", tracking: "heading" },
  { id: "h1", label: "H1", family: "heading", size: "h1", weight: "heading", lineHeight: "tight", tracking: "heading" },
  { id: "h2", label: "H2", family: "heading", size: "h2", weight: "heading", lineHeight: "tight", tracking: "heading" },
  { id: "h3", label: "H3", family: "heading", size: "h3", weight: "heading", lineHeight: "tight", tracking: "heading" },
  { id: "lead", label: "Lead", family: "body", size: "body", scale: 1.0625, weight: "body", lineHeight: "body", tracking: 0 },
  { id: "body", label: "Body", family: "body", size: "body", weight: "body", lineHeight: "body", tracking: 0 },
  { id: "body-strong", label: "Body strong", family: "body", size: "body", weight: 600, lineHeight: "body", tracking: 0 },
  { id: "small", label: "Small", family: "body", size: "small", weight: "body", lineHeight: "body", tracking: 0 },
  { id: "small-strong", label: "Small strong", family: "body", size: "small", weight: 600, lineHeight: "body", tracking: 0 },
  { id: "caption", label: "Caption", family: "body", size: "caption", weight: "body", lineHeight: 1.45, tracking: 0 },
  { id: "caption-strong", label: "Caption strong", family: "body", size: "caption", weight: 600, lineHeight: 1.45, tracking: 0 },
  { id: "overline", label: "Overline", family: "body", size: "caption", weight: 600, lineHeight: 1.45, tracking: 0.08, uppercase: true },
  { id: "button", label: "Button", family: "body", size: "small", weight: "button", lineHeight: 1.2, tracking: 0 },
  { id: "button-sm", label: "Button small", family: "body", size: "caption", weight: "button", lineHeight: 1.2, tracking: 0 },
  { id: "button-lg", label: "Button large", family: "body", size: "body", weight: "button", lineHeight: 1.2, tracking: 0 },
  { id: "mono", label: "Mono", family: "mono", size: "small", weight: 400, lineHeight: 1.5, tracking: 0 },
];

export const textStyle = (id: TextStyleId): TextStyleSpec => TEXT_STYLES.find((spec) => spec.id === id) ?? TEXT_STYLES[5]!;

/** Desktop pixels (the token's max), weight, line height and tracking of a style for some tokens. */
export function resolveTextStyle(spec: TextStyleSpec, tokens: ResolvedTokens) {
  const fontSize = Math.round(tokens.fontSizes[spec.size].px * (spec.scale ?? 1) * 100) / 100;
  const weight =
    spec.weight === "heading"
      ? tokens.heading.weight
      : spec.weight === "body"
        ? tokens.bodyWeight
        : spec.weight === "button"
          ? tokens.components.button.weight
          : spec.weight;
  const lineHeight = spec.lineHeight === "tight" ? tokens.lineHeights.tight : spec.lineHeight === "body" ? tokens.lineHeights.body : spec.lineHeight;
  const tracking = spec.tracking === "heading" ? tokens.heading.tracking : spec.tracking;
  return { fontSize, weight, lineHeight, tracking };
}
