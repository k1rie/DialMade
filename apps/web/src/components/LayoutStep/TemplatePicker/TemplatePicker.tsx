"use client";

import { SET_TEMPLATES, type ScreenKind, type ScreenTemplateId, type SetTemplateId } from "@dialmade/layout";
import { useCallback, useEffect, useRef } from "react";
import { useDndAnnounce } from "@/components/dnd/DndAnnouncer";
import { useDictionary } from "@/i18n";
import { layout } from "@/i18n/layout";
import { cn } from "@/lib/cn";
import { ScreenTemplateList } from "../ScreenTemplateList";
import { useLayoutActions, useLayoutEnv, useLayoutStoreApi } from "../useLayoutStore";
import { BlankCard } from "./BlankCard";
import { recommendedSet } from "./recommend";
import { SetCard } from "./SetCard";

/** «En blanco» has its own card here; the single-screen list shows the rest. */
const SINGLE_EXCLUDE: readonly ScreenTemplateId[] = ["blank"];

export type TemplatePickerProps = {
  className?: string;
};

/**
 * Empty state of the Layout step (no screens yet): «¿Qué vas a diseñar?» with the starting sets «SaaS app»
 * (Dashboard + Ajustes + Login) and «Landing» (Inicio + Precios), «En blanco» (asks web or app), and the
 * single screen templates. The set matching the brief's focus is «Recomendada». Every choice is a button
 * (click, Enter, Space) and one undo step; afterwards focus moves to the canvas (screens on a phone).
 */
export function TemplatePicker({ className }: TemplatePickerProps) {
  const t = useDictionary(layout);
  const announce = useDndAnnounce({ politeness: "polite" });
  const actions = useLayoutActions();
  const store = useLayoutStoreApi();
  const { doc, narrow, focusRegion } = useLayoutEnv();
  const headingRef = useRef<HTMLHeadingElement | null>(null);
  const recommended = recommendedSet(doc.brief.focus);

  // Shown again after undoing the first template: the control that had focus is gone, so take it here.
  useEffect(() => {
    const active = document.activeElement;
    if (!active || active === document.body) headingRef.current?.focus({ preventScroll: true });
  }, []);

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

  return (
    <div className={cn("mx-auto flex w-full max-w-[1040px] flex-col gap-8 px-1 py-6 sm:py-10", className)}>
      <header className="flex flex-col items-center gap-2 text-center">
        <h2 ref={headingRef} tabIndex={-1} className="text-h2 text-balance text-fg outline-none">
          {t.templatePicker.title}
        </h2>
        <p className="max-w-xl text-body text-pretty text-muted">{t.templatePicker.subtitle}</p>
      </header>

      <div role="group" aria-label={t.templatePicker.startWith} className="grid gap-3 md:grid-cols-3 md:gap-4">
        {SET_TEMPLATES.map((set) => (
          <SetCard key={set.id} setId={set.id} recommended={set.id === recommended} onChoose={applySet} />
        ))}
        <BlankCard onChoose={(kind) => addScreen("blank", kind)} />
      </div>

      <div className="flex flex-col gap-3">
        <h3 className="text-caption font-semibold tracking-[0.01em] text-fg">
          {t.templatePicker.screens}
        </h3>
        <ScreenTemplateList variant="grid" exclude={SINGLE_EXCLUDE} label={t.templatePicker.screens} onPick={addScreen} />
      </div>
    </div>
  );
}
