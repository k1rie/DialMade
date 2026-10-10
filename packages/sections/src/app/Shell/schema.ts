import { z } from "zod";
import { SHELL_DENSITIES, SHELL_TONES, iconSchema } from "../content";

export const SHELL_VARIANTS = ["sidebar", "inset", "rail", "topnav"] as const;
export type ShellVariant = (typeof SHELL_VARIANTS)[number];

export const shellNavItemSchema = z.strictObject({
  id: z.string().min(1),
  label: z.string(),
  icon: iconSchema,
  count: z.number().int().nonnegative().optional(),
});

export type ShellNavItem = z.infer<typeof shellNavItemSchema>;

export const shellSchema = z.strictObject({
  brandName: z.string(),
  workspace: z.string(),
  title: z.string(),
  subtitle: z.string(),
  primaryAction: z.string(),
  searchPlaceholder: z.string(),
  nav: z.array(shellNavItemSchema).min(1).max(10),
  activeId: z.string(),
  user: z.strictObject({ name: z.string().min(1), role: z.string() }),
  tone: z.enum(SHELL_TONES),
  density: z.enum(SHELL_DENSITIES),
  showSearch: z.boolean(),
});

export type ShellProps = z.infer<typeof shellSchema>;

/** Nav items that live at the bottom of the sidebar instead of the main list. */
export const FOOTER_NAV_IDS: ReadonlySet<string> = new Set(["settings"]);
