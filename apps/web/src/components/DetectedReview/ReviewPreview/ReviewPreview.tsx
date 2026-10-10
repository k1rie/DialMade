"use client";

import { outputKindOptions, type OutputKind } from "@dialmade/catalog";
import { compileThemeVars, fontsUrlFor, resolveThemeInputs, type DesignDoc } from "@dialmade/doc";
import type { Theme } from "@dialmade/palette";
import { MiniApp, MiniBrand, MiniLanding, contentContextFromDoc } from "@dialmade/sections";
import { AnimatePresence, motion } from "motion/react";
import { useId, useMemo } from "react";
import { ThemeScope } from "@/components/ThemeScope";
import type { PreviewMode } from "@/hooks/usePaletteFlow";
import { useDictionary, useI18n } from "@/i18n";
import { importText } from "@/i18n/import";
import { cn } from "@/lib/cn";
import { snappy, tween } from "@/lib/motion";
import { PREVIEW_HEIGHT, PREVIEW_WIDTH } from "../constants";
import { MoonIcon, SunIcon } from "../icons";
import { FitFrame } from "./FitFrame";

export type ReviewPreviewProps = {
  /** The DesignDoc as it would be with the current choices. */
  doc: DesignDoc;
  /** Its theme (with the imported pins), already generated. */
  theme: Theme | null;
  mode: PreviewMode;
  onModeChange: (mode: PreviewMode) => void;
  kind: OutputKind;
  onKindChange: (kind: OutputKind) => void;
  logoUrl?: string;
  className?: string;
};

const MINIS = { brand: MiniBrand, landing: MiniLanding, app: MiniApp } as const;
const MODES: { id: PreviewMode; Icon: typeof SunIcon }[] = [
  { id: "light", Icon: SunIcon },
  { id: "dark", Icon: MoonIcon },
];

/** Right side of «Esto detectamos» (ref. 2A Klaviyo): the chosen mini painted with the guide as it would be applied. */
export function ReviewPreview({ doc, theme, mode, onModeChange, kind, onKindChange, logoUrl, className }: ReviewPreviewProps) {
  const t = useDictionary(importText).review.preview;
  const { locale } = useI18n();
  const prefix = `review${useId().replace(/[^a-zA-Z0-9_-]/g, "")}`;

  const painted = useMemo(() => {
    try {
      const inputs = resolveThemeInputs(doc, theme ? { theme } : {});
      const href = fontsUrlFor(doc, inputs.pairing);
      return { vars: compileThemeVars(doc, { ...inputs, mode }), pairing: href ? { googleFontsUrl: href } : null };
    } catch {
      return null;
    }
  }, [doc, theme, mode]);
  const ctx = useMemo(() => contentContextFromDoc(doc, { locale, ...(logoUrl && { logoUrl }) }), [doc, locale, logoUrl]);
  const Mini = MINIS[kind];

  return (
    <section aria-labelledby={`${prefix}-title`} className={cn("glass flex min-w-0 flex-col gap-3 rounded-panel border border-app p-3 shadow-surface sm:p-4", className)}>
      <div className="flex flex-wrap items-center justify-between gap-2">
        <h2 id={`${prefix}-title`} className="text-small font-semibold text-fg">
          {t.title}
        </h2>
        <div className="flex flex-wrap items-center gap-2">
          <div role="group" aria-label={t.kinds} className="flex items-center gap-0.5 rounded-control border border-app bg-black/20 p-0.5">
            {outputKindOptions.map((option) => {
              const selected = option.id === kind;
              return (
                <button
                  key={option.id}
                  type="button"
                  aria-pressed={selected}
                  onClick={() => onKindChange(option.id)}
                  className={cn("relative flex h-7 items-center rounded-[8px] px-2.5 text-small transition-colors duration-150", selected ? "text-fg" : "text-muted hover:text-fg")}
                >
                  {selected && (
                    <motion.span layoutId={`${prefix}-kind`} transition={snappy} aria-hidden className="absolute inset-0 rounded-[8px] border border-app-strong bg-white/[0.08]" />
                  )}
                  <span className="relative">{option.label[locale]}</span>
                </button>
              );
            })}
          </div>
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
                  className={cn("relative flex size-7 items-center justify-center rounded-[8px] transition-colors duration-150", selected ? "text-fg" : "text-muted hover:text-fg")}
                >
                  {selected && (
                    <motion.span layoutId={`${prefix}-mode`} transition={snappy} aria-hidden className="absolute inset-0 rounded-[8px] border border-app-strong bg-white/[0.08]" />
                  )}
                  <Icon className="relative size-4" />
                </button>
              );
            })}
          </div>
        </div>
      </div>
      <div className="overflow-hidden rounded-card border border-app">
        {painted ? (
          <ThemeScope vars={painted.vars} pairing={painted.pairing} mode={mode} kind={null} locale={locale} className="relative aspect-[8/5] w-full overflow-hidden">
            <FitFrame width={PREVIEW_WIDTH} height={PREVIEW_HEIGHT}>
              <AnimatePresence initial={false}>
                <motion.div
                  key={kind}
                  className="col-start-1 row-start-1 w-full"
                  initial={{ opacity: 0, y: 4, scale: 0.985 }}
                  animate={{ opacity: 1, y: 0, scale: 1 }}
                  exit={{ opacity: 0, scale: 0.985 }}
                  transition={tween(0.24)}
                >
                  <Mini ctx={ctx} />
                </motion.div>
              </AnimatePresence>
            </FitFrame>
          </ThemeScope>
        ) : (
          <p className="flex aspect-[8/5] items-center justify-center p-6 text-center text-small text-muted">{t.failed}</p>
        )}
      </div>
    </section>
  );
}
