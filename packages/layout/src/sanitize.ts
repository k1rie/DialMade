import { LABEL_MAX, NOTE_MAX } from "./constants";

/** C0/C1 controls, DEL and the Unicode line/paragraph separators: they become a space. */
const BREAKING = /[\u0000-\u001f\u007f-\u009f\u2028\u2029]/g;

const ZWNJ = 0x200c;
const ZWJ = 0x200d;
const VS16 = 0xfe0f;

/** The only emoji tag sequences in use (RGI): the flags of England, Scotland and Wales. */
const tags = (code: string) => Array.from(code, (c) => String.fromCodePoint(0xe0000 + c.charCodeAt(0))).join("");
const TAG_FLAG = `\u{1f3f4}(?:${["gbeng", "gbsct", "gbwls"].map(tags).join("|")})${tags("\u007f")}`;
/**
 * Invisible characters: every format character (`Cf`: bidi marks, BOM, zero-width space/joiners, word
 * joiner, invisible operators, soft hyphen, Mongolian vowel separator, Unicode tags…), the combining grapheme
 * joiner and the Hangul fillers, which render as nothing. The tag flags are matched first so they survive.
 */
const INVISIBLE = new RegExp(`(${TAG_FLAG})|[\\p{Cf}\\u034f\\u115f\\u1160\\u3164\\uffa0]`, "gu");
const PICTOGRAPHIC = /\p{Extended_Pictographic}/u;
const EMOJI_MODIFIER = /\p{Emoji_Modifier}/u;
const JOINING_NEIGHBOR = /[\p{L}\p{M}]/u;
/** Scripts that never need ZWJ/ZWNJ between letters (a joiner there is only hidden text). */
const NON_JOINING_SCRIPT =
  /[\p{Script=Latin}\p{Script=Greek}\p{Script=Cyrillic}\p{Script=Han}\p{Script=Hiragana}\p{Script=Katakana}\p{Script=Hangul}\p{Script=Common}]/u;

function codePointBefore(text: string, index: number): number | undefined {
  if (index <= 0) return undefined;
  const low = text.charCodeAt(index - 1);
  if (low >= 0xdc00 && low <= 0xdfff && index >= 2) {
    const high = text.charCodeAt(index - 2);
    if (high >= 0xd800 && high <= 0xdbff) return text.codePointAt(index - 2);
  }
  return low;
}

const isLetterOfJoiningScript = (cp: number | undefined): boolean => {
  if (cp === undefined) return false;
  const ch = String.fromCodePoint(cp);
  return JOINING_NEIGHBOR.test(ch) && !NON_JOINING_SCRIPT.test(ch);
};

/**
 * ZWJ and ZWNJ only stay where they change what is drawn: ZWJ inside an emoji sequence (👩‍💻: after an
 * emoji, a skin tone or VS16, and before an emoji), and both joiners between two letters or marks of a
 * script that uses them (Persian, Hindi…). Anywhere else they are invisible and get removed.
 */
function keepsJoiner(cp: number, text: string, offset: number): boolean {
  const before = codePointBefore(text, offset);
  const after = text.codePointAt(offset + 1);
  if (cp === ZWJ && before !== undefined && after !== undefined) {
    const emojiBefore =
      before === VS16 ||
      PICTOGRAPHIC.test(String.fromCodePoint(before)) ||
      EMOJI_MODIFIER.test(String.fromCodePoint(before));
    if (emojiBefore && PICTOGRAPHIC.test(String.fromCodePoint(after))) return true;
  }
  return isLetterOfJoiningScript(before) && isLetterOfJoiningScript(after);
}

function removeInvisible(text: string): string {
  return text.replace(INVISIBLE, (match: string, flag: string | undefined, offset: number, whole: string) => {
    if (flag) return match;
    const cp = match.codePointAt(0)!;
    return (cp === ZWJ || cp === ZWNJ) && keepsJoiner(cp, whole, offset) ? match : "";
  });
}

/**
 * One line of plain text, NFC-normalized: controls become spaces, invisible characters are removed (bidi
 * controls, zero-width characters, Unicode tags…; ZWJ survives only in emoji sequences and ZWJ/ZWNJ in the
 * scripts that need them), whitespace collapses, and the result is cut to `max` UTF-16 code units without
 * splitting a surrogate pair or leaving half an emoji tag sequence behind.
 */
export function sanitizeLine(raw: unknown, max: number): string {
  if (typeof raw !== "string") return "";
  const text = removeInvisible(raw.normalize("NFC").replace(BREAKING, " ")).replace(/\s+/g, " ").trim();
  if (text.length <= max) return text;
  let end = Math.max(0, max);
  const last = text.charCodeAt(end - 1);
  if (last >= 0xd800 && last <= 0xdbff) end -= 1;
  // The cut can split a joiner sequence or a tag flag: clean again so no dangling joiner or tag remains.
  return removeInvisible(text.slice(0, end)).trimEnd();
}

/** Block note: one line, ≤200 code units. Data, never instructions. */
export function sanitizeNote(raw: unknown): string {
  return sanitizeLine(raw, NOTE_MAX);
}

/** Block label: one line, ≤60 code units. */
export function sanitizeLabel(raw: unknown): string {
  return sanitizeLine(raw, LABEL_MAX);
}
