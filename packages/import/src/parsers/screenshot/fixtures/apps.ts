import { canvas, frame, rect, textLines, type Pixels } from "./canvas";

/** «Nimbo», the fictional brand of the fixtures. */
export const NIMBO = {
  /** oklch(0.51 0.2 280) */
  violet: "#564cd3",
  /** oklch(0.72 0.15 165) */
  emerald: "#00c28d",
  /** oklch(0.86 0.17 95) */
  yellow: "#f4ce23",
  /** A status dot more saturated than the CTA but far too small to be the accent. */
  dot: "#f5223b",
} as const;

export const SLATE = { 50: "#f1f5f9", 200: "#e2e8f0", 600: "#475569", 900: "#0f172a" } as const;
export const GRAY = { 950: "#0a0a0a", 900: "#171717", 400: "#a1a1a1", 50: "#fafafa", zinc900: "#18181b" } as const;

/**
 * Light dashboard, 400×250: white page, slate sidebar, a card with slate text and a violet CTA that
 * covers ≈1 % of the image (52×20 with a white label), plus a 10×10 red dot (0.1 %).
 */
export function lightApp(): Pixels {
  const p = canvas(400, 250, "#ffffff");
  rect(p, 0, 0, 72, 250, SLATE[50]);
  rect(p, 72, 0, 1, 250, SLATE[200]);
  textLines(p, 12, 24, [44, 40, 36, 44, 30, 38], SLATE[600], 2, 14);
  frame(p, 96, 30, 280, 170, SLATE[200]);
  textLines(p, 112, 48, [220, 200, 236, 180, 210, 224, 190, 236, 160, 200, 226, 140], SLATE[900], 2, 10);
  textLines(p, 112, 172, [120, 90], SLATE[900], 3, 8);
  rect(p, 300, 212, 52, 20, NIMBO.violet);
  rect(p, 312, 221, 28, 2, "#ffffff");
  rect(p, 360, 216, 10, 10, NIMBO.dot);
  return p;
}

/** Dark app, 400×250: near-black page, #171717 sidebar and cards, light text and an emerald button (≈1.4 %). */
export function darkApp(): Pixels {
  const p = canvas(400, 250, GRAY[950]);
  rect(p, 0, 0, 72, 250, GRAY[900]);
  textLines(p, 12, 24, [44, 40, 36, 44, 30], GRAY[400], 2, 14);
  rect(p, 96, 30, 280, 110, GRAY[900]);
  textLines(p, 112, 46, [220, 200, 236, 180, 210, 224, 190, 236], GRAY[50], 2, 10);
  rect(p, 96, 156, 136, 70, GRAY[900]);
  textLines(p, 108, 168, [100, 80, 110, 96], GRAY[400], 2, 12);
  rect(p, 290, 196, 60, 24, NIMBO.emerald);
  rect(p, 302, 207, 36, 2, GRAY[950]);
  return p;
}

/**
 * A landing hero on the brand color, 400×250: violet page (≈73 %), a white card with zinc text, white
 * headline bars on the violet and a yellow CTA (≈1.2 %).
 */
export function brandBackgroundApp(): Pixels {
  const p = canvas(400, 250, NIMBO.violet);
  textLines(p, 24, 24, [180, 150, 120], "#ffffff", 4, 10);
  rect(p, 180, 80, 200, 110, "#ffffff");
  textLines(p, 196, 96, [160, 150, 170, 120, 160, 140, 168, 110, 150], GRAY.zinc900, 2, 10);
  rect(p, 24, 120, 60, 20, NIMBO.yellow);
  rect(p, 36, 129, 36, 2, GRAY.zinc900);
  return p;
}
