"use client";

import { motion } from "motion/react";
import { locales, useI18n } from "@/i18n";
import { cn } from "@/lib/cn";
import { snappy } from "@/lib/motion";

export function LocaleToggle({ className }: { className?: string }) {
  const { locale, setLocale, t } = useI18n();
  return (
    <div role="group" aria-label={t.locale.label} className={cn("isolate inline-flex items-center gap-0.5 rounded-control border border-app bg-white/[0.03] p-0.5", className)}>
      {locales.map((option) => {
        const active = option === locale;
        return (
          <button
            key={option}
            type="button"
            lang={option}
            aria-pressed={active}
            aria-label={t.locale[option]}
            onClick={() => setLocale(option)}
            className={cn(
              "relative h-7 min-w-9 rounded-[8px] px-2 font-mono text-[11px] font-medium tracking-[0.04em] transition-colors duration-150",
              active ? "text-fg" : "text-muted hover:text-fg",
            )}
          >
            {active && (
              <motion.span
                layoutId="locale-toggle-pill"
                aria-hidden
                className="absolute inset-0 z-0 rounded-[8px] border border-app-strong bg-surface-hover shadow-surface"
                transition={snappy}
              />
            )}
            <span className="relative z-10">{t.locale.short[option]}</span>
          </button>
        );
      })}
    </div>
  );
}
