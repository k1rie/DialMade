"use client";

import { motion } from "motion/react";
import { useRef, type KeyboardEvent, type ReactNode } from "react";
import { cn } from "@/lib/cn";
import { snappy } from "@/lib/motion";

export type ReportTab<T extends string> = { id: T; label: ReactNode };

export type ReportTabsProps<T extends string> = {
  /** Accessible name of the tablist. */
  label: string;
  tabs: readonly ReportTab<T>[];
  value: T;
  onChange: (id: T) => void;
  /** Unique per instance: tab ids are `${idBase}-tab-${id}`, the panel is `${idBase}-panel`. */
  idBase: string;
  /** Receives the selected tab element (initial focus of the dialog). */
  selectedRef?: (element: HTMLButtonElement | null) => void;
  className?: string;
};

export const tabId = (idBase: string, id: string) => `${idBase}-tab-${id}`;
export const panelId = (idBase: string) => `${idBase}-panel`;

/**
 * APG tabs with automatic activation: roving tabindex, ←/→ (and Home/End) move and select. The active
 * underline slides between tabs (snappy spring, under 200 ms). Same look as the Layout left tabs.
 */
export function ReportTabs<T extends string>({ label, tabs, value, onChange, idBase, selectedRef, className }: ReportTabsProps<T>) {
  const refs = useRef<(HTMLButtonElement | null)[]>([]);

  const onKeyDown = (event: KeyboardEvent<HTMLDivElement>) => {
    const current = tabs.findIndex((tab) => tab.id === value);
    let next: number | undefined;
    if (event.key === "ArrowRight" || event.key === "ArrowLeft") {
      next = (current + (event.key === "ArrowRight" ? 1 : -1) + tabs.length) % tabs.length;
    } else if (event.key === "Home") next = 0;
    else if (event.key === "End") next = tabs.length - 1;
    const tab = next === undefined ? undefined : tabs[next];
    if (next === undefined || !tab) return;
    event.preventDefault();
    onChange(tab.id);
    refs.current[next]?.focus();
  };

  return (
    <div
      role="tablist"
      aria-label={label}
      onKeyDown={onKeyDown}
      className={cn("flex shrink-0 gap-1 overflow-x-auto border-b border-app scrollbar-none", className)}
    >
      {tabs.map((tab, index) => {
        const selected = tab.id === value;
        return (
          <button
            key={tab.id}
            ref={(element) => {
              refs.current[index] = element;
              if (selected) selectedRef?.(element);
            }}
            type="button"
            role="tab"
            id={tabId(idBase, tab.id)}
            aria-selected={selected}
            aria-controls={selected ? panelId(idBase) : undefined}
            tabIndex={selected ? 0 : -1}
            onClick={() => onChange(tab.id)}
            className={cn(
              "relative inline-flex h-9 shrink-0 items-center gap-1.5 rounded-t-[8px] px-2.5 text-small font-medium whitespace-nowrap transition-colors",
              selected ? "text-fg" : "text-muted hover:text-fg",
            )}
          >
            {tab.label}
            {selected && (
              <motion.span
                layoutId={`${idBase}-indicator`}
                aria-hidden
                className="absolute inset-x-2 -bottom-px h-0.5 rounded-full bg-accent"
                transition={snappy}
              />
            )}
          </button>
        );
      })}
    </div>
  );
}
