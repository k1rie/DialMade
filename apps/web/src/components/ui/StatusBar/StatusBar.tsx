"use client";

import { AnimatePresence, motion } from "motion/react";
import { Fragment, type ReactNode } from "react";
import { Kbd } from "@/components/ui/Kbd";
import { useI18n } from "@/i18n";
import { cn } from "@/lib/cn";
import { snappy, tween } from "@/lib/motion";

export type StatusBarItem = {
  id: string;
  label: string;
  done: boolean;
};

export type StatusBarNext = {
  label: string;
  onClick?: () => void;
  /** Optional shortcut hint shown as <Kbd>, e.g. "E". */
  shortcut?: string;
};

export type StatusBarProps = {
  items: StatusBarItem[];
  /** «Siguiente: …» — a button when `onClick` is given. */
  next?: StatusBarNext;
  /** Right-aligned slot (e.g. export buttons). */
  actions?: ReactNode;
  className?: string;
  "aria-label"?: string;
};

function Check({ done }: { done: boolean }) {
  return (
    <span
      aria-hidden
      className={cn(
        "relative inline-flex size-4 shrink-0 items-center justify-center rounded-[5px] border transition-[background-color,border-color] duration-150",
        done ? "border-transparent bg-accent-soft text-accent" : "border-app-strong text-transparent",
      )}
    >
      <svg viewBox="0 0 12 12" fill="none" className="size-3">
        <motion.path
          d="M2.5 6.25 5 8.5l4.5-5"
          stroke="currentColor"
          strokeWidth="1.6"
          strokeLinecap="round"
          strokeLinejoin="round"
          initial={false}
          animate={{ pathLength: done ? 1 : 0, opacity: done ? 1 : 0 }}
          transition={{ pathLength: snappy, opacity: tween(0.12) }}
        />
      </svg>
    </span>
  );
}

/** Persistent progress bar: «Logo ✓ · Paleta ✓ · AA ✓ · Siguiente: exportar». */
export function StatusBar({ items, next, actions, className, "aria-label": ariaLabel }: StatusBarProps) {
  const { t } = useI18n();
  const summary = [
    ...items.map((item) => `${item.label}: ${item.done ? t.status.done : t.status.pending}`),
    next ? `${t.status.next}: ${next.label}` : "",
  ]
    .filter(Boolean)
    .join(". ");

  return (
    <div
      className={cn(
        "glass flex min-h-12 items-center gap-3 rounded-panel border border-app px-3 py-2 shadow-surface",
        className,
      )}
    >
      <nav aria-label={ariaLabel ?? t.status.label} className="min-w-0 flex-1">
        <ol className="flex flex-wrap items-center gap-x-2 gap-y-1 text-small">
          {items.map((item, index) => (
            <Fragment key={item.id}>
              {index > 0 && (
                <li aria-hidden className="text-subtle">
                  ·
                </li>
              )}
              <li className={cn("inline-flex items-center gap-1.5", item.done ? "text-fg" : "text-muted")}>
                <Check done={item.done} />
                {item.label}
              </li>
            </Fragment>
          ))}
          <AnimatePresence initial={false} mode="popLayout">
            {next && (
              <motion.li
                key={next.label}
                className="inline-flex items-center gap-2"
                initial={{ opacity: 0, x: 6 }}
                animate={{ opacity: 1, x: 0 }}
                exit={{ opacity: 0, x: -6 }}
                transition={tween(0.2)}
              >
                <span aria-hidden className="text-subtle">
                  ·
                </span>
                {next.onClick ? (
                  <button
                    type="button"
                    onClick={next.onClick}
                    className="group inline-flex items-center gap-1.5 rounded-chip px-1.5 py-0.5 text-fg transition-colors hover:bg-white/[0.06]"
                  >
                    <span className="text-muted">{t.status.next}:</span>
                    <span className="font-medium">{next.label}</span>
                    <svg viewBox="0 0 16 16" fill="none" aria-hidden className="size-3.5 text-accent transition-transform duration-150 group-hover:translate-x-0.5">
                      <path d="M3.5 8h9M9 4.5 12.5 8 9 11.5" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round" />
                    </svg>
                    {next.shortcut && <Kbd>{next.shortcut}</Kbd>}
                  </button>
                ) : (
                  <span className="inline-flex items-center gap-1.5">
                    <span className="text-muted">{t.status.next}:</span>
                    <span className="font-medium text-fg">{next.label}</span>
                  </span>
                )}
              </motion.li>
            )}
          </AnimatePresence>
        </ol>
      </nav>
      {actions !== undefined && <div className="flex shrink-0 items-center gap-2">{actions}</div>}
      <span role="status" aria-live="polite" className="sr-only">
        {summary}
      </span>
    </div>
  );
}
