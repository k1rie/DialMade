import { FONT_SIZE_NAMES } from "@dialmade/doc";
import { ROLE_KEYS, type RoleKey } from "@dialmade/palette";
import { normalizeColor } from "../color";
import type { FontMatcher } from "../fonts";
import type { ImportLimits } from "../limits";
import type { SourceFragment } from "../merge";
import { worseConfidence } from "../merge";
import { cleanMultiline, cleanName, cleanText } from "../sanitize";
import type {
  Confidence,
  Detected,
  Dim,
  FontCandidate,
  FontMatch,
  FontRole,
  ImportedColor,
  ImportedFont,
  ImportedShape,
  ImportedSpacing,
  ImportSource,
  ImportWarning,
  Method,
  ParseOutput,
  ProvInput,
  ScreenshotSummary,
  Shadow,
  ShadowLayerValue,
  SystemHint,
  TypeStyle,
  Unresolved,
  UnresolvedCode,
} from "../types";

const CONFIDENCES: ReadonlySet<string> = new Set(["exact", "high", "medium", "low"]);
const METHODS: ReadonlySet<string> = new Set(["declared", "named", "pixel", "pdf-text", "ai", "edited"]);
const ROLES: ReadonlySet<string> = new Set(ROLE_KEYS);
const FONT_ROLES: ReadonlySet<string> = new Set(["heading", "body", "mono"]);
const STEPS: ReadonlySet<string> = new Set(FONT_SIZE_NAMES);
const UNITS: ReadonlySet<string> = new Set(["px", "rem", "em"]);
const HEX = /^#[0-9a-f]{6}$/;

const MAX_NOTES = 20;
const MAX_ITEMS = 20_000;

const finite = (n: unknown, min: number, max: number): n is number => typeof n === "number" && Number.isFinite(n) && n >= min && n <= max;

const UNRESOLVED_CODES: ReadonlySet<string> = new Set(["not-evaluated", "alias-cycle", "missing-ref", "remote-ref", "too-deep", "invalid-value", "missing-file", "other"]);
const REASON_CODES: readonly [RegExp, UnresolvedCode][] = [
  [/not evaluated/i, "not-evaluated"],
  [/\bremote\b/i, "remote-ref"],
  [/cycle|contains itself/i, "alias-cycle"],
  [/missing file/i, "missing-file"],
  [/longer than|more than|too many/i, "too-deep"],
  [/missing|not found|undefined|unknown/i, "missing-ref"],
  [/invalid|is not|unexpected|syntax/i, "invalid-value"],
];

/** A stable code for the UI to translate; the English `reason` stays as the detail. */
export function unresolvedCode(reason: string, given?: unknown): UnresolvedCode {
  if (typeof given === "string" && UNRESOLVED_CODES.has(given)) return given as UnresolvedCode;
  return REASON_CODES.find(([re]) => re.test(reason))?.[1] ?? "other";
}

const SYSTEM_COMPONENTS: ReadonlySet<string> = new Set(["button", "input", "badge"]);
const SHAPES: ReadonlySet<unknown> = new Set(["square", "rounded", "pill"]);

/** A `system` hint the DesignDoc accepts: shapes for button/input/badge, a button weight in hundreds. */
function cleanSystemHint(hint: SystemHint): SystemHint | undefined {
  if (!SYSTEM_COMPONENTS.has(hint.component)) return undefined;
  if (hint.key === "shape" && SHAPES.has(hint.value)) return { component: hint.component, key: "shape", value: hint.value };
  if (hint.key === "weight" && hint.component === "button" && finite(hint.value, 100, 900)) {
    return { component: "button", key: "weight", value: Math.round(hint.value / 100) * 100 };
  }
  return undefined;
}

/** Stamps the source id and cleans what a parser said about provenance (never trusted as is). */
function provenance(sourceId: string, p: ProvInput, fallbackLocator: string): Omit<Detected, "id"> {
  const confidence = (CONFIDENCES.has(p.confidence) ? p.confidence : "low") as Confidence;
  const method = (METHODS.has(p.method) ? p.method : "declared") as Method;
  return { sourceId, locator: cleanText(typeof p.locator === "string" ? p.locator : "", 200) || fallbackLocator, confidence, method };
}

function cleanDim(d: Dim | undefined): Dim | undefined {
  if (!d || !finite(d.px, 0, 100_000) || !finite(d.value, -100_000, 100_000) || !UNITS.has(d.unit)) return undefined;
  return { value: d.value, unit: d.unit, px: d.px, ...(d.assumed && { assumed: true }) };
}

function dim(sourceId: string, id: string, d: (Dim & ProvInput) | undefined, fallback: string): (Dim & Detected) | undefined {
  const clean = cleanDim(d);
  return clean && d ? { id, ...provenance(sourceId, d, fallback), ...clean } : undefined;
}

function dimRecord(sourceId: string, prefix: string, record: Record<string, Dim & ProvInput> | undefined, fallback: string) {
  if (!record) return undefined;
  const out: Record<string, Dim & Detected> = {};
  for (const [rawKey, value] of Object.entries(record).slice(0, 64)) {
    const key = cleanName(rawKey, 32).value;
    const d = key ? dim(sourceId, `${sourceId}:${prefix}-${key}`, value, fallback) : undefined;
    if (d) out[key] = d;
  }
  return Object.keys(out).length > 0 ? out : undefined;
}

function shadowLayer(layer: ShadowLayerValue): ShadowLayerValue | undefined {
  const color = typeof layer.color === "string" ? normalizeColor(layer.color) : null;
  if (!color?.ok || ![layer.x, layer.y, layer.blur, layer.spread].every((v) => finite(v, -1024, 1024)) || layer.blur < 0) return undefined;
  const alpha = finite(layer.alpha, 0, 1) ? layer.alpha * (color.color.alpha ?? 1) : (color.color.alpha ?? 1);
  return { x: layer.x, y: layer.y, blur: layer.blur, spread: layer.spread, color: color.color.hex, alpha: Math.round(alpha * 1000) / 1000, ...(layer.inset && { inset: true }) };
}

export interface NormalizedOutput {
  fragment: SourceFragment;
  fonts: FontCandidate[];
  format?: string;
}

/**
 * A parser's output → a source fragment: ids and the source id stamped, colors parsed (alpha kept;
 * `transparent`, `currentColor` and unparseable values reported), names and locators cleaned,
 * numbers range-checked, roles and steps validated.
 */
export function normalizeOutput(output: ParseOutput, source: ImportSource, limits: ImportLimits): NormalizedOutput {
  const sid = source.id;
  const fallback = source.fileName;
  const warnings: ImportWarning[] = [];
  const unresolved: Unresolved[] = [];
  const warn = (code: string, detail?: string) => warnings.push({ sourceId: sid, code: cleanText(code, 64), ...(detail && { detail: cleanText(detail, 200) }) });

  for (const w of (output.warnings ?? []).slice(0, 500)) if (typeof w?.code === "string") warn(w.code, typeof w.detail === "string" ? w.detail : undefined);
  for (const u of (output.unresolved ?? []).slice(0, 500)) {
    if (typeof u?.path === "string" && typeof u.reason === "string") {
      const reason = cleanText(u.reason, 200);
      unresolved.push({ sourceId: sid, path: cleanText(u.path, 200), reason, code: unresolvedCode(reason, u.code) });
    }
  }

  const colors: ImportedColor[] = [];
  const parsed = output.colors ?? [];
  const maxColors = Math.min(MAX_ITEMS, limits.tokens.maxTokens);
  if (parsed.length > maxColors) warn("too-many-tokens", `${parsed.length} colors, kept ${maxColors}`);
  parsed.slice(0, maxColors).forEach((c, i) => {
    const prov = provenance(sid, c, fallback);
    const name = typeof c.name === "string" ? cleanName(c.name).value : "";
    const result = typeof c.value === "string" ? normalizeColor(c.value) : ({ ok: false, problem: "invalid-color" } as const);
    if (!result.ok) {
      if (result.problem === "unresolved") unresolved.push({ sourceId: sid, path: name || prov.locator, reason: cleanText(`not evaluated: ${c.value}`, 200), code: "not-evaluated" });
      else warn(result.problem, name || prov.locator);
      return;
    }
    const role = c.role && ROLES.has(c.role) ? (c.role as RoleKey) : undefined;
    const scale =
      c.scale && finite(c.scale.step, 0, 1000) && Number.isInteger(c.scale.step) && typeof c.scale.group === "string" && cleanName(c.scale.group).value
        ? { group: cleanName(c.scale.group).value.toLowerCase(), step: c.scale.step }
        : undefined;
    colors.push({
      id: `${sid}:c${i}`,
      ...prov,
      ...result.color,
      ...(name && { name }),
      ...((c.mode === "light" || c.mode === "dark") && { mode: c.mode }),
      ...(role && { role }),
      ...(scale && { scale }),
    });
  });

  const fonts = (output.fonts ?? []).slice(0, 64).filter((f) => FONT_ROLES.has(f.role) && (typeof f.stack === "string" || Array.isArray(f.stack)));

  const shapeIn = output.shape ?? {};
  const shadows = (shapeIn.shadows ?? []).slice(0, 32).flatMap((s, i): (Shadow & Detected)[] => {
    const layers = (Array.isArray(s.layers) ? s.layers : []).slice(0, 8).map(shadowLayer).filter((l): l is ShadowLayerValue => l !== undefined);
    const name = typeof s.name === "string" ? cleanName(s.name, 32).value || "DEFAULT" : "DEFAULT";
    return layers.length > 0 || (Array.isArray(s.layers) && s.layers.length === 0)
      ? [{ id: `${sid}:shadow-${i}`, ...provenance(sid, s, fallback), name, layers }]
      : [];
  });
  const radius = dim(sid, `${sid}:radius`, shapeIn.radius, fallback);
  const radii = dimRecord(sid, "radius", shapeIn.radii, fallback);
  const borderWidth = dim(sid, `${sid}:border-width`, shapeIn.borderWidth, fallback);
  const shape: ImportedShape = {
    ...(radius && { radius }),
    ...(radii && { radii }),
    ...(shadows.length > 0 && { shadows }),
    ...(borderWidth && { borderWidth }),
  };

  const base = dim(sid, `${sid}:space-base`, output.spacing?.base, fallback);
  const scale = dimRecord(sid, "space", output.spacing?.scale, fallback);
  const spacing: ImportedSpacing | undefined = base || scale ? { ...(base && { base }), ...(scale && { scale }) } : undefined;

  const typeScale = (output.typeScale ?? []).slice(0, 64).flatMap((t, i): (TypeStyle & Detected)[] => {
    const name = typeof t.name === "string" ? cleanName(t.name, 64).value : "";
    if (!name) return [];
    const fontSize = cleanDim(t.fontSize);
    const style: TypeStyle & Detected = { id: `${sid}:type-${i}`, ...provenance(sid, t, fallback), name };
    if (t.step && STEPS.has(t.step)) style.step = t.step;
    if (fontSize) style.fontSize = fontSize;
    if (finite(t.lineHeight, 0.5, 3)) style.lineHeight = t.lineHeight;
    if (finite(t.letterSpacing, -0.25, 0.5)) style.letterSpacing = t.letterSpacing;
    if (finite(t.weight, 1, 1000)) style.weight = Math.round(t.weight);
    if (typeof t.family === "string" && cleanName(t.family).value) style.family = cleanName(t.family).value;
    return [style];
  });

  let screenshot: ScreenshotSummary | undefined;
  const shot = output.screenshot;
  if (shot && (shot.mode === "light" || shot.mode === "dark" || shot.mode === "ambiguous")) {
    screenshot = {
      sourceId: sid,
      width: finite(shot.width, 0, 1e6) ? shot.width : 0,
      height: finite(shot.height, 0, 1e6) ? shot.height : 0,
      mode: shot.mode,
      neutralTint: { h: finite(shot.neutralTint?.h, 0, 360) ? shot.neutralTint.h : 0, c: finite(shot.neutralTint?.c, 0, 0.5) ? shot.neutralTint.c : 0 },
      vibrancy: { c: finite(shot.vibrancy?.c, 0, 0.5) ? shot.vibrancy.c : 0, l: finite(shot.vibrancy?.l, 0, 1) ? shot.vibrancy.l : 0 },
      swatches: (Array.isArray(shot.swatches) ? shot.swatches : []).filter((s) => typeof s === "string" && HEX.test(s)).slice(0, 12),
      ...(typeof shot.accentCandidate === "string" && HEX.test(shot.accentCandidate) && { accentCandidate: shot.accentCandidate }),
      ...(shot.fingerprint && { fingerprint: shot.fingerprint }),
    };
  }

  const seenHints = new Set<string>();
  const system = (output.system ?? []).slice(0, 32).flatMap((h, i): (SystemHint & Detected)[] => {
    const clean = h && typeof h === "object" ? cleanSystemHint(h) : undefined;
    if (!clean || seenHints.has(`${clean.component}.${clean.key}`)) return [];
    seenHints.add(`${clean.component}.${clean.key}`);
    return [{ id: `${sid}:system-${i}`, ...provenance(sid, h, fallback), ...clean }];
  });

  const notes = (output.notes ?? []).slice(0, MAX_NOTES).map((note) => (typeof note === "string" ? cleanMultiline(note) : "")).filter(Boolean);

  return {
    fragment: {
      source,
      colors,
      fonts: [],
      shape,
      ...(spacing && { spacing }),
      ...(typeScale.length > 0 && { typeScale }),
      ...(system.length > 0 && { system }),
      ...(screenshot && { screenshot }),
      notes,
      warnings,
      unresolved,
    },
    fonts,
    ...(typeof output.format === "string" && /^[a-z0-9][a-z0-9.+-]{0,63}$/.test(output.format) && { format: output.format }),
  };
}

function cleanMatch(match: FontMatch): FontMatch {
  const family = match.family ? cleanName(match.family).value : "";
  const candidates = (match.candidates ?? []).map((c) => cleanName(c).value).filter(Boolean).slice(0, 3);
  return { kind: match.kind, ...(family && { family }), ...(candidates.length > 0 && { candidates }) };
}

/** Font candidates of one source → fonts, through the matcher. */
export function resolveFonts(sourceId: string, fallbackLocator: string, candidates: readonly FontCandidate[], matcher: FontMatcher): ImportedFont[] {
  const out: ImportedFont[] = [];
  candidates.forEach((candidate, i) => {
    let resolved;
    try {
      resolved = matcher.resolveStack(candidate.stack);
    } catch {
      resolved = null;
    }
    const family = resolved ? cleanName(resolved.family).value : "";
    if (!resolved || !family) return;
    const prov = provenance(sourceId, candidate, fallbackLocator);
    const weights = [...new Set((candidate.weights ?? []).filter((w) => finite(w, 1, 1000)).map(Math.round))].sort((a, b) => a - b).slice(0, 12);
    out.push({
      id: `${sourceId}:f${i}`,
      ...prov,
      confidence: resolved.deduced ? worseConfidence(prov.confidence, "medium") : prov.confidence,
      family,
      role: candidate.role as FontRole,
      weights,
      fallback: resolved.fallback.map((f) => cleanName(f).value).filter(Boolean).slice(0, 12),
      match: cleanMatch(resolved.match),
    });
  });
  return out;
}
