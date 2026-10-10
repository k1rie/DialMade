import type { RoleKey } from "@dialmade/palette";
import { deltaE, normalizeColor, type NormalizedColor } from "../color";
import type { ImportWarning, Mode } from "../types";
import { shadcnBaseRefs } from "./shadcn";
import { TAILWIND_THEME_VARS } from "./tailwind.generated";

/** Below this ΔEok two colors are the same default (well under any visible difference). */
export const DEFAULT_MATCH_DELTA_E = 0.002;

const resolved = new Map<string, NormalizedColor | null>();

/** A Tailwind default color (`--color-blue-500`) or a literal, normalized; cached. */
function colorOf(ref: string): NormalizedColor | null {
  let hit = resolved.get(ref);
  if (hit === undefined) {
    const css = ref.startsWith("--") ? TAILWIND_THEME_VARS[ref] : ref;
    const result = css === undefined ? null : normalizeColor(css);
    hit = result?.ok ? result.color : null;
    resolved.set(ref, hit);
  }
  return hit;
}

const same = (a: { hex: string; alpha?: number }, b: NormalizedColor) =>
  Math.abs((a.alpha ?? 1) - (b.alpha ?? 1)) < 0.01 && deltaE(a.hex, b.hex) < DEFAULT_MATCH_DELTA_E;

/** Tailwind's own value for `--color-<group>-<step>`, if it has one. */
export function tailwindDefaultColor(group: string, step: number): NormalizedColor | undefined {
  return colorOf(`--color-${group}-${step}`) ?? undefined;
}

let paletteIndex: { group: string; step: number; color: NormalizedColor }[] | undefined;

/** The Tailwind palette entry a color equals (`#3b82f6` → blue-500), ignoring black and white. */
export function matchTailwindColor(color: { hex: string; alpha?: number }): { group: string; step: number } | undefined {
  paletteIndex ??= Object.keys(TAILWIND_THEME_VARS).flatMap((name) => {
    const m = /^--color-([a-z]+)-(\d+)$/.exec(name);
    const c = m ? colorOf(name) : null;
    return m && c ? [{ group: m[1]!, step: Number(m[2]), color: c }] : [];
  });
  const hit = paletteIndex.find((entry) => same(color, entry.color));
  return hit && { group: hit.group, step: hit.step };
}

/** shadcn's base value for this role and mode (any base color). */
export function isShadcnDefault(color: { hex: string; alpha?: number }, mode: Mode, role: RoleKey): boolean {
  return shadcnBaseRefs(mode, role).some((ref) => {
    const base = colorOf(ref);
    return base !== null && same(color, base);
  });
}

export interface DefaultCandidate {
  hex: string;
  alpha?: number;
  mode?: Mode;
  role?: RoleKey;
  scale?: { group: string; step: number };
}

/**
 * The value is what Tailwind 4.3.3 or shadcn/ui ship by default for that slot, so it says nothing
 * about the brand: a role equal to shadcn's base, or a scale step equal to Tailwind's palette.
 */
export function isFrameworkDefault(color: DefaultCandidate): boolean {
  if (color.role && isShadcnDefault(color, color.mode ?? "light", color.role)) return true;
  if (color.scale) {
    const base = tailwindDefaultColor(color.scale.group, color.scale.step);
    if (base && same(color, base)) return true;
  }
  return false;
}

/** Whitespace- and case-insensitive equality with Tailwind's default (`--radius-lg: 0.5rem`). */
export function isTailwindDefaultVar(name: string, value: string): boolean {
  const base = TAILWIND_THEME_VARS[name];
  if (base === undefined) return false;
  const norm = (s: string) => s.replace(/\s+/g, " ").replace(/'/g, '"').trim().toLowerCase();
  return norm(base) === norm(value);
}

/**
 * One warning per source whose role colors are nearly all shadcn defaults (an untouched
 * `globals.css`): it is a theme, not a brand.
 */
export function frameworkDefaultWarnings(
  colors: readonly { sourceId: string; role?: RoleKey; isFrameworkDefault?: boolean }[],
  minRoles = 8,
  share = 0.8,
): ImportWarning[] {
  const stats = new Map<string, { roles: number; defaults: number }>();
  for (const color of colors) {
    if (!color.role) continue;
    const entry = stats.get(color.sourceId) ?? { roles: 0, defaults: 0 };
    entry.roles++;
    if (color.isFrameworkDefault) entry.defaults++;
    stats.set(color.sourceId, entry);
  }
  return [...stats]
    .filter(([, s]) => s.roles >= minRoles && s.defaults / s.roles >= share)
    .map(([sourceId, s]) => ({ sourceId, code: "framework-default-theme", detail: `${s.defaults}/${s.roles}` }));
}
