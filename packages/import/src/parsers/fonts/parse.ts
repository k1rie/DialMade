import { GENERIC_FAMILIES, readNextFonts, splitFontStack, type NextFontDeclaration } from "../../fonts";
import type { ParserContext, ParserInput } from "../../registry";
import { clampLines, decodeText } from "../../sanitize";
import type { Confidence, FontCandidate, FontRole, ParseOutput } from "../../types";

const MAX_LINES = 64;
const MAX_CANDIDATES = 32;
const NEXT_FONT = /from\s*["'](?:next\/font\/(?:google|local)|geist\/font\/[a-z]+)["']/;

/** `Títulos: Newsreader`, `Body = Inter`, `Code — JetBrains Mono`: the label says the role. */
const LABEL = /^\s*([\p{L}][\p{L} ]{0,23}?)\s*[:=–—]\s*(\S.*)$/u;
const LABEL_ROLES: readonly [RegExp, FontRole][] = [
  [/^(?:mono|monospace|code|c[oó]digo|monoespaciada)$/i, "mono"],
  [/^(?:heading|headings|headline|display|title|titles|t[ií]tulos?|titulares?|encabezados?)$/i, "heading"],
  [/^(?:body|text|texto|cuerpo|p[aá]rrafos?|copy|ui|sans|base|interfaz)$/i, "body"],
];

const roleOfLabel = (label: string): FontRole | undefined => LABEL_ROLES.find(([re]) => re.test(label.trim()))?.[1];

/** Mono when the family says so; heading when it is a display or title cut; otherwise body. */
function roleOfFamily(family: string): { role: FontRole; named: boolean } {
  if (/\b(?:mono|code)\b|courier|consolas|menlo/i.test(family)) return { role: "mono", named: true };
  if (/\b(?:display|heading|headline|title)\b/i.test(family)) return { role: "heading", named: true };
  return { role: "body", named: false };
}

/** next/font: the CSS variable (`--font-heading`, `--font-geist-mono`) or the family tells the role. */
function roleOfDeclaration(font: NextFontDeclaration): { role: FontRole; named: boolean } {
  const variable = font.variable?.toLowerCase() ?? "";
  if (/(?:^|-)(?:mono|code|monospace)(?:-|$)/.test(variable)) return { role: "mono", named: true };
  if (/(?:^|-)(?:heading|headings|display|title|serif)(?:-|$)/.test(variable)) return { role: "heading", named: true };
  if (/(?:^|-)(?:body|sans|text|base|ui)(?:-|$)/.test(variable)) return { role: "body", named: true };
  return roleOfFamily(font.family);
}

const quote = (family: string) => `"${family.replace(/["\\]/g, "")}"`;

function fromNextFonts(text: string, fileName: string): FontCandidate[] {
  return readNextFonts(text)
    .slice(0, MAX_CANDIDATES)
    .map((font) => {
      const { role, named } = roleOfDeclaration(font);
      const confidence: Confidence = font.deduced ? "medium" : named ? "exact" : "high";
      return {
        role,
        stack: quote(font.family),
        ...(font.weights.length > 0 && { weights: font.weights }),
        locator: `${fileName}:${font.line} ${font.variable ?? font.family}`,
        confidence,
        method: "declared" as const,
      };
    });
}

/**
 * A line is one CSS stack when it ends in a generic or system family (`Inter, system-ui, sans-serif`);
 * otherwise each comma-separated name is a family of its own (`Inter, Roboto Mono`).
 */
function familiesOf(value: string): string[][] {
  const parts = splitFontStack(value).filter((part) => !part.includes("("));
  if (parts.length === 0) return [];
  const stack = parts.length > 1 && parts.slice(1).some((part) => GENERIC_FAMILIES.has(part.toLowerCase()));
  return stack ? [parts] : parts.map((part) => [part]);
}

function fromList(text: string, fileName: string, pasted: boolean): FontCandidate[] {
  const out: FontCandidate[] = [];
  const lines = clampLines(text).text.split(/\r?\n/).slice(0, MAX_LINES);
  lines.forEach((raw, index) => {
    const line = raw.trim();
    if (!line || line.startsWith("#") || line.startsWith("//")) return;
    const labeled = LABEL.exec(line);
    const labelRole = labeled ? roleOfLabel(labeled[1]!) : undefined;
    const value = labeled ? labeled[2]! : line;
    for (const entries of familiesOf(value.replace(/[;.]+$/, ""))) {
      if (out.length >= MAX_CANDIDATES) return;
      const guessed = roleOfFamily(entries[0]!);
      const role = labelRole ?? guessed.role;
      const where = pasted ? `línea ${index + 1}` : `${fileName}:${index + 1}`;
      out.push({
        role,
        stack: entries.map(quote).join(", "),
        locator: `${where} ${entries[0]}`,
        confidence: labelRole ? "high" : guessed.named ? "high" : "medium",
        method: "named",
      });
    }
  });
  return out;
}

/**
 * Font names: a pasted or uploaded list of families (one per line or comma-separated, optionally
 * labeled `Títulos: Newsreader`) and next/font layouts (`import { Inter } from "next/font/google"`),
 * read with linear regexes and never executed. It returns stacks; the core matches them against
 * Google Fonts (aliases such as Source Sans Pro → Source Sans 3, free alternatives such as Arial → Arimo).
 * Body is the default role; mono or heading when the label, the CSS variable or the name says so.
 */
export async function parse(input: ParserInput, _ctx: ParserContext): Promise<ParseOutput> {
  const text = input.text ?? decodeText(input.bytes)?.text ?? "";
  if (!text.trim()) return {};
  const fileName = input.name;
  if (input.format === "next-font" || NEXT_FONT.test(clampLines(text).text)) {
    const fonts = fromNextFonts(text, fileName);
    return fonts.length > 0 ? { format: "next-font", fonts } : { format: "next-font", warnings: [{ code: "no-fonts", detail: "next/font" }] };
  }
  const fonts = fromList(text, fileName, input.pasted);
  return fonts.length > 0 ? { format: "font-names", fonts } : { format: "font-names", warnings: [{ code: "no-fonts" }] };
}
