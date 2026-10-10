"use client";

import { motion } from "motion/react";
import { swatchLayoutId } from "@/lib/layout-ids";
import { ease } from "@/lib/motion";
import { PIECE, PIECE_DURATION, PIECE_GAP, PIECE_STAGGER } from "../constants";
import type { Box } from "../geometry";

/** Overlap between neighbouring fragments (logo px) so no anti-aliased seam shows before they part. */
const SEAM = 0.5;

export type BurstPieceProps = {
  index: number;
  count: number;
  hex: string;
  /** Tile of the logo box this piece starts as. */
  tile: Box;
  box: Box;
  /** Full image placement inside the logo box (crop offset included). */
  image: Box;
  src: string;
  /** Backdrop behind the logo, so the fragments start out looking like the card they replace. */
  backdrop: string;
  reduce: boolean;
};

/**
 * One fragment of the logo: it starts over its tile showing exactly that part of the image, flies
 * to its slot in the swatch row and turns into the solid color. Carries `swatchLayoutId(index)` so the
 * Palette Lab grid picks it up.
 */
export function BurstPiece({ index, count, hex, tile, box, image, src, backdrop, reduce }: BurstPieceProps) {
  const rowX = (index - (count - 1) / 2) * (PIECE + PIECE_GAP);
  const centerX = tile.x + tile.w / 2;
  const centerY = tile.y + tile.h / 2;
  // The piece is a PIECE-sized square scaled up to cover its tile; the fragment inside is exactly the tile.
  const startScale = Math.max(tile.w, tile.h) / PIECE;
  const k = 1 / startScale;
  const delay = index * PIECE_STAGGER;
  const spin = (index % 2 === 0 ? 1 : -1) * (6 + (index % 3) * 3);

  return (
    <motion.div
      layoutId={swatchLayoutId(index)}
      className="absolute top-1/2 left-1/2 rounded-[10px]"
      style={{ width: PIECE, height: PIECE, marginLeft: rowX - PIECE / 2, marginTop: -PIECE / 2 }}
      initial={reduce ? { opacity: 0 } : { x: centerX - box.w / 2 - rowX, y: centerY - box.h / 2, scale: startScale, rotate: 0 }}
      animate={reduce ? { opacity: 1 } : { x: 0, y: 0, scale: 1, rotate: [0, spin, 0] }}
      transition={reduce ? { duration: 0.15 } : { duration: PIECE_DURATION, ease, delay }}
    >
      <span
        aria-hidden
        className="absolute bg-no-repeat"
        style={{
          left: (PIECE - (tile.w + 2 * SEAM) * k) / 2,
          top: (PIECE - (tile.h + 2 * SEAM) * k) / 2,
          width: (tile.w + 2 * SEAM) * k,
          height: (tile.h + 2 * SEAM) * k,
          backgroundColor: backdrop,
          backgroundImage: `url("${src}")`,
          backgroundSize: `${image.w * k}px ${image.h * k}px`,
          backgroundPosition: `${(image.x - tile.x + SEAM) * k}px ${(image.y - tile.y + SEAM) * k}px`,
        }}
      />
      <motion.span
        aria-hidden
        className="absolute inset-0 rounded-[inherit] shadow-[inset_0_0_0_1px_oklch(1_0_0/0.12),0_8px_24px_-8px_oklch(0_0_0/0.6)]"
        style={{ backgroundColor: hex }}
        initial={{ opacity: reduce ? 1 : 0 }}
        animate={{ opacity: 1 }}
        transition={{ duration: 0.22, ease, delay: delay + 0.06 }}
      />
    </motion.div>
  );
}
