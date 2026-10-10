import type { NoteKeyword, ParsedNote } from "./types";

/**
 * Number words. Spanish «un/una/uno» are left out: they are mostly the indefinite article («planes para una
 * startup»), so a count of 1 needs the digit. «once» (es 11) is read only when it is clearly Spanish: see
 * `ENGLISH_AFTER_ONCE`.
 */
const NUMBER_WORDS: Readonly<Record<string, number>> = {
  // es
  dos: 2,
  tres: 3,
  cuatro: 4,
  cinco: 5,
  seis: 6,
  siete: 7,
  ocho: 8,
  nueve: 9,
  diez: 10,
  doce: 12,
  // en
  one: 1,
  two: 2,
  three: 3,
  four: 4,
  five: 5,
  six: 6,
  seven: 7,
  eight: 8,
  nine: 9,
  ten: 10,
  eleven: 11,
  twelve: 12,
};

/**
 * Words that make «once» the English adverb («updated once a day», «once per week», «load once and…»), not
 * the Spanish 11. «once» at the end of a note is English too («refresh once»).
 */
const ENGLISH_AFTER_ONCE: ReadonlySet<string> = new Set([
  "a",
  "an",
  "the",
  "per",
  "every",
  "each",
  "more",
  "again",
  "and",
  "or",
  "in",
  "on",
  "upon",
  "for",
  "only",
  "you",
  "we",
  "they",
  "it",
  "is",
  "daily",
  "weekly",
  "monthly",
  "yearly",
  "day",
  "week",
  "month",
  "year",
]);

/** Keyword → phrases (already lowercase and without diacritics), in the declared output order. */
const KEYWORDS: readonly (readonly [NoteKeyword, readonly string[]])[] = [
  ["weekly", ["semanal", "semana", "weekly", "week"]],
  ["monthly", ["mensual", "mes", "monthly", "month"]],
  ["yearly", ["anual", "ano", "yearly", "annual", "year"]],
  ["daily", ["diario", "dia", "daily", "day"]],
  ["agenda", ["agenda"]],
  ["search", ["buscador", "busqueda", "buscar", "search"]],
  ["login", ["login", "inicio de sesion", "iniciar sesion", "sign in", "signin", "log in"]],
  ["signup", ["registro", "registrate", "sign up", "signup", "register"]],
  ["contact", ["contacto", "contact"]],
  ["split", ["dividido", "split", "lado a lado", "side by side"]],
  ["carousel", ["carrusel", "carousel", "slider"]],
];

const PHRASES: readonly (readonly [NoteKeyword, readonly string[]])[] = KEYWORDS.flatMap(([keyword, phrases]) =>
  phrases.map((phrase) => [keyword, phrase.split(" ")] as const),
);

/** Lowercase, without diacritics (é → e, ñ → n), split into words. `×` stays attached to numbers. */
function tokenize(note: string): string[] {
  return note
    .toLowerCase()
    .normalize("NFD")
    .replace(/\p{M}/gu, "")
    .split(/[^a-z0-9\u00d7]+/)
    .filter(Boolean);
}

function countOf(token: string, next: string | undefined): number | undefined {
  const digits = /^[x\u00d7]?(\d{1,3})[x\u00d7]?$/.exec(token);
  if (digits) {
    const value = Number(digits[1]);
    return value >= 1 && value <= 99 ? value : undefined;
  }
  if (token === "once") return next === undefined || ENGLISH_AFTER_ONCE.has(next) ? undefined : 11;
  return Object.prototype.hasOwnProperty.call(NUMBER_WORDS, token) ? NUMBER_WORDS[token] : undefined;
}

/**
 * Reads a block note without AI: the first standalone number 1–99 («3», «×3», «3x», «tres», «three», but
 * not the article «una»: see `NUMBER_WORDS`) is `count`; es/en keywords («semanal», «buscador», «login»…) come back once each, in the declared order.
 */
export function parseNote(note: string | null | undefined): ParsedNote {
  if (typeof note !== "string" || note.length === 0) return { keywords: [] };
  const tokens = tokenize(note);
  let count: number | undefined;
  for (let i = 0; i < tokens.length; i++) {
    count = countOf(tokens[i]!, tokens[i + 1]);
    if (count !== undefined) break;
  }
  const found = new Set<NoteKeyword>();
  for (let i = 0; i < tokens.length; i++) {
    for (const [keyword, words] of PHRASES) {
      if (found.has(keyword)) continue;
      if (words.every((word, k) => tokens[i + k] === word)) found.add(keyword);
    }
  }
  const keywords = KEYWORDS.map(([keyword]) => keyword).filter((keyword) => found.has(keyword));
  return count === undefined ? { keywords } : { count, keywords };
}
