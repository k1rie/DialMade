import { LIBRARY, type LibraryBlockType } from "@dialmade/layout";
import type { BlockText } from "@/i18n/layout";

/*
 * Block search shared by the library («Buscar bloques») and «¿Qué es esto?». It reads the names and
 * synonyms of every dictionary it gets, so passing both locales' `blocks` makes «agenda» find the
 * calendar and «header» the navbar whatever the UI language. Pure: no React, no DOM.
 */

/** What the search reads from a locale's `blocks` dictionary (`LayoutDictionary["blocks"]` fits). */
export type BlockSearchText = Pick<BlockText, "name" | "synonyms">;
export type BlockSearchDict = Readonly<Record<LibraryBlockType, BlockSearchText>>;

export type SearchBlocksOptions = {
  /** Candidate types, in display order (the last tiebreak). Default: every library block, in library order. */
  types?: readonly LibraryBlockType[];
  /** Maximum number of results. Default: no limit. */
  limit?: number;
};

/**
 * How a block matched, best first. Ties inside a tier go: ready before soon, then the closer match
 * (exact term, shorter term, earlier position), then display order.
 */
export const MATCH_TIER = {
  /** The query is a block name in some locale. */
  exactName: 0,
  /** A block name starts with the query. */
  namePrefix: 1,
  /** A synonym is the query or starts with it. */
  synonymPrefix: 2,
  /** The query appears inside a name or a synonym. */
  substring: 3,
  /** Multi-word query: every word appears in some name or synonym of the block. */
  allWords: 4,
} as const;

export type MatchTier = (typeof MATCH_TIER)[keyof typeof MATCH_TIER];

/** Longest query the search reads; the rest is ignored (names and synonyms are far shorter). */
export const MAX_QUERY_LENGTH = 64;

/**
 * Lowercase, without accents or diacritics (ñ → n), punctuation collapsed to single spaces and trimmed.
 * «Menú  Lateral» → «menu lateral», «Pop-up» → «pop up». `&` is kept («Q&A»).
 */
export function normalizeSearchText(text: string): string {
  return text
    .normalize("NFD")
    .replace(/\p{M}+/gu, "")
    .toLowerCase()
    .replace(/[^\p{L}\p{N}&]+/gu, " ")
    .trim();
}

/** A normalized term in its two forms: spaced («pop up») and compact («popup»), so «popup» finds «pop-up». */
type Term = { spaced: string; compact: string };
type TypeTerms = { names: readonly Term[]; synonyms: readonly Term[] };
type DictIndex = ReadonlyMap<LibraryBlockType, TypeTerms>;

const compactOf = (spaced: string) => spaced.replace(/ /g, "");

function toTerm(raw: string): Term | null {
  const spaced = normalizeSearchText(raw);
  return spaced ? { spaced, compact: compactOf(spaced) } : null;
}

function toTerms(raws: readonly string[]): Term[] {
  const seen = new Set<string>();
  const terms: Term[] = [];
  for (const raw of raws) {
    const term = toTerm(raw);
    if (!term || seen.has(term.spaced)) continue;
    seen.add(term.spaced);
    terms.push(term);
  }
  return terms;
}

const LIBRARY_TYPES: readonly LibraryBlockType[] = LIBRARY.map((def) => def.type);
const SOON = new Set<LibraryBlockType>(LIBRARY.filter((def) => def.status === "soon").map((def) => def.type));

/** Normalized terms per dictionary object, built once (dictionaries are module constants). */
const indexCache = new WeakMap<BlockSearchDict, DictIndex>();

function indexOf(dict: BlockSearchDict): DictIndex {
  const cached = indexCache.get(dict);
  if (cached) return cached;
  const index = new Map<LibraryBlockType, TypeTerms>();
  for (const type of Object.keys(dict) as LibraryBlockType[]) {
    const text = dict[type];
    if (!text) continue;
    index.set(type, { names: toTerms([text.name]), synonyms: toTerms(text.synonyms) });
  }
  indexCache.set(dict, index);
  return index;
}

/** Sort key of a match: smaller is better, compared position by position. */
type Score = readonly [tier: MatchTier, closeness: number, position: number, length: number];

const isBetter = (a: Score, b: Score | null) => {
  if (!b) return true;
  for (let i = 0; i < a.length; i++) {
    const delta = (a[i] ?? 0) - (b[i] ?? 0);
    if (delta !== 0) return delta < 0;
  }
  return false;
};

/** Is `index` the start of a word in `text` (spaced form)? */
const atWordStart = (text: string, index: number) => index === 0 || text.charAt(index - 1) === " ";

/** Best score of one term, in one form (spaced or compact). */
function scoreForm(query: string, term: string, isName: boolean): Score | null {
  if (term === query) return [isName ? MATCH_TIER.exactName : MATCH_TIER.synonymPrefix, 0, 0, term.length];
  if (term.startsWith(query)) return [isName ? MATCH_TIER.namePrefix : MATCH_TIER.synonymPrefix, 1, 0, term.length];
  const position = term.indexOf(query);
  if (position < 0) return null;
  return [MATCH_TIER.substring, atWordStart(term, position) ? 0 : 1, position, term.length];
}

function scoreTerm(query: Term, term: Term, isName: boolean): Score | null {
  const spaced = scoreForm(query.spaced, term.spaced, isName);
  // The compact form only rescues spacing and punctuation differences («popup» ↔ «pop-up»).
  if (spaced || (query.compact === query.spaced && term.compact === term.spaced)) return spaced;
  return scoreForm(query.compact, term.compact, isName);
}

function scoreType(query: Term, words: readonly string[], terms: readonly TypeTerms[]): Score | null {
  let best: Score | null = null;
  for (const { names, synonyms } of terms) {
    for (const name of names) {
      const score = scoreTerm(query, name, true);
      if (score && isBetter(score, best)) best = score;
    }
    for (const synonym of synonyms) {
      const score = scoreTerm(query, synonym, false);
      if (score && isBetter(score, best)) best = score;
    }
  }
  if (best || words.length < 2) return best;
  // «lateral nav»: no single term holds the whole query, but every word is somewhere in the block's terms.
  const all = terms.flatMap(({ names, synonyms }) => [...names, ...synonyms]);
  const everyWord = words.every((word) => all.some((term) => term.spaced.includes(word)));
  return everyWord ? [MATCH_TIER.allWords, 0, 0, 0] : null;
}

const isDictList = (dict: BlockSearchDict | readonly BlockSearchDict[]): dict is readonly BlockSearchDict[] =>
  Array.isArray(dict);

/**
 * Library blocks whose name or synonyms match `query` in any of the given dictionaries, best first:
 * exact name > name prefix > synonym prefix > substring (> every word of a multi-word query). Inside a
 * tier ready blocks go before soon ones. Case, accents and punctuation are ignored. A blank query
 * returns `[]` (the caller shows its default view).
 */
export function searchBlocks(
  query: string,
  dict: BlockSearchDict | readonly BlockSearchDict[],
  opts: SearchBlocksOptions = {},
): LibraryBlockType[] {
  const normalized = toTerm(query.slice(0, MAX_QUERY_LENGTH));
  if (!normalized) return [];
  const limit = opts.limit ?? Number.POSITIVE_INFINITY;
  if (limit <= 0) return [];
  const indexes = (isDictList(dict) ? dict : [dict]).map(indexOf);
  const words = normalized.spaced.split(" ");
  const types = opts.types ?? LIBRARY_TYPES;

  const matches: { type: LibraryBlockType; score: Score; soon: boolean; order: number }[] = [];
  const seen = new Set<LibraryBlockType>();
  types.forEach((type, order) => {
    if (seen.has(type)) return;
    seen.add(type);
    const terms = indexes.map((index) => index.get(type)).filter((terms): terms is TypeTerms => terms !== undefined);
    const score = scoreType(normalized, words, terms);
    if (score) matches.push({ type, score, soon: SOON.has(type), order });
  });

  matches.sort((a, b) => {
    if (a.score[0] !== b.score[0]) return a.score[0] - b.score[0];
    if (a.soon !== b.soon) return a.soon ? 1 : -1;
    for (let i = 1; i < a.score.length; i++) {
      const delta = (a.score[i] ?? 0) - (b.score[i] ?? 0);
      if (delta !== 0) return delta;
    }
    return a.order - b.order;
  });

  return matches.slice(0, limit).map((match) => match.type);
}
