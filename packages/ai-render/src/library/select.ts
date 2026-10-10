// Which library entries go with a block (spec: «los ejemplos propios»): same layout type, ranked by how many axes of
// the document's art direction they suit, then by a seeded tie-break so two brands with the same direction still
// get different references. Pure and deterministic: the hosted routes, BYOK and «Copiar prompt» pick the same ones.
import type { AiAxes } from "@dialmade/doc";
import { hash32 } from "../direction";
import type { LibraryBlock } from "./types";

/** `composition` decides most of what a block looks like; the rest refine. */
const WEIGHTS: { [K in keyof AiAxes]: number } = { composition: 3, typeVoice: 2, decoration: 2, imagery: 2, colorStrategy: 1, rhythm: 1 };

/** An approved entry is worth a bit more than one composition-axis match (3 × 1000 would outweigh it). */
export const APPROVED_BONUS = 2500;

export function fitScore(entry: LibraryBlock, axes: AiAxes): number {
  let score = 0;
  for (const axis of Object.keys(WEIGHTS) as (keyof AiAxes)[]) {
    const wanted = entry.fits[axis] as readonly string[] | undefined;
    if (wanted && wanted.includes(axes[axis])) score += WEIGHTS[axis];
  }
  return score;
}

export type SelectOptions = {
  /** How many references per block (default 2). */
  count?: number;
  /** Document-level seed (the brand name's hash is fine): breaks ties between equally good entries. */
  seed: number;
  /** Entries already used by other blocks of the screen are avoided when there is another good one. */
  used?: Set<string>;
};

export function selectReferences(library: readonly LibraryBlock[], type: string, surface: "landing" | "app", axes: AiAxes, blockId: string, options: SelectOptions): LibraryBlock[] {
  const count = options.count ?? 2;
  const pool = library.filter((entry) => entry.type === type && entry.surface === surface);
  if (pool.length === 0) return [];
  const ranked = pool
    .map((entry) => ({
      entry,
      // Same score → seeded order; a reference another block of the screen already got is nudged down.
      score:
        fitScore(entry, axes) * 1000 +
        (entry.approved ? APPROVED_BONUS : 0) -
        (options.used?.has(entry.id) ? 500 : 0) +
        (hash32(`${options.seed}:${blockId}:${entry.id}`) % 100),
    }))
    .sort((a, b) => b.score - a.score);
  const picked = ranked.slice(0, count).map((item) => item.entry);
  for (const entry of picked) options.used?.add(entry.id);
  return picked;
}
