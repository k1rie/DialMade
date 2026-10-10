// Browser side: screenshots are re-encoded before they leave the tab, as JPEG q0.85 with the long
// side ≤ 1280 px (no EXIF, any decodable format such as AVIF becomes JPEG), ≤ 900 KB each and
// ≤ 3.5 MB of base64 per request. A transparent margin (macOS window captures) is cropped first.
import { VISION_IMAGE_MAX_BYTES, VISION_IMAGE_MAX_SIDE, VISION_JPEG_QUALITY, VISION_MAX_TOTAL_BASE64 } from "./constants";

export type EncodedImage = { mediaType: "image/jpeg"; data: string; bytes: number; width: number; height: number };
export type EncodeLevel = { maxSide: number; quality: number };

/** Tried in order until an image, and then the whole request, fits. */
export const ENCODE_LEVELS: readonly EncodeLevel[] = [
  { maxSide: VISION_IMAGE_MAX_SIDE, quality: VISION_JPEG_QUALITY },
  { maxSide: 1024, quality: VISION_JPEG_QUALITY },
  { maxSide: 1024, quality: 0.72 },
  { maxSide: 800, quality: 0.7 },
];

export type VisionImageErrorCode = "decode-failed" | "too-large";

export class VisionImageError extends Error {
  constructor(
    readonly code: VisionImageErrorCode,
    message: string = code,
  ) {
    super(message);
    this.name = "VisionImageError";
  }
}

export function scaleToFit(width: number, height: number, maxSide: number): { width: number; height: number } {
  const scale = Math.min(1, maxSide / Math.max(width, height));
  return { width: Math.max(1, Math.round(width * scale)), height: Math.max(1, Math.round(height * scale)) };
}

export type Rect = { x: number; y: number; width: number; height: number };

/** Bounding box of the pixels with alpha ≥ `minAlpha` (RGBA); `null` when none is. */
export function opaqueBounds(data: ArrayLike<number>, width: number, height: number, minAlpha = 250): Rect | null {
  let top = height;
  let bottom = -1;
  let left = width;
  let right = -1;
  for (let y = 0; y < height; y++) {
    for (let x = 0; x < width; x++) {
      if ((data[(y * width + x) * 4 + 3] ?? 0) < minAlpha) continue;
      if (y < top) top = y;
      if (y > bottom) bottom = y;
      if (x < left) left = x;
      if (x > right) right = x;
    }
  }
  return bottom < 0 ? null : { x: left, y: top, width: right - left + 1, height: bottom - top + 1 };
}

export function bytesToBase64(bytes: Uint8Array): string {
  let binary = "";
  const chunk = 0x8000;
  for (let i = 0; i < bytes.length; i += chunk) binary += String.fromCharCode(...bytes.subarray(i, i + chunk));
  return btoa(binary);
}

export type BudgetLimits = { imageBytes: number; totalBase64: number; levels: readonly EncodeLevel[] };

const DEFAULT_LIMITS: BudgetLimits = { imageBytes: VISION_IMAGE_MAX_BYTES, totalBase64: VISION_MAX_TOTAL_BASE64, levels: ENCODE_LEVELS };

/**
 * Encodes `count` images at the first level each fits (≤ `imageBytes`), then steps the largest one
 * down until the request fits (≤ `totalBase64`). Throws `VisionImageError("too-large")` when even the
 * last level does not.
 */
export async function fitToBudget(
  count: number,
  encode: (index: number, level: EncodeLevel) => Promise<EncodedImage>,
  limits: BudgetLimits = DEFAULT_LIMITS,
): Promise<EncodedImage[]> {
  const last = limits.levels.length - 1;
  const levels: number[] = [];
  const images: EncodedImage[] = [];
  for (let i = 0; i < count; i++) {
    let level = 0;
    let image = await encode(i, limits.levels[0]!);
    while (image.bytes > limits.imageBytes) {
      if (level === last) throw new VisionImageError("too-large", `Image ${i} does not fit in ${limits.imageBytes} bytes`);
      level++;
      image = await encode(i, limits.levels[level]!);
    }
    levels.push(level);
    images.push(image);
  }

  let total = images.reduce((sum, image) => sum + image.data.length, 0);
  while (total > limits.totalBase64) {
    let pick = -1;
    images.forEach((image, i) => {
      if (levels[i]! < last && (pick < 0 || image.data.length > images[pick]!.data.length)) pick = i;
    });
    if (pick < 0) throw new VisionImageError("too-large", "The images do not fit in one request");
    levels[pick]!++;
    const next = await encode(pick, limits.levels[levels[pick]!]!);
    total += next.data.length - images[pick]!.data.length;
    images[pick] = next;
  }
  return images;
}

type Canvas2D = { canvas: OffscreenCanvas | HTMLCanvasElement; ctx: OffscreenCanvasRenderingContext2D | CanvasRenderingContext2D };

function canvas2d(width: number, height: number): Canvas2D {
  if (typeof OffscreenCanvas !== "undefined") {
    const canvas = new OffscreenCanvas(width, height);
    const ctx = canvas.getContext("2d");
    if (ctx) return { canvas, ctx };
  }
  const canvas = document.createElement("canvas");
  canvas.width = width;
  canvas.height = height;
  const ctx = canvas.getContext("2d");
  if (!ctx) throw new VisionImageError("decode-failed", "No 2D canvas");
  return { canvas, ctx };
}

function toJpeg(canvas: OffscreenCanvas | HTMLCanvasElement, quality: number): Promise<Blob> {
  if ("convertToBlob" in canvas) return canvas.convertToBlob({ type: "image/jpeg", quality });
  return new Promise((resolve, reject) =>
    canvas.toBlob((blob) => (blob ? resolve(blob) : reject(new VisionImageError("decode-failed", "Could not encode JPEG"))), "image/jpeg", quality),
  );
}

const PROBE_SIDE = 320;

/**
 * Maps the opaque box found on a probe of `probe` size back to the source size. Sides with a
 * transparent margin move one probe pixel inward, past the blended edge; the others stay put.
 */
export function cropFromProbe(bounds: Rect | null, probe: { width: number; height: number }, source: { width: number; height: number }): Rect {
  const full = { x: 0, y: 0, width: source.width, height: source.height };
  if (!bounds) return full;
  const left = bounds.x > 0 ? bounds.x + 1 : 0;
  const top = bounds.y > 0 ? bounds.y + 1 : 0;
  const rightEdge = bounds.x + bounds.width;
  const bottomEdge = bounds.y + bounds.height;
  const right = rightEdge < probe.width ? rightEdge - 1 : probe.width;
  const bottom = bottomEdge < probe.height ? bottomEdge - 1 : probe.height;
  const sx = source.width / probe.width;
  const sy = source.height / probe.height;
  const x = Math.floor(left * sx);
  const y = Math.floor(top * sy);
  const width = Math.min(source.width, Math.ceil(right * sx)) - x;
  const height = Math.min(source.height, Math.ceil(bottom * sy)) - y;
  return width < 16 || height < 16 ? full : { x, y, width, height };
}

function contentRect(bitmap: ImageBitmap): Rect {
  const probe = scaleToFit(bitmap.width, bitmap.height, PROBE_SIDE);
  const { ctx } = canvas2d(probe.width, probe.height);
  ctx.drawImage(bitmap, 0, 0, probe.width, probe.height);
  const bounds = opaqueBounds(ctx.getImageData(0, 0, probe.width, probe.height).data, probe.width, probe.height);
  return cropFromProbe(bounds, probe, bitmap);
}

async function encodeBitmap(bitmap: ImageBitmap, crop: Rect, level: EncodeLevel): Promise<EncodedImage> {
  const size = scaleToFit(crop.width, crop.height, level.maxSide);
  const { canvas, ctx } = canvas2d(size.width, size.height);
  ctx.fillStyle = "#ffffff";
  ctx.fillRect(0, 0, size.width, size.height);
  ctx.imageSmoothingQuality = "high";
  ctx.drawImage(bitmap, crop.x, crop.y, crop.width, crop.height, 0, 0, size.width, size.height);
  const blob = await toJpeg(canvas, level.quality);
  if (blob.type !== "image/jpeg") throw new VisionImageError("decode-failed", "This browser cannot encode JPEG");
  const bytes = new Uint8Array(await blob.arrayBuffer());
  return { mediaType: "image/jpeg", data: bytesToBase64(bytes), bytes: bytes.byteLength, ...size };
}

const abortError = () => new DOMException("Aborted", "AbortError");

/** Decodes, crops and re-encodes the screenshots within the request budget. */
export async function prepareVisionImages(files: readonly Blob[], options: { signal?: AbortSignal } = {}): Promise<EncodedImage[]> {
  const bitmaps: ImageBitmap[] = [];
  try {
    for (const file of files) {
      if (options.signal?.aborted) throw abortError();
      try {
        bitmaps.push(await createImageBitmap(file));
      } catch {
        throw new VisionImageError("decode-failed", "The browser could not decode a screenshot");
      }
    }
    const crops = bitmaps.map(contentRect);
    return await fitToBudget(files.length, async (index, level) => {
      if (options.signal?.aborted) throw abortError();
      return encodeBitmap(bitmaps[index]!, crops[index]!, level);
    });
  } finally {
    bitmaps.forEach((bitmap) => bitmap.close());
  }
}
