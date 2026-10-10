/** Deterministic PRNG (mulberry32). Same seed, same sequence, in every engine. */
export interface Rng {
  /** Float in [0, 1). */
  next(): number;
  /** Integer in [min, max] (inclusive). */
  int(min: number, max: number): number;
  /** Float in [min, max). */
  float(min: number, max: number): number;
  pick<T>(items: readonly T[]): T;
  /** `count` distinct items, in random order. */
  sample<T>(items: readonly T[], count: number): T[];
  shuffle<T>(items: readonly T[]): T[];
  chance(probability: number): boolean;
}

/** FNV-1a 32-bit. */
export function hashString(value: string): number {
  let hash = 0x811c9dc5;
  for (let i = 0; i < value.length; i++) {
    hash ^= value.charCodeAt(i);
    hash = Math.imul(hash, 0x01000193);
  }
  return hash >>> 0;
}

/** An independent stream per purpose, so adding a helper never changes the copy of another. */
export const deriveSeed = (seed: number, label: string): number => hashString(`${seed >>> 0}:${label}`);

export function createRng(seed: number): Rng {
  let state = seed >>> 0;
  const next = () => {
    state = (state + 0x6d2b79f5) >>> 0;
    let t = state;
    t = Math.imul(t ^ (t >>> 15), t | 1);
    t ^= t + Math.imul(t ^ (t >>> 7), t | 61);
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
  };
  const int = (min: number, max: number) => min + Math.floor(next() * (max - min + 1));
  const shuffle = <T,>(items: readonly T[]): T[] => {
    const out = [...items];
    for (let i = out.length - 1; i > 0; i--) {
      const j = int(0, i);
      [out[i], out[j]] = [out[j] as T, out[i] as T];
    }
    return out;
  };
  return {
    next,
    int,
    float: (min, max) => min + next() * (max - min),
    pick: <T,>(items: readonly T[]): T => {
      if (items.length === 0) throw new Error("pick() needs at least one item");
      return items[int(0, items.length - 1)] as T;
    },
    sample: <T,>(items: readonly T[], count: number) => shuffle(items).slice(0, Math.max(0, count)),
    shuffle,
    chance: (probability) => next() < probability,
  };
}

export const rngFor = (seed: number, label: string): Rng => createRng(deriveSeed(seed, label));
