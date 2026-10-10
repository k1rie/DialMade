import type { CropRect, FlowLogo } from "@/lib/image";

export type Box = { x: number; y: number; w: number; h: number };

const FALLBACK = 512;

/** Size of the (cropped) logo fitted in `max`, plus where the full image sits inside that box. */
export function fitLogo(logo: FlowLogo, crop: CropRect | undefined, max: number): { box: Box; image: Box } {
  const width = logo.width > 0 ? logo.width : FALLBACK;
  const height = logo.height > 0 ? logo.height : FALLBACK;
  const area = crop ?? { x: 0, y: 0, w: 1, h: 1 };
  const scale = max / Math.max(area.w * width, area.h * height);
  return {
    box: { x: 0, y: 0, w: area.w * width * scale, h: area.h * height * scale },
    image: { x: -area.x * width * scale, y: -area.y * height * scale, w: width * scale, h: height * scale },
  };
}

/** Splits the box into `count` tiles (rows of ⌈√count⌉; the last row stretches) so the pieces rebuild the logo. */
export function tilesFor(count: number, box: Box): Box[] {
  const cols = Math.max(1, Math.ceil(Math.sqrt(count)));
  const rows = Math.max(1, Math.ceil(count / cols));
  const tiles: Box[] = [];
  for (let row = 0; row < rows; row++) {
    const inRow = row === rows - 1 ? count - cols * (rows - 1) : cols;
    for (let col = 0; col < inRow; col++) {
      tiles.push({ x: (col * box.w) / inRow, y: (row * box.h) / rows, w: box.w / inRow, h: box.h / rows });
    }
  }
  return tiles;
}
