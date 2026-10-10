"use client";

import type { OutputKind } from "@dialmade/catalog";
import type { DesignDoc } from "@dialmade/doc";
import { AnimatePresence, motion } from "motion/react";
import { useId, useRef, useState, type KeyboardEvent } from "react";
import { toast } from "sonner";
import { PanelSection } from "@/components/ui/PanelSection";
import { useDesignDocActions, useDesignHistory } from "@/hooks/useDesignDoc";
import type { PreviewMode } from "@/hooks/usePaletteFlow";
import { useDictionary, useI18n } from "@/i18n";
import { composer } from "@/i18n/composer";
import { cn } from "@/lib/cn";
import { snappy, tween } from "@/lib/motion";
import { LanguagesIcon } from "../icons";
import { BrandFields } from "./BrandFields";
import { DialsControl } from "./DialsControl";
import { DirectionControl } from "./DirectionControl";
import { ProductChips } from "./ProductChips";
import { SectionList } from "./SectionList";

type Tab = "design" | "sections";
const TABS: readonly Tab[] = ["design", "sections"];

export type BriefPanelProps = {
  doc: DesignDoc;
  kind: OutputKind | null;
  pageLabel: string;
  mode: PreviewMode;
  selectedId: string | null;
  onSelect: (id: string) => void;
  className?: string;
};

/** Left column (Replit-style controls): brief, dials and direction cards, plus the section list. */
export function BriefPanel({ doc, kind, pageLabel, mode, selectedId, onSelect, className }: BriefPanelProps) {
  const { locale } = useI18n();
  const t = useDictionary(composer);
  const actions = useDesignDocActions();
  const history = useDesignHistory();
  const baseId = useId();
  const [tab, setTab] = useState<Tab>("design");
  const tabRefs = useRef<(HTMLButtonElement | null)[]>([]);

  const onTabKeyDown = (event: KeyboardEvent<HTMLDivElement>) => {
    if (event.key !== "ArrowLeft" && event.key !== "ArrowRight") return;
    event.preventDefault();
    const next = (TABS.indexOf(tab) + (event.key === "ArrowRight" ? 1 : -1) + TABS.length) % TABS.length;
    setTab(TABS[next]!);
    tabRefs.current[next]?.focus();
  };

  const translate = () => {
    const result = actions.setContentLocale(locale, { rebuildPages: true });
    if (result.ok) toast(t.brief.translated, { action: { label: t.undoAction, onClick: () => history.undo() } });
  };

  const labels: Record<Tab, string> = { design: t.tabs.design, sections: t.tabs.sections };

  return (
    <aside aria-label={t.tabs.label} className={cn("flex min-h-0 flex-col overflow-hidden rounded-panel border border-app bg-app-elevated/90 shadow-surface", className)}>
      <div role="tablist" aria-label={t.tabs.label} onKeyDown={onTabKeyDown} className="flex shrink-0 gap-1 border-b border-app px-3 pt-2">
        {TABS.map((id, index) => {
          const selected = id === tab;
          return (
            <button
              key={id}
              ref={(element) => {
                tabRefs.current[index] = element;
              }}
              type="button"
              role="tab"
              id={`${baseId}-tab-${id}`}
              aria-selected={selected}
              aria-controls={selected ? `${baseId}-panel-${id}` : undefined}
              tabIndex={selected ? 0 : -1}
              onClick={() => setTab(id)}
              className={cn(
                "relative h-9 rounded-t-[8px] px-2.5 text-small font-medium transition-colors",
                selected ? "text-fg" : "text-muted hover:text-fg",
              )}
            >
              {labels[id]}
              {selected && <motion.span layoutId={`${baseId}-tab`} aria-hidden className="absolute inset-x-2 -bottom-px h-0.5 rounded-full bg-accent" transition={snappy} />}
            </button>
          );
        })}
      </div>
      <AnimatePresence mode="wait" initial={false}>
        <motion.div
          key={tab}
          role="tabpanel"
          id={`${baseId}-panel-${tab}`}
          aria-labelledby={`${baseId}-tab-${tab}`}
          className="flex min-h-0 flex-1 flex-col gap-6 overflow-y-auto overscroll-contain p-4"
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          exit={{ opacity: 0 }}
          transition={tween(0.14)}
        >
          {tab === "design" ? (
            <>
              <PanelSection title={t.brief.title}>
                <BrandFields name={doc.brand.name} tagline={doc.brand.tagline} />
                <div className="flex flex-col gap-2">
                  <p className="text-caption text-muted">
                    <span className="font-medium text-fg">{t.brief.product}</span> · {t.brief.productHint}
                  </p>
                  <ProductChips productType={doc.brief.productType} locale={locale} />
                </div>
                {doc.brief.locale !== locale && (
                  <p className="flex flex-wrap items-center gap-x-2 gap-y-1 rounded-control border border-app bg-white/[0.02] px-2.5 py-2 text-caption text-muted">
                    <LanguagesIcon className="size-3.5 shrink-0 text-subtle" />
                    <span>{t.brief.contentLocale(t.brief.languages[doc.brief.locale])}</span>
                    <button
                      type="button"
                      onClick={translate}
                      className="rounded-[6px] font-medium text-fg underline decoration-white/25 underline-offset-2 hover:decoration-white/60"
                    >
                      {t.brief.translate(t.brief.languages[locale])}
                    </button>
                  </p>
                )}
              </PanelSection>
              <DialsControl doc={doc} kind={kind} pageLabel={pageLabel} />
              <DirectionControl doc={doc} mode={mode} />
            </>
          ) : kind ? (
            <SectionList doc={doc} kind={kind} selectedId={selectedId} onSelect={onSelect} />
          ) : null}
        </motion.div>
      </AnimatePresence>
    </aside>
  );
}
