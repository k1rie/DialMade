import type { Theme } from "@dialmade/palette";
import { cn } from "@/lib/cn";

export type StyleStripProps = {
  /** Theme generated with this style; undefined renders a neutral placeholder. */
  theme?: Theme;
  className?: string;
};

/** What a palette style does to the brand, in six blocks: tints, the primary, a deep shade, the accent and its default background. */
export function stripColors(theme: Theme): string[] {
  const roles = theme[theme.defaultMode];
  const brand = theme.scales.brand;
  const accent = theme.scales.accent ? roles.cta : theme.scales.neutral[4]!.hex;
  return [brand[1]!.hex, brand[3]!.hex, roles.primary, brand[7]!.hex, accent, roles.background];
}

export function StyleStrip({ theme, className }: StyleStripProps) {
  const colors = theme ? stripColors(theme) : Array.from({ length: 6 }, () => "oklch(1 0 0 / 0.06)");
  return (
    <span aria-hidden className={cn("flex overflow-hidden rounded-[7px] shadow-[inset_0_0_0_1px_oklch(1_0_0/0.08)]", className)}>
      {colors.map((color, index) => (
        <span key={index} className="h-full flex-1 transition-[background-color] duration-300 ease-out" style={{ backgroundColor: color }} />
      ))}
    </span>
  );
}
