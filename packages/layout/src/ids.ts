import type { BlockId, RegionId } from "./types";

/** A source of uniform floats in [0, 1). Injectable so tests (and seeded tools) get stable ids. */
export type RandomSource = () => number;

/** The slice of Web Crypto this module uses. The package compiles without DOM types (`lib: ES2023`). */
type CryptoLike = { getRandomValues<T extends Uint32Array>(array: T): T };

/** Same pattern as `ElementIdSchema` in `@dialmade/doc`. */
export const ELEMENT_ID_RE = /^[A-Za-z0-9][A-Za-z0-9_-]{0,63}$/;
export const NEW_BLOCK_ID_RE = /^b-[0-9a-z]{6}$/;
/** Prefix of inferred region ids; block ids can never use it. */
export const REGION_PREFIX = "r-";
/**
 * Element ids of the compiled page frame (`buildPageFromLayout` in `@dialmade/sections`): the page root, the
 * app shell and the layout scope. Block ids can never use them.
 */
export const RESERVED_BLOCK_IDS: readonly string[] = ["root", "shell", "layout"];

const BASE36 = "0123456789abcdefghijklmnopqrstuvwxyz";
const MAX_ATTEMPTS = 64;

function cryptoRandom(): RandomSource {
  const crypto = (globalThis as { crypto?: CryptoLike }).crypto;
  if (!crypto || typeof crypto.getRandomValues !== "function") {
    throw new Error("newBlockId: crypto.getRandomValues is not available; pass a random source");
  }
  const buffer = new Uint32Array(1);
  return () => crypto.getRandomValues(buffer)[0]! / 4294967296;
}

type TakenIds = ReadonlySet<string> | readonly string[] | Readonly<Record<string, unknown>>;

function isTaken(taken: TakenIds | undefined, id: string): boolean {
  if (!taken) return false;
  if (Array.isArray(taken)) return taken.includes(id);
  if (typeof (taken as ReadonlySet<string>).has === "function") return (taken as ReadonlySet<string>).has(id);
  return Object.prototype.hasOwnProperty.call(taken, id);
}

/**
 * New block id: `b-` + 6 base36 chars, never one of `taken` (a Set, an array or the `blocks` record).
 * Uses `crypto.getRandomValues` unless a `random` source is given. Never call it during render.
 */
export function newBlockId(taken?: TakenIds, random?: RandomSource): BlockId {
  const next = random ?? cryptoRandom();
  for (let attempt = 0; attempt < MAX_ATTEMPTS; attempt++) {
    let id = "b-";
    for (let i = 0; i < 6; i++) id += BASE36[Math.min(35, Math.floor(next() * 36))];
    if (!isTaken(taken, id)) return id;
  }
  throw new Error("newBlockId: could not find a free id (is the random source constant?)");
}

/** `b-xxxxxx`, the format of ids created by the canvas. */
export function isNewBlockId(value: unknown): value is BlockId {
  return typeof value === "string" && NEW_BLOCK_ID_RE.test(value);
}

/** Is the id taken by the compiled page or its regions (`r-…`, `root`, `shell`, `layout`)? */
export function isReservedBlockId(value: string): boolean {
  return value.startsWith(REGION_PREFIX) || RESERVED_BLOCK_IDS.includes(value);
}

/**
 * Any id `ElementIdSchema` accepts (`hero-1` from existing pages), except the reserved ones: the `r-` prefix
 * and `root`, `shell` and `layout` (see `isReservedBlockId`).
 */
export function isValidBlockId(value: unknown): value is BlockId {
  return typeof value === "string" && ELEMENT_ID_RE.test(value) && !isReservedBlockId(value);
}

/** FNV-1a, 32 bits, over UTF-16 code units. */
export function fnv1a32(input: string): number {
  let hash = 0x811c9dc5;
  for (let i = 0; i < input.length; i++) {
    hash ^= input.charCodeAt(i);
    hash = Math.imul(hash, 0x01000193);
  }
  return hash >>> 0;
}

/** Short stable hash (base36 FNV-1a 32) for fingerprints such as `GeneratedFingerprint.noteHash`. */
export function hashString(input: string): string {
  return fnv1a32(input).toString(36);
}

/** Id of an inferred region: `r-` + hash of its kind and its member block ids (order-independent). */
export function regionId(memberIds: readonly BlockId[], kind: string): RegionId {
  const sorted = [...memberIds].sort(compareStrings);
  return REGION_PREFIX + hashString(`${kind}:${sorted.join(",")}`);
}

/** Code-unit string order: deterministic everywhere (no locale). */
export function compareStrings(a: string, b: string): number {
  return a < b ? -1 : a > b ? 1 : 0;
}
