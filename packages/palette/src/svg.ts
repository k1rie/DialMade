import { formatHex, parse } from "culori";

const PROPS = "fill|stroke|stop-color|flood-color|lighting-color|color";
const ATTRIBUTE_RE = new RegExp(`(?<![\\w:.-])(?:${PROPS})\\s*=\\s*(?:"([^"]*)"|'([^']*)')`, "gi");
const DECLARATION_RE = new RegExp(`(?<![\\w-])(?:${PROPS}|--[\\w-]+)\\s*:\\s*([^;{}"'<>]+)`, "gi");
const IGNORED = new Set(["none", "transparent", "currentcolor", "inherit", "initial", "unset", "context-fill", "context-stroke"]);

function normalize(raw: string): string | null {
  let value = raw.replace(/!important/i, "").trim();
  if (value.toLowerCase().startsWith("url(")) value = value.slice(value.indexOf(")") + 1).trim();
  if (!value || IGNORED.has(value.toLowerCase()) || value.toLowerCase().startsWith("var(")) return null;
  const parsed = parse(value);
  if (!parsed || (parsed.alpha !== undefined && parsed.alpha < 1)) return null;
  return formatHex(parsed);
}

/**
 * Colors declared in SVG source: fill/stroke/stop-color/flood-color/lighting-color/color as
 * attributes, inline `style`, `<style>` rules and CSS custom properties. Opaque colors only,
 * normalized to lowercase `#rrggbb`, deduplicated in order of first appearance.
 */
export function parseSvgColors(svgText: string): string[] {
  const source = svgText.replace(/<!--[\s\S]*?-->/g, "").replace(/\/\*[\s\S]*?\*\//g, "");
  const found: { index: number; hex: string }[] = [];
  for (const m of source.matchAll(ATTRIBUTE_RE)) {
    const hex = normalize(m[1] ?? m[2] ?? "");
    if (hex) found.push({ index: m.index, hex });
  }
  for (const m of source.matchAll(DECLARATION_RE)) {
    const hex = normalize(m[1] ?? "");
    if (hex) found.push({ index: m.index, hex });
  }
  found.sort((a, b) => a.index - b.index);
  return [...new Set(found.map((f) => f.hex))];
}
