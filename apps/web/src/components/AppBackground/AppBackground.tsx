import type { CSSProperties } from "react";
import { cn } from "@/lib/cn";

export type AppBackgroundProps = {
  /** Brand color (any CSS color, ideally `oklch(...)`). The tinted orb eases to it over 1.5 s, only when it changes. */
  tint?: string;
  className?: string;
};

/**
 * Static page backdrop (DESIGN-BRIEF §2): 1 px dot grid every 24 px with a radial mask, a white orb
 * top-center and purple orbs in opposite corners. Nothing loops; only `tint` changes animate.
 */
export function AppBackground({ tint, className }: AppBackgroundProps) {
  const style = tint ? ({ "--app-tint": tint } as CSSProperties) : undefined;
  return (
    <div
      aria-hidden
      data-tinted={tint ? "" : undefined}
      style={style}
      className={cn(
        "pointer-events-none fixed inset-0 -z-10 overflow-hidden bg-app",
        "app-tint-transition",
        className,
      )}
    >
      <div
        className="absolute inset-0"
        style={{
          backgroundImage: "radial-gradient(circle at center, oklch(1 0 0 / 0.05) 1px, transparent 1px)",
          backgroundSize: "24px 24px",
          backgroundPosition: "12px 12px",
          maskImage: "radial-gradient(ellipse 75% 65% at 50% 35%, black 25%, transparent 100%)",
          WebkitMaskImage: "radial-gradient(ellipse 75% 65% at 50% 35%, black 25%, transparent 100%)",
        }}
      />
      <div
        className="absolute top-[-14vmax] left-1/2 h-[32vmax] w-[56vmax] -translate-x-1/2 rounded-full"
        style={{ background: "oklch(1 0 0 / 0.09)", filter: "blur(120px)" }}
      />
      <div
        className="absolute bottom-[-22vmax] left-[-18vmax] size-[44vmax] rounded-full"
        style={{ background: "oklch(0.62 0.24 300 / 0.2)", filter: "blur(120px)" }}
      />
      <div
        className="absolute top-[-20vmax] right-[-16vmax] size-[40vmax] rounded-full"
        style={{ background: "color-mix(in oklch, var(--app-tint) 20%, transparent)", filter: "blur(120px)" }}
      />
    </div>
  );
}
