import type { CSSProperties, ReactNode } from "react";
import { demoBrands } from "@/lib/brands";

const coral = demoBrands[0]!;

/** Rotated notes scattered over the dot grid around the heading (Save.design). Decorative, ≥1280 px only. */
export function FloatingNotes() {
  return (
    <div aria-hidden className="pointer-events-none absolute inset-0 hidden xl:block">
      <Note style={{ left: "2%", top: "4%", rotate: "-4deg" }}>
        <p className="mb-2 font-mono text-[10px] text-subtle">tokens.css</p>
        <pre className="font-mono text-[10px] leading-4 text-muted">
          <span className="text-[oklch(0.82_0.1_296)]">--primary</span>: oklch(0.64 0.17 32);{"\n"}
          <span className="text-[oklch(0.82_0.1_296)]">--radius</span>: 12px;{"\n"}
          <span className="text-[oklch(0.82_0.1_296)]">--font-sans</span>: Inter;
        </pre>
      </Note>
      <Note style={{ left: "7%", top: "58%", rotate: "3deg" }}>
        <p className="mb-2 font-mono text-[10px] text-subtle">{coral.name}</p>
        <span className="flex gap-1">
          {["0.93 0.04 32", "0.82 0.1 32", "0.64 0.17 32", "0.5 0.14 30", "0.36 0.09 28"].map((l) => (
            <span key={l} className="h-7 w-6 rounded-[5px]" style={{ background: `oklch(${l})` }} />
          ))}
        </span>
      </Note>
      <Note style={{ right: "3%", top: "6%", rotate: "4deg" }}>
        <p className="text-[34px] leading-none font-semibold tracking-[-0.03em] text-fg">Aa</p>
        <p className="mt-2 font-mono text-[10px] text-subtle">Inter · 600 · −0.03em</p>
      </Note>
      <Note style={{ right: "8%", top: "60%", rotate: "-3deg" }}>
        <span className="flex items-center gap-2">
          <span className="grid h-7 w-10 place-items-center rounded-[5px] text-[11px] font-semibold" style={{ background: "oklch(0.56 0.17 32)", color: "oklch(0.99 0.01 32)" }}>
            Aa
          </span>
          {/* Measured: oklch(0.99 0.01 32) on oklch(0.56 0.17 32) is 4.86:1. */}
          <span className="font-mono text-[10px] text-success">AA · 4.9:1</span>
        </span>
      </Note>
    </div>
  );
}

function Note({ children, style }: { children: ReactNode; style: CSSProperties }) {
  return (
    <div className="absolute rounded-card border border-app bg-app-elevated/80 p-3 shadow-surface" style={style}>
      {children}
    </div>
  );
}
