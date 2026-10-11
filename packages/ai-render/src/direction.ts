// The art direction (spec §4): variety between users comes from the INPUTS, not from sampling (Haiku 5.5 and
// Opus 5.5 take no temperature). The code, with a seed per document, draws two candidates per axis (filtered by the
// recipe's compatibility table and fixed by the chip) and a handful of design «moves» from its own catalog; the model
// picks among them and says why. Without a model («mi Claude», a failed call) the code's first pick is the direction.
import { AI_AXES, AI_AXIS_NAMES, type AiAxes, type AiAxis, type AiDirectionChip } from "@dialmade/doc";

/** mulberry32: small, fast and good enough to draw a few candidates. */
export function prng(seed: number): () => number {
  let a = seed >>> 0;
  return () => {
    a = (a + 0x6d2b79f5) >>> 0;
    let t = a;
    t = Math.imul(t ^ (t >>> 15), t | 1);
    t ^= t + Math.imul(t ^ (t >>> 7), t | 61);
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
  };
}

/** A fresh seed (uint32). Not for security: it only picks design candidates. */
export const newSeed = (): number => Math.floor(Math.random() * 0xffffffff) >>> 0;

/** FNV-1a of a string as uint32 (block seeds, `basis` hashes). */
export function hash32(text: string): number {
  let h = 0x811c9dc5;
  for (let i = 0; i < text.length; i++) {
    h ^= text.charCodeAt(i);
    h = Math.imul(h, 0x01000193);
  }
  return h >>> 0;
}

type AxisValue<K extends AiAxis> = (typeof AI_AXES)[K][number];
type Exclusions = { [K in AiAxis]?: readonly AxisValue<K>[] };

/** Recipe → axis values that clash with it (critique C16: `tech-precision` never gets `soft-shapes`). */
export const RECIPE_EXCLUSIONS: Readonly<Record<string, Exclusions>> = {
  "minimal-swiss": { decoration: ["soft-shapes", "gradient-wash"], imagery: ["layered-collage"] },
  "soft-ui": { typeVoice: ["condensed-caps", "technical-mono"], decoration: ["rules-and-grids"] },
  glass: { decoration: ["rules-and-grids"], colorStrategy: ["tonal-monochrome"] },
  "soft-neubrutal": { decoration: ["gradient-wash"], typeVoice: ["quiet"] },
  "corporate-clean": { typeVoice: ["condensed-caps"], imagery: ["tilted-cards", "layered-collage"] },
  editorial: { composition: ["data-dense", "bento"], decoration: ["gradient-wash", "soft-shapes"] },
  "dark-luxury": { decoration: ["soft-shapes"], typeVoice: ["technical-mono"], rhythm: ["compact"] },
  playful: { typeVoice: ["technical-mono", "quiet"], colorStrategy: ["tonal-monochrome"] },
  "tech-precision": { decoration: ["soft-shapes", "gradient-wash"], typeVoice: ["humanist"] },
  organic: { typeVoice: ["technical-mono", "condensed-caps"], decoration: ["rules-and-grids"] },
  "retro-futurist": { typeVoice: ["quiet", "humanist"] },
  bento: { composition: ["editorial", "centered-stage"] },
};

/** Chip → axes it fixes before the draw (spec §4.2). `auto` fixes none. */
export const CHIP_AXES: Readonly<Record<AiDirectionChip, Partial<AiAxes>>> = {
  auto: {},
  editorial: { composition: "editorial", typeVoice: "bold-display", decoration: "rules-and-grids" },
  technical: { typeVoice: "technical-mono", decoration: "outlined", imagery: "data-viz-led" },
  warm: { typeVoice: "humanist", decoration: "soft-shapes", colorStrategy: "brand-forward" },
  playful: { composition: "asymmetric", decoration: "tinted-panels", imagery: "tilted-cards" },
  luxury: { typeVoice: "quiet", colorStrategy: "tonal-monochrome", rhythm: "airy" },
};

/** Concrete moves (spec §4.2): small, checkable decisions that push away from the generic «AI look». */
export const MOVES: readonly { id: string; text: string; avoid?: readonly string[] }[] = [
  { id: "huge-numerals", text: "Huge numerals for KPIs and prices, small caption labels above them" },
  { id: "left-rule-titles", text: "Left-aligned section titles with a thin rule (border-border) above" },
  { id: "bordered-no-shadow", text: "Cards with a border and no shadow" },
  { id: "pill-labels-on-media", text: "Pill labels (rounded-badge) sitting over images and screenshots" },
  { id: "grid-backdrop", text: "A faint background grid made of border/40 lines behind hero media" },
  { id: "eyebrow-mono", text: "Mono uppercase eyebrow text (font-mono tracking-widest text-caption) above headings" },
  { id: "oversized-heading", text: "One oversized display heading per screen, everything else quiet" },
  { id: "split-asym", text: "Asymmetric 7/5 splits instead of 50/50", avoid: ["centered-stage"] },
  { id: "tinted-section", text: "Alternate sections on bg-muted with full-bleed color bands" },
  { id: "numbered-steps", text: "Numbered steps (01, 02, 03) in mono instead of icons in circles" },
  { id: "quote-big", text: "Testimonials as one large pull quote with a hairline divider, not a grid of cards" },
  { id: "inline-cta", text: "Text-link CTAs with an arrow icon next to the primary button" },
  { id: "dense-tables", text: "Compact tables with tabular-nums, zebra rows on bg-muted/40" },
  { id: "framed-shots", text: "Screenshots inside a browser-like frame: a top bar with three dots made of small rounded spans" },
  { id: "stacked-cards", text: "Two stacked, slightly rotated cards behind the main media", avoid: ["minimal-swiss", "corporate-clean"] },
  { id: "underline-accent", text: "One key word of each heading in text-primary-text with an underline offset" },
  { id: "badge-status", text: "Status badges with a small colored dot (size-2 rounded-full) before the label" },
  { id: "divider-lists", text: "Feature lists as divided rows (divide-y divide-border) with the icon at the right" },
  { id: "two-tone-heading", text: "Headings in two tones: first half text-foreground, second half text-muted-foreground" },
  { id: "chip-filters", text: "Filters and tabs as rounded-full chips with an active bg-primary state" },
  { id: "kpi-sparkline", text: "KPI cards with a tiny bar sparkline built from 7 thin divs of varying height" },
  { id: "outlined-buttons", text: "Secondary actions as outlined buttons (border-border) with no fill" },
  { id: "corner-meta", text: "Small meta text pinned to card corners (dates, tags) in text-caption" },
  { id: "full-bleed-media", text: "Media that bleeds to the block edges with the text on a card overlapping it" },
  { id: "soft-glow", text: "A soft glow behind the hero media: bg-radial from-primary/20 to-transparent", avoid: ["tech-precision", "minimal-swiss"] },
  { id: "checklist-pricing", text: "Pricing as a comparison checklist with check icons, the recommended plan in a primary ring" },
  { id: "logo-row-mono", text: "Logo rows as quiet wordmarks in text-muted-foreground, never colored" },
  { id: "avatar-row", text: "A tight row of 3–4 avatars (ring-2 ring-background) next to the social proof line" },
  { id: "section-index", text: "A small section index number (01/05) in mono at the top-left of each block" },
  { id: "sidebar-note", text: "A narrow aside column with a note or a stat next to long text" },
  { id: "caps-nav", text: "Navigation links in small caps text with wide tracking" },
  { id: "rounded-xl-media", text: "Generous rounded-xl media with a 1px ring-border inset" },
  { id: "empty-illustration", text: "Empty states with a large icon on a tinted square and one clear action" },
  { id: "form-floating", text: "Forms on a raised card with labels above fields and helper text below" },
  { id: "gradient-cta", text: "CTA band with a gradient from primary to primary-hover and primary-foreground text" },
  { id: "timeline-activity", text: "Activity as a vertical timeline with a 1px line and dots" },
  { id: "calendar-chips", text: "Calendar events as small colored chips with time in mono" },
  { id: "highlight-row", text: "One highlighted row or card per list using bg-accent and text-accent-foreground" },
  { id: "kicker-badge", text: "A kicker badge with an icon above the hero heading" },
  { id: "metric-strip", text: "A strip of 3–4 metrics separated by vertical dividers (divide-x)" },
  // Personality moves (the owner's references, 2026-10-10): a type voice, a texture, a color gesture.
  { id: "italic-accent", text: "Headings in two voices: one word or the second line in italic of the same font, the rest roman" },
  { id: "spec-sheet", text: "A small mono spec sheet (caps labels over plain values, no boxes) under the main action or a key figure" },
  { id: "corner-annotations", text: "Tiny mono annotations in the corners of the hero and of color bands: a place, a year, a status or a version" },
  { id: "color-shapes", text: "One or two big geometric shapes in the brand and CTA colors (a circle, a rotated rounded square) behind the product visual", avoid: ["minimal-swiss", "tech-precision"] },
];

export type DirectionCandidates = {
  seed: number;
  chip: AiDirectionChip;
  /** Two candidates per axis (one when the chip fixes it or the recipe leaves one). */
  axes: { [K in AiAxis]: AxisValue<K>[] };
  /** 5 move candidates; the model keeps 2–3. */
  moves: string[];
};

function draw<T>(random: () => number, values: readonly T[], count: number): T[] {
  const pool = [...values];
  const out: T[] = [];
  while (out.length < count && pool.length > 0) out.push(pool.splice(Math.floor(random() * pool.length), 1)[0]!);
  return out;
}

/** The code's part of the direction: candidates drawn with `seed` for `recipeId`, fixed by `chip`. */
export function directionCandidates(seed: number, recipeId: string, chip: AiDirectionChip = "auto"): DirectionCandidates {
  const random = prng(seed);
  const exclusions: Exclusions = RECIPE_EXCLUSIONS[recipeId] ?? {};
  const fixed = CHIP_AXES[chip];
  const axes = {} as DirectionCandidates["axes"];
  for (const axis of AI_AXIS_NAMES) {
    const chosen = fixed[axis];
    // Always draw, so a chip changes only its own axes and the others stay the same for this seed.
    const allowed = (AI_AXES[axis] as readonly string[]).filter((value) => !(exclusions[axis] as readonly string[] | undefined)?.includes(value));
    const drawn = draw(random, allowed, 2);
    (axes as Record<string, string[]>)[axis] = chosen ? [chosen] : drawn;
  }
  const blocked = new Set<string>([recipeId, ...Object.values(axes).flat()]);
  const moves = draw(
    random,
    MOVES.filter((move) => !move.avoid?.some((tag) => blocked.has(tag))),
    5,
  ).map((move) => move.text);
  return { seed, chip, axes, moves };
}

/** The direction without a model: the first candidate of each axis and the first three moves. */
export function defaultPick(candidates: DirectionCandidates): { axes: AiAxes; moves: string[] } {
  const axes = Object.fromEntries(AI_AXIS_NAMES.map((axis) => [axis, candidates.axes[axis][0]])) as AiAxes;
  return { axes, moves: candidates.moves.slice(0, 3) };
}

/** What each axis value means, for the prompt (one line each). */
export const AXIS_GLOSSARY: Readonly<Record<string, string>> = {
  editorial: "magazine-like: strong type hierarchy, generous measure, asymmetric text columns",
  asymmetric: "off-center compositions, unequal columns, offset media",
  "centered-stage": "centered headline and one hero object, symmetric",
  bento: "content grouped in tiles of different sizes inside the block",
  split: "clear two-column splits (text | media)",
  "data-dense": "compact, information-rich, tables and numbers first",
  quiet: "restrained type, normal weights, lots of space around text",
  "bold-display": "big, heavy display headings with tight leading",
  "technical-mono": "mono accents for labels, numbers and eyebrows",
  humanist: "friendly, medium weights, sentence case, softer rhythm",
  "condensed-caps": "uppercase headings with wide tracking for labels",
  none: "no decoration beyond the content itself",
  "rules-and-grids": "hairline rules, dividers and faint grids",
  "soft-shapes": "rounded tinted shapes behind media",
  outlined: "borders instead of fills and shadows",
  "tinted-panels": "one or two large panels on muted/accent tints that hold a block's content, not a tint on every item",
  "gradient-wash": "subtle token gradients on backgrounds",
  "framed-screens": "product screenshots in device or browser frames",
  "tilted-cards": "slightly rotated stacked cards",
  "layered-collage": "overlapping media and cards",
  "icon-led": "icons carry the visuals",
  "data-viz-led": "charts, numbers and mini graphs carry the visuals",
  "brand-forward": "primary color used generously on surfaces",
  "neutral-with-pops": "neutral surfaces, primary only on key accents",
  "high-contrast-cta": "neutral page, one loud CTA color",
  "tonal-monochrome": "one hue in several tints and shades (brand scale)",
  airy: "large spacing, few elements per row",
  balanced: "standard spacing",
  compact: "tight spacing, more per row",
};
