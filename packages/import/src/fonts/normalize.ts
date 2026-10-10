import { cleanName } from "../sanitize";

/** Lookup key of a family: lowercase ASCII letters and digits only (`Open-Sans`, `open_sans`, `OpenSans` → `opensans`). */
export function familyKey(name: string): string {
  return name
    .normalize("NFKD")
    .replace(/[̀-ͯ]/g, "")
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, "");
}

const STYLE_WORDS =
  /^(?:regular|normal|book|roman|plain|italic|oblique|ital|thin|hairline|extralight|ultralight|light|medium|semibold|demibold|demi|bold|extrabold|ultrabold|heavy|black|ultra|extra|semi|variable|var|vf|web|webfont|std|lt|mt|ps|psmt|[1-9]00)$/;

/** `ABCDEF+` subset prefix of fonts embedded in PDFs. */
const SUBSET_PREFIX = /^[A-Z]{6}\+/;

/** `PlusJakartaSans` → `Plus Jakarta Sans`; acronyms stay together (`IBMPlexSans` → `IBM Plex Sans`). */
function splitCamel(word: string): string {
  return word.replace(/([a-z0-9])([A-Z])/g, "$1 $2").replace(/([A-Z]+)([A-Z][a-z])/g, "$1 $2");
}

/**
 * Cleaned display name of a declared family, plus the variants worth looking up when the exact name
 * is unknown: PostScript names split (`PlusJakartaSans-Bold` → `Plus Jakarta Sans`) and trailing style
 * or format words removed (`Inter Variable`, `Roboto Bold`, `Lato Std`).
 */
export function familyVariants(name: string): { display: string; variants: string[] } {
  const display = cleanName(name.replace(SUBSET_PREFIX, "")).value.replace(/^["']+|["']+$/g, "").trim();
  const variants: string[] = [];
  const add = (v: string) => {
    const trimmed = v.replace(/\s+/g, " ").trim();
    if (trimmed && !variants.includes(trimmed)) variants.push(trimmed);
  };
  add(display);
  const postScript = !display.includes(" ") && /[a-z][A-Z]|-/.test(display);
  const spaced = postScript ? display.split("-").map(splitCamel).join(" ") : display.replace(/[_-]+/g, " ");
  add(spaced);
  const words = spaced.split(" ");
  while (words.length > 1 && STYLE_WORDS.test(words[words.length - 1]!.toLowerCase())) {
    words.pop();
    add(words.join(" "));
  }
  return { display, variants };
}

/** `my-brand_sans` → `My Brand Sans`. */
export const titleCase = (name: string): string =>
  name
    .split(/[\s_-]+/)
    .filter(Boolean)
    .map((w) => w[0]!.toUpperCase() + w.slice(1))
    .join(" ");

/** Optimal string alignment distance (Damerau-Levenshtein with adjacent transpositions), early exit above `max`. */
export function editDistance(a: string, b: string, max = Infinity): number {
  if (a === b) return 0;
  if (Math.abs(a.length - b.length) > max) return max + 1;
  const n = b.length;
  let prev2 = new Array<number>(n + 1).fill(0);
  let prev = Array.from({ length: n + 1 }, (_, j) => j);
  let cur = new Array<number>(n + 1).fill(0);
  for (let i = 1; i <= a.length; i++) {
    cur[0] = i;
    let rowMin = cur[0];
    for (let j = 1; j <= n; j++) {
      const cost = a[i - 1] === b[j - 1] ? 0 : 1;
      let v = Math.min(prev[j]! + 1, cur[j - 1]! + 1, prev[j - 1]! + cost);
      if (i > 1 && j > 1 && a[i - 1] === b[j - 2] && a[i - 2] === b[j - 1]) v = Math.min(v, prev2[j - 2]! + 1);
      cur[j] = v;
      if (v < rowMin) rowMin = v;
    }
    if (rowMin > max) return max + 1;
    [prev2, prev, cur] = [prev, cur, prev2];
  }
  return prev[n]!;
}
