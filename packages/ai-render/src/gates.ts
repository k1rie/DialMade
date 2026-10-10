// Quality gates of AI blocks that need no browser (spec §7): structure (gate 1), sanitizing ratio (2, see
// ./sanitize), headings (6), new contact text (7) and coherence with the direction (8). Contrast (4) lives in
// ./contrast. Pure and deterministic; they run in the app's worker after each block arrives, $0.
import type { AiGateWarning } from "@dialmade/doc";
import { attr, elements, textOf, type AiElement, type AiNode } from "./tree";
import { splitClass } from "./vocabulary";

// ── gate 1: structure ─────────────────────────────────────────────────────────────

export type StructureVerdict = "accept" | "duplicate" | "unexpected" | "missing-id";

/**
 * Tracks the roots of one screen as they stream in: every expected id exactly once (a duplicate root is ignored,
 * the first one wins), nothing extra. The layout (which blocks, where) never comes from the model: a root is only
 * accepted into the cell that already exists for its id.
 */
export class StructureTracker {
  private readonly seen = new Set<string>();
  readonly extras: string[] = [];
  readonly duplicates: string[] = [];
  private lastIndex = -1;
  outOfOrder = false;

  constructor(private readonly expected: readonly string[]) {}

  accept(blockId: string | null): StructureVerdict {
    if (blockId === null) {
      this.extras.push("(no id)");
      return "missing-id";
    }
    const index = this.expected.indexOf(blockId);
    if (index < 0) {
      this.extras.push(blockId.slice(0, 64));
      return "unexpected";
    }
    if (this.seen.has(blockId)) {
      this.duplicates.push(blockId);
      return "duplicate";
    }
    if (index < this.lastIndex) this.outOfOrder = true;
    this.lastIndex = Math.max(this.lastIndex, index);
    this.seen.add(blockId);
    return "accept";
  }

  /** Expected ids that never arrived (they stay on the base design, with «La IA falló aquí»). */
  missing(): string[] {
    return this.expected.filter((id) => !this.seen.has(id));
  }
}

/** Whole answers: which roots are kept for which id. */
export function structureGate(expected: readonly string[], roots: readonly { blockId: string | null; html: string }[]) {
  const tracker = new StructureTracker(expected);
  const accepted = new Map<string, string>();
  for (const root of roots) if (tracker.accept(root.blockId) === "accept") accepted.set(root.blockId!, root.html);
  return { accepted, missing: tracker.missing(), extras: tracker.extras, duplicates: tracker.duplicates, outOfOrder: tracker.outOfOrder };
}

// ── gate 6: headings ──────────────────────────────────────────────────────────────

const HEADING = /^h([1-6])$/;

/**
 * Fixes the heading levels of one block in place so the screen's outline is valid whatever order the blocks arrive
 * in: only the block allowed to (`mayHoldH1`) keeps one h1, every block's first heading is at most h2 (h1 in the h1
 * block), and a heading is never more than one level below the previous one. Returns how many headings changed.
 */
export function fixHeadings(root: AiElement, mayHoldH1: boolean): number {
  let changed = 0;
  let previous = 0;
  let h1Used = !mayHoldH1;
  for (const element of elements([root])) {
    const match = HEADING.exec(element.tag);
    if (!match) continue;
    let level = Number(match[1]);
    if (level === 1) {
      if (h1Used) level = 2;
      h1Used = true;
    }
    const max = previous === 0 ? (mayHoldH1 ? 1 : 2) : Math.min(6, previous + 1);
    if (level > max) level = max;
    if (level === 1 && previous !== 0) level = 2;
    if (`h${level}` !== element.tag) {
      element.tag = `h${level}`;
      changed++;
    }
    previous = level;
  }
  return changed;
}

// ── gate 7: contact text the developer did not write ─────────────────────────────

const URL = /\b(?:https?:\/\/|www\.)[^\s<>"']+|\b[a-z0-9-]+\.(?:com|net|org|io|dev|app|co|es|mx|ai|xyz|info|biz|example)\b(?:\/[^\s<>"']*)?/gi;
const EMAIL = /\b[\w.+-]+@[\w-]+(?:\.[\w-]+)+\b/g;
const PHONE = /(?:\+\d{1,3}[\s.-]?)?(?:\(\d{2,4}\)[\s.-]?)?\d{3}[\s.-]?\d{3,4}(?:[\s.-]?\d{3,4})?/g;

/** URLs, emails and phone numbers in the block's text that are not in `known` (the draft, labels, notes). */
export function newContacts(root: AiElement, known: readonly string[]): string[] {
  const haystack = known.join(" ").toLowerCase();
  const text = textOf([root]);
  const found = new Set<string>();
  for (const pattern of [EMAIL, URL, PHONE]) {
    for (const match of text.matchAll(pattern)) {
      const value = match[0].trim().replace(/[.,;:!?)»"']+$/, "");
      if (pattern === PHONE && value.replace(/\D/g, "").length < 9) continue;
      if (!haystack.includes(value.toLowerCase())) found.add(value.slice(0, 80));
    }
  }
  return [...found];
}

// ── gate 8: coherence with the direction ─────────────────────────────────────────

/** The radii, shadows and heading type sizes a block uses (no variants). */
export function styleFingerprint(root: AiElement): { radii: Set<string>; shadows: Set<string>; headingSizes: Set<string> } {
  const radii = new Set<string>();
  const shadows = new Set<string>();
  const headingSizes = new Set<string>();
  for (const element of elements([root])) {
    const classes = (attr(element, "class") ?? "").split(/\s+/).filter(Boolean);
    for (const token of classes) {
      const { variants, utility } = splitClass(token);
      if (variants.length > 0) continue;
      if (utility.startsWith("rounded")) radii.add(utility);
      if (utility.startsWith("shadow")) shadows.add(utility);
      if (/^h[12]$/.test(element.tag) && /^text-(?:display|h1|h2|h3|body|small|caption)$/.test(utility)) headingSizes.add(utility);
    }
  }
  return { radii, shadows, headingSizes };
}

/**
 * Coherence across the screens of a document: the h1/h2 sizes, radii and shadows of a block should come from the set
 * the other blocks use. A block that brings two or more new ones is «off direction» (a warning, never a fix).
 */
export function offDirection(block: ReturnType<typeof styleFingerprint>, others: readonly ReturnType<typeof styleFingerprint>[]): boolean {
  if (others.length < 2) return false;
  const union = (key: keyof ReturnType<typeof styleFingerprint>) => new Set(others.flatMap((other) => [...other[key]]));
  let novel = 0;
  for (const key of ["radii", "shadows", "headingSizes"] as const) {
    const known = union(key);
    for (const value of block[key]) if (!known.has(value)) novel++;
  }
  return novel >= 3;
}

// ── gate 4b: a visible focus indicator ──────────────────────────────────────────

const INTERACTIVE = new Set(["a", "button", "input", "select", "textarea"]);
const REMOVES_OUTLINE = /^(?:outline-none|outline-hidden|outline-0)$/;
const FOCUS_VARIANTS = new Set(["focus", "focus-visible", "focus-within", "group-focus-visible", "group-focus-within"]);

/** Classes that draw a focus indicator under a focus variant: a ring, an outline, a border, an underline, a fill. */
const FOCUS_INDICATOR = /^(?:ring(?:-\d)?|ring-[a-z]|outline(?:-\d)?|outline-[a-z]|border|underline|bg-|shadow)/;

/**
 * Interactive elements whose classes remove the browser's focus outline (`outline-none`, also only on focus) and draw
 * nothing instead under `focus:`/`focus-visible:` (WCAG 2.4.7). Their visible text, for the warning. Whether a drawn
 * ring CONTRASTS is gate 4 (./contrast); this is about having one at all.
 */
export function missingFocusIndicators(root: AiElement): string[] {
  const out: string[] = [];
  for (const element of elements([root])) {
    const focusable = INTERACTIVE.has(element.tag) || attr(element, "tabindex") === "0";
    if (!focusable) continue;
    let removed = false;
    let drawn = false;
    for (const token of (attr(element, "class") ?? "").split(/\s+/).filter(Boolean)) {
      const { variants, utility } = splitClass(token);
      const onFocus = variants.some((variant) => FOCUS_VARIANTS.has(variant));
      if (REMOVES_OUTLINE.test(utility)) removed = true;
      else if (onFocus && FOCUS_INDICATOR.test(utility)) drawn = true;
    }
    if (removed && !drawn) out.push(snippet(element.children) || element.tag);
  }
  return out;
}

// ── gate 9: writing system ──────────────────────────────────────────────────────

const LETTER = /\p{L}/u;
const LATIN = /\p{Script=Latin}/u;

/**
 * Words with letters outside the Latin script (the alphabet of every language the app writes, es and en) that are
 * not in `known` either (the draft, labels, notes, brand). The spike saw Haiku write «sin配置» in a Spanish sentence
 * (spec §15.1): a warning, never a fix.
 */
export function foreignScript(root: AiElement, known: readonly string[]): string[] {
  const allowed = new Set([...known.join("")].filter((char) => LETTER.test(char) && !LATIN.test(char)));
  const found = new Set<string>();
  for (const word of textOf([root]).split(/\s+/)) {
    if ([...word].some((char) => LETTER.test(char) && !LATIN.test(char) && !allowed.has(char))) found.add(word.slice(0, 40));
  }
  return [...found];
}

/** The warnings of gates 4b (focus indicator) and 9 (writing system) for a processed block. */
export function extraGateWarnings(root: AiElement, known: readonly string[]): AiGateWarning[] {
  return [
    ...missingFocusIndicators(root).slice(0, 2).map((text) => warning("focus-ring", text)),
    ...foreignScript(root, known).slice(0, 3).map((word) => warning("foreign-script", word)),
  ];
}

// ── gate 5: responsive (measured in the island) ─────────────────────────────────

export type Device = "desktop" | "tablet" | "mobile";
export const DEVICES: readonly Device[] = ["desktop", "tablet", "mobile"];

/** One measurement of a block at the width of its cell on a device (the island's `measure` message). */
export type DeviceMeasure = { device: Device; width: number; overflowX: boolean; smallTargets: number; clipped: number; height?: number };

/** Spec §7: in an `app` screen, a block taller than 1.25 × its height in the layout is flagged. */
export const APP_HEIGHT_TOLERANCE = 1.25;

/**
 * Gate 5's verdict from the measurements at the 3 widths (`DEVICE_WIDTHS`): horizontal overflow and clipped text
 * («overflow»), interactive targets under 24×24 px (WCAG 2.5.8, «small-target») and, when `layoutHeightPx` is given
 * (app screens), a desktop height over 1.25 × the layout's. Warnings name the device; a warning, never a fix.
 */
export function responsiveGate(measures: readonly DeviceMeasure[], options: { layoutHeightPx?: number } = {}): { responsive: "ok" | "warn"; warnings: AiGateWarning[] } {
  const warnings: AiGateWarning[] = [];
  const sorted = [...measures].sort((a, b) => DEVICES.indexOf(a.device) - DEVICES.indexOf(b.device));
  for (const measure of sorted) {
    if (measure.overflowX) warnings.push(warning("overflow", `${measure.device} · ${Math.round(measure.width)}px`));
    if (measure.clipped > 0) warnings.push(warning("overflow", `${measure.device} · clipped ${measure.clipped}`));
    if (measure.smallTargets > 0) warnings.push(warning("small-target", `${measure.device} · ${measure.smallTargets}`));
  }
  const desktop = sorted.find((measure) => measure.device === "desktop");
  if (options.layoutHeightPx && desktop?.height && desktop.height > options.layoutHeightPx * APP_HEIGHT_TOLERANCE) {
    warnings.push(warning("overflow", `desktop · ${Math.round(desktop.height)}/${Math.round(options.layoutHeightPx)}px`));
  }
  return { responsive: warnings.length > 0 ? "warn" : "ok", warnings };
}

// ── helpers ───────────────────────────────────────────────────────────────────────

export const warning = (code: AiGateWarning["code"], detail?: string): AiGateWarning => ({ code, ...(detail && { detail: detail.slice(0, 160) }) });

/** First text of an element, for warnings («Ver demo»). */
export const snippet = (nodes: readonly AiNode[], max = 40): string => {
  const text = textOf(nodes);
  return text.length > max ? `${text.slice(0, max - 1)}…` : text;
};
