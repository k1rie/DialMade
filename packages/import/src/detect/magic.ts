// Binary signatures and image headers. Every reader checks bounds and advances at least one byte
// per step, so truncated or hostile files end the scan instead of throwing or looping.

export interface ImageSize {
  width: number;
  height: number;
}

const u16be = (b: Uint8Array, i: number) => (b[i]! << 8) | b[i + 1]!;
const u16le = (b: Uint8Array, i: number) => b[i]! | (b[i + 1]! << 8);
const u24le = (b: Uint8Array, i: number) => b[i]! | (b[i + 1]! << 8) | (b[i + 2]! << 16);
const u32be = (b: Uint8Array, i: number) => ((b[i]! << 24) | (b[i + 1]! << 16) | (b[i + 2]! << 8) | b[i + 3]!) >>> 0;
const i32le = (b: Uint8Array, i: number) => b[i]! | (b[i + 1]! << 8) | (b[i + 2]! << 16) | (b[i + 3]! << 24);

/** The bytes at `offset` spell `ascii`. */
export function startsWith(bytes: Uint8Array, ascii: string, offset = 0): boolean {
  if (bytes.length < offset + ascii.length) return false;
  for (let i = 0; i < ascii.length; i++) if (bytes[offset + i] !== ascii.charCodeAt(i)) return false;
  return true;
}

const sized = (width: number, height: number): ImageSize | undefined =>
  width > 0 && height > 0 && Number.isFinite(width) && Number.isFinite(height) ? { width, height } : undefined;

export function pngSize(b: Uint8Array): ImageSize | undefined {
  if (b.length < 24 || !startsWith(b, "IHDR", 12)) return undefined;
  return sized(u32be(b, 16), u32be(b, 20));
}

export function gifSize(b: Uint8Array): ImageSize | undefined {
  return b.length < 10 ? undefined : sized(u16le(b, 6), u16le(b, 8));
}

export function bmpSize(b: Uint8Array): ImageSize | undefined {
  return b.length < 26 ? undefined : sized(Math.abs(i32le(b, 18)), Math.abs(i32le(b, 22)));
}

/** Walks JPEG markers up to the first SOFn (before the scan data). */
export function jpegSize(b: Uint8Array): ImageSize | undefined {
  let i = 2;
  while (i + 1 < b.length) {
    if (b[i] !== 0xff) {
      i++;
      continue;
    }
    let marker = b[i + 1]!;
    while (marker === 0xff && i + 2 < b.length) marker = b[++i + 1]!;
    if (marker === 0xd8 || marker === 0x01 || (marker >= 0xd0 && marker <= 0xd7)) {
      i += 2;
      continue;
    }
    if (marker === 0xd9 || marker === 0xda || i + 3 >= b.length) return undefined;
    const length = u16be(b, i + 2);
    const isSof = marker >= 0xc0 && marker <= 0xcf && marker !== 0xc4 && marker !== 0xc8 && marker !== 0xcc;
    if (isSof) return i + 8 < b.length ? sized(u16be(b, i + 7), u16be(b, i + 5)) : undefined;
    i += 2 + Math.max(2, length);
  }
  return undefined;
}

export function webpSize(b: Uint8Array): ImageSize | undefined {
  if (b.length < 30) return undefined;
  if (startsWith(b, "VP8 ", 12)) {
    if (b[23] !== 0x9d || b[24] !== 0x01 || b[25] !== 0x2a) return undefined;
    return sized(u16le(b, 26) & 0x3fff, u16le(b, 28) & 0x3fff);
  }
  if (startsWith(b, "VP8L", 12)) {
    if (b[20] !== 0x2f) return undefined;
    const b0 = b[21]!, b1 = b[22]!, b2 = b[23]!, b3 = b[24]!;
    return sized(1 + (((b1 & 0x3f) << 8) | b0), 1 + (((b3 & 0x0f) << 10) | (b2 << 2) | ((b1 & 0xc0) >> 6)));
  }
  if (startsWith(b, "VP8X", 12)) return sized(1 + u24le(b, 24), 1 + u24le(b, 27));
  return undefined;
}

/** Brands of an ISO-BMFF `ftyp` box (major first). */
export function ftypBrands(b: Uint8Array): string[] {
  if (b.length < 16 || !startsWith(b, "ftyp", 4)) return [];
  const size = Math.min(u32be(b, 0), b.length, 4096);
  const brands: string[] = [];
  const read = (i: number) => String.fromCharCode(b[i]!, b[i + 1]!, b[i + 2]!, b[i + 3]!);
  brands.push(read(8));
  for (let i = 16; i + 4 <= size; i += 4) brands.push(read(i));
  return brands;
}

/**
 * AVIF/HEIF size from the `ispe` property boxes in the first megabyte. With several (grid tiles,
 * thumbnails) the largest is used, which is the safe side for the megapixel limit.
 */
export function ispeSize(b: Uint8Array): ImageSize | undefined {
  const end = Math.min(b.length, 1024 * 1024) - 16;
  let best: ImageSize | undefined;
  for (let i = 4; i <= end; i++) {
    if (b[i] !== 0x69 || b[i + 1] !== 0x73 || b[i + 2] !== 0x70 || b[i + 3] !== 0x65) continue;
    const size = sized(u32be(b, i + 8), u32be(b, i + 12));
    if (size && (!best || size.width * size.height > best.width * best.height)) best = size;
  }
  return best;
}
