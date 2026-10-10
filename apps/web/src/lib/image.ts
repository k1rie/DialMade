/** Normalized crop (0–1) relative to the image's natural size. */
export type CropRect = { x: number; y: number; w: number; h: number };

export type DecodedPixels = { data: Uint8ClampedArray; width: number; height: number };

export type FlowLogo = {
  name: string;
  type: string;
  /** blob: URL owned by the flow (revoked on replace/reset). Render it with <img>, never innerHTML. */
  objectUrl: string;
  /** Raw SVG source, only for SVG logos (feed it to `parseSvgColors`). */
  svgText?: string;
  width: number;
  height: number;
};

export type LogoFileErrorCode = "unsupported-type" | "too-large" | "decode-failed";

export class LogoFileError extends Error {
  constructor(
    readonly code: LogoFileErrorCode,
    message: string = code,
  ) {
    super(message);
    this.name = "LogoFileError";
  }
}

/** What the Home promises: «SVG, PNG, JPG o WebP · hasta 5 MB». */
export const ACCEPTED_LOGO_TYPES = ["image/svg+xml", "image/png", "image/jpeg", "image/webp"] as const;
export const ACCEPTED_LOGO_EXTENSIONS = [".svg", ".png", ".jpg", ".jpeg", ".webp"] as const;
/** `accept` attribute for <input type="file">. */
export const LOGO_ACCEPT = [...ACCEPTED_LOGO_TYPES, ...ACCEPTED_LOGO_EXTENSIONS].join(",");
export const MAX_LOGO_BYTES = 5 * 1024 * 1024;
export const MAX_LOGO_MB = MAX_LOGO_BYTES / 1024 / 1024;

const SVG_TYPE = "image/svg+xml";
const FALLBACK_SVG_SIZE = 512;

const extensionOf = (name: string) => {
  const dot = name.lastIndexOf(".");
  return dot >= 0 ? name.slice(dot).toLowerCase() : "";
};

export function isSvg(file: { type: string; name?: string }): boolean {
  return file.type === SVG_TYPE || (!!file.name && extensionOf(file.name) === ".svg");
}

export type LogoTone = "dark" | "light";

/** Pixels below this alpha are background, not part of the mark. */
export const LOGO_EMPTY_ALPHA = 24;
const DARK_TONE_BELOW = 0.55;

/**
 * Average (alpha-weighted) lightness of a decoded logo's visible pixels: a dark mark reads best on a
 * light backdrop and vice versa. `keep` can drop more pixels (e.g. a flat background color).
 */
export function logoTone(data: ArrayLike<number>, keep: (index: number) => boolean = () => true): LogoTone {
  let light = 0;
  let weight = 0;
  for (let i = 0; i < data.length; i += 4) {
    const alpha = data[i + 3] ?? 0;
    if (alpha < LOGO_EMPTY_ALPHA || !keep(i)) continue;
    light += ((0.2126 * (data[i] ?? 0) + 0.7152 * (data[i + 1] ?? 0) + 0.0722 * (data[i + 2] ?? 0)) / 255) * alpha;
    weight += alpha;
  }
  return weight > 0 && light / weight < DARK_TONE_BELOW ? "dark" : "light";
}

export function isAcceptedLogo(file: { type: string; name?: string }): boolean {
  if ((ACCEPTED_LOGO_TYPES as readonly string[]).includes(file.type)) return true;
  return !!file.name && (ACCEPTED_LOGO_EXTENSIONS as readonly string[]).includes(extensionOf(file.name));
}

function loadImage(url: string): Promise<HTMLImageElement> {
  return new Promise((resolve, reject) => {
    const img = new Image();
    img.decoding = "async";
    img.onload = () => resolve(img);
    img.onerror = () => reject(new LogoFileError("decode-failed"));
    img.src = url;
  });
}

/** Intrinsic size of an SVG from width/height or viewBox (DOMParser documents are inert). */
function svgSize(svgText: string): { width: number; height: number } | undefined {
  try {
    const doc = new DOMParser().parseFromString(svgText, SVG_TYPE);
    const root = doc.documentElement;
    if (root.nodeName.toLowerCase() !== "svg") return undefined;
    const viewBox = root.getAttribute("viewBox")?.trim().split(/[\s,]+/).map(Number);
    const vbW = viewBox?.[2];
    const vbH = viewBox?.[3];
    const attr = (name: string) => {
      const raw = root.getAttribute(name);
      if (!raw || raw.endsWith("%")) return undefined;
      const value = Number.parseFloat(raw);
      return Number.isFinite(value) && value > 0 ? value : undefined;
    };
    const width = attr("width");
    const height = attr("height");
    if (width && height) return { width, height };
    if (vbW && vbH && vbW > 0 && vbH > 0) {
      if (width) return { width, height: (width * vbH) / vbW };
      if (height) return { width: (height * vbW) / vbH, height };
      return { width: vbW, height: vbH };
    }
  } catch {}
  return undefined;
}

/** Adds explicit width/height (from the viewBox) so every browser can rasterize the SVG. */
function withExplicitSize(svgText: string): string {
  const size = svgSize(svgText);
  if (!size) return svgText;
  try {
    const doc = new DOMParser().parseFromString(svgText, SVG_TYPE);
    const root = doc.documentElement;
    if (root.hasAttribute("width") && root.hasAttribute("height") && !/%$/.test(root.getAttribute("width") ?? "")) return svgText;
    root.setAttribute("width", String(size.width));
    root.setAttribute("height", String(size.height));
    return new XMLSerializer().serializeToString(doc);
  } catch {
    return svgText;
  }
}

type Drawable = { source: CanvasImageSource; width: number; height: number; close?: () => void };

async function toDrawable(blob: Blob, svgText?: string): Promise<Drawable> {
  if (svgText !== undefined || blob.type === SVG_TYPE) {
    const text = svgText ?? (await blob.text());
    const url = URL.createObjectURL(new Blob([withExplicitSize(text)], { type: SVG_TYPE }));
    try {
      const img = await loadImage(url);
      const size = svgSize(text);
      const width = size?.width ?? (img.naturalWidth || FALLBACK_SVG_SIZE);
      const height = size?.height ?? (img.naturalHeight || FALLBACK_SVG_SIZE);
      return { source: img, width, height };
    } finally {
      URL.revokeObjectURL(url);
    }
  }
  try {
    const bitmap = await createImageBitmap(blob);
    return { source: bitmap, width: bitmap.width, height: bitmap.height, close: () => bitmap.close() };
  } catch {
    const url = URL.createObjectURL(blob);
    try {
      const img = await loadImage(url);
      return { source: img, width: img.naturalWidth, height: img.naturalHeight };
    } finally {
      URL.revokeObjectURL(url);
    }
  }
}

const clamp01 = (v: number) => Math.min(1, Math.max(0, v));

/** Clamps a normalized crop into the image and keeps it ≥1 % on each side. */
export function normalizeCrop(crop: CropRect): CropRect {
  const x = clamp01(crop.x);
  const y = clamp01(crop.y);
  const w = Math.max(0.01, Math.min(1 - x, crop.w));
  const h = Math.max(0.01, Math.min(1 - y, crop.h));
  return { x: Math.min(x, 0.99), y: Math.min(y, 0.99), w, h };
}

export const isFullCrop = (crop?: CropRect | null) =>
  !crop || (crop.x <= 0.001 && crop.y <= 0.001 && crop.w >= 0.999 && crop.h >= 0.999);

type Canvas2D = { canvas: HTMLCanvasElement | OffscreenCanvas; ctx: CanvasRenderingContext2D | OffscreenCanvasRenderingContext2D };

function createCanvas(width: number, height: number): Canvas2D {
  if (typeof OffscreenCanvas !== "undefined") {
    const canvas = new OffscreenCanvas(width, height);
    const ctx = canvas.getContext("2d", { willReadFrequently: true });
    if (ctx) return { canvas, ctx };
  }
  const canvas = document.createElement("canvas");
  canvas.width = width;
  canvas.height = height;
  const ctx = canvas.getContext("2d", { willReadFrequently: true });
  if (!ctx) throw new Error("Canvas 2D is not available");
  return { canvas, ctx };
}

type RenderOptions = { maxSize?: number; crop?: CropRect | null; svgText?: string };

async function render(source: Blob | string, { maxSize = 256, crop, svgText }: RenderOptions): Promise<Canvas2D & { width: number; height: number }> {
  const blob = typeof source === "string" ? await (await fetch(source)).blob() : source;
  const drawable = await toDrawable(blob, svgText);
  try {
    const area = crop && !isFullCrop(crop) ? normalizeCrop(crop) : { x: 0, y: 0, w: 1, h: 1 };
    const sw = area.w * drawable.width;
    const sh = area.h * drawable.height;
    const scale = Math.min(1, maxSize / Math.max(sw, sh));
    const isVector = drawable.source instanceof HTMLImageElement && (svgText !== undefined || blob.type === SVG_TYPE);
    const fit = isVector ? maxSize / Math.max(sw, sh) : scale;
    const width = Math.max(1, Math.round(sw * fit));
    const height = Math.max(1, Math.round(sh * fit));
    const surface = createCanvas(width, height);
    surface.ctx.imageSmoothingEnabled = true;
    surface.ctx.imageSmoothingQuality = "high";
    if (isVector) {
      // Vector: draw the full SVG at the target scale, offset so the crop lands at the origin.
      const fullW = drawable.width * fit;
      const fullH = drawable.height * fit;
      surface.ctx.drawImage(drawable.source, -area.x * fullW, -area.y * fullH, fullW, fullH);
    } else {
      surface.ctx.drawImage(drawable.source, area.x * drawable.width, area.y * drawable.height, sw, sh, 0, 0, width, height);
    }
    return { ...surface, width, height };
  } finally {
    drawable.close?.();
  }
}

/**
 * Decodes a logo (SVG or raster) to RGBA pixels, at most `maxSize` px on the long side, after
 * applying the optional normalized `crop`. SVGs are rasterized through a blob URL in an <img>.
 */
export async function decodeToPixels(
  source: Blob | string,
  options: { maxSize?: number; crop?: CropRect | null; svgText?: string } = {},
): Promise<DecodedPixels> {
  try {
    const { ctx, width, height } = await render(source, options);
    const { data } = ctx.getImageData(0, 0, width, height, { colorSpace: "srgb" });
    return { data, width, height };
  } catch (error) {
    throw error instanceof LogoFileError ? error : new LogoFileError("decode-failed", String(error));
  }
}

/** Crops (and downsizes) a logo to a PNG blob — handy for thumbnails of the cropped logo. */
export async function cropToBlob(
  source: Blob | string,
  options: { maxSize?: number; crop?: CropRect | null; svgText?: string } = {},
): Promise<Blob> {
  const { canvas } = await render(source, { maxSize: 512, ...options });
  if ("convertToBlob" in canvas) return canvas.convertToBlob({ type: "image/png" });
  return new Promise((resolve, reject) =>
    canvas.toBlob((blob) => (blob ? resolve(blob) : reject(new LogoFileError("decode-failed"))), "image/png"),
  );
}

/**
 * Validates and reads a user file into a `FlowLogo` (blob URL + natural size + SVG source).
 * Throws `LogoFileError` with a code the UI maps to an i18n message.
 */
export async function readLogoFile(file: File | Blob, name = file instanceof File ? file.name : "logo"): Promise<FlowLogo> {
  const meta = { type: file.type, name };
  if (!isAcceptedLogo(meta)) throw new LogoFileError("unsupported-type");
  if (file.size > MAX_LOGO_BYTES) throw new LogoFileError("too-large");

  if (isSvg(meta)) {
    const svgText = await file.text();
    if (!/<svg[\s>]/i.test(svgText)) throw new LogoFileError("decode-failed");
    const blob = new Blob([withExplicitSize(svgText)], { type: SVG_TYPE });
    const objectUrl = URL.createObjectURL(blob);
    try {
      const img = await loadImage(objectUrl);
      const size = svgSize(svgText) ?? { width: img.naturalWidth || FALLBACK_SVG_SIZE, height: img.naturalHeight || FALLBACK_SVG_SIZE };
      return { name, type: SVG_TYPE, objectUrl, svgText, ...size };
    } catch (error) {
      URL.revokeObjectURL(objectUrl);
      throw error;
    }
  }

  const objectUrl = URL.createObjectURL(file);
  try {
    const img = await loadImage(objectUrl);
    return { name, type: file.type || "image/*", objectUrl, width: img.naturalWidth, height: img.naturalHeight };
  } catch (error) {
    URL.revokeObjectURL(objectUrl);
    throw error;
  }
}

/** Decodes a `FlowLogo` already in the flow (uses its blob URL and SVG text). */
export function decodeLogo(logo: FlowLogo, options: { maxSize?: number; crop?: CropRect | null } = {}): Promise<DecodedPixels> {
  return decodeToPixels(logo.objectUrl, { ...options, svgText: logo.svgText });
}
