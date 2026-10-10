"use client";

import { TEXT_CONTRAST, cssVarName, type ColorMode, type RoleKey, type Theme } from "@dialmade/palette";
import { AnimatePresence, motion } from "motion/react";
import { useId, useMemo, useState } from "react";
import { useDictionary, useI18n } from "@/i18n";
import { palette } from "@/i18n/palette";
import { cn } from "@/lib/cn";
import { tween } from "@/lib/motion";
import { AlertIcon, CheckIcon, ChevronDownIcon, MoonIcon, SunIcon } from "../icons";

export type ContrastTableProps = {
  theme: Theme;
  /** Mode listed by default (the preview's); the pills switch it. */
  mode: ColorMode;
};

const MODES: ColorMode[] = ["light", "dark"];
const roleName = (key: string) => cssVarName(key as RoleKey);

/** Compact WCAG AA report: pass count per mode and, on demand, every checked pair with its ratio. */
export function ContrastTable({ theme, mode }: ContrastTableProps) {
  const t = useDictionary(palette).contrast;
  const { locale } = useI18n();
  const listId = useId();
  const [open, setOpen] = useState(false);
  const [picked, setPicked] = useState<ColorMode | null>(null);
  const shown = picked ?? mode;

  const byMode = useMemo(
    () => Object.fromEntries(MODES.map((m) => [m, theme.contrast.filter((check) => check.mode === m)])) as Record<ColorMode, Theme["contrast"]>,
    [theme],
  );
  const ratio = useMemo(() => new Intl.NumberFormat(locale, { minimumFractionDigits: 2, maximumFractionDigits: 2 }), [locale]);
  const required = useMemo(() => new Intl.NumberFormat(locale, { maximumFractionDigits: 1 }), [locale]);

  return (
    <div className="flex flex-col gap-2">
      <div className="flex flex-wrap items-center gap-1.5">
        {MODES.map((m) => {
          const checks = byMode[m];
          const passed = checks.filter((check) => check.pass).length;
          const ok = passed === checks.length;
          const selected = open && shown === m;
          return (
            <button
              key={m}
              type="button"
              aria-pressed={selected}
              aria-controls={open ? listId : undefined}
              onClick={() => {
                setPicked(m);
                setOpen(!(open && shown === m));
              }}
              className={cn(
                "inline-flex h-7 items-center gap-1.5 rounded-chip border px-2 text-small transition-[background-color,border-color] duration-150",
                selected ? "glow-purple border-transparent bg-accent-soft text-fg" : "border-app bg-white/[0.03] text-muted hover:border-app-strong hover:text-fg",
              )}
            >
              {m === "light" ? <SunIcon className="size-3.5" /> : <MoonIcon className="size-3.5" />}
              <span>{t.modes[m]}</span>
              <span className="font-mono text-caption tabular-nums text-fg">{t.summary(passed, checks.length)}</span>
              {ok ? <CheckIcon className="size-3.5 text-success" /> : <AlertIcon className="size-3.5 text-danger" />}
            </button>
          );
        })}
        <button
          type="button"
          aria-expanded={open}
          aria-controls={open ? listId : undefined}
          onClick={() => setOpen((value) => !value)}
          className="ml-auto inline-flex h-7 items-center gap-1 rounded-chip px-2 text-small text-muted transition-colors duration-150 hover:bg-white/[0.06] hover:text-fg"
        >
          {open ? t.hide : t.show}
          <ChevronDownIcon className={cn("size-3.5 transition-transform duration-200", open && "rotate-180")} />
        </button>
      </div>
      <AnimatePresence initial={false}>
        {open && (
          <motion.div
            key="pairs"
            id={listId}
            initial={{ opacity: 0, y: -4 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: -4 }}
            transition={tween(0.2)}
            className="rounded-card border border-app bg-black/20"
          >
            <ul aria-label={`${t.title} · ${t.modes[shown]}`} className="max-h-64 overflow-y-auto px-2 py-1.5">
              {byMode[shown].map((check) => {
                const [fg = "", bg = ""] = check.pair.split("/");
                const isText = check.required >= TEXT_CONTRAST;
                return (
                  <li key={check.pair} className="grid grid-cols-[auto_minmax(0,1fr)_auto_auto] items-center gap-2 py-1">
                    <span
                      aria-hidden
                      className="flex h-6 w-8 items-center justify-center rounded-[6px] text-caption font-semibold shadow-[inset_0_0_0_1px_oklch(1_0_0/0.08)]"
                      style={{ backgroundColor: check.bg, color: check.fg }}
                    >
                      {isText ? "Aa" : <span className="size-3 rounded-[3px] border-2" style={{ borderColor: check.fg }} />}
                    </span>
                    <span className="min-w-0">
                      <span aria-hidden className="block truncate font-mono text-caption text-muted" title={`${roleName(fg)} / ${roleName(bg)}`}>
                        {roleName(fg)} <span className="text-subtle">/</span> {roleName(bg)}
                      </span>
                      <span className="sr-only">
                        {t.pair(roleName(fg), roleName(bg))}. {isText ? t.text : t.ui}.
                      </span>
                    </span>
                    <span className="font-mono text-caption tabular-nums text-fg">
                      <span aria-hidden>{ratio.format(check.ratio)}</span>
                      <span className="sr-only">{t.ratio(ratio.format(check.ratio), required.format(check.required))}</span>
                    </span>
                    <span
                      className={cn(
                        "inline-flex h-5 items-center gap-1 rounded-[6px] px-1.5 text-[11px] leading-none font-semibold",
                        check.pass ? "bg-success/15 text-success" : "bg-danger/15 text-danger",
                      )}
                    >
                      {check.pass ? t.pass : t.fail}
                    </span>
                  </li>
                );
              })}
            </ul>
            <p className="border-t border-app px-3 py-2 text-caption text-muted">{t.note}</p>
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
}
