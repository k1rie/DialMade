import { hexToOklch, parseColorWithAlpha, splitAlpha } from "@dialmade/palette";
import { IMPORT_LIMITS } from "../../limits";
import type { ParserContext, ParserInput } from "../../registry";
import { detectVocabulary, mapRoleName, modeFromName, parseScaleName, type RoleMatch } from "../../roles";
import { clampLines, decodeText } from "../../sanitize";
import type { Confidence, Mode, ParsedColor, ParseOutput } from "../../types";
import { cleanLabel, namedValue, scanColors, splitSegments, type ColorToken } from "./tokenize";

/** Pasted palettes are short; more than this is a dump (the rest is reported, not read). */
export const MAX_PASTED_COLORS = 64;

const COOLORS = /coolors\.co\/(?:palette\/)?((?:[0-9a-f]{6}-){0,19}[0-9a-f]{6})(?![0-9a-z])/gi;
const SLUG = /^[0-9a-f]{6}(?:-[0-9a-f]{6}){1,19}$/i;
/** Below this OKLCH chroma a color is gray: it is not offered as the primary candidate. */
const CHROMATIC = 0.04;

/** Spanish role and mode words → the English names the role vocabulary knows. */
const SPANISH: Readonly<Record<string, string>> = {
  primario: "primary",
  primaria: "primary",
  principal: "primary",
  secundario: "secondary",
  secundaria: "secondary",
  fondo: "background",
  texto: "text",
  acento: "accent",
  borde: "border",
  bordes: "border",
  superficie: "surface",
  tarjeta: "card",
  exito: "success",
  peligro: "danger",
  advertencia: "warning",
  aviso: "warning",
  informacion: "info",
  enlace: "link",
  enlaces: "link",
  anillo: "ring",
  foco: "focus",
  apagado: "muted",
  atenuado: "muted",
  tenue: "muted",
  destructivo: "destructive",
  marca: "brand",
  oscuro: "dark",
  claro: "light",
  sobre: "on",
};

function translate(label: string): string {
  return label
    .normalize("NFKD")
    .replace(/[̀-ͯ]/g, "")
    .toLowerCase()
    .split(/[^a-z0-9]+/)
    .filter(Boolean)
    .map((word) => SPANISH[word] ?? word)
    .filter((word) => word !== "de" && word !== "del" && word !== "la" && word !== "el" && word !== "color")
    .join("-");
}

/** `Dark mode`, `## Modo oscuro`, `Light:` → that mode for the lines below. */
function headerMode(line: string): Mode | undefined {
  const text = line.replace(/[#*_:=\-–—[\]()]+/g, " ").trim();
  if (!text || text.length > 40 || text.split(/\s+/).length > 4) return undefined;
  return modeFromName(translate(text));
}

const CONFIDENCE_RANK: Readonly<Record<Confidence, number>> = { exact: 0, high: 1, medium: 2, low: 3 };

interface Found {
  value: string;
  label?: string;
  line: number;
  mode?: Mode;
  coolors?: number;
}

/**
 * Pasted colors: hex, `rgb()`, `hsl()`, `oklch()`, `lab()`, CSS names, Coolors URLs (read from the URL,
 * never fetched) and labeled lines (`Primary: #3A5BD9`, `--brand: …`, `$brand = …`, «Fondo oscuro: #111»).
 * A label that names a role gives it with medium confidence; without any, the first chromatic color is
 * the primary candidate with low confidence (the user picks). The values themselves are high confidence.
 */
export async function parse(input: ParserInput, ctx: ParserContext): Promise<ParseOutput> {
  const source = input.text ?? decodeText(input.bytes)?.text ?? "";
  if (!source.trim()) return {};
  const { text, truncated } = clampLines(source, ctx.limits?.maxLineLength ?? IMPORT_LIMITS.maxLineLength);
  const warnings: NonNullable<ParseOutput["warnings"]> = [];
  const unresolved: NonNullable<ParseOutput["unresolved"]> = [];
  if (truncated > 0) warnings.push({ code: "line-truncated", detail: `${truncated}` });

  const found: Found[] = [];
  let mode: Mode | undefined;
  let coolors = false;
  let total = 0;
  const add = (item: Found) => {
    total++;
    if (found.length < MAX_PASTED_COLORS) found.push(item);
  };

  const lines = text.split(/\r?\n/);
  for (let index = 0; index < lines.length; index++) {
    if (index % 500 === 0 && ctx.signal?.aborted) throw new Error("aborted");
    const line = lines[index]!;
    const number = index + 1;
    const trimmed = line.trim();
    if (!trimmed) continue;

    const urls = [...trimmed.matchAll(COOLORS)];
    if (urls.length > 0 || SLUG.test(trimmed)) {
      coolors ||= urls.length > 0;
      const groups = urls.length > 0 ? urls.map((m) => m[1]!) : [trimmed];
      let position = 0;
      for (const group of groups) for (const hex of group.split("-")) add({ value: `#${hex.toLowerCase()}`, line: number, coolors: ++position, ...(mode && { mode }) });
      continue;
    }

    let lineHasColor = false;
    const segments = splitSegments(line);
    let pendingLabel: string | undefined;
    for (const segment of segments) {
      const { colors, unevaluated } = scanColors(segment.text);
      for (const u of unevaluated) unresolved.push({ path: cleanLabel(segment.text.slice(0, u.start)) ?? `line ${number}`, reason: `${u.text.slice(0, 60)} is not evaluated` });
      if (colors.length === 0) {
        const named = namedValue(segment.text);
        if (named) {
          lineHasColor = true;
          add({ value: named.value, line: number, ...((named.label ?? pendingLabel) && { label: named.label ?? pendingLabel }), ...(mode && { mode }) });
          pendingLabel = undefined;
        } else if (unevaluated.length === 0) pendingLabel = cleanLabel(segment.text);
        continue;
      }
      lineHasColor = true;
      colors.forEach((token: ColorToken, i) => {
        const before = segment.text.slice(i === 0 ? 0 : colors[i - 1]!.end, token.start);
        const after = colors.length === 1 ? segment.text.slice(token.end) : "";
        const label = cleanLabel(before) ?? (i === 0 ? pendingLabel : undefined) ?? (after ? cleanLabel(after) : undefined);
        add({ value: token.value, line: number, ...(label && { label }), ...(mode && { mode }) });
      });
      pendingLabel = undefined;
    }
    if (!lineHasColor) {
      const header = headerMode(trimmed);
      if (header) mode = header;
    }
  }
  if (total > found.length) warnings.push({ code: "too-many-tokens", detail: `${total} colors, kept ${MAX_PASTED_COLORS}` });

  const vocabulary = detectVocabulary(found.flatMap((f) => (f.label ? [f.label] : [])));
  const roleOf = (label: string | undefined): RoleMatch | null => {
    if (!label) return null;
    const ctxVocabulary = vocabulary ? { vocabulary } : {};
    return mapRoleName(label, ctxVocabulary) ?? mapRoleName(translate(label), ctxVocabulary);
  };

  const seen = new Set<string>();
  const colors: ParsedColor[] = [];
  for (const item of found) {
    const role = roleOf(item.label);
    const scale = role || !item.label ? null : (parseScaleName(item.label) ?? parseScaleName(translate(item.label)));
    const itemMode = item.mode ?? role?.mode;
    const key = `${parseColorWithAlpha(item.value) ?? item.value}|${item.label ?? ""}|${itemMode ?? ""}`;
    if (seen.has(key)) continue;
    seen.add(key);
    const confidence: Confidence = role ? (CONFIDENCE_RANK[role.confidence] < CONFIDENCE_RANK.medium ? "medium" : role.confidence) : "high";
    const where = item.coolors ? `coolors #${item.coolors}` : item.label;
    colors.push({
      value: item.value,
      locator: `${input.name}:${item.line}${where ? ` ${where}` : ""}`,
      confidence,
      method: "declared",
      ...(item.label && { name: item.label }),
      ...(itemMode && { mode: itemMode }),
      ...(role && { role: role.role }),
      ...(scale && { scale }),
    });
  }

  if (colors.length > 0 && !colors.some((c) => c.role === "primary")) {
    const candidate = colors.find((c) => !c.role && !c.scale && isChromatic(c.value)) ?? colors.find((c) => !c.role && !c.scale);
    if (candidate) {
      candidate.role = "primary";
      candidate.confidence = "low";
    }
  }

  const output: ParseOutput = { format: coolors ? "coolors" : "color-list" };
  if (colors.length > 0) output.colors = colors;
  if (warnings.length > 0) output.warnings = warnings;
  if (unresolved.length > 0) output.unresolved = unresolved.slice(0, 100);
  return output;
}

function isChromatic(value: string): boolean {
  const parsed = parseColorWithAlpha(value);
  if (!parsed) return false;
  const oklch = hexToOklch(splitAlpha(parsed).hex);
  return oklch !== null && oklch.c >= CHROMATIC;
}
