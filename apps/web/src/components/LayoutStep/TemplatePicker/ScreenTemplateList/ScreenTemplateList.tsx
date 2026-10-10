"use client";

import { SCREEN_TEMPLATES, type AppNav, type ScreenKind, type ScreenTemplateId } from "@dialmade/layout";
import { AnimatePresence, motion } from "motion/react";
import { useId, useMemo, useRef, useState, type KeyboardEvent } from "react";
import { useDictionary } from "@/i18n";
import { layout } from "@/i18n/layout";
import { cn } from "@/lib/cn";
import { popVariants } from "@/lib/motion";
import { PlusIcon } from "../../icons";
import { LayoutThumbnail, templatePreview } from "../../LayoutThumbnail";
import { KindBadge } from "../KindBadge";
import { KindQuestion } from "../KindQuestion";

/** Marks the options for ↑/↓ (the KindQuestion answers are not part of that cycle). */
const OPTION_SELECTOR = "[data-template-option]";

export type ScreenTemplateListProps = {
  /** A template was chosen. «En blanco» comes with the kind the user answered. */
  onPick: (templateId: ScreenTemplateId, kind?: ScreenKind) => void;
  /** Navigation shared by the project's app screens: app templates preview it, like `addScreen` creates them. */
  appNav?: AppNav | null;
  exclude?: readonly ScreenTemplateId[];
  /** `list`: rows for the «+ Pantalla» menu (↑/↓ move between them). `grid`: compact cards for the template picker. */
  variant?: "list" | "grid";
  /** Accessible name of the list. */
  label?: string;
  className?: string;
};

/**
 * The screen templates (Inicio, Precios, Login, Dashboard… En blanco) with their thumbnail, name, kind and
 * description. «En blanco» asks «¿Web pública o pantalla de app?» inline before creating the screen.
 * Used by «+ Pantalla» (ScreensPanel) and by the template picker.
 */
export function ScreenTemplateList({ onPick, appNav = null, exclude, variant = "list", label, className }: ScreenTemplateListProps) {
  const t = useDictionary(layout);
  const baseId = useId();
  const listRef = useRef<HTMLUListElement | null>(null);
  const blankRef = useRef<HTMLButtonElement | null>(null);
  const [askKind, setAskKind] = useState(false);
  const templates = useMemo(() => SCREEN_TEMPLATES.filter((template) => !exclude?.includes(template.id)), [exclude]);
  const grid = variant === "grid";
  const questionId = `${baseId}-kind-question`;

  const onKeyDown = (event: KeyboardEvent<HTMLUListElement>) => {
    if (grid || event.altKey || event.ctrlKey || event.metaKey || event.shiftKey) return;
    const options = Array.from(listRef.current?.querySelectorAll<HTMLElement>(OPTION_SELECTOR) ?? []);
    const index = options.indexOf(event.target as HTMLElement);
    if (index < 0) return;
    let next: number | undefined;
    if (event.key === "ArrowDown") next = Math.min(options.length - 1, index + 1);
    else if (event.key === "ArrowUp") next = Math.max(0, index - 1);
    else if (event.key === "Home") next = 0;
    else if (event.key === "End") next = options.length - 1;
    if (next === undefined) return;
    event.preventDefault();
    options[next]?.focus();
  };

  return (
    <ul
      ref={listRef}
      role="list"
      aria-label={label}
      onKeyDown={onKeyDown}
      className={cn(grid ? "grid gap-2 sm:grid-cols-2 lg:grid-cols-3" : "flex flex-col gap-0.5", className)}
    >
      {templates.map((template) => {
        const { id } = template;
        const blank = template.kind === null;
        const preview = templatePreview(id, appNav);
        const text = t.templates[id];
        const nameId = `${baseId}-${id}-name`;
        const kindId = `${baseId}-${id}-kind`;
        const descId = `${baseId}-${id}-desc`;
        const expanded = blank && askKind;
        return (
          <li key={id} className={cn(grid && "flex")}>
            <div className={cn("flex w-full flex-col", grid && expanded && "rounded-card border border-app-strong bg-surface")}>
              <button
                ref={blank ? blankRef : undefined}
                type="button"
                data-template-option=""
                aria-labelledby={nameId}
                aria-describedby={template.kind ? `${kindId} ${descId}` : descId}
                aria-expanded={blank ? askKind : undefined}
                aria-controls={expanded ? questionId : undefined}
                onClick={() => (blank ? setAskKind((open) => !open) : onPick(id))}
                className={cn(
                  "flex w-full items-center gap-3 text-start transition-[background-color,border-color] duration-150",
                  grid
                    ? "h-full rounded-card border border-app bg-surface p-2 shadow-surface hover:border-app-strong hover:bg-surface-hover"
                    : "rounded-[8px] p-1.5 hover:bg-white/[0.06] focus-visible:bg-white/[0.06] aria-expanded:bg-white/[0.06]",
                  grid && expanded && "border-transparent shadow-none",
                )}
              >
                <span
                  className={cn(
                    "relative block shrink-0 overflow-hidden rounded-[6px] border border-app bg-app",
                    grid ? "h-11 w-[4.25rem]" : "h-9 w-14",
                  )}
                >
                  <LayoutThumbnail layout={preview.layout} shell={preview.shell} className="size-full" />
                  {blank && (
                    <span aria-hidden="true" className="absolute inset-0 flex items-center justify-center text-subtle [&_svg]:size-3.5">
                      <PlusIcon />
                    </span>
                  )}
                </span>
                <span className="block min-w-0 flex-1">
                  <span className="flex min-w-0 items-center gap-1.5">
                    <span id={nameId} className="truncate text-small font-medium text-fg">
                      {text.name}
                    </span>
                    {template.kind && <KindBadge id={kindId} kind={template.kind} />}
                  </span>
                  <span id={descId} className="mt-0.5 line-clamp-2 text-caption text-muted">
                    {text.description}
                  </span>
                </span>
              </button>
              <AnimatePresence initial={false}>
                {expanded && (
                  <motion.div key="kind" variants={popVariants} initial="initial" animate="animate" exit="exit">
                    <KindQuestion
                      id={questionId}
                      autoFocus
                      onChoose={(kind) => onPick(id, kind)}
                      onCancel={() => {
                        setAskKind(false);
                        blankRef.current?.focus();
                      }}
                      className={grid ? "p-2 pt-0" : "px-1.5 pt-1 pb-2"}
                    />
                  </motion.div>
                )}
              </AnimatePresence>
            </div>
          </li>
        );
      })}
    </ul>
  );
}
