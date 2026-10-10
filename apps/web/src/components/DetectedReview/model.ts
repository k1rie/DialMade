import type { PatchOperation } from "@dialmade/doc";
import type {
  Detected,
  DetectionEdit,
  Dim,
  ImportedBrand,
  ImportedColor,
  ImportedFont,
  ImportSelection,
  LogoChoice,
  Mode,
  Ownership,
  Shadow,
  SystemHint,
  TypeStyle,
} from "@dialmade/import";
import { ROLE_KEYS, parseColorWithAlpha, splitAlpha, type RoleKey } from "@dialmade/palette";

/** «Esto detectamos» as pure data: what each chip is, the user's choices and what they add up to. */

export const SLOT_ROLES = ["primary", "secondary", "background", "foreground", "cta"] as const satisfies readonly RoleKey[];
export type SlotRole = (typeof SLOT_ROLES)[number];

export type ChipGroup = "colors" | "type" | "shape";

export type ChipItem =
  | { kind: "color"; id: string; group: "colors"; color: ImportedColor }
  | { kind: "font"; id: string; group: "type"; font: ImportedFont }
  | { kind: "type"; id: string; group: "type"; style: TypeStyle & Detected }
  | { kind: "radius"; id: string; group: "shape"; dim: Dim & Detected; key?: string }
  | { kind: "border"; id: string; group: "shape"; dim: Dim & Detected }
  | { kind: "shadow"; id: string; group: "shape"; shadow: Shadow & Detected }
  | { kind: "space"; id: string; group: "shape"; dim: Dim & Detected; key?: string }
  | { kind: "system"; id: string; group: "shape"; hint: SystemHint & Detected };

export const detectedOf = (item: ChipItem): Detected & { isFrameworkDefault?: boolean; overriddenBy?: string } => {
  switch (item.kind) {
    case "color":
      return item.color;
    case "font":
      return item.font;
    case "type":
      return item.style;
    case "shadow":
      return item.shadow;
    case "system":
      return item.hint;
    default:
      return item.dim;
  }
};

/** The user's choices on top of what was detected. Ids are `Detected.id`. */
export type ReviewState = {
  /** Included, in the order they win a role (earlier wins). */
  accept: string[];
  edits: Record<string, DetectionEdit>;
  /** «Bloquear» / «Desbloquear» the user toggled (otherwise the default applies). */
  locks: Record<string, boolean>;
  dismissed: string[];
  /** Screenshot source ids kept as references. */
  references: string[];
  /** Logo-vs-guide card choice per role. */
  conflicts: Record<string, LogoChoice>;
  /** Screenshot source ids whose AI attributes (density, recipe) the user accepted. */
  aiAttributes: string[];
  /** Edits before «Ajustar a AA», for «Deshacer el ajuste». */
  aaBackup?: Record<string, DetectionEdit>;
};

const SLOT_ORDER = new Map<string, number>(SLOT_ROLES.map((role, i) => [role, i]));
const ROLE_ORDER = new Map<string, number>(ROLE_KEYS.map((role, i) => [role, i]));
const roleRank = (role: RoleKey) => SLOT_ORDER.get(role) ?? SLOT_ROLES.length + (ROLE_ORDER.get(role) ?? 99);
const RADIUS_ORDER = ["none", "xs", "sm", "md", "DEFAULT", "lg", "xl", "2xl", "3xl", "full"];

/** Every chip in display order: role colors (slots first, light before dark), scales, loose colors, alternatives; fonts then type scale; shape and spacing. */
export function chipItems(brand: ImportedBrand): ChipItem[] {
  const colorKey = (c: ImportedColor): [number, number, string, number] => {
    if (c.overriddenBy) return [3, c.role ? roleRank(c.role) : 999, "", 0];
    if (c.role) return [0, roleRank(c.role) * 2 + (c.mode === "dark" ? 1 : 0), "", 0];
    if (c.scale) return [1, 0, c.scale.group, c.scale.step];
    return [2, 0, "", 0];
  };
  const colors = brand.colors
    .map((color, index) => ({ color, index, key: colorKey(color) }))
    .sort((a, b) => a.key[0] - b.key[0] || a.key[1] - b.key[1] || a.key[2].localeCompare(b.key[2]) || a.key[3] - b.key[3] || a.index - b.index)
    .map(({ color }): ChipItem => ({ kind: "color", id: color.id, group: "colors", color }));

  const fontOrder = { heading: 0, body: 1, mono: 2 } as const;
  const fonts = [...brand.fonts]
    .sort((a, b) => Number(!!a.overriddenBy) - Number(!!b.overriddenBy) || fontOrder[a.role] - fontOrder[b.role])
    .map((font): ChipItem => ({ kind: "font", id: font.id, group: "type", font }));
  const types = (brand.typeScale ?? []).map((style): ChipItem => ({ kind: "type", id: style.id, group: "type", style }));

  const shape: ChipItem[] = [];
  if (brand.shape.radius) shape.push({ kind: "radius", id: brand.shape.radius.id, group: "shape", dim: brand.shape.radius });
  const radii = Object.entries(brand.shape.radii ?? {}).sort(([a], [b]) => {
    const ia = RADIUS_ORDER.indexOf(a);
    const ib = RADIUS_ORDER.indexOf(b);
    return (ia < 0 ? 99 : ia) - (ib < 0 ? 99 : ib) || a.localeCompare(b);
  });
  for (const [key, dim] of radii) shape.push({ kind: "radius", id: dim.id, group: "shape", dim, key });
  if (brand.shape.borderWidth) shape.push({ kind: "border", id: brand.shape.borderWidth.id, group: "shape", dim: brand.shape.borderWidth });
  for (const shadow of brand.shape.shadows ?? []) shape.push({ kind: "shadow", id: shadow.id, group: "shape", shadow });
  if (brand.spacing?.base) shape.push({ kind: "space", id: brand.spacing.base.id, group: "shape", dim: brand.spacing.base });
  for (const [key, dim] of Object.entries(brand.spacing?.scale ?? {})) shape.push({ kind: "space", id: dim.id, group: "shape", dim, key });
  for (const hint of brand.system ?? []) shape.push({ kind: "system", id: hint.id, group: "shape", hint });

  return [...colors, ...fonts, ...types, ...shape];
}

/** The batch's statement wins: a third-party batch makes every source third-party. */
export function ownershipOf(brand: ImportedBrand, ownership: Ownership, sourceId: string): Ownership {
  if (ownership !== "own") return "third-party";
  return brand.sources.find((source) => source.id === sourceId)?.ownership === "own" ? "own" : "third-party";
}

/** Third-party colors and fonts are never applied (only attributes are): their chips are read-only. */
export function isReadOnly(item: ChipItem, brand: ImportedBrand, ownership: Ownership): boolean {
  return (item.kind === "color" || item.kind === "font") && ownershipOf(brand, ownership, detectedOf(item).sourceId) === "third-party";
}

/** What @dialmade/doc locks when nobody says otherwise: own, exact/high (or edited), not AI, not a framework default. */
export function defaultLock(item: ChipItem, brand: ImportedBrand, ownership: Ownership, edit?: DetectionEdit): boolean {
  const d = detectedOf(item);
  if (ownershipOf(brand, ownership, d.sourceId) !== "own") return false;
  if (d.isFrameworkDefault && !edit?.color) return false;
  if (edit && Object.keys(edit).length > 0) return true;
  if (d.method === "ai") return false;
  return d.confidence === "exact" || d.confidence === "high";
}

export const isLockedChip = (item: ChipItem, brand: ImportedBrand, ownership: Ownership, review: ReviewState) =>
  review.locks[item.id] ?? defaultLock(item, brand, ownership, review.edits[item.id]);

export type ChipState = "accepted" | "suggested" | "dismissed";

export function chipState(id: string, review: ReviewState): ChipState {
  if (review.dismissed.includes(id)) return "dismissed";
  return review.accept.includes(id) ? "accepted" : "suggested";
}

/** A color as the user left it: edited value (alpha kept), role and mode. */
export function effectiveColor(color: ImportedColor, edit?: DetectionEdit): { hex: string; alpha?: number; role?: RoleKey; mode: Mode } {
  let hex = color.hex;
  let alpha = color.alpha;
  if (edit?.color) {
    const parsed = parseColorWithAlpha(edit.color);
    if (parsed) {
      const split = splitAlpha(parsed);
      hex = split.hex;
      alpha = split.alpha < 1 ? split.alpha : undefined;
    }
  }
  const role = edit?.role === null ? undefined : (edit?.role ?? color.role);
  return { hex, ...(alpha !== undefined && { alpha }), ...(role && { role }), mode: edit?.mode ?? color.mode ?? "light" };
}

export const roleKey = (mode: Mode, role: RoleKey) => `${mode}:${role}`;

/**
 * Which accepted color fills each (mode, role), as `applyImport` decides it: not overridden first, then
 * the earlier in `accept`. Third-party colors never fill a role.
 */
export function roleWinners(brand: ImportedBrand, review: ReviewState, ownership: Ownership): Map<string, ImportedColor> {
  const best = new Map<string, { color: ImportedColor; rank: [number, number] }>();
  review.accept.forEach((id, order) => {
    if (review.dismissed.includes(id)) return;
    const color = brand.colors.find((c) => c.id === id);
    if (!color || ownershipOf(brand, ownership, color.sourceId) !== "own") return;
    const eff = effectiveColor(color, review.edits[id]);
    if (!eff.role) return;
    const key = roleKey(eff.mode, eff.role);
    const rank: [number, number] = [color.overriddenBy ? 1 : 0, order];
    const current = best.get(key);
    if (!current || rank[0] - current.rank[0] < 0 || (rank[0] === current.rank[0] && rank[1] < current.rank[1])) best.set(key, { color, rank });
  });
  return new Map([...best].map(([key, { color }]) => [key, color]));
}

/** The mode the role slots show: light when the guide has light roles, dark for a dark-only guide. */
export function slotMode(winners: ReadonlyMap<string, ImportedColor>): Mode {
  const keys = [...winners.keys()];
  if (keys.some((key) => key.startsWith("light:"))) return "light";
  return keys.some((key) => key.startsWith("dark:")) ? "dark" : "light";
}

export function initialReview(selection: ImportSelection): ReviewState {
  return {
    accept: [...selection.accept],
    edits: { ...selection.edits },
    locks: { ...selection.locks },
    dismissed: [...(selection.dismissed ?? [])],
    references: [...(selection.references ?? [])],
    conflicts: {},
    aiAttributes: [...(selection.aiAttributes ?? [])],
  };
}

const without = <T,>(list: readonly T[], value: T) => list.filter((item) => item !== value);

function setEdit(edits: Record<string, DetectionEdit>, id: string, patch: DetectionEdit): Record<string, DetectionEdit> {
  const next = { ...edits[id], ...patch };
  for (const key of Object.keys(next) as (keyof DetectionEdit)[]) if (next[key] === undefined) delete next[key];
  const all = { ...edits };
  if (Object.keys(next).length === 0) delete all[id];
  else all[id] = next;
  return all;
}

export function acceptChip(review: ReviewState, id: string): ReviewState {
  return { ...review, accept: review.accept.includes(id) ? review.accept : [...review.accept, id], dismissed: without(review.dismissed, id) };
}

export function dismissChip(review: ReviewState, id: string): ReviewState {
  return { ...review, accept: without(review.accept, id), dismissed: review.dismissed.includes(id) ? review.dismissed : [...review.dismissed, id] };
}

/** Back from «Descartados»: included again (what was dismissed had been included or suggested). */
export const restoreChip = (review: ReviewState, id: string): ReviewState => acceptChip(review, id);

export function editChip(review: ReviewState, id: string, edit: DetectionEdit): ReviewState {
  return acceptChip({ ...review, edits: setEdit(review.edits, id, edit) }, id);
}

export function lockChip(review: ReviewState, id: string, locked: boolean): ReviewState {
  return { ...review, locks: { ...review.locks, [id]: locked } };
}

/**
 * Puts a color in (mode, role) and takes that role away from every other included color there, so the
 * slot shows exactly what the import will write. `role: null` empties the color's role.
 */
export function assignRole(review: ReviewState, brand: ImportedBrand, id: string, role: RoleKey | null, mode: Mode): ReviewState {
  const color = brand.colors.find((c) => c.id === id);
  if (!color) return review;
  let edits = review.edits;
  if (role) {
    for (const other of brand.colors) {
      if (other.id === id || !review.accept.includes(other.id)) continue;
      const eff = effectiveColor(other, edits[other.id]);
      if (eff.role === role && eff.mode === mode) edits = setEdit(edits, other.id, { role: null });
    }
  }
  const same = color.role === role || (role === null && !color.role);
  edits = setEdit(edits, id, { role: same ? undefined : role, mode: role && (color.mode ?? "light") !== mode ? mode : undefined });
  const next = { ...review, edits };
  return role ? { ...acceptChip(next, id), accept: [id, ...without(next.accept, id)] } : next;
}

export function setReference(review: ReviewState, sourceId: string, keep: boolean): ReviewState {
  const references = without(review.references, sourceId);
  return { ...review, references: keep ? [...references, sourceId] : references };
}

export function setAiAttributes(review: ReviewState, sourceId: string, use: boolean): ReviewState {
  const aiAttributes = without(review.aiAttributes, sourceId);
  return { ...review, aiAttributes: use ? [...aiAttributes, sourceId] : aiAttributes };
}

/** The selection for `applyImport`, with the conflict cards folded in, plus the operations the cards add. */
export function selectionOf(brand: ImportedBrand, review: ReviewState): { selection: ImportSelection; extraOps: PatchOperation[] } {
  let edits = review.edits;
  const extraOps: PatchOperation[] = [];
  for (const conflict of brand.conflicts) {
    const choice = review.conflicts[conflict.role] ?? "guide";
    if (choice === "logo") edits = setEdit(edits, conflict.guideId, { color: conflict.logo });
    else if (choice === "guide-primary-logo-secondary") extraOps.push({ op: "add", path: "/brand/seeds/secondary", value: conflict.logo });
  }
  const accept = review.accept.filter((id) => !review.dismissed.includes(id));
  return {
    selection: {
      accept,
      edits,
      locks: review.locks,
      dismissed: review.dismissed,
      references: review.references,
      seeds: true,
      recipe: true,
      ...(review.aiAttributes.length > 0 && { aiAttributes: review.aiAttributes }),
    },
    extraOps,
  };
}

export type ReviewExit = "create" | "palette" | "references";

const ITEM_IDS = (brand: ImportedBrand) => new Map(chipItems(brand).map((item) => [item.id, item]));

/**
 * The single way out: a complete guide (primary, background and text in one mode, plus a heading or body
 * font) goes straight to «Layout»; anything else of the user's own goes to the Palette Lab; nothing own
 * (third-party batch, only references) keeps the references.
 */
export function exitOf(brand: ImportedBrand, review: ReviewState, ownership: Ownership): ReviewExit {
  if (ownership !== "own") return "references";
  const items = ITEM_IDS(brand);
  const { selection } = selectionOf(brand, review);
  const own = selection.accept.filter((id) => {
    const item = items.get(id);
    if (!item || isReadOnly(item, brand, ownership)) return false;
    if (item.kind !== "color") return true;
    const eff = effectiveColor(item.color, selection.edits?.[id]);
    return !!eff.role || !!item.color.scale;
  });
  if (own.length === 0) return "references";
  const winners = roleWinners(brand, { ...review, edits: { ...(selection.edits ?? {}) } }, ownership);
  const roles = (mode: Mode) => ["primary", "background", "foreground"].every((role) => winners.has(`${mode}:${role}`));
  const fonts = own.some((id) => {
    const item = items.get(id);
    return item?.kind === "font" && (item.font.role === "heading" || item.font.role === "body");
  });
  return (roles("light") || roles("dark")) && fonts ? "create" : "palette";
}

/** Counts for the status bar: included own colors (with a role or a scale step) and fonts. */
export function counts(brand: ImportedBrand, review: ReviewState, ownership: Ownership): { colors: number; fonts: number } {
  const items = ITEM_IDS(brand);
  let colors = 0;
  let fonts = 0;
  for (const id of review.accept) {
    if (review.dismissed.includes(id)) continue;
    const item = items.get(id);
    if (!item || isReadOnly(item, brand, ownership)) continue;
    if (item.kind === "font") fonts++;
    else if (item.kind === "color" && (effectiveColor(item.color, review.edits[id]).role || item.color.scale)) colors++;
  }
  return { colors, fonts };
}

/** The opaque primary the guide sets (light first), with the user's edits and card choices; `undefined` when it sets none. */
export function guidePrimary(brand: ImportedBrand, selection: ImportSelection, ownership: Ownership): string | undefined {
  const review: ReviewState = {
    accept: [...selection.accept],
    edits: { ...selection.edits },
    locks: {},
    dismissed: [...(selection.dismissed ?? [])],
    references: [],
    conflicts: {},
    aiAttributes: [],
  };
  const winners = roleWinners(brand, review, ownership);
  const color = winners.get("light:primary") ?? winners.get("dark:primary");
  return color ? effectiveColor(color, selection.edits?.[color.id]).hex : undefined;
}
