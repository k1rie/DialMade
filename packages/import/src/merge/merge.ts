import type { RoleKey } from "@dialmade/palette";
import { deltaE, oklabOf } from "../color";
import type {
  Confidence,
  Detected,
  Dim,
  ImportedBrand,
  ImportedColor,
  ImportedFont,
  ImportedShape,
  ImportedSpacing,
  ImportSource,
  ImportSourceKind,
  ImportWarning,
  LogoConflict,
  Mode,
  Prov,
  ScreenshotSummary,
  Shadow,
  SystemHint,
  TypeStyle,
  Unresolved,
} from "../types";

/** Colors closer than this are the same color: merged, keeping both provenances. */
export const MERGE_DELTA_E = 0.02;
/**
 * Within one source both values were declared on purpose (a scale step next to a role): they merge
 * only when practically identical, so neither loses its exact value.
 */
export const SAME_SOURCE_DELTA_E = 0.001;
/** The logo and the imported guide disagree above this: a conflict card. */
export const CONFLICT_DELTA_E = 0.06;

/**
 * Who wins when sources disagree (lower wins): tokens/CSS > tailwind.config > DESIGN.md > palette
 * file > pasted text > PDF text > screenshots > AI (any value with `method: "ai"`). The logo sits
 * between PDF text and screenshots, but it is not a source here: see `findLogoConflicts`.
 */
export const KIND_RANK: Readonly<Record<ImportSourceKind, number>> = {
  tokens: 0,
  css: 0,
  url: 1,
  "tailwind-config": 1,
  scss: 1,
  "design-md": 2,
  "palette-file": 3,
  paste: 4,
  "font-name": 4,
  "font-file": 4,
  pdf: 5,
  screenshot: 7,
};
export const AI_RANK = 8;

const CONFIDENCE_RANK: Readonly<Record<Confidence, number>> = { exact: 0, high: 1, medium: 2, low: 3 };

export const worseConfidence = (a: Confidence, b: Confidence): Confidence => (CONFIDENCE_RANK[a] >= CONFIDENCE_RANK[b] ? a : b);

/** Everything one source brought, already normalized (ids and source ids stamped). */
export interface SourceFragment {
  source: ImportSource;
  colors: ImportedColor[];
  fonts: ImportedFont[];
  shape: ImportedShape;
  spacing?: ImportedSpacing;
  typeScale?: (TypeStyle & Detected)[];
  system?: (SystemHint & Detected)[];
  screenshot?: ScreenshotSummary;
  notes: string[];
  warnings: ImportWarning[];
  unresolved: Unresolved[];
}

type SortKey = [rank: number, confidence: number, order: number, item: number];

const compareKeys = (a: SortKey, b: SortKey) => a[0] - b[0] || a[1] - b[1] || a[2] - b[2] || a[3] - b[3];

function keyer(sources: readonly ImportSource[]) {
  const order = new Map(sources.map((s, i) => [s.id, { i, kind: s.kind }]));
  return (p: Prov, item: number): SortKey => {
    const src = order.get(p.sourceId);
    const rank = p.method === "ai" ? AI_RANK : src ? KIND_RANK[src.kind] : AI_RANK;
    return [rank, CONFIDENCE_RANK[p.confidence] ?? 3, src?.i ?? Number.MAX_SAFE_INTEGER, item];
  };
}

const provOf = ({ sourceId, locator, confidence, method }: Prov): Prov => ({ sourceId, locator, confidence, method });

const withAlso = <T extends Detected>(item: T, extra: readonly Prov[]): T =>
  extra.length === 0 ? item : { ...item, also: [...(item.also ?? []), ...extra] };

/** The mode a color applies to: without one, it is a light-mode value. */
export const effectiveMode = (color: { mode?: Mode }): Mode => color.mode ?? "light";

/** A color with a role is a light-mode value unless it says otherwise; without a role, no mode is a wildcard. */
const modeOf = (c: ImportedColor): Mode | undefined => (c.role ? effectiveMode(c) : c.mode);

function compatible(a: ImportedColor, b: ImportedColor): boolean {
  const ma = modeOf(a);
  const mb = modeOf(b);
  if (ma && mb && ma !== mb) return false;
  // A role the vision AI suggests never lands on a declared color: it would keep the declared method and get locked.
  if ((a.method === "ai") !== (b.method === "ai") && Boolean(a.role) !== Boolean(b.role)) return false;
  if (a.role && b.role && a.role !== b.role) return false;
  if (a.scale && b.scale && (a.scale.group !== b.scale.group || a.scale.step !== b.scale.step)) return false;
  return Math.abs((a.alpha ?? 1) - (b.alpha ?? 1)) < 0.02;
}

const CELL = MERGE_DELTA_E;
const cellOf = (c: ImportedColor) => {
  const lab = oklabOf(c.oklch);
  return [Math.floor(lab.l / CELL), Math.floor(lab.a / CELL), Math.floor(lab.b / CELL)] as const;
};

/**
 * Merges near-identical colors (ΔEok < 0.02 across sources, < 0.001 within one; same alpha) whose mode, role and scale step do not
 * contradict: the strongest keeps its id and value, takes the missing fields of the others (a role
 * borrowed from a weaker source lowers the confidence to the weaker one) and lists them in `also`.
 * Then, per mode and role, every color but the strongest gets `overriddenBy`.
 */
export function mergeColors(colors: readonly ImportedColor[], sources: readonly ImportSource[]): ImportedColor[] {
  const key = keyer(sources);
  const sorted = colors.map((color, i) => ({ color, key: key(color, i) })).sort((a, b) => compareKeys(a.key, b.key));
  const merged: { color: ImportedColor; key: SortKey }[] = [];
  const grid = new Map<string, number[]>();
  for (const { color, key: k } of sorted) {
    const [l, a, b] = cellOf(color);
    let target = -1;
    search: for (let dl = -1; dl <= 1; dl++) {
      for (let da = -1; da <= 1; da++) {
        for (let db = -1; db <= 1; db++) {
          for (const index of grid.get(`${l + dl},${a + da},${b + db}`) ?? []) {
            const candidate = merged[index]!.color;
            const threshold = candidate.sourceId === color.sourceId ? SAME_SOURCE_DELTA_E : MERGE_DELTA_E;
            if (compatible(candidate, color) && deltaE(candidate.hex, color.hex) < threshold) {
              target = index;
              break search;
            }
          }
        }
      }
    }
    if (target < 0) {
      const cell = `${l},${a},${b}`;
      grid.set(cell, [...(grid.get(cell) ?? []), merged.length]);
      merged.push({ color, key: k });
      continue;
    }
    const into = merged[target]!.color;
    const next: ImportedColor = withAlso(into, [provOf(color), ...(color.also ?? [])]);
    if (!into.role && color.role) {
      next.role = color.role;
      next.confidence = worseConfidence(into.confidence, color.confidence);
    }
    if (!into.mode && color.mode && !into.role) next.mode = color.mode;
    if (!into.scale && color.scale) next.scale = color.scale;
    if (!into.name && color.name) next.name = color.name;
    merged[target]!.color = next;
  }

  const winners = new Map<string, string>();
  const out = merged.sort((a, b) => compareKeys(a.key, b.key)).map(({ color }) => {
    if (!color.role) return color;
    const slot = `${effectiveMode(color)}|${color.role}`;
    const winner = winners.get(slot);
    if (winner === undefined) {
      winners.set(slot, color.id);
      return color;
    }
    return { ...color, overriddenBy: winner };
  });
  const position = new Map(colors.map((c, i) => [c.id, i]));
  return out.sort((a, b) => (position.get(a.id) ?? 0) - (position.get(b.id) ?? 0));
}

const familyKey = (family: string) => family.trim().toLowerCase().replace(/\s+/g, " ");

/** Per role: the same family merges (weights joined), another family is `overriddenBy` the strongest. */
export function mergeFonts(fonts: readonly ImportedFont[], sources: readonly ImportSource[]): ImportedFont[] {
  const key = keyer(sources);
  const sorted = fonts.map((font, i) => ({ font, key: key(font, i) })).sort((a, b) => compareKeys(a.key, b.key));
  const kept: ImportedFont[] = [];
  const winner = new Map<string, ImportedFont>();
  for (const { font } of sorted) {
    const same = kept.findIndex((k) => k.role === font.role && familyKey(k.family) === familyKey(font.family));
    if (same >= 0) {
      const into = kept[same]!;
      const weights = [...new Set([...into.weights, ...font.weights])].sort((a, b) => a - b);
      kept[same] = { ...withAlso(into, [provOf(font), ...(font.also ?? [])]), weights };
      continue;
    }
    const top = winner.get(font.role);
    if (top) kept.push({ ...font, overriddenBy: top.id });
    else {
      winner.set(font.role, font);
      kept.push(font);
    }
  }
  const position = new Map(fonts.map((f, i) => [f.id, i]));
  return kept.sort((a, b) => (position.get(a.id) ?? 0) - (position.get(b.id) ?? 0));
}

interface Best<T extends Detected> {
  winner?: T;
  warnings: ImportWarning[];
}

/** The strongest candidate; equal ones join its `also`, different ones are dropped with an `overridden` warning. */
function pickBest<T extends Detected>(
  candidates: readonly T[],
  sources: readonly ImportSource[],
  same: (a: T, b: T) => boolean,
  label: string,
): Best<T> {
  if (candidates.length === 0) return { warnings: [] };
  const key = keyer(sources);
  const [first, ...rest] = candidates.map((c, i) => ({ c, key: key(c, i) })).sort((a, b) => compareKeys(a.key, b.key));
  let winner = first!.c;
  const warnings: ImportWarning[] = [];
  for (const { c } of rest) {
    if (same(winner, c)) winner = withAlso(winner, [provOf(c), ...(c.also ?? [])]);
    else warnings.push({ sourceId: c.sourceId, code: "overridden", detail: `${label}: ${winner.locator}` });
  }
  return { winner, warnings };
}

const sameDim = (a: Dim, b: Dim) => Math.abs(a.px - b.px) < 0.5;
const sameShadow = (a: Shadow, b: Shadow) => JSON.stringify(a.layers) === JSON.stringify(b.layers);
const sameType = (a: TypeStyle, b: TypeStyle) =>
  a.fontSize?.px === b.fontSize?.px && a.lineHeight === b.lineHeight && a.letterSpacing === b.letterSpacing && a.weight === b.weight;

function pickRecord<T extends Detected>(
  records: readonly (Record<string, T> | undefined)[],
  sources: readonly ImportSource[],
  same: (a: T, b: T) => boolean,
  label: string,
  warnings: ImportWarning[],
): Record<string, T> | undefined {
  const byKey = new Map<string, T[]>();
  for (const record of records) {
    for (const [name, value] of Object.entries(record ?? {})) byKey.set(name, [...(byKey.get(name) ?? []), value]);
  }
  if (byKey.size === 0) return undefined;
  const out: Record<string, T> = {};
  for (const [name, list] of byKey) {
    const pick = pickBest(list, sources, same, `${label}.${name}`);
    warnings.push(...pick.warnings);
    if (pick.winner) out[name] = pick.winner;
  }
  return out;
}

export type MergedBrand = Omit<ImportedBrand, "version" | "files" | "conflicts" | "recipe">;

/** Joins the fragments of a batch with the precedence rules above. Pure and deterministic. */
export function mergeFragments(fragments: readonly SourceFragment[]): MergedBrand {
  const sources = fragments.map((f) => f.source);
  const warnings: ImportWarning[] = fragments.flatMap((f) => f.warnings);

  const radius = pickBest(fragments.flatMap((f) => (f.shape.radius ? [f.shape.radius] : [])), sources, sameDim, "radius");
  const borderWidth = pickBest(fragments.flatMap((f) => (f.shape.borderWidth ? [f.shape.borderWidth] : [])), sources, sameDim, "borderWidth");
  warnings.push(...radius.warnings, ...borderWidth.warnings);
  const radii = pickRecord(fragments.map((f) => f.shape.radii), sources, sameDim, "radius", warnings);
  const shadowRecords = fragments.map((f) => (f.shape.shadows ? Object.fromEntries(f.shape.shadows.map((s) => [s.name, s])) : undefined));
  const shadows = pickRecord(shadowRecords, sources, sameShadow, "shadow", warnings);
  const shape: ImportedShape = {
    ...(radius.winner && { radius: radius.winner }),
    ...(radii && { radii }),
    ...(shadows && { shadows: Object.values(shadows) }),
    ...(borderWidth.winner && { borderWidth: borderWidth.winner }),
  };

  const spaceBase = pickBest(fragments.flatMap((f) => (f.spacing?.base ? [f.spacing.base] : [])), sources, sameDim, "spacing");
  warnings.push(...spaceBase.warnings);
  const spaceScale = pickRecord(fragments.map((f) => f.spacing?.scale), sources, sameDim, "spacing", warnings);
  const spacing: ImportedSpacing | undefined =
    spaceBase.winner || spaceScale ? { ...(spaceBase.winner && { base: spaceBase.winner }), ...(spaceScale && { scale: spaceScale }) } : undefined;

  const typeRecords = fragments.map((f) => (f.typeScale ? Object.fromEntries(f.typeScale.map((t) => [t.step ?? t.name, t])) : undefined));
  const typeScale = pickRecord(typeRecords, sources, sameType, "type", warnings);
  const systemRecords = fragments.map((f) => (f.system ? Object.fromEntries(f.system.map((h) => [`${h.component}.${h.key}`, h])) : undefined));
  const system = pickRecord(systemRecords, sources, (a, b) => a.value === b.value, "system", warnings);

  const screenshots = fragments.flatMap((f) => (f.screenshot ? [f.screenshot] : []));
  return {
    sources,
    colors: mergeColors(fragments.flatMap((f) => f.colors), sources),
    fonts: mergeFonts(fragments.flatMap((f) => f.fonts), sources),
    shape,
    ...(spacing && { spacing }),
    ...(typeScale && { typeScale: Object.values(typeScale) }),
    ...(system && { system: Object.values(system) }),
    ...(screenshots.length > 0 && { screenshots }),
    notes: fragments.flatMap((f) => f.notes),
    warnings,
    unresolved: fragments.flatMap((f) => f.unresolved),
  };
}

/** The guide's winning color for a role in light mode (not overridden). */
export function guideColor(colors: readonly ImportedColor[], role: RoleKey): ImportedColor | undefined {
  return colors.find((c) => c.role === role && effectiveMode(c) === "light" && !c.overriddenBy);
}

/**
 * Logo vs imported guide: a card when their primaries (or secondaries) differ by more than ΔEok 0.06.
 * Choices: «Usar la guía» (default) · «Usar el logo» · «Primario de la guía + secundario del logo».
 */
export function findLogoConflicts(
  colors: readonly ImportedColor[],
  logo: { primary: string; secondary?: string },
  threshold = CONFLICT_DELTA_E,
): LogoConflict[] {
  const out: LogoConflict[] = [];
  const check = (role: "primary" | "secondary", logoHex: string | undefined) => {
    const guide = guideColor(colors, role);
    if (!guide || !logoHex) return;
    const d = deltaE(guide.hex, logoHex);
    if (d > threshold) {
      out.push({
        role,
        guideId: guide.id,
        guide: guide.hex,
        logo: logoHex.toLowerCase(),
        deltaE: Math.round(d * 1000) / 1000,
        choices: ["guide", "logo", "guide-primary-logo-secondary"],
      });
    }
  };
  check("primary", logo.primary);
  check("secondary", logo.secondary);
  return out;
}
