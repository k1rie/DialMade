import type { CSSProperties } from "react";
import type { BlockId } from "@/lib/blocks";
import type { DemoBrand } from "@/lib/brands";

export type FloatingTile = {
  id: BlockId;
  mode: "wire" | "design";
  brand?: DemoBrand["id"];
  position: CSSProperties;
  width: number;
  rotate: number;
  /** Shows the named «Tú» cursor next to this tile. */
  cursor?: boolean;
};

/** Named rectangles floating around the hero copy (FLORA + Save.design). Only at ≥1280 px. */
export const floatingTiles: FloatingTile[] = [
  { id: "navbar", mode: "wire", position: { left: "3%", top: "13%" }, width: 252, rotate: -3 },
  { id: "calendar", mode: "design", brand: "coral", position: { left: "1.5%", top: "41%" }, width: 238, rotate: 2, cursor: true },
  { id: "cards", mode: "wire", position: { left: "8.5%", top: "73%" }, width: 236, rotate: -1.5 },
  { id: "hero", mode: "design", brand: "bosque", position: { right: "2.5%", top: "10%" }, width: 292, rotate: 2.5 },
  { id: "pricing", mode: "wire", position: { right: "1.5%", top: "45%" }, width: 236, rotate: -2.5 },
  { id: "testimonials", mode: "design", brand: "ambar", position: { right: "8%", top: "75%" }, width: 228, rotate: 1.5 },
];
