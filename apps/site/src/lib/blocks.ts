/** Blocks of the Modo Layout library shown on the landing. Labels live in i18n (`landing.blocks`). */
export const blockIds = ["navbar", "hero", "calendar", "cards", "pricing", "testimonials", "footer"] as const;
export type BlockId = (typeof blockIds)[number];

export type BlockSpec = {
  /**
   * Letter shortcut of the landing demo (and the hint in the «Añadir bloque» art). Avoids R, V and H,
   * which are tools in the app's Modo Layout.
   */
  key: string;
  /** Nominal size on a 1440 px page, shown in mono like a canvas node. */
  size: string;
  /** Height of the mini block in the demo page frame, in px. */
  height: { desktop: number; mobile: number };
};

export const blocks: Record<BlockId, BlockSpec> = {
  navbar: { key: "N", size: "1440 × 64", height: { desktop: 30, mobile: 30 } },
  hero: { key: "E", size: "1440 × 560", height: { desktop: 128, mobile: 150 } },
  calendar: { key: "C", size: "720 × 480", height: { desktop: 132, mobile: 150 } },
  cards: { key: "K", size: "1440 × 360", height: { desktop: 104, mobile: 170 } },
  pricing: { key: "P", size: "1440 × 520", height: { desktop: 128, mobile: 168 } },
  testimonials: { key: "T", size: "1440 × 320", height: { desktop: 84, mobile: 120 } },
  footer: { key: "O", size: "1440 × 200", height: { desktop: 56, mobile: 76 } },
};

/** The layout the demo starts with: a booking landing for a fictitious studio. */
export const starterLayout: BlockId[] = ["navbar", "hero", "calendar", "footer"];
