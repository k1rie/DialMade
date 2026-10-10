import type { CSSProperties, ReactNode } from "react";
import { BlockPreview } from "@/components/BlockPreview";
import { NamedCursor } from "@/components/NamedCursor";
import { landing, type Locale } from "@/i18n";
import { blocks, type BlockId } from "@/lib/blocks";
import { demoBrands } from "@/lib/brands";
import { cn } from "@/lib/cn";
import { CodeIcon, FrameIcon, LinkIcon, PagesIcon, WandIcon } from "./icons";

/** The UI fragment inside each «Cómo funciona» card (FLORA's cards carry a piece of product). Decorative: StepCard hides it from AT. */
export function StepArt({ step, locale }: { step: number; locale: Locale }) {
  const t = landing[locale];
  const art = t.how.art;
  const [coral, bosque, ambar] = demoBrands as [(typeof demoBrands)[0], (typeof demoBrands)[0], (typeof demoBrands)[0]];
  switch (step) {
    case 0: {
      const rows: BlockId[] = ["navbar", "hero", "calendar", "cards"];
      return (
        <Frame>
          <div className="w-[236px] rounded-card border border-app-strong bg-app-elevated p-1.5 shadow-lift">
            <p className="px-2 pt-1 pb-1.5 text-caption text-subtle">{art.addBlock}</p>
            <ul className="flex flex-col gap-0.5">
              {rows.map((id) => (
                <li
                  key={id}
                  className={cn("relative flex h-8 items-center gap-2.5 rounded-chip px-2 text-small", id === "calendar" ? "bg-white/[0.07] text-fg" : "text-muted")}
                >
                  <span className="grid size-5 place-items-center rounded-[5px] border border-app">
                    <span className="h-1.5 w-2.5 rounded-[2px] border border-dashed border-white/40" />
                  </span>
                  <span className="flex-1">{t.blocks[id]}</span>
                  <kbd className="font-mono text-[10px] text-subtle">{blocks[id].key}</kbd>
                  {id === "calendar" ? <NamedCursor label={t.demo.cursor} className="absolute top-4 right-9" /> : null}
                </li>
              ))}
            </ul>
            <p className="mt-1.5 flex gap-3 border-t border-app px-2 pt-1.5 pb-0.5 font-mono text-[10px] text-subtle">
              <span>↑↓ {art.navigate}</span>
              <span>↵ {art.select}</span>
            </p>
          </div>
        </Frame>
      );
    }
    case 1: {
      const scale = ["0.93 0.04 32", "0.82 0.1 32", "0.64 0.17 32", "0.5 0.14 30", "0.36 0.09 28"];
      return (
        <Frame>
          <div className="flex items-center gap-5">
            <div className="flex flex-col items-center gap-2">
              <span className="grid size-16 place-items-center rounded-card border border-app-strong bg-white/[0.04]">
                <svg viewBox="0 0 12 12" className="size-8">
                  <circle cx="6" cy="6" r="5" fill="oklch(0.64 0.17 32)" />
                  <circle cx="6" cy="6" r="2.2" fill="var(--app-bg)" />
                </svg>
              </span>
              <span className="font-mono text-[10px] text-subtle">{art.logo}</span>
            </div>
            <svg aria-hidden viewBox="0 0 40 8" className="w-10 text-white/30">
              <path d="M0 4h36m-3-3 3 3-3 3" fill="none" stroke="currentColor" strokeWidth="1.2" />
            </svg>
            <div className="flex flex-col gap-1">
              {scale.map((l, i) => (
                <span key={l} className="flex items-center gap-2">
                  <span className={cn("h-4 w-12 rounded-[4px]", i === 2 && "ring-1 ring-white/70")} style={{ background: `oklch(${l})` }} />
                  <span className="font-mono text-[10px] text-subtle">{["100", "300", "500", "700", "900"][i]}</span>
                </span>
              ))}
            </div>
          </div>
          <div className="absolute bottom-3 left-3 flex gap-1.5">
            <span className="rounded-chip border border-app-strong bg-app-elevated px-2 py-1 text-caption text-muted">{art.importGuide}</span>
            <span className="rounded-chip border border-[oklch(0.75_0.17_155/0.4)] bg-[oklch(0.75_0.17_155/0.1)] px-2 py-1 text-caption text-success">
              {art.contrast} ✓
            </span>
          </div>
        </Frame>
      );
    }
    case 2: {
      const page: BlockId[] = ["navbar", "hero", "cards"];
      return (
        <Frame>
          <div className="flex items-center gap-2">
            <MiniPage>
              {page.map((id) => (
                <div key={id} style={{ height: blocks[id].height.desktop * 0.5 }}>
                  <BlockPreview id={id} mode="wire" label={t.blocks[id]} compact />
                </div>
              ))}
            </MiniPage>
            <span className="inline-flex h-7 items-center rounded-chip bg-accent-cta px-2.5 text-caption font-medium text-white glow-purple">
              {art.generate}
            </span>
            <MiniPage>
              {page.map((id) => (
                <Scaled key={id} height={blocks[id].height.desktop * 0.5}>
                  <BlockPreview id={id} mode="design" label={t.blocks[id]} compact={id === "navbar"} brand={bosque} />
                </Scaled>
              ))}
            </MiniPage>
          </div>
        </Frame>
      );
    }
    case 3: {
      // The app's dials (0–10). Text is edited from the section panel, so the art shows a selected text, not a caret.
      const sliders = [
        { label: art.variance, value: 0.6, text: "6" },
        { label: art.density, value: 0.3, text: "3" },
        { label: art.motion, value: 0.7, text: "7" },
      ];
      return (
        <Frame>
          <div className="flex w-full max-w-[440px] items-center gap-3 px-0 sm:gap-5 sm:px-4">
            <div
              className="relative min-w-0 flex-1 rounded-[10px] border border-[var(--page-line)] p-3 sm:p-4"
              style={{ ...(ambar.vars as CSSProperties), background: "var(--page)", color: "var(--page-ink)" }}
            >
              <span className="relative mt-5 inline-block rounded-[3px] px-1 text-[13px] font-semibold tracking-tight whitespace-nowrap outline outline-1 outline-[var(--app-accent)] sm:text-[15px]">
                {art.editSample}
                <span className="absolute -top-5 left-0 rounded-[4px] bg-accent-cta px-1 font-mono text-[9px] leading-4 whitespace-nowrap text-white">
                  {art.editText}
                </span>
              </span>
              <span className="mt-2 block h-1.5 w-3/4 rounded-full" style={{ background: "var(--page-muted)" }} />
              <span className="mt-3 inline-block h-5 w-16 rounded-[5px]" style={{ background: "var(--brand)" }} />
            </div>
            <div className="flex w-28 shrink-0 flex-col gap-3 sm:w-36">
              {sliders.map((s) => (
                <div key={s.label} className="flex flex-col gap-1.5">
                  <span className="flex justify-between text-caption">
                    <span className="text-muted">{s.label}</span>
                    <span className="font-mono text-subtle">{s.text}</span>
                  </span>
                  <span className="relative h-1 rounded-full bg-white/10">
                    <span className="absolute inset-y-0 left-0 rounded-full bg-white/60" style={{ width: `${s.value * 100}%` }} />
                    <span className="absolute top-1/2 size-3 -translate-x-1/2 -translate-y-1/2 rounded-full bg-white shadow-surface" style={{ left: `${s.value * 100}%` }} />
                  </span>
                </div>
              ))}
            </div>
          </div>
        </Frame>
      );
    }
    default: {
      const targets: { label: string; icon: ReactNode }[] = [
        { label: "Figma", icon: <FrameIcon /> },
        { label: "Claude Design", icon: <WandIcon /> },
        { label: "Framer", icon: <PagesIcon /> },
        { label: art.code, icon: <CodeIcon /> },
        { label: art.link, icon: <LinkIcon /> },
      ];
      return (
        <Frame>
          <ul className="grid grid-cols-3 gap-2 sm:grid-cols-5">
            {targets.map((target, i) => (
              <li
                key={target.label}
                className={cn(
                  "flex w-[92px] flex-col items-center gap-2 rounded-card border bg-app-elevated px-2 py-3 text-center text-caption",
                  i === 0 ? "border-[oklch(0.68_0.2_296/0.5)] text-fg glow-purple" : "border-app text-muted",
                )}
              >
                <span className={i === 0 ? "text-accent" : "text-subtle"}>{target.icon}</span>
                {target.label}
              </li>
            ))}
          </ul>
          <span
            aria-hidden
            className="absolute right-4 bottom-3 flex items-center gap-1.5 font-mono text-[10px] text-subtle"
            style={coral.vars as CSSProperties}
          >
            <span className="size-2 rounded-full" style={{ background: "var(--brand)" }} />
            tokens.css · DESIGN.md
          </span>
        </Frame>
      );
    }
  }
}

function Frame({ children }: { children: ReactNode }) {
  return <div className="relative grid h-full place-items-center p-4">{children}</div>;
}

/** 96 px wide at every breakpoint: two pages, the gaps and «Generar» fit the narrowest card (≈288 px). */
function MiniPage({ children }: { children: ReactNode }) {
  return <div className="flex w-[96px] shrink-0 flex-col gap-1 rounded-[9px] border border-app bg-app/70 p-1">{children}</div>;
}

const DESIGN_SCALE = 0.45;

/** Paints a generated block at 1/0.45 of its slot and scales it down, so its full design fits instead of being clipped. */
function Scaled({ height, children }: { height: number; children: ReactNode }) {
  return (
    <div className="relative overflow-hidden" style={{ height }}>
      <div
        className="absolute top-0 left-0 origin-top-left"
        style={{ width: `${100 / DESIGN_SCALE}%`, height: height / DESIGN_SCALE, transform: `scale(${DESIGN_SCALE})` }}
      >
        {children}
      </div>
    </div>
  );
}
