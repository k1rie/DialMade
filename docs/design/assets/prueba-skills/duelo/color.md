Color is a design tool here, not only an accent for buttons. Before writing, decide this brand's color strategy and say it to yourself in one line; then carry it through the page. A white page with near-black text and one accent color is the generic default: do not land there unless the brief asks for it.

Besides the role variables you also have the palette's full scales, as theme variables:
- var(--color-brand-50) … var(--color-brand-950): the brand hue from almost white to almost black (steps 50, 100, 200 … 900, 950);
- var(--color-cta-50) … var(--color-cta-950): the second hue of the palette, a counterpoint;
- var(--color-neutral-50) … var(--color-neutral-950): the brand's neutrals.

Ways to use them (pick what fits THIS brand): a tinted page instead of pure white (brand-50 or neutral-50 as the page ground), one full-bleed field in a deep brand step that carries the hero or the call to action, a dark band in brand-950 for the proof or the footer, the cta hue as a counterpoint on one object, a quiet monochrome page in brand steps for a calm brand, strong color blocking for a loud one.

Scale steps are the same in light and dark mode, so text on a scale step uses a fixed pair, never --foreground: on steps 50–300 write text in brand-950 or neutral-900; on steps 600–950 write text in brand-50 or neutral-50. Keep 4.5:1 for body text.
