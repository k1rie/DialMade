"use client";

import type { OutputKind, OutputKindOption } from "@dialmade/catalog";
import { motion } from "motion/react";
import { useRef, type KeyboardEvent } from "react";
import { useDictionary, useI18n } from "@/i18n";
import { palette } from "@/i18n/palette";
import { cn } from "@/lib/cn";
import { smooth } from "@/lib/motion";

export type PreviewTabsProps = {
  options: readonly OutputKindOption[];
  value: OutputKind;
  onChange: (kind: OutputKind) => void;
  /** `id` of each tab is `${idPrefix}-tab-${kind}`; the panel is `${idPrefix}-panel`. */
  idPrefix: string;
  className?: string;
};

export const tabId = (prefix: string, kind: OutputKind) => `${prefix}-tab-${kind}`;
export const panelId = (prefix: string) => `${prefix}-panel`;

/** «Guía de estilo · Landing page · Dashboard y componentes»: tabs with roving tabindex (arrows, Home, End). */
export function PreviewTabs({ options, value, onChange, idPrefix, className }: PreviewTabsProps) {
  const t = useDictionary(palette).preview;
  const { locale } = useI18n();
  const refs = useRef(new Map<OutputKind, HTMLButtonElement>());

  const onKeyDown = (event: KeyboardEvent<HTMLDivElement>) => {
    const index = options.findIndex((option) => option.id === value);
    const last = options.length - 1;
    const next =
      event.key === "ArrowRight" ? (index + 1) % options.length
      : event.key === "ArrowLeft" ? (index - 1 + options.length) % options.length
      : event.key === "Home" ? 0
      : event.key === "End" ? last
      : -1;
    const option = options[next];
    if (!option) return;
    event.preventDefault();
    onChange(option.id);
    refs.current.get(option.id)?.focus();
  };

  return (
    <div
      role="tablist"
      aria-label={t.tabs}
      onKeyDown={onKeyDown}
      className={cn("relative flex min-w-0 items-center gap-0.5 rounded-control border border-app bg-black/20 p-0.5", className)}
    >
      {options.map((option) => {
        const selected = option.id === value;
        return (
          <button
            key={option.id}
            ref={(element) => {
              if (element) refs.current.set(option.id, element);
              else refs.current.delete(option.id);
            }}
            type="button"
            role="tab"
            id={tabId(idPrefix, option.id)}
            aria-selected={selected}
            aria-controls={panelId(idPrefix)}
            tabIndex={selected ? 0 : -1}
            onClick={() => onChange(option.id)}
            className={cn(
              "relative h-8 min-w-0 flex-1 rounded-[8px] px-2.5 text-small whitespace-nowrap transition-colors duration-150 sm:flex-none sm:px-3",
              selected ? "text-fg" : "text-muted hover:text-fg",
            )}
          >
            {selected && (
              <motion.span
                layoutId={`${idPrefix}-indicator`}
                transition={smooth}
                aria-hidden
                className="absolute inset-0 rounded-[8px] border border-app-strong bg-white/[0.08] shadow-[inset_0_1px_0_0_oklch(1_0_0/0.06)]"
              />
            )}
            <span className="relative sm:hidden">{t.short[option.id]}</span>
            <span className="relative hidden sm:inline">{option.label[locale]}</span>
          </button>
        );
      })}
    </div>
  );
}
