// Inline SVG of page mode: the drawings a section paints itself (a product mockup, a kiln shelf, a forecast line). A
// small allowlist, without dependencies: the sanitizer uses it, and so does the preview runtime's second wall. Tag and
// attribute names are lowercase (the HTML parser restores the camelCase of SVG when it reads them back).
import { oklabMix } from "./pageCss";

/** SVG elements a section may draw with. No `use`, `image`, `foreignObject`, `script`, `a`, `animate*` or filters. */
export const SVG_TAGS: ReadonlySet<string> = new Set([
  "svg", "g", "path", "rect", "circle", "ellipse", "line", "polyline", "polygon", "text", "tspan", "defs",
  "lineargradient", "radialgradient", "stop", "clippath", "mask", "pattern", "title", "desc",
]);

/** Dropped and counted as hostile when they appear inside an SVG: code, links, other documents. */
export const SVG_HOSTILE: ReadonlySet<string> = new Set(["script", "foreignobject", "use", "image", "feimage", "a", "iframe", "handler", "listener", "set", "animate", "animatemotion", "animatetransform"]);

const NUMBERS = /^[-+\d.eE%\s,]{1,200}$/;
const LENGTH = /^(?:[-+]?\d*\.?\d+(?:e[-+]?\d+)?(?:px|%|em|rem)?|auto)$/i;
const PATH = /^[MmZzLlHhVvCcSsQqTtAa\d\s,.eE+-]{1,8000}$/;
const TRANSFORM = /^(?:\s*(?:translate|rotate|scale|skewX|skewY|matrix)\(\s*[-+\d.eE\s,]{1,120}\)\s*)+$/i;
const LOCAL_REF = /^url\(\s*#([A-Za-z][\w-]{0,80})\s*\)$/;
/** A paint the theme can switch: none, currentColor, transparent, a theme variable or a color-mix of them; a gradient by local id. */
const PAINT = /^(?:none|currentcolor|transparent|inherit|var\(--[a-z0-9-]{1,48}\)|color-mix\(in (?:oklch|oklab|srgb),\s*var\(--[a-z0-9-]{1,48}\)(?:\s+\d{1,3}%)?,\s*(?:var\(--[a-z0-9-]{1,48}\)|transparent)(?:\s+\d{1,3}%)?\))$/i;

/** Attributes an SVG element keeps, by kind of value. `id` and references are prefixed by the sanitizer. */
const SVG_ATTRS: Readonly<Record<string, "numbers" | "length" | "path" | "transform" | "paint" | "ref" | "enum" | "text" | "id">> = {
  viewbox: "numbers", width: "length", height: "length", x: "length", y: "length", x1: "length", y1: "length", x2: "length", y2: "length",
  cx: "length", cy: "length", r: "length", rx: "length", ry: "length", dx: "length", dy: "length", fx: "length", fy: "length",
  offset: "length", "stroke-width": "length", "stroke-dashoffset": "length", "stroke-miterlimit": "numbers", "stroke-dasharray": "numbers",
  "font-size": "length", "letter-spacing": "length", pathlength: "numbers",
  opacity: "numbers", "fill-opacity": "numbers", "stroke-opacity": "numbers", "stop-opacity": "numbers",
  d: "path", points: "numbers",
  transform: "transform", gradienttransform: "transform", patterntransform: "transform",
  fill: "paint", stroke: "paint", "stop-color": "paint",
  "clip-path": "ref", mask: "ref",
  "stroke-linecap": "enum", "stroke-linejoin": "enum", "fill-rule": "enum", "clip-rule": "enum", "text-anchor": "enum", "dominant-baseline": "enum",
  gradientunits: "enum", patternunits: "enum", patterncontentunits: "enum", preserveaspectratio: "enum", "font-weight": "enum", "vector-effect": "enum",
  focusable: "enum",
  id: "id",
};

const ENUMS: Readonly<Record<string, RegExp>> = {
  "stroke-linecap": /^(?:butt|round|square)$/,
  "stroke-linejoin": /^(?:miter|round|bevel|arcs|miter-clip)$/,
  "fill-rule": /^(?:nonzero|evenodd)$/,
  "clip-rule": /^(?:nonzero|evenodd)$/,
  "text-anchor": /^(?:start|middle|end)$/,
  "dominant-baseline": /^(?:auto|middle|central|hanging|alphabetic|text-before-edge|text-after-edge)$/,
  gradientunits: /^(?:userSpaceOnUse|objectBoundingBox)$/i,
  patternunits: /^(?:userSpaceOnUse|objectBoundingBox)$/i,
  patterncontentunits: /^(?:userSpaceOnUse|objectBoundingBox)$/i,
  preserveaspectratio: /^(?:none|x(?:Min|Mid|Max)Y(?:Min|Mid|Max)(?:\s+(?:meet|slice))?)$/i,
  "font-weight": /^(?:normal|bold|[1-9]00)$/,
  "vector-effect": /^(?:none|non-scaling-stroke)$/,
  focusable: /^(?:true|false)$/,
};

export type SvgAttrVerdict = { keep: false } | { keep: true; value: string } | { keep: true; ref: string } | { keep: true; id: string };

/**
 * One SVG attribute: kept (with its canonical value), kept as a local reference or an id (the caller prefixes it), or
 * dropped. `class`, `role` and `aria-*` are handled by the caller like on HTML elements.
 */
export function checkSvgAttr(name: string, value: string): SvgAttrVerdict {
  const kind = SVG_ATTRS[name];
  const v = value.trim();
  if (!kind || v.length > 8000) return { keep: false };
  switch (kind) {
    case "numbers":
      return NUMBERS.test(v) ? { keep: true, value: v } : { keep: false };
    case "length":
      return LENGTH.test(v) ? { keep: true, value: v } : { keep: false };
    case "path":
      return PATH.test(v) ? { keep: true, value: v } : { keep: false };
    case "transform":
      return TRANSFORM.test(v) ? { keep: true, value: v } : { keep: false };
    case "paint": {
      const ref = LOCAL_REF.exec(v);
      const mixed = oklabMix(v);
      if (!ref && PAINT.test(mixed)) return { keep: true, value: mixed };
      if (ref) return { keep: true, ref: ref[1]! };
      return PAINT.test(v) ? { keep: true, value: v } : { keep: false };
    }
    case "ref": {
      const ref = LOCAL_REF.exec(v);
      return ref ? { keep: true, ref: ref[1]! } : { keep: false };
    }
    case "enum":
      return ENUMS[name]?.test(v) ? { keep: true, value: v } : { keep: false };
    case "id":
      return { keep: true, id: v };
    case "text":
      return { keep: false };
  }
}

/** Is `name` an attribute an SVG element may carry once sanitized (the runtime's second wall). */
export const isAllowedSvgAttr = (name: string): boolean => name in SVG_ATTRS || name === "class" || name === "role" || /^aria-[a-z]+$/.test(name);
