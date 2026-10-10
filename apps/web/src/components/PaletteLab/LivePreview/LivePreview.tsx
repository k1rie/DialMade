"use client";

import { outputKindOptions, type OutputKind } from "@dialmade/catalog";
import type { Theme } from "@dialmade/palette";
import { motion } from "motion/react";
import dynamic from "next/dynamic";
import { useId, type CSSProperties } from "react";
import type { PreviewMode } from "@/hooks/usePaletteFlow";
import { useDictionary, useI18n } from "@/i18n";
import { palette } from "@/i18n/palette";
import { cn } from "@/lib/cn";
import { snappy } from "@/lib/motion";
import { MoonIcon, SunIcon } from "../icons";
import { loadPreviewStage } from "./loadPreviewStage";
import { PreviewFrame } from "./PreviewFrame";
import { PreviewTabs, panelId, tabId } from "./PreviewTabs";
import { StageSkeleton } from "./StageSkeleton";

export type LivePreviewProps = {
  theme: Theme;
  mode: PreviewMode;
  onModeChange: (mode: PreviewMode) => void;
  /** Selected output kind (the flow's `previewKind`): it marks the recommended starting set in «Layout». */
  kind: OutputKind;
  onKindChange: (kind: OutputKind) => void;
  brandName: string;
  logoUrl?: string;
  className?: string;
};

const PreviewStage = dynamic(loadPreviewStage, { ssr: false, loading: () => <StageSkeleton /> });

const MODES: { id: PreviewMode; Icon: typeof SunIcon }[] = [
  { id: "light", Icon: SunIcon },
  { id: "dark", Icon: MoonIcon },
];

/**
 * Right panel of the Palette Lab (Klaviyo-style live preview): the three things the user can create as
 * tabs, each showing its mini painted with the live theme, a light/dark toggle and a «Para ti si…» line.
 */
export function LivePreview({ theme, mode, onModeChange, kind, onKindChange, brandName, logoUrl, className }: LivePreviewProps) {
  const t = useDictionary(palette).preview;
  const { locale } = useI18n();
  const prefix = `preview${useId().replace(/[^a-zA-Z0-9_-]/g, "")}`;
  const headingId = `${prefix}-title`;
  const option = outputKindOptions.find((item) => item.id === kind) ?? outputKindOptions[0]!;

  return (
    <section aria-labelledby={headingId} className={cn("glass flex min-w-0 flex-col gap-4 rounded-panel border border-app p-3 shadow-surface sm:p-4", className)}>
      <h2 id={headingId} className="sr-only">
        {t.title}
      </h2>
      <div className="flex flex-wrap items-center justify-between gap-2">
        <PreviewTabs options={outputKindOptions} value={kind} onChange={onKindChange} idPrefix={prefix} className="flex-1 sm:flex-none" />
        <div role="group" aria-label={t.mode} className="flex items-center gap-0.5 rounded-control border border-app bg-black/20 p-0.5">
          {MODES.map(({ id, Icon }) => {
            const selected = id === mode;
            return (
              <button
                key={id}
                type="button"
                aria-pressed={selected}
                aria-label={t[id]}
                onClick={() => onModeChange(id)}
                className={cn(
                  "relative flex h-8 items-center gap-1.5 rounded-[8px] px-2.5 text-small transition-colors duration-150",
                  selected ? "text-fg" : "text-muted hover:text-fg",
                )}
              >
                {selected && (
                  <motion.span
                    layoutId={`${prefix}-mode`}
                    transition={snappy}
                    aria-hidden
                    className="absolute inset-0 rounded-[8px] border border-app-strong bg-white/[0.08]"
                  />
                )}
                <Icon className="relative size-4" />
                <span className="relative hidden md:inline">{t[id]}</span>
              </button>
            );
          })}
        </div>
      </div>

      <div
        role="tabpanel"
        id={panelId(prefix)}
        aria-labelledby={tabId(prefix, kind)}
        aria-describedby={`${prefix}-why`}
        className="theme-transition relative overflow-hidden rounded-card border border-app bg-app"
        style={{ "--brand": theme[mode].brand } as CSSProperties}
      >
        <div
          aria-hidden
          className="pointer-events-none absolute inset-0 bg-[radial-gradient(oklch(1_0_0/0.09)_1px,transparent_1px)] [background-size:20px_20px] [mask-image:radial-gradient(80%_75%_at_50%_45%,black,transparent)]"
        />
        <div className="relative px-3 py-6 sm:px-8 sm:py-10 xl:px-12">
          <div aria-hidden className="pointer-events-none absolute inset-x-[14%] top-[22%] bottom-[4%] rounded-full bg-(--brand) opacity-35 blur-[72px]" />
          <PreviewFrame kind={kind} brandName={brandName}>
            <PreviewStage kind={kind} theme={theme} mode={mode} locale={locale} brandName={brandName} logoUrl={logoUrl} />
          </PreviewFrame>
        </div>
      </div>

      <p id={`${prefix}-why`} className="px-1 text-small text-muted">
        <span className="font-medium text-fg">{t.forYouIf}</span> {option.forYouIf[locale]}
      </p>
    </section>
  );
}
