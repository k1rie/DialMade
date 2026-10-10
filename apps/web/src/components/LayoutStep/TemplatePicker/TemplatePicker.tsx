"use client";

import { recommendKind, type FirstUseAnswer } from "@dialmade/catalog";
import { SET_TEMPLATES, type ScreenKind, type ScreenTemplateId, type SetTemplateId } from "@dialmade/layout";
import { contentContextFromDoc } from "@dialmade/sections";
import { motion, useReducedMotion } from "motion/react";
import { useCallback, useEffect, useMemo, useId, useRef, useState, type KeyboardEvent } from "react";
import { useStore } from "zustand";
import { useDndAnnounce } from "@/components/dnd/DndAnnouncer";
import { Button } from "@/components/ui/Button";
import { createDesignDocStore, useOptionalDesignDocStore } from "@/hooks/useDesignDoc";
import { useDictionary } from "@/i18n";
import { layout } from "@/i18n/layout";
import { cn } from "@/lib/cn";
import { tween } from "@/lib/motion";
import { DescribeScreens } from "../DescribeScreens";
import { ArrowLeftIcon } from "../icons";
import { ScreenTemplateList } from "../ScreenTemplateList";
import { useLayoutActions, useLayoutEnv, useLayoutStoreApi } from "../useLayoutStore";
import { BlankCard } from "./BlankCard";
import { KindCard } from "./KindCard";
import { RecommendQuestion } from "./RecommendQuestion";
import { recommendedSet } from "./recommend";

/** «En blanco» has its own card here; the single-screen list shows the rest. */
const SINGLE_EXCLUDE: readonly ScreenTemplateId[] = ["blank"];

/** Outside the flow (the dev playground) there is no DesignDoc store: no logo, no details. */
const detachedStore = createDesignDocStore();

export type TemplatePickerProps = {
  className?: string;
};

/** Which screen of the empty state shows. */
type StartView = "describe" | "templates";

/**
 * Empty state of the Layout step (no screens yet), one focused screen at a time:
 * - first «¿Qué vas a construir?» (DescribeScreens: the description, «Detalles», then «Elige una»), with «o usa una
 *   plantilla» and «empieza vacío» under it;
 * - «o usa una plantilla» opens the starting sets as large cards with their live branded mini («SaaS app» =
 *   Dashboard + Ajustes + Login, «Landing» = Inicio + Precios), «En blanco», «¿No sabes cuál?» (one deterministic
 *   question) and the single screen templates. The set matching the Palette Lab tab (or the answer) is
 *   «Recomendada». «Volver» or Esc goes back to «Describe» (its text stays).
 * Every choice is a button (click, Enter, Space) and one undo step; afterwards focus moves to the canvas
 * (screens on a phone). Each screen change moves focus to its heading.
 */
export function TemplatePicker({ className }: TemplatePickerProps) {
  const t = useDictionary(layout);
  const baseId = useId();
  const announce = useDndAnnounce({ politeness: "polite" });
  const actions = useLayoutActions();
  const store = useLayoutStoreApi();
  const { doc, preferredKind, narrow, focusRegion } = useLayoutEnv();
  const designStore = useOptionalDesignDocStore();
  const logoUrl = useStore(designStore ?? detachedStore, (state) => state.logoUrl);
  const headingRef = useRef<HTMLHeadingElement | null>(null);
  const reduce = useReducedMotion();
  const describeRef = useRef<HTMLDivElement | null>(null);
  const [view, setView] = useState<StartView>("describe");
  const [moved, setMoved] = useState(false);
  const [answer, setAnswer] = useState<FirstUseAnswer | null>(null);
  const answered = answer ? recommendedSet(recommendKind(answer)) : null;
  const recommended = answer ? answered : recommendedSet(preferredKind);
  const result = answer === null ? null : answered ? t.templatePicker.recommendResult(t.sets[answered].name) : t.templatePicker.guideAlways;

  const ctx = useMemo(() => contentContextFromDoc(doc, logoUrl ? { logoUrl } : {}), [doc, logoUrl]);

  // The templates replaced «Describe»: their heading takes focus.
  useEffect(() => {
    if (view === "templates") headingRef.current?.focus({ preventScroll: true });
  }, [view]);
  const show = (next: StartView) => {
    setView(next);
    setMoved(true);
    // «Describe» stayed mounted: once it shows again, its heading takes focus.
    if (next === "describe") requestAnimationFrame(() => describeRef.current?.querySelector<HTMLElement>("h2[tabindex]")?.focus({ preventScroll: true }));
  };
  const onTemplatesKeyDown = (event: KeyboardEvent<HTMLDivElement>) => {
    if (event.key !== "Escape" || event.defaultPrevented) return;
    event.preventDefault();
    show("describe");
  };

  const created = useCallback(
    (message: string) => {
      announce(message);
      // After the commit the editor replaces this picker; move focus where the work starts.
      requestAnimationFrame(() => focusRegion(narrow ? "screens" : "canvas"));
    },
    [announce, focusRegion, narrow],
  );

  const applySet = useCallback(
    (setId: SetTemplateId) => {
      const ids = actions.applySet(setId);
      if (ids.length === 0) return;
      const { screens } = store.getState();
      const names = ids.flatMap((screenId) => (screens[screenId] ? [screens[screenId].name] : []));
      created(t.templatePicker.applied(t.sets[setId].name, names));
    },
    [actions, store, created, t],
  );

  const addScreen = useCallback(
    (templateId: ScreenTemplateId, kind?: ScreenKind) => {
      const screenId = actions.addScreen(templateId, kind);
      const screen = screenId ? store.getState().screens[screenId] : undefined;
      if (screen) created(t.announce.screenAdded(screen.name));
    },
    [actions, store, created, t],
  );

  const answerQuestion = useCallback(
    (next: FirstUseAnswer) => {
      setAnswer(next);
      const set = recommendedSet(recommendKind(next));
      announce(set ? t.templatePicker.recommendResult(t.sets[set].name) : t.templatePicker.guideAlways);
    },
    [announce, t],
  );

  return (
    <div className={cn("mx-auto flex w-full max-w-[1040px] flex-col px-1 py-6 sm:py-10", className)}>
      {/* «Describe» stays mounted while the templates show, so its text survives «Volver». */}
      <motion.div ref={describeRef} hidden={view !== "describe"} initial={false} animate={{ opacity: view === "describe" ? 1 : 0 }} transition={tween(0.2)}>
        <DescribeScreens
          mode="start"
          focusHeading={moved}
          onTemplates={() => show("templates")}
          onBlank={(kind) => addScreen("blank", kind)}
        />
      </motion.div>

      {view === "templates" && (
        <motion.div
          key="templates"
          role="group"
          aria-labelledby={`${baseId}-templates`}
          onKeyDown={onTemplatesKeyDown}
          initial={{ opacity: 0, x: reduce ? 0 : 16 }}
          animate={{ opacity: 1, x: 0 }}
          transition={tween(0.2)}
          className="flex flex-col gap-8"
        >
          <header className="flex flex-col gap-3">
            <Button variant="ghost" size="sm" leadingIcon={<ArrowLeftIcon />} onClick={() => show("describe")} className="self-start">
              {t.common.back}
            </Button>
            <div className="flex flex-col items-center gap-2 text-center">
              <h2 ref={headingRef} id={`${baseId}-templates`} tabIndex={-1} className="m-0 text-h2 text-balance text-fg outline-none">
                {t.templatePicker.templatesTitle}
              </h2>
              <p className="m-0 max-w-xl text-body text-pretty text-muted">{t.templatePicker.subtitle}</p>
              <p id={`${baseId}-sketch`} className="m-0 max-w-xl text-small text-pretty text-muted">
                {t.templatePicker.sketchNote}
              </p>
            </div>
          </header>

          <div className="flex flex-col gap-4">
            <div role="group" aria-label={t.templatePicker.startWith} aria-describedby={`${baseId}-sketch`} className="grid gap-3 md:grid-cols-3 md:gap-4">
              {SET_TEMPLATES.map((set) => (
                <KindCard key={set.id} setId={set.id} doc={doc} ctx={ctx} recommended={set.id === recommended} onChoose={applySet} />
              ))}
              <BlankCard onChoose={(kind) => addScreen("blank", kind)} />
            </div>
            <RecommendQuestion answer={answer} onAnswer={answerQuestion} result={result} />
          </div>

          <div className="flex flex-col gap-3">
            <h3 className="text-caption font-semibold tracking-[0.01em] text-fg">{t.templatePicker.screens}</h3>
            <ScreenTemplateList variant="grid" exclude={SINGLE_EXCLUDE} label={t.templatePicker.screens} onPick={addScreen} />
          </div>
        </motion.div>
      )}
    </div>
  );
}
