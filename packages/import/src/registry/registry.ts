import type { DetectedFormat } from "../detect";
import type { ImportLimits } from "../limits";
import type { ImportSourceKind, Ownership, ParseOutput, ParserId } from "../types";

/** What the user said a file is in the panel («Mi logo», «Mi guía/tokens», «Captura de mi app», «Referencia de otra app», «Fuente»). */
export type FileRole = "logo" | "guide" | "screenshot" | "reference" | "font";

/** Minimal `AbortSignal` (no DOM types in this package). */
export interface AbortSignalLike {
  readonly aborted: boolean;
}

/** A file after detection, before parsing. */
export interface SniffedFile {
  /** Cleaned name (no control or bidi characters, ≤ 64). */
  readonly name: string;
  /** Lowercase, without the dot (`css`, `resolver.json`). */
  readonly extension: string;
  readonly bytes: Uint8Array;
  /** Decoded text (BOM stripped) for text formats. Lines are NOT cut: parsers use `clampLines`. */
  readonly text?: string;
  readonly detected: DetectedFormat;
  readonly role?: FileRole;
  readonly pasted: boolean;
}

/** A parser's claim on a file. `score` 0–1; the highest wins. */
export interface ParserMatch {
  format: string;
  score: number;
}

export interface ParserInput extends SniffedFile {
  readonly sourceId: string;
  /** The format from `detect`. */
  readonly format: string;
  readonly ownership: Ownership;
}

/** Another file of the same batch (for `$ref` between token files or `var()` across CSS files). */
export interface BatchFile {
  readonly name: string;
  readonly sourceId: string;
  readonly format: string;
  readonly parserId: ParserId;
  /** Text formats only. */
  readonly text?: string;
}

export interface DecodedImage {
  /** RGBA, 4 bytes per pixel. */
  data: Uint8ClampedArray | Uint8Array;
  width: number;
  height: number;
}

export interface DecodeImageRequest {
  bytes: Uint8Array;
  mime: string;
  /** Reduce so the long side is at most this (1600). */
  maxSide: number;
  /** Refuse anything larger (50 MP). */
  maxPixels: number;
}

/** Image decoding needs the platform (worker: createImageBitmap + OffscreenCanvas); the host injects it. */
export type ImageDecoder = (request: DecodeImageRequest) => Promise<DecodedImage>;

export interface ParserContext {
  readonly limits: ImportLimits;
  readonly signal?: AbortSignalLike;
  /** Every file the batch is parsing, in order (this one included). */
  readonly batch: readonly BatchFile[];
  readonly decodeImage?: ImageDecoder;
}

/**
 * One input format. `detect` is cheap and synchronous (it runs on every file); `parse` does the work
 * and should load its code on demand (`import("./parse")`) so the worker only downloads what it uses.
 * A parser never throws for bad input: it returns `warnings` and `unresolved`. Throwing marks the file
 * as failed (`parse-error`) without affecting the rest of the batch.
 */
export interface Parser {
  readonly id: ParserId;
  readonly kind: ImportSourceKind;
  /** Semver; the source records `<id>@<version>`. `0.0.0` = stub. */
  readonly version: string;
  detect(file: SniffedFile): ParserMatch | null;
  parse(input: ParserInput, ctx: ParserContext): Promise<ParseOutput>;
}

export interface ParserRegistry {
  readonly parsers: readonly Parser[];
  get(id: ParserId): Parser | undefined;
  /** The parser for a file: highest score, then the detector's choice, then registration order. */
  pick(file: SniffedFile): { parser: Parser; match: ParserMatch } | null;
}

const SEMVER = /^\d+\.\d+\.\d+$/;

export function createRegistry(parsers: readonly Parser[]): ParserRegistry {
  const byId = new Map<ParserId, Parser>();
  for (const parser of parsers) {
    if (byId.has(parser.id)) throw new TypeError(`Duplicate parser "${parser.id}"`);
    if (!SEMVER.test(parser.version)) throw new TypeError(`Parser "${parser.id}" needs a x.y.z version`);
    byId.set(parser.id, parser);
  }
  const list = [...parsers];
  return {
    parsers: list,
    get: (id) => byId.get(id),
    pick(file) {
      let best: { parser: Parser; match: ParserMatch; rank: number } | null = null;
      list.forEach((parser, order) => {
        let match: ParserMatch | null;
        try {
          match = parser.detect(file);
        } catch {
          match = null;
        }
        if (!match || !(match.score > 0)) return;
        const preferred = parser.id === file.detected.parserId ? 1 : 0;
        const rank = match.score * 10 + preferred - order / 1000;
        if (!best || rank > best.rank) best = { parser, match, rank };
      });
      const chosen = best as { parser: Parser; match: ParserMatch } | null;
      return chosen && { parser: chosen.parser, match: chosen.match };
    },
  };
}

/** `detect` for a parser that takes what the format detector assigned to it. */
export function detectedBy(id: ParserId): Parser["detect"] {
  return (file) => (file.detected.parserId === id ? { format: file.detected.format, score: file.detected.confidence } : null);
}

/** What a stub parser returns until its implementation lands. */
export function notImplemented(id: ParserId): ParseOutput {
  return { warnings: [{ code: "parser-not-implemented", detail: id }] };
}
