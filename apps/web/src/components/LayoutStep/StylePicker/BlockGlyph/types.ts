import type { LibraryBlockType } from "@dialmade/layout";

/** Parts of an app screen's frame, painted like blocks. */
export type FrameKind = "frame-sidebar" | "frame-rail" | "frame-topnav" | "frame-header";

/** What a glyph paints: a library block type or a part of the app frame. */
export type GlyphKind = LibraryBlockType | FrameKind;
