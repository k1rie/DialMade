// Glyphs of the two ways to start («Descríbelo», «Dibújalo tú»). Decorative: the card's heading names the path.
import type { SVGProps } from "react";

type GlyphProps = SVGProps<SVGSVGElement>;

/** A few lines of text and a spark: describe it and get proposals. */
export const DescribeGlyph = (props: GlyphProps) => (
  <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={1.5} strokeLinecap="round" aria-hidden focusable="false" {...props}>
    <path d="M4 6h10M4 10h13M4 14h8M4 18h6" />
    <path d="M18.5 13.5 19.4 16l2.1.6-2.1.7-.9 2.4-.8-2.4-2.2-.7 2.2-.6z" fill="currentColor" stroke="none" />
  </svg>
);

/** An empty canvas with a couple of blocks placed by hand. */
export const CanvasGlyph = (props: GlyphProps) => (
  <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={1.5} strokeLinejoin="round" aria-hidden focusable="false" {...props}>
    <rect x="3" y="3.5" width="18" height="17" rx="2.5" strokeDasharray="2.2 2" />
    <rect x="6" y="6.5" width="12" height="3.5" rx="1" fill="currentColor" fillOpacity={0.25} />
    <rect x="6" y="12" width="5" height="5.5" rx="1" fill="currentColor" fillOpacity={0.25} />
    <rect x="13" y="12" width="5" height="5.5" rx="1" />
  </svg>
);
