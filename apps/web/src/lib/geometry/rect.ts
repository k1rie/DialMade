/**
 * Pixel geometry of the logo cropper (rects in natural image pixels, handles, zoom view). The grid canvas of
 * Layout mode uses `./grid`, which shares `Handle`, `Point` and `clamp` from here.
 */
import type { CropRect } from "@/lib/image";

/** Rectangle in natural image pixels. */
export type Rect = { x: number; y: number; w: number; h: number };
export type Size = { w: number; h: number };
export type Point = { x: number; y: number };
export type Handle = "n" | "s" | "e" | "w" | "ne" | "nw" | "se" | "sw";
export type View = { scale: number; x: number; y: number };

export const HANDLES: readonly Handle[] = ["nw", "n", "ne", "e", "se", "s", "sw", "w"];

export const clamp = (value: number, min: number, max: number) => Math.min(max, Math.max(min, value));

export const fullRect = (image: Size): Rect => ({ x: 0, y: 0, w: image.w, h: image.h });

export const toNatural = (crop: CropRect, image: Size): Rect => ({
  x: crop.x * image.w,
  y: crop.y * image.h,
  w: crop.w * image.w,
  h: crop.h * image.h,
});

export const toNormalized = (rect: Rect, image: Size): CropRect => ({
  x: rect.x / image.w,
  y: rect.y / image.h,
  w: rect.w / image.w,
  h: rect.h / image.h,
});

/** Keeps the rect inside the image and at least `min` on each side. */
export function constrain(rect: Rect, image: Size, min: number): Rect {
  const w = clamp(rect.w, Math.min(min, image.w), image.w);
  const h = clamp(rect.h, Math.min(min, image.h), image.h);
  return { x: clamp(rect.x, 0, image.w - w), y: clamp(rect.y, 0, image.h - h), w, h };
}

export function moveRect(rect: Rect, dx: number, dy: number, image: Size): Rect {
  return { ...rect, x: clamp(rect.x + dx, 0, image.w - rect.w), y: clamp(rect.y + dy, 0, image.h - rect.h) };
}

/** Drags `handle` by (dx, dy) from `start`. Square keeps 1:1, anchored on the opposite corner or edge. */
export function resizeRect(start: Rect, handle: Handle, dx: number, dy: number, image: Size, min: number, square: boolean): Rect {
  const left = start.x;
  const top = start.y;
  const right = start.x + start.w;
  const bottom = start.y + start.h;
  const west = handle.includes("w");
  const east = handle.includes("e");
  const north = handle.includes("n");
  const south = handle.includes("s");

  if (!square) {
    const x0 = west ? clamp(left + dx, 0, right - min) : left;
    const x1 = east ? clamp(right + dx, left + min, image.w) : right;
    const y0 = north ? clamp(top + dy, 0, bottom - min) : top;
    const y1 = south ? clamp(bottom + dy, top + min, image.h) : bottom;
    return { x: x0, y: y0, w: x1 - x0, h: y1 - y0 };
  }

  const width = west ? right - (left + dx) : east ? right + dx - left : start.w;
  const height = north ? bottom - (top + dy) : south ? bottom + dy - top : start.h;

  if ((west || east) && (north || south)) {
    const ax = west ? right : left;
    const ay = north ? bottom : top;
    const max = Math.min(west ? ax : image.w - ax, north ? ay : image.h - ay);
    const side = clamp(Math.abs(dx) >= Math.abs(dy) ? width : height, min, max);
    return { x: west ? ax - side : ax, y: north ? ay - side : ay, w: side, h: side };
  }
  if (west || east) {
    const ax = west ? right : left;
    const side = clamp(width, min, Math.min(west ? ax : image.w - ax, image.h));
    const y = clamp(top + start.h / 2 - side / 2, 0, image.h - side);
    return { x: west ? ax - side : ax, y, w: side, h: side };
  }
  const ay = north ? bottom : top;
  const side = clamp(height, min, Math.min(north ? ay : image.h - ay, image.w));
  const x = clamp(left + start.w / 2 - side / 2, 0, image.w - side);
  return { x, y: north ? ay - side : ay, w: side, h: side };
}

/** New selection dragged from `anchor` to `point` (both natural px). */
export function drawRect(anchor: Point, point: Point, image: Size, min: number, square: boolean): Rect {
  const px = clamp(point.x, 0, image.w);
  const py = clamp(point.y, 0, image.h);
  const sx = px < anchor.x ? -1 : 1;
  const sy = py < anchor.y ? -1 : 1;
  const roomX = sx < 0 ? anchor.x : image.w - anchor.x;
  const roomY = sy < 0 ? anchor.y : image.h - anchor.y;
  let w = Math.max(Math.abs(px - anchor.x), min);
  let h = Math.max(Math.abs(py - anchor.y), min);
  if (square) {
    const side = Math.min(Math.max(w, h), Math.max(roomX, min), Math.max(roomY, min));
    w = side;
    h = side;
  }
  return constrain({ x: sx < 0 ? anchor.x - w : anchor.x, y: sy < 0 ? anchor.y - h : anchor.y, w, h }, image, min);
}

/** Largest square centered on the rect's center that fits in it and in the image. */
export function squareOf(rect: Rect, image: Size): Rect {
  const side = Math.min(rect.w, rect.h);
  const cx = rect.x + rect.w / 2;
  const cy = rect.y + rect.h / 2;
  return { x: clamp(cx - side / 2, 0, image.w - side), y: clamp(cy - side / 2, 0, image.h - side), w: side, h: side };
}

/** A Map, not an object: `"toString" in {…}` is true, and `KeyboardEvent.key` is any string. */
const ARROWS: ReadonlyMap<string, Point> = new Map([
  ["ArrowLeft", { x: -1, y: 0 }],
  ["ArrowRight", { x: 1, y: 0 }],
  ["ArrowUp", { x: 0, y: -1 }],
  ["ArrowDown", { x: 0, y: 1 }],
]);

export const isArrowKey = (key: string) => ARROWS.has(key);

/** Arrow keys: move by `step`; with `resize`, Right/Down grow and Left/Up shrink (from the top-left corner). */
export function nudgeRect(rect: Rect, key: string, step: number, resize: boolean, square: boolean, image: Size, min: number): Rect {
  const dir = ARROWS.get(key);
  if (!dir) return rect;
  if (!resize) return moveRect(rect, dir.x * step, dir.y * step, image);
  if (square) {
    const side = clamp(rect.w + (dir.x + dir.y) * step, min, Math.min(image.w - rect.x, image.h - rect.y));
    return { ...rect, w: side, h: side };
  }
  return {
    ...rect,
    w: clamp(rect.w + dir.x * step, min, image.w - rect.x),
    h: clamp(rect.h + dir.y * step, min, image.h - rect.y),
  };
}

/** Scale that fits the whole image in the stage (zoom 1). */
export const fitScale = (stage: Size, image: Size, pad: number) =>
  Math.max(1e-4, Math.min((stage.w - 2 * pad) / image.w, (stage.h - 2 * pad) / image.h));

/** Image placement for `zoom`, centered on `focus` (natural px) and clamped so no empty band opens past `pad`. */
export function computeView(stage: Size, image: Size, zoom: number, focus: Point, pad: number): View {
  const scale = fitScale(stage, image, pad) * zoom;
  const axis = (stageLength: number, imageLength: number, center: number) => {
    const size = imageLength * scale;
    if (size + 2 * pad <= stageLength) return (stageLength - size) / 2;
    return clamp(stageLength / 2 - center * scale, stageLength - pad - size, pad);
  };
  return { scale, x: axis(stage.w, image.w, focus.x), y: axis(stage.h, image.h, focus.y) };
}

/** True when the rect, on screen, lies inside the stage. */
export function isVisible(rect: Rect, view: View, stage: Size): boolean {
  const left = view.x + rect.x * view.scale;
  const top = view.y + rect.y * view.scale;
  return left >= 0 && top >= 0 && left + rect.w * view.scale <= stage.w && top + rect.h * view.scale <= stage.h;
}

export const centerOf = (rect: Rect): Point => ({ x: rect.x + rect.w / 2, y: rect.y + rect.h / 2 });

export const sameRect = (a: Rect, b: Rect, tolerance: number) =>
  Math.abs(a.x - b.x) <= tolerance &&
  Math.abs(a.y - b.y) <= tolerance &&
  Math.abs(a.w - b.w) <= tolerance &&
  Math.abs(a.h - b.h) <= tolerance;
