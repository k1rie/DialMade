export const GALLERY_SECTIONS = [
  "buttons",
  "forms",
  "selection",
  "badges",
  "avatars",
  "navigation",
  "cards",
  "stats",
  "table",
  "charts",
  "overlays",
  "feedback",
] as const;

export type GallerySectionId = (typeof GALLERY_SECTIONS)[number];
