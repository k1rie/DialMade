// What the preview runtime (apps/preview) needs from this package, without parse5 or Tailwind: the tag and
// attribute allowlist for its second wall, and the SVG of icons and placeholders.
export { ALLOWED_ATTRS, ALLOWED_TAGS, INPUT_TYPES, ROOT_TAGS, isAllowedAttr, isAllowedAttrFor } from "./allowlist";
export { chartFromAttributes, chartSvg, iconSvg, isChartKind, parseChartHighlight, parseChartValues, placeholderSvg } from "./assets";
// Page mode's second wall: the CSS and SVG rules of the first one.
export { PAGE_BASE_CSS, sanitizeCss, sanitizeStyleAttr } from "./pageCss";
export { SVG_TAGS, SVG_HOSTILE, checkSvgAttr, isAllowedSvgAttr } from "./svgAllowlist";
