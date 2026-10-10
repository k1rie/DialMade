"use client";

import type { BlockId, LibraryBlockType } from "@dialmade/layout";
import { useCallback, useMemo } from "react";
import { useDndAnnounce } from "@/components/dnd/DndAnnouncer";
import { useDictionary } from "@/i18n";
import { layout } from "@/i18n/layout";
import { selectActiveScreen, selectSelectedId, useLayoutActions, useLayoutStoreApi } from "../useLayoutStore";
import { insertParentFor, tileModeFor } from "./libraryModel";

export type LibraryInsert = {
  /** Click/Enter on a tile: inserts in the next free slot (inside the selected container) or sets the app nav. */
  insert: (type: LibraryBlockType) => void;
  /** «Usar bloque libre» from an empty search: a free block named after the query, as one undo step. */
  insertFree: (label: string) => void;
};

/**
 * The single-pointer and keyboard alternative to dragging a tile (WCAG 2.5.7). Reads the store at call
 * time (no subscription) and announces the result politely: «Añadiste Calendario: columnas 1 a 8, de 24
 * a 504 px.», «… dentro de Grupo.» or «Navegación: Superior.». Focus is left where it is, so the same
 * tile can be used again right away.
 */
export function useLibraryInsert(): LibraryInsert {
  const t = useDictionary(layout);
  const store = useLayoutStoreApi();
  const actions = useLayoutActions();
  const announce = useDndAnnounce();

  const announceBlock = useCallback(
    (id: BlockId) => {
      const screen = selectActiveScreen(store.getState());
      const block = screen?.layout.blocks[id];
      if (!screen || !block) return;
      const parent = block.parentId !== undefined ? screen.layout.blocks[block.parentId] : undefined;
      announce(parent ? t.announce.insertedInto(block.label, parent.label) : t.announce.inserted(block.label, block.rect));
    },
    [announce, store, t],
  );

  const insert = useCallback(
    (type: LibraryBlockType) => {
      const state = store.getState();
      const screen = selectActiveScreen(state);
      if (!screen) return;
      const mode = tileModeFor(type, screen.kind);
      if (mode === "appOnly") {
        announce(t.library.appOnlyHint(t.blocks[type].name));
        return;
      }
      const parentId = mode === "block" ? insertParentFor(screen.layout, selectSelectedId(state), type) : undefined;
      const outcome = actions.insertBlock(type, parentId !== undefined ? { parentId } : {});
      if (outcome.nav) announce(t.announce.navChanged(t.nav[outcome.nav]));
      else if (outcome.id) announceBlock(outcome.id);
    },
    [actions, announce, announceBlock, store, t],
  );

  const insertFree = useCallback(
    (label: string) => {
      const state = store.getState();
      const screen = selectActiveScreen(state);
      if (!screen) return;
      const parentId = insertParentFor(screen.layout, selectSelectedId(state), "free");
      actions.beginBatch();
      const outcome = actions.insertBlock("free", parentId !== undefined ? { parentId } : {});
      if (outcome.id && label.trim()) actions.updateBlock(outcome.id, { label });
      actions.commitBatch();
      if (outcome.id) announceBlock(outcome.id);
    },
    [actions, announceBlock, store],
  );

  return useMemo(() => ({ insert, insertFree }), [insert, insertFree]);
}
