/** CSS generic families and the platform system-font keywords: they never load anything. */
export const GENERIC_FAMILIES: ReadonlySet<string> = new Set([
  "serif",
  "sans-serif",
  "monospace",
  "cursive",
  "fantasy",
  "system-ui",
  "ui-serif",
  "ui-sans-serif",
  "ui-monospace",
  "ui-rounded",
  "math",
  "emoji",
  "fangsong",
  "-apple-system",
  "blinkmacsystemfont",
  "-webkit-system-font",
  "-webkit-body",
  "system",
]);

/** System families of an OS (go to the fallback stack, `match.kind: "system"`). */
const SYSTEM_FAMILY =
  /^(?:segoe ui(?: (?:variable(?: (?:display|text|small))?|emoji|symbol|historic))?|sf pro(?: [a-z]+)*|sf compact(?: [a-z]+)*|sf mono|sfmono-regular|san francisco|\.sf ?ns[a-z ]*|\.applesystemuifont|apple color emoji|apple symbols|noto color emoji|android emoji|twemoji mozilla|menlo|monaco|consolas|lucida grande)$/;

export const isSystemFamily = (family: string): boolean => {
  const key = family.trim().toLowerCase();
  return GENERIC_FAMILIES.has(key) || SYSTEM_FAMILY.test(key);
};

/**
 * Fonts preinstalled on some OS that system stacks list after the system keywords (Tailwind's and
 * Bootstrap's `-apple-system, "Segoe UI", Roboto, "Helvetica Neue", Arial…`). In a stack that starts with
 * a system family they are part of that system stack, not the brand's font.
 */
const PLATFORM_FAMILIES: ReadonlySet<string> = new Set([
  "roboto",
  "helvetica neue",
  "helvetica",
  "arial",
  "noto sans",
  "noto serif",
  "liberation sans",
  "liberation serif",
  "liberation mono",
  "ubuntu",
  "ubuntu mono",
  "cantarell",
  "oxygen",
  "oxygen-sans",
  "fira sans",
  "droid sans",
  "droid sans mono",
  "dejavu sans",
  "dejavu serif",
  "dejavu sans mono",
  "lucida sans",
  "lucida console",
  "andale mono",
  "tahoma",
  "verdana",
  "georgia",
  "cambria",
  "times new roman",
  "times",
  "courier new",
  "courier",
  "cascadia code",
  "cascadia mono",
]);

export const isPlatformFamily = (family: string): boolean => PLATFORM_FAMILIES.has(family.trim().toLowerCase().replace(/\s+/g, " "));

/** Splits a `font-family` value on top-level commas, unquoting entries. Linear; parentheses (var()) kept whole. */
export function splitFontStack(stack: string): string[] {
  const out: string[] = [];
  let current = "";
  let quote: string | null = null;
  let depth = 0;
  for (const ch of stack.slice(0, 2000)) {
    if (quote) {
      if (ch === quote) quote = null;
      else current += ch;
    } else if ((ch === '"' || ch === "'") && depth === 0) quote = ch;
    else if (ch === "(") {
      depth++;
      current += ch;
    } else if (ch === ")") {
      depth = Math.max(0, depth - 1);
      current += ch;
    } else if (ch === "," && depth === 0) {
      out.push(current);
      current = "";
    } else current += ch;
  }
  out.push(current);
  return out.map((entry) => entry.replace(/\s+/g, " ").trim()).filter(Boolean);
}
