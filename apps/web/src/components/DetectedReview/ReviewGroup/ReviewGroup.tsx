"use client";

import { AnimatePresence } from "motion/react";
import { useId, useState, type ReactNode } from "react";
import { useDictionary } from "@/i18n";
import { importText } from "@/i18n/import";
import { cn } from "@/lib/cn";
import { VISIBLE_CHIPS } from "../constants";
import { ChevronDownIcon } from "../icons";

export type ReviewGroupProps = {
  title: string;
  /** Right side of the heading (a count). */
  aside?: ReactNode;
  /** Shown when the group has no chips and no `children`. */
  empty?: string;
  /** Chip ids in order (not dismissed). */
  active?: readonly string[];
  dismissed?: readonly string[];
  renderChip?: (id: string, index: number) => ReactNode;
  /** Content above the chips (mode summary, reference cards…). */
  children?: ReactNode;
  /** DOM id of the «Descartados (n)» toggle (focus goes there when the last chip is dismissed). */
  dismissedToggleId?: string;
  className?: string;
};

/** A group of «Esto detectamos» (Colores · Tipografía · Formas · Modo · Referencias): 5 chips, then «Ver N más». */
export function ReviewGroup({ title, aside, empty, active = [], dismissed = [], renderChip, children, dismissedToggleId, className }: ReviewGroupProps) {
  const t = useDictionary(importText).review;
  const headingId = useId();
  const listId = useId();
  const dismissedId = useId();
  const [expanded, setExpanded] = useState(false);
  const [showDismissed, setShowDismissed] = useState(false);
  const shown = expanded ? active : active.slice(0, VISIBLE_CHIPS);
  const hidden = active.length - shown.length;

  return (
    <section aria-labelledby={headingId} className={cn("mt-4 border-t border-white/[0.06] pt-4", className)}>
      <div className="mb-2.5 flex items-baseline justify-between gap-2">
        <h2 id={headingId} className="text-small font-semibold text-fg">
          {title}
        </h2>
        {aside !== undefined && <span className="text-caption text-muted">{aside}</span>}
      </div>
      {children}
      {renderChip && active.length > 0 && (
        <ul id={listId} aria-labelledby={headingId} className="flex flex-col gap-1.5">
          <AnimatePresence>{shown.map((id, index) => renderChip(id, index))}</AnimatePresence>
        </ul>
      )}
      {active.length > VISIBLE_CHIPS && (
        <button
          type="button"
          aria-expanded={expanded}
          aria-controls={listId}
          onClick={() => setExpanded((value) => !value)}
          className="mt-1.5 inline-flex h-8 items-center gap-1 rounded-control px-2 text-small text-muted transition-colors duration-150 hover:bg-white/[0.06] hover:text-fg"
        >
          {expanded ? t.less : t.more(hidden)}
          <ChevronDownIcon className={cn("size-3.5 transition-transform duration-200", expanded && "rotate-180")} />
        </button>
      )}
      {renderChip && dismissed.length > 0 && (
        <div className="mt-1.5">
          <button
            type="button"
            id={dismissedToggleId}
            aria-expanded={showDismissed}
            aria-controls={dismissedId}
            onClick={() => setShowDismissed((value) => !value)}
            className="inline-flex h-8 items-center gap-1 rounded-control px-2 text-small text-muted transition-colors duration-150 hover:bg-white/[0.06] hover:text-fg"
          >
            {t.dismissedList(dismissed.length)}
            <ChevronDownIcon className={cn("size-3.5 transition-transform duration-200", showDismissed && "rotate-180")} />
          </button>
          {showDismissed && (
            <ul id={dismissedId} className="mt-1.5 flex flex-col gap-1.5">
              <AnimatePresence initial={false}>{dismissed.map((id, index) => renderChip(id, index))}</AnimatePresence>
            </ul>
          )}
        </div>
      )}
      {!children && active.length === 0 && dismissed.length === 0 && empty && <p className="text-small text-muted">{empty}</p>}
    </section>
  );
}
