/**
 * Static page backdrop (DESIGN-BRIEF §2): 1 px dot grid every 24 px with a radial mask, a white orb
 * top-center and two purple orbs in opposite corners. Nothing animates.
 */
export function SiteBackground() {
  return (
    <div aria-hidden className="pointer-events-none fixed inset-0 -z-10 overflow-hidden bg-app">
      <div
        className="absolute inset-0"
        style={{
          backgroundImage: "radial-gradient(circle at center, oklch(1 0 0 / 0.05) 1px, transparent 1px)",
          backgroundSize: "24px 24px",
          backgroundPosition: "12px 12px",
          maskImage: "radial-gradient(ellipse 80% 70% at 50% 30%, black 30%, transparent 100%)",
          WebkitMaskImage: "radial-gradient(ellipse 80% 70% at 50% 30%, black 30%, transparent 100%)",
        }}
      />
      <div
        className="absolute top-[-16vmax] left-1/2 h-[34vmax] w-[60vmax] -translate-x-1/2 rounded-full"
        style={{ background: "oklch(1 0 0 / 0.09)", filter: "blur(120px)" }}
      />
      <div
        className="absolute bottom-[-24vmax] left-[-20vmax] size-[46vmax] rounded-full"
        style={{ background: "oklch(0.62 0.24 300 / 0.18)", filter: "blur(120px)" }}
      />
      <div
        className="absolute top-[-18vmax] right-[-18vmax] size-[40vmax] rounded-full"
        style={{ background: "oklch(0.62 0.24 300 / 0.16)", filter: "blur(120px)" }}
      />
    </div>
  );
}
