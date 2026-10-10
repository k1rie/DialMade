"use client";

import { defaultRecipe, styleRecipes } from "@dialmade/catalog";
import { useCallback, useEffect, useMemo, useRef, type KeyboardEvent } from "react";
import { useDndAnnounce } from "@/components/dnd/DndAnnouncer";
import { useDictionary, useLocale } from "@/i18n";
import { layout } from "@/i18n/layout";
import { PanelSection } from "../PanelSection";
import type { StyleChoice } from "../types";
import { selectActiveScreen, useLayoutActions, useLayoutEnv, useLayoutStore, useLayoutStoreApi } from "../useLayoutStore";
import { ANNOUNCE_DELAY_MS, GUIDE_STYLE, STYLE_PICKER_ATTR } from "./constants";
import { isSampleLayout } from "./previewGeometry";
import { StyleOption } from "./StyleOption";
import { useDeferredPreviews } from "./useDeferredPreviews";

export type StylePickerProps = {
  className?: string;
};

type Option = { choice: StyleChoice; name: string; label: string; description: string; recommended: boolean };

const ARROWS: Readonly<Record<string, number>> = { ArrowRight: 1, ArrowDown: 1, ArrowLeft: -1, ArrowUp: -1 };

/**
 * «Estilo» of the screen panel: «Tu guía de estilo» (only with an imported guide), then the 12 recipes
 * of the catalog, each previewed with the active screen's blocks (the matching template when it has
 * none) in the user's brand. A radio group: arrows move and pick, Space/Enter pick (not a drag
 * context). Picking calls `setStyle`; LayoutStep reports it with `onStyleChange`.
 *
 * Reads everything from the layout store and env. The previews only repaint when the active layout or
 * frame changes (geometry memoised per layout object, glyphs per block) or when the doc's theme changes
 * (variables cached by value); selection, tool, device and other screens do not touch them.
 *
 * The panel mounts every time the selection is cleared, so the previews render in a deferred pass
 * (`useDeferredPreviews`): the radios, their names and the roving focus are there from the first commit,
 * the painted screens follow in a background render that a new selection cancels.
 */
export function StylePicker({ className }: StylePickerProps) {
  const t = useDictionary(layout);
  const locale = useLocale();
  const announce = useDndAnnounce();
  const { doc, hasImportedGuide } = useLayoutEnv();
  const actions = useLayoutActions();
  const storeApi = useLayoutStoreApi();
  const value = useLayoutStore((state) => state.style);
  const layoutDoc = useLayoutStore((state) => selectActiveScreen(state)?.layout ?? null);
  const kind = useLayoutStore((state) => selectActiveScreen(state)?.kind ?? "landing");
  const shell = useLayoutStore((state) => selectActiveScreen(state)?.shell ?? null);

  /* ---- Previews: one painted element for all options, the variables change per option (deferred) ---- */
  const previews = useDeferredPreviews(layoutDoc, kind, shell, doc);

  /* ---- Options ---- */
  const productType = doc.brief.productType;
  const options = useMemo<Option[]>(() => {
    const recommendedId = defaultRecipe(productType).id;
    const list: Option[] = [];
    if (hasImportedGuide) {
      list.push({ choice: GUIDE_STYLE, name: t.style.guide, label: t.style.option(t.style.guide, false), description: t.style.guideHint, recommended: false });
    }
    for (const recipe of styleRecipes) {
      const name = recipe.label[locale];
      const recommended = recipe.id === recommendedId;
      list.push({ choice: recipe.id, name, label: t.style.option(name, recommended), description: recipe.description[locale], recommended });
    }
    return list;
  }, [hasImportedGuide, locale, productType, t]);

  const checked = options.findIndex((option) => option.choice === value);
  // Roving tabindex: the chosen style, else the first option (a value outside the list checks none).
  const tabbable = checked >= 0 ? checked : 0;

  /* ---- Picking ---- */
  const refs = useRef(new Map<StyleChoice, HTMLButtonElement>());
  const registerRef = useCallback((choice: StyleChoice, element: HTMLButtonElement | null) => {
    if (element) refs.current.set(choice, element);
    else refs.current.delete(choice);
  }, []);

  // Arrowing through the options picks each one; the result is announced once the user stops.
  const announceTimer = useRef<ReturnType<typeof setTimeout> | undefined>(undefined);
  useEffect(() => () => clearTimeout(announceTimer.current), []);

  const select = useCallback(
    (choice: StyleChoice) => {
      if (storeApi.getState().style === choice) return;
      actions.setStyle(choice);
      const name = options.find((option) => option.choice === choice)?.name ?? choice;
      clearTimeout(announceTimer.current);
      announceTimer.current = setTimeout(() => announce(t.style.applied(name)), ANNOUNCE_DELAY_MS);
    },
    [actions, announce, options, storeApi, t],
  );

  const onKeyDown = (event: KeyboardEvent<HTMLDivElement>) => {
    if (event.altKey || event.ctrlKey || event.metaKey || options.length === 0) return;
    const delta = ARROWS[event.key];
    const target = (event.target as HTMLElement).closest<HTMLElement>("[data-choice]");
    const index = target ? options.findIndex((option) => option.choice === target.dataset.choice) : tabbable;
    const current = index >= 0 ? index : tabbable;
    let next: number | undefined;
    if (delta !== undefined) next = (current + delta + options.length) % options.length;
    else if (event.key === "Home") next = 0;
    else if (event.key === "End") next = options.length - 1;
    if (next === undefined) return;
    event.preventDefault();
    const option = options[next];
    if (!option) return;
    select(option.choice);
    refs.current.get(option.choice)?.focus();
  };

  return (
    <PanelSection title={t.style.title} hint={t.style.hint} className={className}>
      {isSampleLayout(layoutDoc) && <p className="-mt-1 text-caption text-muted">{t.style.emptyPreview}</p>}
      <div
        role="radiogroup"
        aria-label={t.style.list}
        {...{ [STYLE_PICKER_ATTR]: "" }}
        onKeyDown={onKeyDown}
        className="grid min-w-0 grid-cols-[repeat(auto-fill,minmax(6.75rem,1fr))] gap-2"
      >
        {options.map((option, index) => (
          <StyleOption
            key={option.choice}
            choice={option.choice}
            name={option.name}
            label={option.label}
            description={option.description}
            recommendedBadge={option.recommended ? t.style.recommended : null}
            previews={previews}
            selected={index === checked}
            tabbable={index === tabbable}
            onSelect={select}
            registerRef={registerRef}
          />
        ))}
      </div>
    </PanelSection>
  );
}
