import type { CSSProperties } from "react";

export type Backdrop = "light" | "dark";

/** Checkerboards behind the logo so transparent areas read as transparent. */
export const BACKDROPS: Record<Backdrop, CSSProperties> = {
  light: {
    backgroundColor: "oklch(0.965 0.004 285)",
    backgroundImage: "repeating-conic-gradient(oklch(0.915 0.006 285) 0 25%, transparent 0 50%)",
    backgroundSize: "16px 16px",
  },
  dark: {
    backgroundColor: "oklch(0.185 0.014 285)",
    backgroundImage: "repeating-conic-gradient(oklch(1 0 0 / 0.045) 0 25%, transparent 0 50%)",
    backgroundSize: "16px 16px",
  },
};

/** Tint over everything outside the crop. */
export const CROP_DIM = "oklch(0.13 0.012 285 / 0.64)";

/** «Ajuste fino»: the arrow steps the buttons send to `nudge`, per row (move or resize). */
export const ADJUST_ROWS = [
  {
    row: "move",
    resize: false,
    buttons: [
      { key: "ArrowLeft", label: "left", glyph: "←" },
      { key: "ArrowUp", label: "up", glyph: "↑" },
      { key: "ArrowDown", label: "down", glyph: "↓" },
      { key: "ArrowRight", label: "right", glyph: "→" },
    ],
  },
  {
    row: "size",
    resize: true,
    buttons: [
      { key: "ArrowLeft", label: "narrower", glyph: "⇤" },
      { key: "ArrowRight", label: "wider", glyph: "⇥" },
      { key: "ArrowUp", label: "shorter", glyph: "⤒" },
      { key: "ArrowDown", label: "taller", glyph: "⤓" },
    ],
  },
] as const;
