import type { DesignDoc } from "../schema";
import { FONT_SIZE_NAMES, RADIUS_NAMES } from "../tokens";
import { resolveExport, type ExportOptions } from "./shared";

/** Figma variable scopes (Plugin API `VariableScope`) used by the number variables. */
export type FigmaScope =
  | "CORNER_RADIUS"
  | "GAP"
  | "WIDTH_HEIGHT"
  | "FONT_SIZE"
  | "FONT_WEIGHT"
  | "STROKE_FLOAT";

export interface FigmaNumberToken {
  $type: "number";
  $value: number;
  $extensions: { "com.figma.scopes": FigmaScope[] };
}

export interface FigmaNumberGroup {
  [name: string]: FigmaNumberToken | FigmaNumberGroup;
}

const num = (value: number, ...scopes: FigmaScope[]): FigmaNumberToken => ({
  $type: "number",
  $value: value,
  $extensions: { "com.figma.scopes": scopes },
});

/**
 * Number variables for Figma's Variables import (one file, the same in every mode): radius, space,
 * font sizes and weights, border width, layout and `component/*` (e.g. `component/button/radius`,
 * a pill is 9999). Values are px without unit; scopes go in `com.figma.scopes`. Colors stay in
 * @dialmade/palette's `toFigmaTokens(theme, mode)`.
 */
export function toFigmaNumberVars(doc: DesignDoc, options: ExportOptions = {}): FigmaNumberGroup {
  const t = resolveExport(doc, options).light;

  const radius: FigmaNumberGroup = {};
  for (const name of RADIUS_NAMES) radius[name] = num(t.radius[name], "CORNER_RADIUS");
  const space: FigmaNumberGroup = {};
  t.space.forEach((px, i) => (space[String(i + 1)] = num(px, "GAP", "WIDTH_HEIGHT")));
  const fontSize: FigmaNumberGroup = {};
  for (const name of FONT_SIZE_NAMES) fontSize[name] = num(t.fontSizes[name].px, "FONT_SIZE");

  const { button, card, input, badge, nav, table, sidebar } = t.components;
  return {
    radius,
    space,
    "font-size": fontSize,
    "font-weight": {
      heading: num(t.heading.weight, "FONT_WEIGHT"),
      body: num(t.bodyWeight, "FONT_WEIGHT"),
      button: num(button.weight, "FONT_WEIGHT"),
    },
    "border-width": num(t.borderWidth, "STROKE_FLOAT"),
    layout: {
      container: num(t.layout.container, "WIDTH_HEIGHT"),
      "section-py": num(t.layout.sectionPy, "GAP"),
    },
    component: {
      button: {
        radius: num(button.radius.px, "CORNER_RADIUS"),
        "height-sm": num(button.hSm, "WIDTH_HEIGHT"),
        "height-md": num(button.hMd, "WIDTH_HEIGHT"),
        "height-lg": num(button.hLg, "WIDTH_HEIGHT"),
        "padding-x": num(button.px.px, "GAP"),
        "font-weight": num(button.weight, "FONT_WEIGHT"),
      },
      card: {
        radius: num(card.radius.px, "CORNER_RADIUS"),
        padding: num(card.padding.px, "GAP"),
        "border-width": num(card.border?.width ?? 0, "STROKE_FLOAT"),
      },
      input: { radius: num(input.radius.px, "CORNER_RADIUS"), height: num(input.h.px, "WIDTH_HEIGHT") },
      badge: { radius: num(badge.radius.px, "CORNER_RADIUS") },
      nav: { height: num(nav.h, "WIDTH_HEIGHT") },
      table: { "row-height": num(table.rowH, "WIDTH_HEIGHT") },
      sidebar: { width: num(sidebar.w, "WIDTH_HEIGHT") },
    },
  };
}
