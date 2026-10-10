import { memo, type CSSProperties } from "react";
// Relative imports only: the glyph test renders this module in vitest without the `@/` alias.
import type { PreviewBox } from "../previewGeometry";
import { glyphContent, isCollection } from "./glyphs";
import { BAND, CARD, FRAME_SIDE, FRAME_TOP, FROSTED, GLASS_CARD, GROUP, MEDIA, ROOT } from "./kit";
import type { GlyphKind } from "./types";

/*
 * One block of a style preview, painted with the theme variables of its preview root: the recipe's card
 * (background, border, radius ×0.45, shadow), buttons, inputs and accents (--primary, --chart-1..5,
 * --muted). Lengths are design px through `--u` (1 design px in container units, set by StylePreview), so
 * the preview is a true miniature without CSS scale(). Decorative: the radio carries the accessible name.
 */

export type { FrameKind, GlyphKind } from "./types";

export type BlockGlyphProps = {
  kind: GlyphKind;
  /** Position in percentages of the preview. */
  box: PreviewBox;
  /** Size in design px (decides how many rows, bars or items fit). */
  widthPx: number;
  heightPx: number;
  /** ×N of repeatable blocks. */
  count?: number;
  /** `recipe.surface === "glass"`: frosted, translucent surfaces over the blurred blobs. */
  glass?: boolean;
};

/** Surface of each kind: a card, the page background (collections), a group panel, media or the frame. */
function skin(kind: GlyphKind, glass: boolean): CSSProperties {
  switch (kind) {
    case "frame-sidebar":
    case "frame-rail":
      return glass ? { ...FRAME_SIDE, ...FROSTED } : FRAME_SIDE;
    case "frame-topnav":
      return glass ? { ...FRAME_TOP, ...FROSTED } : FRAME_TOP;
    case "frame-header":
      return BAND;
    case "container":
      return GROUP;
    case "media":
    case "video":
    case "map":
      return MEDIA;
    case "modal":
      return { ...(glass ? GLASS_CARD : CARD), boxShadow: "var(--dl-shadow-lg, none)" };
    default:
      return isCollection(kind) ? BAND : glass ? GLASS_CARD : CARD;
  }
}

/** One block (or frame part) of a style preview, absolutely positioned in percentages of the preview. */
export const BlockGlyph = memo(function BlockGlyph({ kind, box, widthPx, heightPx, count, glass = false }: BlockGlyphProps) {
  return (
    <span
      data-glyph={kind}
      style={{
        ...ROOT,
        ...skin(kind, glass),
        left: `${box.left}%`,
        top: `${box.top}%`,
        width: `${box.width}%`,
        height: `${box.height}%`,
      }}
    >
      {glyphContent(kind, { widthPx, heightPx, count, glass })}
    </span>
  );
});
