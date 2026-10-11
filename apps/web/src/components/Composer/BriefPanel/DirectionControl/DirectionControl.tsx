"use client";

import { getStyleRecipe, getTypographyPairing, styleRecipes, typographyPairings } from "@dialmade/catalog";
import { isLocked, type DesignDoc } from "@dialmade/doc";
import { AnimatePresence, motion } from "motion/react";
import { useCallback, useMemo, useState } from "react";
import { DropSlot, type DropSlotState } from "@/components/dnd/DropSlot";
import { IconButton } from "@/components/ui/IconButton";
import { PanelSection } from "@/components/ui/PanelSection";
import { Segmented } from "@/components/ui/Segmented";
import type { PreviewMode } from "@/hooks/usePaletteFlow";
import { useDictionary, useI18n } from "@/i18n";
import { composer } from "@/i18n/composer";
import { cn } from "@/lib/cn";
import type { DroppedItem } from "@/lib/dnd";
import { tween } from "@/lib/motion";
import { DND, STYLE_SLOT_ACCEPT, TYPE_SLOT_ACCEPT } from "../../constants";
import { LockIcon, UnlockIcon } from "../../icons";
import { PairingCard } from "../../PairingCard";
import { recipeChoice, sampleVars } from "../../previewVars";
import { StyleSample } from "../../StyleSample";
import { useComposerActions } from "../../useComposerActions";
import { RecipeCard } from "./RecipeCard";

type Deck = "styles" | "type";

export type DirectionControlProps = {
  doc: DesignDoc;
  mode: PreviewMode;
};

const slotFrame = (state: DropSlotState) =>
  cn(
    "relative flex h-full w-full flex-col gap-2 rounded-card border p-2.5 text-start transition-[border-color,background-color] duration-150",
    "",
    state === "idle" ? "border-app bg-surface hover:border-app-strong" : "border-dashed border-accent/60 bg-transparent",
  );

/**
 * «Dirección»: the Estilo and Tipografía slots (drop targets showing the current choice) and the
 * card decks. Cards apply on click or by dragging onto a slot or the canvas.
 */
export function DirectionControl({ doc, mode }: DirectionControlProps) {
  const { locale } = useI18n();
  const t = useDictionary(composer);
  const { applyRecipe, applyPairing, setPairingLocked } = useComposerActions();
  const [deck, setDeck] = useState<Deck>("styles");

  const recipe = getStyleRecipe(doc.brief.recipeId);
  const pairing = getTypographyPairing(doc.brief.pairingId);
  const locked = isLocked(doc, "/brief/pairingId");
  const currentVars = sampleVars(doc, {}, mode);

  const recipeVars = useMemo(() => styleRecipes.map((r) => sampleVars(doc, recipeChoice(doc, r.id), mode)), [doc, mode]);

  const onStyleDrop = useCallback(
    (item: DroppedItem) => {
      if (item.type === DND.recipe) applyRecipe(String(item.data.recipeId));
    },
    [applyRecipe],
  );
  const onTypeDrop = useCallback((item: DroppedItem) => applyPairing(String(item.data.pairingId)), [applyPairing]);

  const headingFace = pairing ? `"${pairing.heading.family}", ${pairing.heading.fallback}` : undefined;

  return (
    <PanelSection title={t.direction.title} hint={t.direction.deckHint}>
      <div className="grid grid-cols-2 gap-2">
        <DropSlot id="composer-slot-style" accept={STYLE_SLOT_ACCEPT} label={t.direction.style} onDrop={onStyleDrop} className="rounded-card">
          {(state) => (
            <button type="button" className={slotFrame(state)} aria-pressed={deck === "styles"} onClick={() => setDeck("styles")}>
              <span className="text-caption text-muted">{t.direction.style}</span>
              <span aria-hidden className="block h-11 overflow-hidden rounded-[8px] border border-app">
                <StyleSample vars={currentVars} mode={mode} layout="recipe" buttonLabel={t.direction.sampleButton} />
              </span>
              <span className="truncate text-small font-medium text-fg">{recipe?.label[locale] ?? doc.brief.recipeId}</span>
            </button>
          )}
        </DropSlot>
        <DropSlot id="composer-slot-type" accept={TYPE_SLOT_ACCEPT} label={t.direction.type} onDrop={onTypeDrop} className="rounded-card">
          {(state) => (
            <button type="button" className={slotFrame(state)} aria-pressed={deck === "type"} onClick={() => setDeck("type")}>
              <span className="text-caption text-muted">{t.direction.type}</span>
              <span aria-hidden className="flex h-11 items-center text-[1.75rem] leading-none text-fg" style={{ fontFamily: headingFace }}>
                Aa
              </span>
              <span className="truncate pe-6 text-small font-medium text-fg">{pairing?.label[locale] ?? doc.brief.pairingId}</span>
            </button>
          )}
        </DropSlot>
      </div>
      <div className="-mt-1 flex items-center justify-between gap-2">
        <Segmented
          label={t.direction.decks}
          layoutId="composer-deck"
          size="sm"
          value={deck}
          onChange={setDeck}
          options={[
            { value: "styles", label: t.direction.styles },
            { value: "type", label: t.direction.typefaces },
          ]}
        />
        <IconButton
          size="sm"
          label={locked ? t.direction.unlock : t.direction.lock}
          aria-pressed={locked}
          icon={locked ? <LockIcon /> : <UnlockIcon />}
          className={cn(locked && "text-accent")}
          onClick={() => setPairingLocked(!locked)}
        />
      </div>
      <AnimatePresence mode="wait" initial={false}>
        <motion.ul
          key={deck}
          role="list"
          className="grid grid-cols-2 gap-2"
          initial={{ opacity: 0, y: 4 }}
          animate={{ opacity: 1, y: 0 }}
          exit={{ opacity: 0, y: -4 }}
          transition={tween(0.16)}
        >
          {deck === "styles"
            ? styleRecipes.map((r, index) => (
                <li key={r.id}>
                  <RecipeCard
                    recipe={r}
                    selected={r.id === doc.brief.recipeId}
                    vars={recipeVars[index]!}
                    mode={mode}
                    onApply={applyRecipe}
                    locale={locale}
                    buttonLabel={t.direction.sampleButton}
                    currentLabel={t.themes.current}
                  />
                </li>
              ))
            : typographyPairings.map((p) => (
                <li key={p.id}>
                  <PairingCard
                    pairing={p}
                    selected={p.id === doc.brief.pairingId}
                    onApply={applyPairing}
                    idPrefix="deck-pairing"
                    variant="deck"
                    locale={locale}
                    sample={t.fonts.sample}
                    currentLabel={t.themes.current}
                  />
                </li>
              ))}
        </motion.ul>
      </AnimatePresence>
    </PanelSection>
  );
}
