"use client";

import { motion } from "motion/react";
import { memo, useId, useRef, type KeyboardEvent, type ReactNode } from "react";
import { Kbd } from "@/components/ui/Kbd";
import { Tooltip } from "@/components/ui/Tooltip";
import { useDictionary } from "@/i18n";
import { layout } from "@/i18n/layout";
import { cn } from "@/lib/cn";
import { snappy } from "@/lib/motion";
import { DrawIcon, EditIcon, HandIcon } from "../../icons";
import type { Tool } from "../../types";

/** Order of the bottom bar (ref 11B Replit): Dibujar · Editar · Mano. */
const TOOLS: readonly Tool[] = ["draw", "edit", "hand"];
const TOOL_ICONS: Record<Tool, ReactNode> = { draw: <DrawIcon />, edit: <EditIcon />, hand: <HandIcon /> };

export type ToolPickerProps = {
  value: Tool;
  onChange: (tool: Tool) => void;
  /** Single-key shortcuts on: the tooltips and names mention R / V / H. */
  shortcutsEnabled: boolean;
  className?: string;
};

/**
 * Canvas tool as a radio group (roving tabindex, arrows and Home/End select). Each tool has a tooltip
 * with its shortcut (when single-key shortcuts are on) and a one-line hint. The labels show only when
 * the bar is wide enough (container query on GenerateBar); the radios always carry the name.
 */
export const ToolPicker = memo(function ToolPicker({ value, onChange, shortcutsEnabled, className }: ToolPickerProps) {
  const t = useDictionary(layout);
  const pillId = useId();
  const refs = useRef<(HTMLButtonElement | null)[]>([]);

  const onKeyDown = (event: KeyboardEvent<HTMLDivElement>) => {
    const deltas: Record<string, number> = { ArrowRight: 1, ArrowDown: 1, ArrowLeft: -1, ArrowUp: -1 };
    const delta = deltas[event.key];
    const current = TOOLS.indexOf(value);
    let next: number | undefined;
    if (delta !== undefined) next = (current + delta + TOOLS.length) % TOOLS.length;
    else if (event.key === "Home") next = 0;
    else if (event.key === "End") next = TOOLS.length - 1;
    const tool = next === undefined ? undefined : TOOLS[next];
    if (next === undefined || !tool) return;
    event.preventDefault();
    onChange(tool);
    refs.current[next]?.focus();
  };

  return (
    <div
      role="radiogroup"
      aria-label={t.bottomBar.tools}
      onKeyDown={onKeyDown}
      className={cn("inline-flex shrink-0 items-center gap-0.5 rounded-control border border-app bg-white/[0.03] p-0.5", className)}
    >
      {TOOLS.map((tool, index) => {
        const text = t.tools[tool];
        const checked = tool === value;
        return (
          <Tooltip
            key={tool}
            side="top"
            content={
              <span className="flex flex-col gap-0.5 py-0.5">
                <span className="flex items-center gap-1.5 font-medium">
                  {text.label}
                  {shortcutsEnabled && <Kbd>{text.shortcut}</Kbd>}
                </span>
                <span className="text-muted">{text.hint}</span>
              </span>
            }
          >
            <button
              ref={(element) => {
                refs.current[index] = element;
              }}
              type="button"
              role="radio"
              aria-checked={checked}
              aria-label={shortcutsEnabled ? t.bottomBar.toolLabel(text.label, text.shortcut) : text.label}
              tabIndex={checked ? 0 : -1}
              onClick={() => onChange(tool)}
              className={cn(
                "relative inline-flex h-8 min-w-8 items-center justify-center gap-1.5 rounded-[8px] px-2 text-small font-medium transition-colors duration-150 [&_svg]:size-4",
                checked ? "text-fg" : "text-muted hover:text-fg",
              )}
            >
              {checked && (
                <motion.span
                  layoutId={pillId}
                  aria-hidden
                  className="absolute inset-0 rounded-[8px] border border-app-strong bg-surface-hover shadow-surface"
                  transition={snappy}
                />
              )}
              <span className="relative inline-flex items-center gap-1.5">
                {TOOL_ICONS[tool]}
                <span className="hidden @3xl:inline">{text.label}</span>
              </span>
            </button>
          </Tooltip>
        );
      })}
    </div>
  );
});
