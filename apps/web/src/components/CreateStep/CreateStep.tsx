"use client";

import { OUTPUT_KINDS, outputKindOptions, recommendKind, type FirstUseAnswer, type OutputKind } from "@dialmade/catalog";
import { contentContextFromDoc } from "@dialmade/sections";
import { useCallback, useEffect, useMemo, useState } from "react";
import { useDndAnnounce } from "@/components/dnd/DndAnnouncer";
import { Button } from "@/components/ui/Button";
import { useDesignDoc, useDesignDocActions } from "@/hooks/useDesignDoc";
import { usePaletteFlow } from "@/hooks/usePaletteFlow";
import { useDictionary, useI18n } from "@/i18n";
import { create } from "@/i18n/create";
import { cn } from "@/lib/cn";
import { CanvasSlot } from "./CanvasSlot";
import { kindLabel } from "./constants";
import { DetailsPanel } from "./DetailsPanel";
import { ArrowLeftIcon, ArrowRightIcon } from "./icons";
import { KindCard } from "./KindCard";
import { RecommendQuestion } from "./RecommendQuestion";

export type CreateStepProps = {
  /** Card preselected: the Palette Lab's LivePreview tab (`usePaletteFlow().state.previewKind`). */
  initialKind: OutputKind;
  /** Confirms the choice. PaletteFlow runs `setFocus(kind)` (creates the page if missing) and goes to "compose". */
  onCreate: (kind: OutputKind) => void;
  /** Back to the Palette Lab («Marca»). */
  onBack: () => void;
  className?: string;
};

/**
 * «¿Qué quieres crear?» (ref. 7A Higgsfield): three large cards with their live mini, a canvas slot
 * to drag them onto (or click / Space+arrows+Enter), one deterministic «¿No sabes cuál?» question and
 * optional brand details. The CTA creates the page (`onCreate` → `setFocus`) and the chosen mini grows
 * into the Composer's canvas (shared `layoutId`).
 */
export function CreateStep({ initialKind, onCreate, onBack, className }: CreateStepProps) {
  const c = useDictionary(create);
  const { locale } = useI18n();
  const announce = useDndAnnounce();
  const doc = useDesignDoc((state) => state.doc);
  const logoUrl = useDesignDoc((state) => state.logoUrl);
  const actions = useDesignDocActions();
  const { actions: flowActions } = usePaletteFlow();
  const [kind, setKind] = useState<OutputKind>(initialKind);
  const [answer, setAnswer] = useState<FirstUseAnswer | null>(null);
  const recommended = answer ? recommendKind(answer) : null;

  const hasPages = !!doc && OUTPUT_KINDS.some((k) => doc.pages[k]);
  const docLocale = doc?.brief.locale;
  // Until a page exists there is no stored copy: the content simply follows the app's language.
  useEffect(() => {
    if (docLocale && !hasPages && docLocale !== locale) actions.setContentLocale(locale);
  }, [docLocale, hasPages, locale, actions]);

  const ctx = useMemo(() => (doc ? contentContextFromDoc(doc, logoUrl ? { logoUrl } : {}) : null), [doc, logoUrl]);

  const select = useCallback(
    (next: OutputKind, message?: string) => {
      setKind(next);
      flowActions.setPreviewKind(next);
      if (message) announce(message);
    },
    [flowActions, announce],
  );

  const handleAnswer = useCallback(
    (next: FirstUseAnswer) => {
      setAnswer(next);
      const target = recommendKind(next);
      select(target, c.announce.recommended(kindLabel(target, locale)));
    },
    [select, c, locale],
  );

  if (!doc || !ctx) return null;

  const created = !!doc.pages[kind];
  const label = kindLabel(kind, locale);

  return (
    <div className={cn("mx-auto flex w-full max-w-[1040px] flex-col gap-5", className)}>
      <header className="flex flex-col items-center gap-2 text-center">
        <h1 tabIndex={-1} className="text-h2 text-balance text-fg">
          {c.title}
        </h1>
        <p className="max-w-xl text-body text-pretty text-muted">{c.subtitle}</p>
      </header>

      <CanvasSlot kind={kind} ctx={ctx} created={created} onDropKind={(next) => select(next)} />

      <div role="group" aria-label={c.options} className="grid gap-3 md:grid-cols-3 md:gap-4">
        {outputKindOptions.map((option) => (
          <KindCard
            key={option.id}
            option={option}
            ctx={ctx}
            selected={option.id === kind}
            recommended={option.id === recommended}
            created={!!doc.pages[option.id]}
            onSelect={(next) => select(next, c.announce.selected(kindLabel(next, locale)))}
          />
        ))}
      </div>

      <RecommendQuestion answer={answer} onAnswer={handleAnswer} />

      <DetailsPanel doc={doc} hasPages={hasPages} />

      <div className="sticky bottom-3 z-20 sm:bottom-4">
        <div className="glass mx-auto flex max-w-3xl items-center gap-2 rounded-panel border border-app p-2 shadow-lift sm:gap-3">
          <Button variant="ghost" leadingIcon={<ArrowLeftIcon />} onClick={onBack} aria-label={c.back} className="shrink-0">
            <span className="hidden sm:inline">{c.back}</span>
          </Button>
          <p className="hidden min-w-0 flex-1 text-center text-caption text-muted lg:block">{c.ctaNote}</p>
          <Button
            variant="primary"
            size="lg"
            trailingIcon={<ArrowRightIcon />}
            onClick={() => {
              actions.commitBatch();
              onCreate(kind);
            }}
            className="ms-auto min-w-0 flex-1 sm:min-w-64 sm:flex-none [&>span]:truncate"
          >
            {created ? c.open(label) : c.cta(label)}
          </Button>
        </div>
      </div>
    </div>
  );
}
