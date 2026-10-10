"use client";

import { getStyleRecipe, getTypographyPairing } from "@dialmade/catalog";
import type { PatchOperation } from "@dialmade/doc";
import { PALETTE_STYLES } from "@dialmade/palette";
import { useMemo } from "react";
import { useDndAnnounce } from "@/components/dnd/DndAnnouncer";
import { useDesignDocActions, useDesignDocStore } from "@/hooks/useDesignDoc";
import type { PreviewMode } from "@/hooks/usePaletteFlow";
import { useDictionary, useI18n } from "@/i18n";
import { composer } from "@/i18n/composer";
import type { ThemeCombo } from "./constants";

export type ComposerActions = {
  /** Applies a style recipe; its pairing and motion tier follow unless pinned. */
  applyRecipe: (recipeId: string) => void;
  /** Applies a pairing and pins it, so later style changes keep it. */
  applyPairing: (pairingId: string) => void;
  /** Palette style + recipe in one undo step; the preview switches to the mode the card showed. */
  applyTheme: (combo: ThemeCombo, mode?: PreviewMode) => void;
  setPairingLocked: (locked: boolean) => void;
};

export const paletteStyleLabel = (id: string, locale: "es" | "en") => PALETTE_STYLES.find((style) => style.id === id)?.label[locale] ?? id;

/** Click and drop share these, so both paths apply and announce the same way. */
export function useComposerActions(): ComposerActions {
  const store = useDesignDocStore();
  const actions = useDesignDocActions();
  const announce = useDndAnnounce();
  const { locale } = useI18n();
  const t = useDictionary(composer);

  return useMemo(() => {
    const locked = () => store.getState().doc?.brief.locks.includes("pairingId") ?? false;

    const applyRecipe = (recipeId: string) => {
      const recipe = getStyleRecipe(recipeId);
      if (!recipe) return;
      const result = actions.setRecipe(recipeId, { cascade: true });
      if (result.ok) announce(t.direction.applied(recipe.label[locale]));
    };

    const applyPairing = (pairingId: string) => {
      const pairing = getTypographyPairing(pairingId);
      const doc = store.getState().doc;
      if (!pairing || !doc) return;
      const ops: PatchOperation[] = [];
      if (doc.brief.pairingId !== pairing.id) ops.push({ op: "replace", path: "/brief/pairingId", value: pairing.id });
      if (!locked()) ops.push({ op: "add", path: "/brief/locks/-", value: "pairingId" });
      if (ops.length > 0 && actions.applyPatch(ops).ok) announce(t.direction.applied(pairing.label[locale]));
    };

    const applyTheme = (combo: ThemeCombo, mode?: PreviewMode) => {
      const recipe = getStyleRecipe(combo.recipeId);
      if (!recipe) return;
      actions.beginBatch();
      const palette = actions.setPaletteStyle(combo.paletteStyleId);
      const style = palette.ok ? actions.setRecipe(combo.recipeId, { cascade: true }) : palette;
      if (style.ok) actions.commitBatch();
      else actions.cancelBatch();
      if (!style.ok) return;
      if (mode) actions.setPreviewMode(mode);
      announce(t.themes.applied(t.themes.card(recipe.label[locale], paletteStyleLabel(combo.paletteStyleId, locale))));
    };

    const setPairingLocked = (next: boolean) => {
      const doc = store.getState().doc;
      if (!doc) return;
      const index = doc.brief.locks.indexOf("pairingId");
      if (next && index < 0) actions.applyPatch([{ op: "add", path: "/brief/locks/-", value: "pairingId" }]);
      if (!next && index >= 0) actions.applyPatch([{ op: "remove", path: `/brief/locks/${index}` }]);
    };

    return { applyRecipe, applyPairing, applyTheme, setPairingLocked };
  }, [store, actions, announce, locale, t]);
}
