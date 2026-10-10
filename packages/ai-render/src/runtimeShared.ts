// What the preview runtime (apps/preview) needs from this package, without parse5 or Tailwind: the tag and
// attribute allowlist for its second wall, and the SVG of icons and placeholders.
export { ALLOWED_ATTRS, ALLOWED_TAGS, ROOT_TAGS, isAllowedAttr } from "./allowlist";
export { iconSvg, placeholderSvg } from "./assets";
