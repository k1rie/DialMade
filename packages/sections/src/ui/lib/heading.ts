import { z } from "zod";

/**
 * Heading level of a ui.* section's title: `h2` by default; the build (`buildPageFromLayout`) gives `h1` to the
 * first visible section that takes one when the screen has no hero, page header or text block (a Login or a
 * form-only screen still gets its h1), and turns an earlier `h1` back into `h2`. The look stays the same.
 */
export const SECTION_LEVELS = ["h1", "h2"] as const;
export type SectionLevel = (typeof SECTION_LEVELS)[number];

export const sectionLevelSchema = z.enum(SECTION_LEVELS).optional();
