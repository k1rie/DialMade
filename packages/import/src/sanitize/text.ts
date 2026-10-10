import { IMPORT_LIMITS } from "../limits";

// C0/C1 controls, DEL, bidi embeddings/overrides/isolates and marks (U+202A\u2013202E, U+2066\u20132069,
// LRM/RLM/ALM), zero-width space and BOM. Character classes only: linear on any input.
const INVISIBLE = /[\u0000-\u0008\u000b\u000c\u000e-\u001f\u007f-\u009f\u061c\u200b\u200e\u200f\u202a-\u202e\u2066-\u2069\ufeff]/g;
const LINE_BREAKS = /[\t\n\r\u2028\u2029]/g;
const SPACES = /\s+/g;

export interface Cleaned {
  value: string;
  truncated: boolean;
}

/** First `max` code points, never splitting a surrogate pair. */
function cutCodePoints(text: string, max: number): Cleaned {
  if (text.length <= max) return { value: text, truncated: false };
  const points = Array.from(text.slice(0, max * 2));
  if (points.length <= max) return { value: points.join(""), truncated: text.length > max * 2 };
  return { value: points.slice(0, max).join("").trimEnd(), truncated: true };
}

/**
 * A single-line label from user content (file, variable or family name): no control or bidi
 * characters, whitespace collapsed, at most `max` code points (64 by default).
 */
export function cleanName(input: string, max: number = IMPORT_LIMITS.maxNameLength): Cleaned {
  const head = input.length > max * 8 ? input.slice(0, max * 8) : input;
  const flat = head.replace(LINE_BREAKS, " ").replace(INVISIBLE, "").replace(SPACES, " ").trim();
  const cut = cutCodePoints(flat, max);
  return { value: cut.value, truncated: cut.truncated || head.length < input.length };
}

/** `cleanName` for longer single-line text (locators, details). */
export const cleanText = (input: string, max = 200): string => cleanName(input, max).value;

/** Prose (DESIGN.md notes): keeps line breaks, drops other controls and bidi, at most `max` code points. */
export function cleanMultiline(input: string, max = 4000): string {
  const head = input.length > max * 4 ? input.slice(0, max * 4) : input;
  const text = head
    .replace(/\r\n?/g, "\n")
    .replace(/[\u2028\u2029]/g, "\n")
    .replace(/\t/g, " ")
    .replace(INVISIBLE, "")
    .replace(/(\S) {2,}/g, "$1 ")
    .replace(/[ ]+\n/g, "\n")
    .replace(/\n{3,}/g, "\n\n")
    .trim();
  return cutCodePoints(text, max).value;
}

/** A name for generated code: `[a-z0-9-]`, at most 64 characters (`Brand Blue/500` \u2192 `brand-blue-500`). */
export function toIdentifier(name: string, fallback = "x"): string {
  const id = cleanName(name, 128)
    .value.toLowerCase()
    .normalize("NFKD")
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/^-+|-+$/g, "")
    .slice(0, 64)
    .replace(/-+$/, "");
  return id || fallback;
}

export interface ClampedText {
  text: string;
  /** Lines that were cut. */
  truncated: number;
}

/** Cuts every line to `max` characters, so no regex ever runs on a megabyte-long line. Linear. */
export function clampLines(text: string, max: number = IMPORT_LIMITS.maxLineLength): ClampedText {
  let truncated = 0;
  let start = 0;
  let parts: string[] | null = null;
  while (start <= text.length) {
    let end = text.indexOf("\n", start);
    if (end < 0) end = text.length;
    if (end - start > max) {
      parts ??= [text.slice(0, start)];
      parts.push(text.slice(start, start + max));
      truncated++;
    } else if (parts) {
      parts.push(text.slice(start, end));
    }
    if (end === text.length) break;
    if (parts) parts.push("\n");
    start = end + 1;
  }
  return { text: parts ? parts.join("") : text, truncated };
}

/** Lines (LF or CRLF), each cut to `max`. */
export function splitLines(text: string, max: number = IMPORT_LIMITS.maxLineLength): string[] {
  return clampLines(text, max).text.split(/\r?\n/);
}

/** 1-based line of a character offset (for locators like `globals.css:12`). */
export function lineAt(text: string, offset: number): number {
  let line = 1;
  let i = text.indexOf("\n");
  while (i >= 0 && i < offset) {
    line++;
    i = text.indexOf("\n", i + 1);
  }
  return line;
}

interface TextDecoderLike {
  decode(input?: Uint8Array): string;
}
type TextDecoderCtor = new (label?: string, options?: { fatal?: boolean; ignoreBOM?: boolean }) => TextDecoderLike;

const Decoder = (globalThis as unknown as { TextDecoder?: TextDecoderCtor }).TextDecoder;

export interface DecodedText {
  text: string;
  encoding: "utf-8" | "utf-16le" | "utf-16be";
  /** Bytes that were not valid UTF-8 were replaced with U+FFFD. */
  invalid: boolean;
}

/** True when the first 8 KB hold a NUL byte (binary), ignoring UTF-16 text. */
export function looksBinary(bytes: Uint8Array): boolean {
  const end = Math.min(bytes.length, 8192);
  for (let i = 0; i < end; i++) if (bytes[i] === 0) return true;
  return false;
}

/** Text of a file: UTF-8 (BOM stripped) or UTF-16 with BOM; `null` for binary content. */
export function decodeText(bytes: Uint8Array): DecodedText | null {
  if (!Decoder) throw new Error("TextDecoder is not available in this environment");
  if (bytes.length >= 2 && bytes[0] === 0xff && bytes[1] === 0xfe) {
    return { text: new Decoder("utf-16le").decode(bytes.subarray(2)), encoding: "utf-16le", invalid: false };
  }
  if (bytes.length >= 2 && bytes[0] === 0xfe && bytes[1] === 0xff) {
    return { text: new Decoder("utf-16be").decode(bytes.subarray(2)), encoding: "utf-16be", invalid: false };
  }
  if (looksBinary(bytes)) return null;
  const body = bytes.length >= 3 && bytes[0] === 0xef && bytes[1] === 0xbb && bytes[2] === 0xbf ? bytes.subarray(3) : bytes;
  try {
    return { text: new Decoder("utf-8", { fatal: true, ignoreBOM: true }).decode(body), encoding: "utf-8", invalid: false };
  } catch {
    return { text: new Decoder("utf-8", { ignoreBOM: true }).decode(body), encoding: "utf-8", invalid: true };
  }
}
