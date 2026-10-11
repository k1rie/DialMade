"use client";

import { getStyleRecipe, getThemeShape, getTypographyPairing } from "@dialmade/catalog";
import { isLocked, lockPointer, type DesignDoc, type PatchOperation, type PatchResult } from "@dialmade/doc";
import { PALETTE_STYLES, type PaletteStyleId } from "@dialmade/palette";
import { useMemo } from "react";
import { toast } from "sonner";
import { useDndAnnounce } from "@/components/dnd/DndAnnouncer";
import { useDesignDocActions, useDesignDocStore } from "@/hooks/useDesignDoc";
import type { PreviewMode } from "@/hooks/usePaletteFlow";
import { useDictionary, useI18n } from "@/i18n";
import { composer } from "@/i18n/composer";

export type ComposerActions = {
  /** Applies a style recipe; its pairing and motion tier follow unless pinned. */
  applyRecipe: (recipeId: string) => void;
  /** Applies a pairing and pins it, so later style changes keep it. */
  applyPairing: (pairingId: string) => void;
  /** A palette style; the preview switches to the mode the card showed. */
  applyPalette: (styleId: PaletteStyleId, mode?: PreviewMode) => void;
  /** A variant of the current style (`brief.themeId`; its shape, not its colors), or `null` for the plain style. */
  applyVariant: (themeId: string | null, mode?: PreviewMode) => void;
  setPairingLocked: (locked: boolean) => void;
};

export const paletteStyleLabel = (id: string, locale: "es" | "en") => PALETTE_STYLES.find((style) => style.id === id)?.label[locale] ?? id;

const PAIRING = "/brief/pairingId";

/** Removes every spelling of a lock (`"pairingId"` and `/brief/pairingId`), last index first. */
function unlockOps(doc: DesignDoc, pointer: string): PatchOperation[] {
  const target = lockPointer(pointer);
  const ops: PatchOperation[] = [];
  doc.brief.locks.forEach((lock, index) => {
    if (lockPointer(lock) === target) ops.push({ op: "remove", path: `/brief/locks/${index}` });
  });
  return ops.reverse();
}

/** Click and drop share these, so both paths apply and announce the same way. */
export function useComposerActions(): ComposerActions {
  const store = useDesignDocStore();
  const actions = useDesignDocActions();
  const announce = useDndAnnounce();
  const { locale } = useI18n();
  const t = useDictionary(composer);

  return useMemo(() => {
    const doc = () => store.getState().doc;
    const pinned = () => {
      const current = doc();
      return current ? isLocked(current, PAIRING) : false;
    };

    /**
     * A value an import locked rejects the change («tu guía manda»): say so, and offer «Desbloquear»,
     * which drops that lock and retries in one undo step (an explicit user action may pass allowLocked).
     */
    const guard = (result: PatchResult, retry: () => PatchResult, onDone: () => void) => {
      if (result.ok) {
        onDone();
        return;
      }
      const lock = result.error.reason === "locked" ? result.error.lock : undefined;
      if (!lock) return;
      toast(t.direction.lockedByGuide, {
        action: {
          label: t.direction.unlockAction,
          onClick: () => {
            const current = doc();
            if (!current) return;
            actions.beginBatch();
            const unlocked = actions.applyPatch(unlockOps(current, lock), { allowLocked: true });
            const again = unlocked.ok ? retry() : unlocked;
            if (again.ok) {
              actions.commitBatch();
              onDone();
            } else actions.cancelBatch();
          },
        },
      });
    };

    const applyRecipe = (recipeId: string) => {
      const recipe = getStyleRecipe(recipeId);
      if (!recipe) return;
      const run = () => actions.setRecipe(recipeId, { cascade: true });
      guard(run(), run, () => announce(t.direction.applied(recipe.label[locale])));
    };

    const applyPairing = (pairingId: string) => {
      const pairing = getTypographyPairing(pairingId);
      const current = doc();
      if (!pairing || !current) return;
      const run = () => {
        const latest = doc() ?? current;
        const ops: PatchOperation[] = [];
        if (latest.brief.pairingId !== pairing.id) ops.push({ op: "replace", path: PAIRING, value: pairing.id });
        if (!pinned()) ops.push({ op: "add", path: "/brief/locks/-", value: "pairingId" });
        return ops.length > 0 ? actions.applyPatch(ops) : ({ ok: true, doc: latest } as const);
      };
      guard(run(), run, () => announce(t.direction.applied(pairing.label[locale])));
    };

    const applyPalette = (styleId: PaletteStyleId, mode?: PreviewMode) => {
      const style = PALETTE_STYLES.find((candidate) => candidate.id === styleId);
      if (!style) return;
      const run = () => actions.setPaletteStyle(styleId);
      guard(run(), run, () => {
        if (mode) actions.setPreviewMode(mode);
        announce(t.palette.applied(style.label[locale]));
      });
    };

    const applyVariant = (themeId: string | null, mode?: PreviewMode) => {
      const current = doc();
      const name = themeId ? getThemeShape(themeId)?.label : getStyleRecipe(current?.brief.recipeId ?? "")?.label[locale];
      if (!current || !name) return;
      const run = () => actions.setTheme(themeId, { cascade: true });
      guard(run(), run, () => {
        if (mode) actions.setPreviewMode(mode);
        announce(t.variants.applied(name));
      });
    };

    const setPairingLocked = (next: boolean) => {
      const current = doc();
      if (!current) return;
      if (next && !pinned()) actions.applyPatch([{ op: "add", path: "/brief/locks/-", value: "pairingId" }]);
      // Unpinning is the user's «Desbloquear»: it also drops the lock an import put on the pairing.
      if (!next) {
        const ops = unlockOps(current, PAIRING);
        if (ops.length > 0) actions.applyPatch(ops, { allowLocked: true });
      }
    };

    return { applyRecipe, applyPairing, applyPalette, applyVariant, setPairingLocked };
  }, [store, actions, announce, locale, t]);
}
