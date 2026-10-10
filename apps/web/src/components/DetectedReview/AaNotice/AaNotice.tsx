"use client";

import type { ContrastCheck, RoleKey } from "@dialmade/palette";
import { AnimatePresence, motion } from "motion/react";
import { useEffect, useId, useMemo, useRef, useState } from "react";
import { Button } from "@/components/ui/Button";
import { useDictionary, useI18n } from "@/i18n";
import { importText } from "@/i18n/import";
import { cn } from "@/lib/cn";
import { tween } from "@/lib/motion";
import { AlertIcon, CheckIcon, ChevronDownIcon } from "../icons";
import { roleLabel } from "../labels";

export type AaNoticeProps = {
  /** Imported pairs that fail (`source: "imported"`, `pass: false`). */
  failures: readonly ContrastCheck[];
  /** How many of them «Ajustar a AA» can fix (it only adjusts the text side). */
  fixable: number;
  onFix: () => void;
  /** «Deshacer el ajuste» after a fix. */
  onUndo?: () => void;
  /** Colors the last «Ajustar a AA» changed. */
  fixed?: number;
};

/** «3 pares no pasan AA en tus colores. No cambiamos tu marca; añadimos variantes accesibles para texto» + «Ajustar a AA». */
export function AaNotice({ failures, fixable, onFix, onUndo, fixed = 0 }: AaNoticeProps) {
  const t = useDictionary(importText).review;
  const { locale } = useI18n();
  const listId = useId();
  const [open, setOpen] = useState(false);
  const boxRef = useRef<HTMLDivElement>(null);
  const fixRef = useRef<HTMLButtonElement>(null);
  const undoRef = useRef<HTMLButtonElement>(null);
  // «Ajustar a AA» and «Deshacer el ajuste» replace each other: focus follows to the one that appears.
  const pendingFocus = useRef<"fix" | "undo" | null>(null);
  useEffect(() => {
    const target = pendingFocus.current;
    if (!target) return;
    pendingFocus.current = null;
    ((target === "undo" ? undoRef.current : fixRef.current) ?? boxRef.current)?.focus();
  }, [onUndo, fixable]);
  const ratio = useMemo(() => new Intl.NumberFormat(locale, { minimumFractionDigits: 2, maximumFractionDigits: 2 }), [locale]);
  const required = useMemo(() => new Intl.NumberFormat(locale, { maximumFractionDigits: 1 }), [locale]);

  if (failures.length === 0 && !onUndo) return null;

  // Only the title is a live region: the buttons and the pairs list are not re-read on every change.
  return (
    <div
      ref={boxRef}
      tabIndex={-1}
      className={cn(
        "flex flex-col gap-2.5 rounded-card border p-3 outline-none",
        failures.length > 0 ? "border-warning/30 bg-warning/[0.06]" : "border-success/30 bg-success/[0.06]",
      )}
    >
      {failures.length > 0 ? (
        <div className="flex items-start gap-2.5">
          <AlertIcon className="mt-0.5 size-4 shrink-0 text-warning" />
          <div className="min-w-0">
            <p role="status" className="text-small font-medium text-fg">
              {t.aa.title(failures.length)}
            </p>
            <p className="text-caption text-pretty text-muted">{t.aa.body}</p>
            {fixable === 0 && <p className="mt-1 text-caption text-muted">{t.aa.noFix}</p>}
          </div>
        </div>
      ) : (
        <p className="flex items-center gap-2 text-small text-fg">
          <CheckIcon aria-hidden className="size-4 shrink-0 text-success" />
          {t.aa.fixed(fixed)}
        </p>
      )}
      <div className="flex flex-wrap items-center gap-1.5">
        {fixable > 0 && (
          <Button
            ref={fixRef}
            size="sm"
            variant="secondary"
            onClick={() => {
              pendingFocus.current = "undo";
              onFix();
            }}
          >
            {t.aa.fix}
          </Button>
        )}
        {onUndo && (
          <Button
            ref={undoRef}
            size="sm"
            variant="ghost"
            onClick={() => {
              pendingFocus.current = "fix";
              onUndo();
            }}
          >
            {t.aa.undo}
          </Button>
        )}
        {failures.length > 0 && (
          <button
            type="button"
            aria-expanded={open}
            aria-controls={listId}
            onClick={() => setOpen((value) => !value)}
            className="ml-auto inline-flex h-8 items-center gap-1 rounded-control px-2 text-small text-muted transition-colors duration-150 hover:bg-white/[0.06] hover:text-fg"
          >
            {open ? t.aa.hide : t.aa.details}
            <ChevronDownIcon className={cn("size-3.5 transition-transform duration-200", open && "rotate-180")} />
          </button>
        )}
      </div>
      <AnimatePresence initial={false}>
        {open && failures.length > 0 && (
          <motion.ul
            key="pairs"
            id={listId}
            initial={{ opacity: 0, y: -4 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0 }}
            transition={tween(0.18)}
            className="flex flex-col gap-1 rounded-control border border-app bg-black/20 p-2"
          >
            {failures.map((check) => {
              const [fg = "", bg = ""] = check.pair.split("/");
              return (
                <li key={`${check.mode}-${check.pair}`} className="grid grid-cols-[auto_minmax(0,1fr)_auto] items-center gap-2 text-caption">
                  <span
                    aria-hidden
                    className="flex h-6 w-8 items-center justify-center rounded-[6px] text-caption font-semibold shadow-[inset_0_0_0_1px_oklch(1_0_0/0.08)]"
                    style={{ backgroundColor: check.bg, color: check.fg }}
                  >
                    Aa
                  </span>
                  <span className="min-w-0 truncate text-fg">
                    {t.aa.pair(roleLabel(fg as RoleKey, t), roleLabel(bg as RoleKey, t))} <span className="text-muted">· {t.aa.mode[check.mode]}</span>
                  </span>
                  <span className="font-mono tabular-nums text-muted">{t.aa.ratio(ratio.format(check.ratio), required.format(check.required))}</span>
                </li>
              );
            })}
          </motion.ul>
        )}
      </AnimatePresence>
    </div>
  );
}
