import { clampLines, lineAt } from "../sanitize";
import { familyVariants, titleCase } from "./normalize";

/** One font declared with next/font (or the `geist` package) in a layout file. Nothing is executed. */
export interface NextFontDeclaration {
  /** `Geist_Mono` → `Geist Mono`; for next/font/local, deduced from the file name. */
  family: string;
  /** The CSS variable it defines (`variable: "--font-inter"`), when set. */
  variable?: string;
  weights: number[];
  source: "google" | "local";
  /** The family comes from a file name (next/font/local), not from a declared name. */
  deduced?: boolean;
  /** 1-based line of the call (or of the import, for the geist package). */
  line: number;
}

const GOOGLE_IMPORT = /import\s*\{([^{}]{0,4000})\}\s*from\s*["']next\/font\/google["']/g;
const LOCAL_IMPORT = /import\s+([A-Za-z_$][\w$]*)\s+from\s*["']next\/font\/local["']/g;
const GEIST_IMPORT = /import\s*\{([^{}]{0,400})\}\s*from\s*["']geist\/font\/(sans|mono|pixel)["']/g;
const CALL = /\b([A-Za-z_$][\w$]*)\s*\(\s*\{/g;
const VARIABLE = /\bvariable\s*:\s*["'`](--[A-Za-z0-9_-]{1,64})["'`]/;
const WEIGHT = /\bweight\s*:\s*(\[[^\]]{0,400}\]|["'`][^"'`]{0,40}["'`])/;
const SRC_STRING = /\bsrc\s*:\s*(?:\[\s*\{[^{}]{0,400}?path\s*:\s*)?["'`]([^"'`]{1,200})["'`]/;
const FONT_FILE = /^([A-Za-z0-9_-]{1,64})\.(?:woff2?|ttf|otf)$/;

const GEIST_DEFAULTS: Readonly<Record<string, { family: string; variable: string }>> = {
  GeistSans: { family: "Geist", variable: "--font-geist-sans" },
  GeistMono: { family: "Geist Mono", variable: "--font-geist-mono" },
  GeistPixelSquare: { family: "Geist Pixel", variable: "--font-geist-pixel-square" },
};

/** The `{…}` argument that starts at `open` (quotes and nesting respected), at most 4000 characters. */
function objectLiteral(text: string, open: number): string {
  let depth = 0;
  let quote: string | null = null;
  const end = Math.min(text.length, open + 4000);
  for (let i = open; i < end; i++) {
    const ch = text[i]!;
    if (quote) {
      if (ch === "\\") i++;
      else if (ch === quote) quote = null;
    } else if (ch === '"' || ch === "'" || ch === "`") quote = ch;
    else if (ch === "{") depth++;
    else if (ch === "}" && --depth === 0) return text.slice(open, i + 1);
  }
  return text.slice(open, end);
}

function weightsOf(literal: string): number[] {
  const raw = WEIGHT.exec(literal)?.[1] ?? "";
  const found = raw.match(/\d{3}/g) ?? [];
  return [...new Set(found.map(Number).filter((w) => w >= 100 && w <= 1000))].sort((a, b) => a - b);
}

/**
 * Fonts a Next.js layout loads (`import { Inter, Geist_Mono } from "next/font/google"` and the calls that
 * set `variable: "--font-inter"`), read with linear regexes on lines cut to 10,000 characters. Lets the
 * CSS importer turn an undefined `var(--font-inter)` into Inter with certainty.
 */
export function readNextFonts(source: string): NextFontDeclaration[] {
  const text = clampLines(source).text;
  const google = new Map<string, string>();
  const local = new Set<string>();
  const out: NextFontDeclaration[] = [];

  for (const match of text.matchAll(GOOGLE_IMPORT)) {
    for (const spec of match[1]!.split(",")) {
      const [imported, alias] = spec.split(/\s+as\s+/).map((s) => s.trim());
      if (imported && /^[A-Za-z_$][\w$]*$/.test(imported)) google.set(alias && /^[A-Za-z_$][\w$]*$/.test(alias) ? alias : imported, imported.replace(/_/g, " "));
    }
  }
  for (const match of text.matchAll(LOCAL_IMPORT)) local.add(match[1]!);
  for (const match of text.matchAll(GEIST_IMPORT)) {
    for (const spec of match[1]!.split(",")) {
      const geist = GEIST_DEFAULTS[spec.split(/\s+as\s+/)[0]!.trim()];
      if (geist) out.push({ ...geist, weights: [], source: "google", line: lineAt(text, match.index ?? 0) });
    }
  }
  if (google.size === 0 && local.size === 0) return out;

  for (const match of text.matchAll(CALL)) {
    const callee = match[1]!;
    const family = google.get(callee);
    if (family === undefined && !local.has(callee)) continue;
    const literal = objectLiteral(text, (match.index ?? 0) + match[0].length - 1);
    const variable = VARIABLE.exec(literal)?.[1];
    const line = lineAt(text, match.index ?? 0);
    if (family !== undefined) {
      out.push({ family, ...(variable && { variable }), weights: weightsOf(literal), source: "google", line });
      continue;
    }
    const path = SRC_STRING.exec(literal)?.[1] ?? "";
    const file = FONT_FILE.exec(path.slice(path.lastIndexOf("/") + 1))?.[1];
    if (!file) continue;
    const base = familyVariants(file).variants.at(-1) ?? file;
    out.push({ family: titleCase(base), ...(variable && { variable }), weights: weightsOf(literal), source: "local", deduced: true, line });
  }
  return out;
}
