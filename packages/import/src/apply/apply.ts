import { typographyPairings } from "@dialmade/catalog";
import {
  FontFamilyTokenSchema,
  ReferenceSchema,
  ShadowLayerSchema,
  TypeStepSchema,
  applyPatch,
  coversPointer,
  hardLocks,
  importPatch,
  lockPointer,
  valueAtPointer,
  type ApplyImportInput,
  type DesignDoc,
  type FontSizeName,
  type ImportedValue,
  type PatchFailure,
  type PatchOperation,
  type ReferenceInput,
} from "@dialmade/doc";
import { SCALE_STEPS, cssVarName, type RoleKey } from "@dialmade/palette";
import { ACHROMATIC_CHROMA, deltaE, hueDelta, normalizeColor, tokenColor } from "../color";
import { DENSITY_DIAL } from "../fingerprint";
import { effectiveMode, worseConfidence } from "../merge";
import { scaleSystem } from "../roles";
import { cleanName, cleanText } from "../sanitize";
import type {
  Confidence,
  Detected,
  Dim,
  FontMatch,
  ImportedBrand,
  ImportedColor,
  ImportedFont,
  ImportSource,
  Mode,
  Ownership,
  Prov,
  Shadow,
  TypeStyle,
} from "../types";

/** A change made in a chip before accepting it. Edited values become `method: "edited"`, confidence exact. */
export interface DetectionEdit {
  /** Colors: any CSS color (alpha kept). */
  color?: string;
  /** Colors: the role slot it fills (`null` takes it out of every slot). */
  role?: RoleKey | null;
  mode?: Mode;
  /** Fonts: another family (e.g. the free alternative the user picked). */
  family?: string;
  /**
   * Fonts: what `family` matches, when the UI knows (a matcher result). Without it, a family the chip
   * offered (its match or candidates) is taken as that Google Fonts family; anything else is unknown.
   */
  match?: FontMatch;
  /** Dimensions (radius, border width, spacing, font size), in px. */
  px?: number;
}

/** What the user accepted in «Esto detectamos». Ids are `Detected.id`. */
export interface ImportSelection {
  accept: readonly string[];
  edits?: Readonly<Record<string, DetectionEdit>>;
  /** «Bloquear» / unlock per id. Default: own source, exact or high confidence, not AI, not a framework default. */
  locks?: Readonly<Record<string, boolean>>;
  /** Ids the user discarded: kept in provenance so a re-import does not offer them again. */
  dismissed?: readonly string[];
  /** Screenshot source ids to keep as references. Default: all. */
  references?: readonly string[];
  /** Write `brand.seeds` (and `achromatic`) from the light primary. Default true. */
  seeds?: boolean;
  /** Write `brief.recipeId` with the nearest recipe when shape values are accepted. Default true. */
  recipe?: boolean;
  /**
   * Screenshot source ids whose AI fingerprint attributes the user accepted: density → `brief.dials.density`
   * and, when no shape value was accepted, the AI's `recipeId`. Always unlocked (`method: "ai"`).
   */
  aiAttributes?: readonly string[];
}

export interface ApplyImportOptions {
  /** The batch declaration; `third-party` downgrades every source. */
  ownership: Ownership;
  /** ISO date-time (UTC) of «Es mi marca o tengo permiso de su titular». */
  rightsConfirmedAt?: string;
  /** Only after «Desbloquear»: lets values replace locked ones. */
  allowLocked?: boolean;
}

export type SkipReason =
  | "unknown-id"
  | "third-party"
  | "no-role"
  | "locked"
  | "superseded"
  | "out-of-range"
  | "invalid"
  | "unsupported-key"
  | "framework-default"
  | "duplicate-reference";

export interface SkippedDetection {
  id: string;
  reason: SkipReason;
  path?: string;
}

export type ImportPatchResult =
  | {
      ok: true;
      /** RFC 6902, to apply in one step (one undo). */
      ops: PatchOperation[];
      /** `doc` with `ops` applied and validated. */
      doc: DesignDoc;
      /** Pointers this import locked. */
      locks: string[];
      skipped: SkippedDetection[];
    }
  | { ok: false; error: PatchFailure; sourceId?: string; skipped: SkippedDetection[] };

interface Candidate {
  id: string;
  path: string;
  value: unknown;
  prov: Prov;
  lock?: boolean;
  /** Lower wins a path: [overridden, accept order]. */
  rank: [number, number];
}

const RADIUS_MAX: Readonly<Record<string, number>> = { sm: 64, md: 64, lg: 96, xl: 128 };
const FONT_SIZE_RANGE: Readonly<Record<FontSizeName, [number, number]>> = {
  display: [0, 200],
  h1: [0, 160],
  h2: [0, 128],
  h3: [0, 96],
  body: [10, 32],
  small: [9, 24],
  caption: [8, 20],
};
/** Tailwind spacing keys (multiples of 0.25rem) at each DesignDoc step: `--dl-space-1` … `-10` = 4 … 128 px. */
const TAILWIND_SPACE_KEYS = [1, 2, 3, 4, 6, 8, 12, 16, 24, 32];
const NAMED_SPACE_KEYS = ["2xs", "xs", "sm", "md", "lg", "xl", "2xl", "3xl", "4xl", "5xl"];
const TAILWIND_DEFAULT_SPACING_PX = 4;
const SHADOW_LEVEL: Readonly<Record<string, "sm" | "md" | "lg">> = { "2xs": "sm", xs: "sm", sm: "sm", DEFAULT: "md", md: "md", lg: "lg", xl: "lg", "2xl": "lg" };
const DIRECT_SHADOW: ReadonlySet<string> = new Set(["sm", "md", "lg"]);
const BRAND_GROUPS: ReadonlySet<string> = new Set(["brand", "primary"]);
const ACCENT_GROUPS: ReadonlySet<string> = new Set(["cta", "accent"]);
const SECONDARY_HUE = 30;
const SECONDARY_DELTA = 0.12;
const MAX_REFERENCES = 50;

function jsonEqual(a: unknown, b: unknown): boolean {
  if (a === b) return true;
  if (typeof a !== "object" || typeof b !== "object" || a === null || b === null) return false;
  if (Array.isArray(a) !== Array.isArray(b)) return false;
  const ka = Object.keys(a).filter((k) => (a as Record<string, unknown>)[k] !== undefined);
  const kb = Object.keys(b).filter((k) => (b as Record<string, unknown>)[k] !== undefined);
  return ka.length === kb.length && ka.every((k) => jsonEqual((a as Record<string, unknown>)[k], (b as Record<string, unknown>)[k]));
}

/** `/tokens/typography/scale/h1` → step from a declared name (`h1`, `heading-2`, `text-sm`, `caption`). */
export function typeStepFor(style: Pick<TypeStyle, "name" | "step">): FontSizeName | undefined {
  if (style.step) return style.step;
  const key = cleanName(style.name, 64)
    .value.toLowerCase()
    .replace(/[\s_.]+/g, "-")
    .replace(/^-+/, "")
    .replace(/^(?:text|font|type|typography)-/, "");
  const heading = /^(?:h|heading-?|headline-?|title-?)([1-3])$/.exec(key);
  if (heading) return `h${heading[1]}` as FontSizeName;
  // Material / Google DESIGN.md: headline-lg|md|sm → h1|h2|h3, title-* → h3, label-* → caption.
  const sized = /^(?:headline|heading)-(lg|large|md|medium|sm|small)$/.exec(key);
  if (sized) return sized[1]!.startsWith("l") ? "h1" : sized[1]!.startsWith("m") ? "h2" : "h3";
  if (/^title(?:-(?:lg|large|md|medium|sm|small))?$/.test(key)) return "h3";
  if (/^(?:display|hero|display-(?:lg|large|md|medium|sm|small))$/.test(key)) return "display";
  if (/^(?:body|base|paragraph|body-(?:lg|large|md|medium|base))$/.test(key)) return "body";
  if (/^(?:small|sm|body-(?:sm|small))$/.test(key)) return "small";
  if (/^(?:caption|xs|label|overline|label-(?:lg|large|md|medium|sm|small))$/.test(key)) return "caption";
  return undefined;
}

const provOf = (d: Prov): Prov => ({ sourceId: d.sourceId, locator: d.locator, confidence: d.confidence, method: d.method });
const edited = (d: Prov): Prov => ({ ...provOf(d), confidence: "exact", method: "edited" });

/**
 * A font after «Usar Arimo» / «Usar Figtree» or a typed family. A free alternative of a proprietary
 * family (metric-compatible or style) keeps the declared name and loads the alternative as its
 * substitute; a candidate of an unmatched, fuzzy or system family becomes that Google family.
 */
export function editedFont(font: ImportedFont, edit: DetectionEdit): ImportedFont {
  const family = cleanName(edit.family ?? font.family).value || font.family;
  const base = { ...font, ...edited(font) };
  if (edit.match) return { ...base, family, match: edit.match };
  const key = family.toLowerCase();
  const offered = [font.match.family, ...(font.match.candidates ?? [])].filter((f): f is string => !!f);
  const picked = offered.find((f) => f.toLowerCase() === key);
  if (key === font.family.toLowerCase()) return { ...base, match: font.match };
  if (!picked) return { ...base, family, match: { kind: "none" } };
  if (font.match.kind === "metric-compatible" || font.match.kind === "style-alt") return { ...base, match: { kind: font.match.kind, family: picked } };
  return { ...base, family: picked, match: { kind: "google", family: picked } };
}

/**
 * The accepted detections → one RFC 6902 patch of the DesignDoc (one undo step), built with
 * `importPatch` from @dialmade/doc per source: values to `tokens.*`, `brand.seeds`, `brief.pairingId`
 * and `brief.recipeId`, screenshots to `references`, every source to `provenance.imports`, and locks
 * for own values of exact or high confidence (not AI, not framework defaults) unless `selection.locks`
 * says otherwise. A third-party source only brings attributes: no colors, no font families, no brand.
 * Values that would change a locked one are skipped (`locked`) unless `allowLocked`.
 */
export function applyImport(doc: DesignDoc, imported: ImportedBrand, selection: ImportSelection, options: ApplyImportOptions): ImportPatchResult {
  const sources = new Map(imported.sources.map((s) => [s.id, s]));
  const ownershipOf = (sourceId: string): Ownership =>
    options.ownership === "third-party" || sources.get(sourceId)?.ownership !== "own" ? "third-party" : "own";
  const skipped: SkippedDetection[] = [];
  const skip = (id: string, reason: SkipReason, path?: string) => skipped.push({ id, reason, ...(path && { path }) });
  const order = new Map(selection.accept.map((id, i) => [id, i]));
  const accepted = (d: Detected) => order.has(d.id);
  const rankOf = (d: Detected & { overriddenBy?: string }): [number, number] => [d.overriddenBy ? 1 : 0, order.get(d.id) ?? Number.MAX_SAFE_INTEGER];
  const edits = selection.edits ?? {};
  /** `{ lock }` when the user toggled it (or a fallback applies), otherwise nothing: @dialmade/doc decides. */
  const lockField = (id: string, fallback?: boolean): { lock?: boolean } => {
    const lock = selection.locks?.[id] ?? fallback;
    return lock === undefined ? {} : { lock };
  };

  const candidates = new Map<string, Candidate>();
  const put = (c: Candidate) => {
    const current = candidates.get(c.path);
    if (!current) {
      candidates.set(c.path, c);
      return;
    }
    const newer = c.rank[0] - current.rank[0] || c.rank[1] - current.rank[1];
    if (newer < 0) {
      skip(current.id, "superseded", c.path);
      candidates.set(c.path, c);
    } else skip(c.id, "superseded", c.path);
  };

  const known = new Set<string>();
  const remember = (d: Detected) => known.add(d.id);

  // ── colors ──
  const colors: ImportedColor[] = [];
  for (const color of imported.colors) {
    remember(color);
    if (!accepted(color)) continue;
    const edit = edits[color.id];
    let next: ImportedColor = color;
    if (edit) {
      next = { ...color, ...edited(color) };
      if (edit.color !== undefined) {
        const parsed = normalizeColor(edit.color);
        if (!parsed.ok) {
          skip(color.id, "invalid");
          continue;
        }
        next = { ...next, hex: parsed.color.hex, oklch: parsed.color.oklch };
        if (parsed.color.alpha === undefined) delete next.alpha;
        else next.alpha = parsed.color.alpha;
        delete next.isFrameworkDefault;
      }
      if (edit.role === null) delete next.role;
      else if (edit.role) next.role = edit.role;
      if (edit.mode) next.mode = edit.mode;
    }
    if (ownershipOf(color.sourceId) === "third-party") {
      skip(color.id, "third-party");
      continue;
    }
    if (!next.role && !next.scale) {
      skip(color.id, "no-role");
      continue;
    }
    colors.push(next);
    if (next.role) {
      put({
        id: next.id,
        path: `/tokens/color/${effectiveMode(next)}/${cssVarName(next.role)}`,
        value: tokenColor(next),
        prov: provOf(next),
        rank: rankOf(next),
        ...lockField(next.id, next.isFrameworkDefault ? false : undefined),
      });
    }
  }

  const chosen = (mode: Mode, role: RoleKey) => {
    const c = candidates.get(`/tokens/color/${mode}/${cssVarName(role)}`);
    return c ? colors.find((color) => color.id === c.id) : undefined;
  };

  // ── scales (Tailwind 50–950 only) ──
  const groups = new Map<string, ImportedColor[]>();
  for (const color of colors) {
    if (!color.scale || !(SCALE_STEPS as readonly number[]).includes(color.scale.step)) continue;
    groups.set(color.scale.group, [...(groups.get(color.scale.group) ?? []), color]);
  }
  const usable = [...groups].filter(([, list]) => list.length >= 3 && scaleSystem(list.map((c) => c.scale!.step)) === "tailwind" && !list.every((c) => c.isFrameworkDefault));
  const containing = (color: ImportedColor | undefined) =>
    color && usable.find(([, list]) => list.some((c) => deltaE(c.hex, color.hex) < 0.02))?.[0];
  const brandGroup = usable.find(([name]) => BRAND_GROUPS.has(name))?.[0] ?? containing(chosen("light", "primary"));
  const accentGroup = usable.find(([name]) => ACCENT_GROUPS.has(name) && name !== brandGroup)?.[0] ?? containing(chosen("light", "cta"));
  for (const [target, group] of [["brand", brandGroup], ["accent", accentGroup !== brandGroup ? accentGroup : undefined]] as const) {
    if (!group) continue;
    const list = [...groups.get(group)!].sort((a, b) => a.scale!.step - b.scale!.step);
    const first = list[0]!;
    const value: Record<string, string> = {};
    for (const c of list) value[String(c.scale!.step)] = c.hex;
    const confidence = list.reduce<Confidence>((worst, c) => worseConfidence(worst, c.confidence), "exact");
    put({
      id: first.id,
      path: `/tokens/color/scales/${target}`,
      value,
      prov: { ...provOf(first), locator: cleanText(`${first.locator} (+${list.length - 1})`, 200), confidence },
      rank: rankOf(first),
      ...lockField(first.id),
    });
  }

  // ── seeds ──
  const primary = chosen("light", "primary");
  if (primary && selection.seeds !== false) {
    const seedLock = candidates.get(`/tokens/color/light/primary`)?.lock;
    const seedProv = { prov: provOf(primary), rank: rankOf(primary), ...(seedLock !== undefined && { lock: seedLock }) };
    put({ id: primary.id, path: "/brand/seeds/primary", value: primary.hex, ...seedProv });
    const achromatic = primary.oklch.c < ACHROMATIC_CHROMA;
    put({ id: primary.id, path: "/brand/achromatic", value: achromatic, prov: provOf(primary), rank: rankOf(primary), lock: false });
    const pool = (achromatic ? (["cta", "ring", "secondary", "chart1"] as const) : (["secondary", "cta"] as const))
      .map((role) => chosen("light", role))
      .filter((c): c is ImportedColor => c !== undefined && c.oklch.c >= ACHROMATIC_CHROMA);
    const secondary = pool.find(
      (c) => achromatic || Math.abs(hueDelta(primary.oklch.h, c.oklch.h)) >= SECONDARY_HUE || deltaE(primary.hex, c.hex) >= SECONDARY_DELTA,
    );
    if (secondary) {
      const lock = candidates.get(`/tokens/color/light/${cssVarName(secondary.role!)}`)?.lock;
      put({ id: secondary.id, path: "/brand/seeds/secondary", value: secondary.hex, prov: provOf(secondary), rank: rankOf(secondary), ...(lock !== undefined && { lock }) });
    }
  }

  // ── fonts ──
  const fontByRole = new Map<string, ImportedFont>();
  for (const font of imported.fonts) {
    remember(font);
    if (!accepted(font)) continue;
    if (ownershipOf(font.sourceId) === "third-party") {
      skip(font.id, "third-party");
      continue;
    }
    const edit = edits[font.id];
    const next: ImportedFont = edit?.family || edit?.match ? editedFont(font, edit) : font;
    const current = fontByRole.get(next.role);
    if (current && (rankOf(current)[0] - rankOf(next)[0] || rankOf(current)[1] - rankOf(next)[1]) <= 0) {
      skip(next.id, "superseded", `/tokens/typography/${next.role}`);
      continue;
    }
    if (current) skip(current.id, "superseded", `/tokens/typography/${current.role}`);
    fontByRole.set(next.role, next);
  }
  const familyOf = (f: ImportedFont) => (f.match.kind === "alias" && f.match.family ? f.match.family : f.family).toLowerCase();
  const heading = fontByRole.get("heading");
  const body = fontByRole.get("body");
  const pairing =
    heading && body
      ? typographyPairings.find((p) => p.heading.family.toLowerCase() === familyOf(heading) && p.body.family.toLowerCase() === familyOf(body))
      : undefined;
  if (pairing && heading && body) {
    put({
      id: heading.id,
      path: "/brief/pairingId",
      value: pairing.id,
      prov: { ...provOf(heading), confidence: worseConfidence(heading.confidence, body.confidence) },
      rank: rankOf(heading),
      ...lockField(heading.id),
    });
  }
  for (const font of fontByRole.values()) {
    if (pairing && font.role !== "mono") continue;
    const token = fontToken(font);
    if (!FontFamilyTokenSchema.safeParse(token).success) {
      skip(font.id, "invalid", `/tokens/typography/${font.role}`);
      continue;
    }
    put({ id: font.id, path: `/tokens/typography/${font.role}`, value: token, prov: provOf(font), rank: rankOf(font), ...lockField(font.id) });
  }

  // ── shape ──
  const pxOf = (d: Dim & Detected) => edits[d.id]?.px ?? d.px;
  const provFor = (d: Detected) => (edits[d.id]?.px !== undefined ? edited(d) : provOf(d));
  /** `value` defaults to the (possibly edited) px of `d`; derived steps pass their own. */
  const dimCandidate = (d: Dim & Detected, path: string, max: number, min = 0, value = pxOf(d)) => {
    const px = Math.round(value * 100) / 100;
    if (!(px >= min && px <= max)) {
      skip(d.id, "out-of-range", path);
      return;
    }
    put({ id: d.id, path, value: px, prov: provFor(d), rank: rankOf(d), ...lockField(d.id) });
  };
  const shapeAccepted: Detected[] = [];
  for (const [key, d] of Object.entries(imported.shape.radii ?? {})) {
    remember(d);
    if (!accepted(d)) continue;
    shapeAccepted.push(d);
    if (RADIUS_MAX[key] === undefined) skip(d.id, "unsupported-key", `/tokens/radius/${key}`);
    else dimCandidate(d, `/tokens/radius/${key}`, RADIUS_MAX[key]!);
  }
  const base = imported.shape.radius;
  if (base) {
    remember(base);
    if (accepted(base)) {
      shapeAccepted.push(base);
      const r = pxOf(base);
      const derived: Record<string, number> = { sm: Math.max(0, r - 4), md: Math.max(0, r - 2), lg: r, xl: r + 4 };
      for (const [key, px] of Object.entries(derived)) {
        if (candidates.has(`/tokens/radius/${key}`)) continue;
        dimCandidate(base, `/tokens/radius/${key}`, RADIUS_MAX[key]!, 0, px);
      }
    }
  }
  const border = imported.shape.borderWidth;
  if (border) {
    remember(border);
    if (accepted(border)) {
      shapeAccepted.push(border);
      dimCandidate(border, "/tokens/borderWidth", 8);
    }
  }
  for (const s of imported.shape.shadows ?? []) remember(s);
  const shadows = (imported.shape.shadows ?? []).filter(accepted);
  shapeAccepted.push(...shadows);
  for (const shadow of [...shadows].sort((a, b) => Number(DIRECT_SHADOW.has(b.name)) - Number(DIRECT_SHADOW.has(a.name)))) {
    const level = SHADOW_LEVEL[shadow.name];
    if (!level) {
      skip(shadow.id, "unsupported-key", `/tokens/elevation/${shadow.name}`);
      continue;
    }
    const path = `/tokens/elevation/${level}`;
    if (!DIRECT_SHADOW.has(shadow.name) && candidates.has(path)) {
      skip(shadow.id, "superseded", path);
      continue;
    }
    const layers = shadowLayers(shadow);
    if (!layers) {
      skip(shadow.id, "out-of-range", path);
      continue;
    }
    put({ id: shadow.id, path, value: layers, prov: provOf(shadow), rank: rankOf(shadow), ...lockField(shadow.id) });
  }

  // ── spacing ──
  for (const [key, d] of Object.entries(imported.spacing?.scale ?? {})) {
    remember(d);
    if (!accepted(d)) continue;
    const tailwind = TAILWIND_SPACE_KEYS.indexOf(Number(key));
    const named = NAMED_SPACE_KEYS.indexOf(key.toLowerCase());
    const step = tailwind >= 0 ? tailwind + 1 : named >= 0 ? named + 1 : 0;
    if (step === 0) skip(d.id, "unsupported-key", `/tokens/space/${key}`);
    else dimCandidate(d, `/tokens/space/${step}`, 256);
  }
  const spaceBase = imported.spacing?.base;
  if (spaceBase) {
    remember(spaceBase);
    if (accepted(spaceBase)) {
      const px = pxOf(spaceBase);
      if (Math.abs(px - TAILWIND_DEFAULT_SPACING_PX) < 0.01 && edits[spaceBase.id]?.px === undefined) skip(spaceBase.id, "framework-default", "/tokens/space");
      else
        TAILWIND_SPACE_KEYS.forEach((k, i) => {
          if (!candidates.has(`/tokens/space/${i + 1}`)) dimCandidate(spaceBase, `/tokens/space/${i + 1}`, 256, 0, px * k);
        });
    }
  }

  // ── type scale ──
  for (const style of imported.typeScale ?? []) {
    remember(style);
    if (!accepted(style)) continue;
    const step = typeStepFor(style);
    if (!step) {
      skip(style.id, "unsupported-key", `/tokens/fontSize/${style.name}`);
      continue;
    }
    if (style.fontSize) {
      const [min, max] = FONT_SIZE_RANGE[step];
      dimCandidate({ ...style, ...style.fontSize }, `/tokens/fontSize/${step}`, max, min, edits[style.id]?.px ?? style.fontSize.px);
    }
    const metrics = {
      ...(style.lineHeight !== undefined && { lineHeight: style.lineHeight }),
      ...(style.letterSpacing !== undefined && { letterSpacing: style.letterSpacing }),
      ...(style.weight !== undefined && { weight: style.weight }),
    };
    if (Object.keys(metrics).length === 0) continue;
    if (!TypeStepSchema.safeParse(metrics).success) skip(style.id, "out-of-range", `/tokens/typography/scale/${step}`);
    else put({ id: style.id, path: `/tokens/typography/scale/${step}`, value: metrics, prov: provOf(style), rank: rankOf(style), ...lockField(style.id) });
  }

  // ── system (component shapes; never locked unless the user locks them) ──
  for (const hint of imported.system ?? []) {
    remember(hint);
    if (!accepted(hint)) continue;
    put({ id: hint.id, path: `/system/${hint.component}/${hint.key}`, value: hint.value, prov: provOf(hint), rank: rankOf(hint), ...lockField(hint.id, false) });
  }

  // ── recipe ──
  // Radii alone do not tell a style: shadows, border or surface must back it, or the recipe would
  // bring shadows and borders the guide never declared (shadcn's radius is «soft-neubrutal»'s).
  const recipe = imported.recipe;
  const strongestShape = [...shapeAccepted].sort((a, b) => rankOf(a)[1] - rankOf(b)[1])[0];
  const styleEvidence = shadows.length > 0 || (border !== undefined && accepted(border)) || (recipe?.basis.includes("surface") ?? false);
  if (recipe && selection.recipe !== false && strongestShape && styleEvidence) {
    put({
      id: strongestShape.id,
      path: "/brief/recipeId",
      value: recipe.id,
      prov: { ...provOf(strongestShape), locator: cleanText(`${strongestShape.locator} → ${recipe.id}`, 200), confidence: worseConfidence(strongestShape.confidence, "medium") },
      rank: rankOf(strongestShape),
      lock: false,
    });
  }

  // ── AI attributes (opt-in, never locked) ──
  for (const sourceId of selection.aiAttributes ?? []) {
    const fp = imported.screenshots?.find((s) => s.sourceId === sourceId)?.fingerprint;
    const source = sources.get(sourceId);
    if (!fp || !source || fp.method !== "ai") {
      skip(sourceId, "unknown-id");
      continue;
    }
    const prov: Prov = { sourceId, locator: cleanText(`${source.fileName} · ai`, 200), confidence: fp.confidence ?? "low", method: "ai" };
    const density = fp.density ? DENSITY_DIAL[fp.density] : undefined;
    if (density !== undefined) put({ id: sourceId, path: "/brief/dials/density", value: density, prov, rank: [1, Number.MAX_SAFE_INTEGER], lock: false });
    if (fp.recipeId && !candidates.has("/brief/recipeId")) put({ id: sourceId, path: "/brief/recipeId", value: fp.recipeId, prov, rank: [1, Number.MAX_SAFE_INTEGER], lock: false });
  }

  for (const id of selection.accept) if (!known.has(id)) skip(id, "unknown-id");

  // ── locks already in the doc ──
  const docLocks = [...doc.brief.locks.map(lockPointer)];
  for (const [path, c] of [...candidates]) {
    if (options.allowLocked) break;
    const blocked = docLocks.some((lock) => {
      if (coversPointer(lock, path)) return !jsonEqual(valueAtPointer(doc, path), c.value);
      if (coversPointer(path, lock)) return !jsonEqual(valueAtPointer(doc, lock), valueAtPointer(c.value, lock.slice(path.length)));
      return false;
    });
    if (blocked) {
      candidates.delete(path);
      skip(c.id, "locked", path);
    }
  }

  // ── per-source inputs ──
  const dismissedBySource = new Map<string, string[]>();
  const all: Detected[] = [
    ...imported.colors,
    ...imported.fonts,
    ...Object.values(imported.shape.radii ?? {}),
    ...(imported.shape.radius ? [imported.shape.radius] : []),
    ...(imported.shape.borderWidth ? [imported.shape.borderWidth] : []),
    ...(imported.shape.shadows ?? []),
    ...Object.values(imported.spacing?.scale ?? {}),
    ...(imported.spacing?.base ? [imported.spacing.base] : []),
    ...(imported.typeScale ?? []),
    ...(imported.system ?? []),
  ];
  const byId = new Map(all.map((d) => [d.id, d]));
  for (const id of selection.dismissed ?? []) {
    const d = byId.get(id);
    if (d) dismissedBySource.set(d.sourceId, [...new Set([...(dismissedBySource.get(d.sourceId) ?? []), d.locator])]);
  }

  const valuesBySource = new Map<string, ImportedValue[]>();
  for (const c of candidates.values()) {
    const list = valuesBySource.get(c.prov.sourceId) ?? [];
    list.push({
      path: c.path as ImportedValue["path"],
      value: c.value,
      locator: c.prov.locator,
      confidence: c.prov.confidence,
      method: c.prov.method,
      ...(c.lock !== undefined && { lock: c.lock }),
    });
    valuesBySource.set(c.prov.sourceId, list);
  }

  const inputs: ApplyImportInput[] = [];
  for (const source of imported.sources) {
    const values = valuesBySource.get(source.id) ?? [];
    const dismissed = dismissedBySource.get(source.id) ?? [];
    if (values.length === 0 && dismissed.length === 0) continue;
    inputs.push({ source: recordFor(source, ownershipOf(source.id), options.rightsConfirmedAt, dismissed), values });
  }

  // ── references ──
  const refOps: PatchOperation[] = [];
  const wanted = new Set(selection.references ?? (imported.screenshots ?? []).map((s) => s.sourceId));
  let referenceCount = doc.references.length;
  for (const shot of imported.screenshots ?? []) {
    if (!wanted.has(shot.sourceId)) continue;
    const source = sources.get(shot.sourceId);
    if (!source) continue;
    const id = `ref-${source.sha256.slice(0, 12)}`;
    if (doc.references.some((r) => r.id === id || r.contentHash === source.sha256)) {
      skip(shot.sourceId, "duplicate-reference");
      continue;
    }
    if (referenceCount >= MAX_REFERENCES) {
      skip(shot.sourceId, "out-of-range", "/references");
      continue;
    }
    const reference: ReferenceInput = {
      id,
      kind: "upload",
      origin: "screenshot",
      ownership: ownershipOf(shot.sourceId),
      contentHash: source.sha256,
      label: cleanText(source.fileName, 120),
      fingerprint: {
        ...(shot.fingerprint ?? {}),
        colors: shot.swatches.slice(0, 12),
        ...(shot.mode !== "ambiguous" && { mode: shot.mode }),
        method: shot.fingerprint?.method ?? "pixel",
      },
      usedFor: [],
    };
    const parsed = ReferenceSchema.safeParse(reference);
    if (!parsed.success) {
      skip(shot.sourceId, "invalid", "/references");
      continue;
    }
    referenceCount++;
    refOps.push({ op: "add", path: "/references/-", value: parsed.data });
  }

  // ── build the patch source by source, then check it in one go ──
  let scratch = doc;
  const ops: PatchOperation[] = [];
  for (const input of inputs) {
    let sourceOps: PatchOperation[];
    try {
      sourceOps = importPatch(scratch, input);
    } catch (error) {
      return { ok: false, error: { reason: "invalid-operation", message: error instanceof Error ? error.message : String(error) }, sourceId: input.source.sourceId, skipped };
    }
    const step = applyPatch(scratch, sourceOps, { allowLocked: options.allowLocked ?? false });
    if (!step.ok) return { ok: false, error: step.error, sourceId: input.source.sourceId, skipped };
    scratch = step.doc;
    ops.push(...sourceOps);
  }
  ops.push(...refOps);
  const result = applyPatch(doc, ops, { allowLocked: options.allowLocked ?? false });
  if (!result.ok) return { ok: false, error: result.error, skipped };
  const before = new Set(hardLocks(doc));
  return { ok: true, ops, doc: result.doc, locks: hardLocks(result.doc).filter((l) => !before.has(l)), skipped };
}

function recordFor(source: ImportSource, ownership: Ownership, rightsConfirmedAt: string | undefined, dismissed: string[]): ApplyImportInput["source"] {
  const confirmed = ownership === "own" ? (rightsConfirmedAt ?? source.rightsConfirmedAt) : undefined;
  return {
    sourceId: source.id,
    kind: source.kind,
    format: source.format,
    fileName: cleanText(source.fileName, 128) || "file",
    sha256: source.sha256,
    bytes: source.bytes,
    parser: source.parser,
    ownership,
    ...(confirmed && { rightsConfirmedAt: confirmed }),
    dismissed,
  };
}

/** An imported font → `tokens.typography.<role>` (family, where it loads from, free substitute, fallback, weights). */
export function fontToken(font: ImportedFont) {
  const fallback = font.fallback.filter((f) => FontFamilyTokenSchema.shape.family.safeParse(f).success).slice(0, 12);
  const weights = [...new Set(font.weights)].filter((w) => Number.isInteger(w) && w >= 1 && w <= 1000).slice(0, 12);
  const base = { ...(fallback.length > 0 && { fallback }), ...(weights.length > 0 && { weights }) };
  switch (font.match.kind) {
    case "google":
      return { family: font.match.family ?? font.family, source: "google" as const, ...base };
    case "alias":
      return { family: font.match.family ?? font.family, source: "google" as const, ...base };
    case "metric-compatible":
    case "style-alt": {
      const substitute = font.match.family ?? font.match.candidates?.[0];
      return { family: font.family, source: "local" as const, ...(substitute && { substitute }), ...base };
    }
    case "system":
      return { family: font.family, source: "system" as const, ...base };
    default:
      return { family: font.family, source: "unknown" as const, ...base };
  }
}

/** Shadow layers for `tokens.elevation` (inset layers dropped); `undefined` when a layer is out of range. */
function shadowLayers(shadow: Shadow): { x: number; y: number; blur: number; spread: number; color: string; alpha: number }[] | undefined {
  const layers = shadow.layers.filter((l) => !l.inset).slice(0, 6).map(({ x, y, blur, spread, color, alpha }) => ({ x, y, blur, spread, color, alpha }));
  return layers.every((l) => ShadowLayerSchema.safeParse(l).success) ? layers : undefined;
}

/**
 * What «Esto detectamos» pre-selects: own colors with a role (not overridden, not AI, not low
 * confidence) and own scale steps that are not framework defaults; fonts, shape, spacing and type
 * that are not overridden or AI; every screenshot as a reference. Third-party colors and fonts stay
 * out (they would be skipped anyway).
 */
export function defaultSelection(imported: ImportedBrand): ImportSelection {
  const own = new Set(imported.sources.filter((s) => s.ownership === "own").map((s) => s.id));
  const usable = (d: Detected & { overriddenBy?: string }) => !d.overriddenBy && d.method !== "ai";
  const accept: string[] = [];
  for (const c of imported.colors) {
    if (!own.has(c.sourceId) || !usable(c)) continue;
    if (c.role ? c.confidence !== "low" : c.scale && !c.isFrameworkDefault) accept.push(c.id);
  }
  for (const f of imported.fonts) if (own.has(f.sourceId) && usable(f)) accept.push(f.id);
  const rest: Detected[] = [
    ...(imported.shape.radius ? [imported.shape.radius] : []),
    ...Object.values(imported.shape.radii ?? {}),
    ...(imported.shape.borderWidth ? [imported.shape.borderWidth] : []),
    ...(imported.shape.shadows ?? []),
    ...(imported.spacing?.base ? [imported.spacing.base] : []),
    ...Object.values(imported.spacing?.scale ?? {}),
    ...(imported.typeScale ?? []),
    ...(imported.system ?? []),
  ];
  for (const d of rest) if (usable(d)) accept.push(d.id);
  return { accept, references: (imported.screenshots ?? []).map((s) => s.sourceId), seeds: true, recipe: true };
}

