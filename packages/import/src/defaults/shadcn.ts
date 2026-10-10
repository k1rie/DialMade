import type { RoleKey } from "@dialmade/palette";
import type { Mode } from "../types";

// shadcn/ui (MIT, see NOTICE) base themes for Tailwind v4. Every base color (neutral, zinc, slate,
// stone, gray) uses the same steps of its Tailwind gray; destructive, borders in dark mode and the
// charts are fixed. Steps refer to `--color-<base>-<step>` in Tailwind's default theme.

export const SHADCN_BASE_COLORS = ["neutral", "zinc", "slate", "stone", "gray"] as const;
export type ShadcnBaseColor = (typeof SHADCN_BASE_COLORS)[number];

type Ref = number | "white" | `${string}-${number}` | `white/${number}`;

const LIGHT: Partial<Record<RoleKey, Ref>> = {
  background: "white",
  foreground: 950,
  card: "white",
  cardForeground: 950,
  popover: "white",
  popoverForeground: 950,
  primary: 900,
  primaryForeground: 50,
  secondary: 100,
  secondaryForeground: 900,
  muted: 100,
  mutedForeground: 500,
  accent: 100,
  accentForeground: 900,
  destructive: "red-600",
  border: 200,
  input: 200,
  ring: 400,
  chart1: "orange-600",
  chart2: "teal-600",
  chart3: "cyan-900",
  chart4: "amber-400",
  chart5: "amber-500",
};

const DARK: Partial<Record<RoleKey, Ref>> = {
  background: 950,
  foreground: 50,
  card: 900,
  cardForeground: 50,
  popover: 900,
  popoverForeground: 50,
  primary: 200,
  primaryForeground: 900,
  secondary: 800,
  secondaryForeground: 50,
  muted: 800,
  mutedForeground: 400,
  accent: 800,
  accentForeground: 50,
  destructive: "red-400",
  border: "white/10",
  input: "white/15",
  ring: 500,
  chart1: "blue-700",
  chart2: "emerald-500",
  chart3: "amber-500",
  chart4: "purple-500",
  chart5: "rose-500",
};

export const SHADCN_BASE: Readonly<Record<Mode, Partial<Record<RoleKey, Ref>>>> = { light: LIGHT, dark: DARK };

/** The CSS values shadcn's base themes use for a role (one per base color, deduplicated), as Tailwind var references or literals. */
export function shadcnBaseRefs(mode: Mode, role: RoleKey): string[] {
  const ref = SHADCN_BASE[mode][role];
  if (ref === undefined) return [];
  if (ref === "white") return ["#ffffff"];
  if (typeof ref === "number") return SHADCN_BASE_COLORS.map((base) => `--color-${base}-${ref}`);
  if (ref.startsWith("white/")) return [`rgb(255 255 255 / ${Number(ref.slice(6)) / 100})`];
  return [`--color-${ref}`];
}
