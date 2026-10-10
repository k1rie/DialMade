"use client";

import { OUTPUT_KINDS, type OutputKind } from "@dialmade/catalog";
import { hasScreens, renderTargets, type DesignDoc, type PageKey } from "@dialmade/doc";
import { motion } from "motion/react";
import { useRef, useState, type KeyboardEvent } from "react";
import { toast } from "sonner";
import { Popover } from "@/components/ui/Popover";
import { useDesignDocActions, useDesignHistory } from "@/hooks/useDesignDoc";
import { useDictionary } from "@/i18n";
import { composer } from "@/i18n/composer";
import { cn } from "@/lib/cn";
import { snappy } from "@/lib/motion";
import { CloseIcon, PlusIcon } from "../../icons";
import type { PageTarget } from "../../pageOps";

export type PageTabsProps = {
  doc: DesignDoc;
  /** Key of the page shown: a page kind or a screen id. */
  active: PageKey;
  labelOf: (target: Pick<PageTarget, "kind" | "screen">) => string;
  /** id of the canvas region the tabs control. */
  controls: string;
};

/**
 * The doc's pages as tabs. A document with screens (Modo Layout): its screens in order, then «Guía de estilo»;
 * screens are added and removed in «Layout» («Editar layout»). A legacy document: its kinds, plus «+ Añadir»
 * (the other kinds, born with the shared tokens) and «Quitar».
 */
export function PageTabs({ doc, active, labelOf, controls }: PageTabsProps) {
  const t = useDictionary(composer);
  const actions = useDesignDocActions();
  const history = useDesignHistory();
  const [menuOpen, setMenuOpen] = useState(false);
  const refs = useRef<Partial<Record<PageKey, HTMLButtonElement | null>>>({});
  const screens = hasScreens(doc);
  const tabs: Pick<PageTarget, "key" | "kind" | "screen">[] = screens
    ? renderTargets(doc)
    : OUTPUT_KINDS.filter((kind) => doc.pages[kind]).map((kind) => ({ key: kind, kind }));
  const keys = tabs.map((tab) => tab.key);
  const missing = screens ? [] : OUTPUT_KINDS.filter((kind) => !doc.pages[kind]);
  const activeKind = tabs.find((tab) => tab.key === active)?.kind;

  const onKeyDown = (event: KeyboardEvent<HTMLDivElement>) => {
    if (event.key !== "ArrowLeft" && event.key !== "ArrowRight") return;
    event.preventDefault();
    const at = keys.indexOf(active);
    const next = keys[(at + (event.key === "ArrowRight" ? 1 : -1) + keys.length) % keys.length];
    if (!next) return;
    actions.setActiveKey(next);
    refs.current[next]?.focus();
  };

  const add = (kind: OutputKind) => {
    setMenuOpen(false);
    actions.addPage(kind);
  };
  const remove = (kind: OutputKind) => {
    setMenuOpen(false);
    if (actions.removePage(kind).ok) {
      toast(t.canvas.removed(labelOf({ kind })), { action: { label: t.undoAction, onClick: () => history.undo() } });
    }
  };

  return (
    <div className="flex min-w-0 flex-1 items-center gap-1">
      <div role="tablist" aria-label={t.canvas.pages} onKeyDown={onKeyDown} className="flex min-w-0 items-center gap-0.5 overflow-x-auto scrollbar-none">
        {tabs.map((tab) => {
          const selected = tab.key === active;
          return (
            <button
              key={tab.key}
              ref={(element) => {
                refs.current[tab.key] = element;
              }}
              type="button"
              role="tab"
              aria-selected={selected}
              aria-controls={controls}
              tabIndex={selected ? 0 : -1}
              onClick={() => actions.setActiveKey(tab.key)}
              className={cn(
                "relative h-8 shrink-0 rounded-control px-3 text-small font-medium whitespace-nowrap transition-colors",
                selected ? "text-fg" : "text-muted hover:text-fg",
              )}
            >
              {selected && (
                <motion.span
                  layoutId="composer-page-tab"
                  aria-hidden
                  className="absolute inset-0 rounded-control border border-app-strong bg-surface-hover shadow-surface"
                  transition={snappy}
                />
              )}
              <span className="relative">{labelOf(tab)}</span>
            </button>
          );
        })}
      </div>
      {/* Screens are added and removed in «Layout». */}
      {!screens && (
        <Popover
          open={menuOpen}
          onOpenChange={setMenuOpen}
          label={t.canvas.addPage}
          className="w-60 p-1.5"
          trigger={(props) => (
            <button
              {...props}
              type="button"
              title={t.canvas.addPage}
              className="inline-flex h-8 min-w-8 shrink-0 items-center justify-center gap-1.5 rounded-control border border-dashed border-app-strong px-2 text-small font-medium text-muted transition-colors hover:border-accent/60 hover:text-fg [&_svg]:size-3.5"
            >
              <PlusIcon />
              <span className={cn(tabs.length > 1 ? "sr-only" : "max-sm:sr-only")}>{t.canvas.addPage}</span>
            </button>
          )}
        >
          <div className="flex flex-col">
            {missing.map((kind) => (
              <button
                key={kind}
                type="button"
                onClick={() => add(kind)}
                className="flex h-9 items-center gap-2 rounded-[8px] px-2.5 text-start text-small text-fg hover:bg-white/[0.06] focus-visible:bg-white/[0.06] [&_svg]:size-3.5"
              >
                <PlusIcon className="text-accent" />
                {t.canvas.add(labelOf({ kind }))}
              </button>
            ))}
            {tabs.length > 1 && activeKind && (
              <>
                {missing.length > 0 && <span aria-hidden className="my-1 h-px bg-white/[0.08]" />}
                <button
                  type="button"
                  onClick={() => remove(activeKind)}
                  className="flex h-9 items-center gap-2 rounded-[8px] px-2.5 text-start text-small text-muted hover:bg-white/[0.06] hover:text-fg focus-visible:bg-white/[0.06] [&_svg]:size-3.5"
                >
                  <CloseIcon />
                  {t.canvas.remove(labelOf({ kind: activeKind }))}
                </button>
              </>
            )}
          </div>
        </Popover>
      )}
    </div>
  );
}
