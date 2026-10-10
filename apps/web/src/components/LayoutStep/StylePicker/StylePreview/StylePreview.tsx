import { memo, type CSSProperties } from "react";
// Relative imports only: the preview test renders this module in vitest without the `@/` alias.
import { BlockGlyph, type FrameKind } from "./BlockGlyph";
import { PREVIEW_WIDTH } from "../constants";
import type { FrameNav, PreviewGeometry } from "../previewGeometry";

export type StylePreviewProps = {
  geometry: PreviewGeometry;
  /** `recipe.surface === "glass"`: two blurred blobs behind frosted surfaces. */
  glass?: boolean;
};

const NAV_GLYPH: Record<FrameNav, FrameKind> = { sidebar: "frame-sidebar", rail: "frame-rail", topnav: "frame-topnav" };

/*
 * The root is a size container and defines `--u` = 1 design px in container units: the glyphs draw in
 * design px and the miniature follows the preview's width, without measuring and without scale().
 */
const ROOT = {
  position: "absolute",
  inset: 0,
  display: "block",
  overflow: "hidden",
  containerType: "inline-size",
  background: "var(--background)",
  color: "var(--foreground)",
  "--u": `calc(100cqw / ${PREVIEW_WIDTH})`,
} as CSSProperties;

const BLOB: CSSProperties = {
  position: "absolute",
  display: "block",
  width: "52%",
  aspectRatio: "1",
  borderRadius: "50%",
  opacity: 0.55,
  filter: "blur(calc(var(--u) * 96))",
};
const BLOB_PRIMARY: CSSProperties = { ...BLOB, left: "-6%", top: "-22%", background: "var(--primary)" };
const BLOB_SECOND: CSSProperties = { ...BLOB, right: "-8%", bottom: "-30%", background: "var(--chart-2)" };

/**
 * A screen painted with the theme variables of its parent (StyleOption sets them): the app's frame,
 * then every visible block in painting order. Decorative. One element is shared by the 13 options and
 * memoised by geometry, so picking a style or an unrelated store change does not repaint it.
 */
export const StylePreview = memo(function StylePreview({ geometry, glass = false }: StylePreviewProps) {
  const { nav, header, blocks } = geometry;
  return (
    <span aria-hidden style={ROOT}>
      {glass && (
        <>
          <span style={BLOB_PRIMARY} />
          <span style={BLOB_SECOND} />
        </>
      )}
      {nav && <BlockGlyph kind={NAV_GLYPH[nav.kind]} box={nav.box} widthPx={nav.widthPx} heightPx={nav.heightPx} glass={glass} />}
      {header && <BlockGlyph kind="frame-header" box={header.box} widthPx={header.widthPx} heightPx={header.heightPx} glass={glass} />}
      {blocks.map((block) => (
        <BlockGlyph
          key={block.id}
          kind={block.type}
          box={block.box}
          widthPx={block.widthPx}
          heightPx={block.heightPx}
          count={block.count}
          glass={glass}
        />
      ))}
    </span>
  );
});
