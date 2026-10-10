import type { FontMatch } from "../types";
import { FONT_ALIASES, GENERIC_VAR_WORDS, METRIC_COMPATIBLE, STYLE_ALTERNATIVES, SYSTEM_ALTERNATIVES } from "./alternatives";
import fontIndex from "./font-index.json";
import { editDistance, familyKey, familyVariants, titleCase } from "./normalize";
import { isPlatformFamily, isSystemFamily, splitFontStack } from "./stack";
import type { FontMatcher, ResolvedFontStack } from "./types";

export type FontCategory = "sans-serif" | "serif" | "display" | "handwriting" | "monospace";

export interface GoogleFontEntry {
  family: string;
  category: FontCategory;
  weights: readonly number[];
}

/** A fuzzy match is taken as the family only when it scores this or more and nothing else does. */
export const FUZZY_ACCEPT = 0.92;
/** Fuzzy candidates below this are not offered. */
export const FUZZY_OFFER = 0.6;

const CSS_WIDE = new Set(["inherit", "initial", "unset", "revert", "revert-layer", "default", "none"]);
const MAX_ENTRIES = 32;
const MAX_VAR_DEPTH = 4;

interface Internal {
  match: FontMatch;
  /** The family name was guessed (fuzzy search): confidence drops to medium. */
  fuzzy: boolean;
}

/** The Google Fonts families of font-index.json (generated from google-fonts.csv, without popularity columns). */
export function googleFonts(): GoogleFontEntry[] {
  return (fontIndex.families as unknown as [string, FontCategory, number[]][]).map(([family, category, weights]) => ({ family, category, weights }));
}

const varName = (entry: string) => /^var\(\s*(--[A-Za-z0-9_-]{1,128})\s*(?:,([\s\S]*))?\)$/.exec(entry);

/**
 * Font matching against the 1,934 Google Fonts families: exact → alias (Source Sans Pro → Source Sans 3)
 * → metric-compatible (Arial → Arimo) → style alternative (Futura → Jost) → fuzzy (top 3, ties by name).
 * Stacks are read whole: system families go to the fallback, and an undefined `var(--font-inter)` is
 * deduced from its name (`deduced`, confidence medium).
 */
export function createFontMatcher(entries: readonly GoogleFontEntry[] = googleFonts()): FontMatcher & {
  /** The canonical Google Fonts family for a name, if there is one (exact or alias). */
  lookup(family: string): string | undefined;
  /** What an undefined `var(--font-x)` stands for: `--font-geist-mono` → Geist Mono; null for `--font-sans`. */
  deduceFromVariable(name: string): string | null;
} {
  const byKey = new Map<string, string>();
  for (const entry of entries) byKey.set(familyKey(entry.family), entry.family);
  const keys = [...byKey.keys()];
  const cache = new Map<string, Internal>();

  const canonical = (key: string): { family: string; kind: "google" | "alias" } | undefined => {
    const exact = byKey.get(key);
    if (exact) return { family: exact, kind: "google" };
    const alias = FONT_ALIASES[key];
    return alias && byKey.has(familyKey(alias)) ? { family: alias, kind: "alias" } : undefined;
  };

  const curated = (key: string): FontMatch | undefined => {
    const metric = METRIC_COMPATIBLE[key];
    if (metric) return { kind: "metric-compatible", family: metric };
    const style = STYLE_ALTERNATIVES[key];
    if (style) return { kind: "style-alt", family: style[0]!, candidates: [...style].slice(0, 3) };
    return undefined;
  };

  function fuzzy(key: string): Internal {
    if (key.length < 3) return { match: { kind: "none" }, fuzzy: false };
    const scored: { family: string; score: number }[] = [];
    const budget = Math.ceil(key.length * 0.4);
    for (const candidate of keys) {
      let score = 0;
      const d = editDistance(key, candidate, budget);
      if (d <= budget) score = 1 - d / Math.max(key.length, candidate.length);
      if (key.length >= 4 && candidate.startsWith(key)) score = Math.max(score, Math.min(0.9, 0.75 + (0.2 * key.length) / candidate.length));
      if (score >= FUZZY_OFFER) scored.push({ family: byKey.get(candidate)!, score });
    }
    scored.sort((a, b) => b.score - a.score || a.family.localeCompare(b.family, "en"));
    const [best, second] = scored;
    if (!best) return { match: { kind: "none" }, fuzzy: false };
    const candidates = scored.slice(0, 3).map((s) => s.family);
    if (best.score >= FUZZY_ACCEPT && !(second && second.score >= FUZZY_ACCEPT)) return { match: { kind: "google", family: best.family, candidates }, fuzzy: true };
    return { match: { kind: "none", candidates }, fuzzy: false };
  }

  function matchInternal(family: string): Internal {
    const cached = cache.get(family);
    if (cached) return cached;
    let result: Internal | undefined;
    const { display, variants } = familyVariants(family);
    if (!display) result = { match: { kind: "none" }, fuzzy: false };
    else if (isSystemFamily(display)) {
      const alternatives = SYSTEM_ALTERNATIVES[familyKey(display)];
      result = { match: { kind: "system", ...(alternatives && { candidates: [...alternatives] }) }, fuzzy: false };
    } else {
      for (const variant of variants) {
        const key = familyKey(variant);
        const hit = canonical(key);
        const match = hit ? { kind: hit.kind, family: hit.family } : curated(key);
        if (match) {
          result = { match, fuzzy: false };
          break;
        }
      }
      result ??= fuzzy(familyKey(variants[variants.length - 1]!));
    }
    if (cache.size > 2000) cache.clear();
    cache.set(family, result);
    return result;
  }

  function deduceFromVariable(name: string): string | null {
    const rest = name
      .replace(/^--/, "")
      .toLowerCase()
      .replace(/^(?:dl-)?(?:font-family|font|fonts|ff|typeface)-/, "");
    if (!rest) return null;
    const stripped = rest.replace(/-(?:sans|serif|mono|display|heading|body|variable|var)$/, "");
    for (const candidate of [rest, stripped]) {
      const key = familyKey(candidate);
      if (!key) continue;
      const hit = canonical(key);
      if (hit) return hit.family;
      if (curated(key)) return titleCase(candidate);
    }
    const words = stripped.split("-").filter(Boolean);
    if (words.length === 0 || words.every((w) => GENERIC_VAR_WORDS.has(w) || /^\d+$/.test(w))) return null;
    return words.join("").replace(/[^a-z]/g, "").length >= 3 ? titleCase(stripped) : null;
  }

  interface Entry {
    name: string;
    deduced: boolean;
  }

  function expand(raw: string, depth: number, out: Entry[]): void {
    if (out.length >= MAX_ENTRIES) return;
    const entry = raw.trim();
    if (!entry) return;
    const asVar = varName(entry);
    if (asVar) {
      const deduced = deduceFromVariable(asVar[1]!);
      if (deduced) out.push({ name: deduced, deduced: true });
      else if (asVar[2] !== undefined && depth < MAX_VAR_DEPTH) for (const part of splitFontStack(asVar[2])) expand(part, depth + 1, out);
      return;
    }
    if (entry.includes("(") || CSS_WIDE.has(entry.toLowerCase())) return;
    const name = familyVariants(entry).display;
    if (name) out.push({ name, deduced: false });
  }

  return {
    lookup(family) {
      for (const variant of familyVariants(family).variants) {
        const hit = canonical(familyKey(variant));
        if (hit) return hit.family;
      }
      return undefined;
    },
    deduceFromVariable,
    match: (family) => matchInternal(family).match,
    resolveStack(stack): ResolvedFontStack | null {
      const raw = typeof stack === "string" ? splitFontStack(stack) : stack.flatMap((s) => splitFontStack(s));
      const expanded: Entry[] = [];
      for (const entry of raw.slice(0, MAX_ENTRIES)) expand(entry, 0, expanded);
      const seen = new Set<string>();
      const list = expanded.filter((e) => {
        const key = e.name.toLowerCase();
        if (seen.has(key)) return false;
        seen.add(key);
        return true;
      });
      if (list.length === 0) return null;
      const systemFirst = isSystemFamily(list[0]!.name);
      const index = list.findIndex((e) => !isSystemFamily(e.name) && !(systemFirst && isPlatformFamily(e.name)));
      const chosen = list[index < 0 ? 0 : index]!;
      const fallback = list.filter((e) => e !== chosen).map((e) => e.name);
      if (index < 0) {
        const { match } = matchInternal(chosen.name);
        return { family: chosen.name, fallback, match: match.kind === "system" ? match : { kind: "system" } };
      }
      const { match, fuzzy: guessed } = matchInternal(chosen.name);
      return { family: chosen.name, fallback, match, ...((chosen.deduced || guessed) && { deduced: true }) };
    },
  };
}
