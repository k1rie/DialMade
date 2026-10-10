"use client";

import type { AppNav, ScreenId, ScreenKind, ScreenTemplateId } from "@dialmade/layout";
import type { MotionValue } from "motion/react";
import { useCallback, useId, useMemo, useRef, useState } from "react";
import { toast } from "sonner";
import { useDndAnnounce } from "@/components/dnd/DndAnnouncer";
import { usePlatformKeys } from "@/hooks/usePlatformKeys";
import { useDictionary } from "@/i18n";
import { layout } from "@/i18n/layout";
import { cn } from "@/lib/cn";
import { Popover } from "../Popover";
import { ScreenTemplateList } from "../ScreenTemplateList";
import { selectActiveScreenId, useActiveScreenId, useLayoutActions, useLayoutStore, useLayoutStoreApi, useScreens, type LayoutState } from "../useLayoutStore";
import { stepIndex } from "./reorder";
import { ScreenRow, type ScreenRowHandlers, type ScreenRowKeys } from "./ScreenRow";
import { useScreenReorder } from "./useScreenReorder";

export type ScreensPanelProps = {
  className?: string;
};

/** Navigation shared by the app screens (the first one with navigation, as the store applies it). */
function selectAppNav(state: LayoutState): AppNav | null {
  for (const id of state.screenOrder) {
    const nav = state.screens[id]?.shell?.nav;
    if (nav && nav !== "none") return nav;
  }
  return null;
}

const attr = (name: string, id: ScreenId) => `[${name}="${CSS.escape(id)}"]`;

/**
 * «Pantallas» (left panel): the project's screens in order with thumbnail, name, kind and route, and
 * «+ Pantalla» (every screen template; «En blanco» asks web or app). Click a row to edit that screen.
 * Rename with double click / F2, reorder by dragging, Alt+↑/↓ or the row menu, duplicate and delete from
 * the menu (delete shows «Deshacer»). Every change is one undo step and is announced (es/en).
 */
export function ScreensPanel({ className }: ScreensPanelProps) {
  const t = useDictionary(layout);
  const platform = usePlatformKeys();
  const announce = useDndAnnounce();
  const store = useLayoutStoreApi();
  const actions = useLayoutActions();
  const screens = useScreens();
  const order = useLayoutStore((state) => state.screenOrder);
  const activeId = useActiveScreenId();
  const appNav = useLayoutStore(selectAppNav);
  const hintId = useId();

  const [renamingId, setRenamingId] = useState<ScreenId | null>(null);
  const [menuId, setMenuId] = useState<ScreenId | null>(null);
  const [addOpen, setAddOpen] = useState(false);
  const listRef = useRef<HTMLUListElement | null>(null);
  const offsets = useRef(new Map<ScreenId, MotionValue<number>>());

  const keys = useMemo<ScreenRowKeys>(
    () => ({ rename: "F2", up: platform.combo(platform.alt, "↑"), down: platform.combo(platform.alt, "↓") }),
    [platform],
  );

  /* ---- Elements (looked up on demand: rows are keyed by screen id) ---- */
  const rowOf = useCallback((id: ScreenId) => listRef.current?.querySelector<HTMLElement>(attr("data-screen-row", id)) ?? null, []);
  const buttonOf = useCallback((id: ScreenId) => listRef.current?.querySelector<HTMLElement>(attr("data-screen-button", id)) ?? null, []);
  /** Focus after React commits the change (the row may be new, moved or back from renaming). */
  const focusLater = useCallback((id: ScreenId) => requestAnimationFrame(() => buttonOf(id)?.focus()), [buttonOf]);
  const offsetOf = useCallback((id: ScreenId) => offsets.current.get(id), []);
  const nameOf = useCallback((id: ScreenId) => store.getState().screens[id]?.name ?? "", [store]);

  /* ---- Pointer reorder ---- */
  const onDrop = useCallback(
    (id: ScreenId, to: number) => {
      if (!actions.moveScreen(id, to)) return false;
      announce(t.announce.screenMoved(nameOf(id), to + 1, store.getState().screenOrder.length));
      // React moves the row's node, which can drop its focus.
      focusLater(id);
      return true;
    },
    [actions, announce, focusLater, nameOf, store, t],
  );
  const onCancel = useCallback(
    (id: ScreenId, index: number) => announce(t.screens.reorderCanceled(nameOf(id), index + 1, store.getState().screenOrder.length)),
    [announce, nameOf, store, t],
  );
  const reorder = useScreenReorder({ order, listRef, rowOf, offsetOf, onDrop, onCancel });
  const { onPointerDown, consumeClick, flip } = reorder;

  /* ---- Commands (shared by the rows, the keyboard and the menus) ---- */
  const addScreen = useCallback(
    (templateId: ScreenTemplateId, kind?: ScreenKind) => {
      setAddOpen(false);
      const id = actions.addScreen(templateId, kind);
      if (!id) return;
      announce(t.announce.screenAdded(nameOf(id)));
      focusLater(id);
    },
    [actions, announce, focusLater, nameOf, t],
  );

  const handlers = useMemo<ScreenRowHandlers>(() => {
    const closeMenu = (id: ScreenId) => setMenuId((current) => (current === id ? null : current));
    const endRename = (id: ScreenId, refocus: boolean) => {
      setRenamingId((current) => (current === id ? null : current));
      if (refocus) focusLater(id);
    };

    return {
      select: (id) => {
        const previous = selectActiveScreenId(store.getState());
        actions.setActiveScreen(id);
        if (previous !== id) announce(t.announce.screenActive(nameOf(id)));
      },
      pointerDown: onPointerDown,
      consumeClick,
      startRename: (id) => {
        setMenuId(null);
        setRenamingId(id);
      },
      commitRename: (id, value, refocus) => {
        if (actions.renameScreen(id, value)) announce(t.announce.renamed(nameOf(id)));
        endRename(id, refocus);
      },
      cancelRename: endRename,
      setMenu: (id, open) => {
        if (open) setMenuId(id);
        else closeMenu(id);
      },
      duplicate: (id) => {
        closeMenu(id);
        const copyId = actions.duplicateScreen(id);
        if (!copyId) return;
        announce(t.announce.screenDuplicated(nameOf(copyId)));
        focusLater(copyId);
      },
      move: (id, delta) => {
        closeMenu(id);
        const { screenOrder } = store.getState();
        const to = stepIndex(screenOrder.indexOf(id), delta, screenOrder.length);
        if (to === null) {
          announce(delta < 0 ? t.screens.atTop(nameOf(id)) : t.screens.atBottom(nameOf(id)));
          focusLater(id);
          return;
        }
        if (flip(() => actions.moveScreen(id, to))) announce(t.announce.screenMoved(nameOf(id), to + 1, screenOrder.length));
        focusLater(id);
      },
      remove: (id) => {
        closeMenu(id);
        const before = store.getState();
        const index = before.screenOrder.indexOf(id);
        const wasActive = selectActiveScreenId(before) === id;
        const name = before.screens[id]?.name ?? "";
        if (!actions.removeScreen(id)) {
          announce(t.screens.lastOne);
          return;
        }
        // «Deshacer» undoes this removal only: after any other change it says so instead of undoing that change.
        const token = actions.changeToken();
        const after = store.getState();
        const neighbor = after.screenOrder[Math.min(index, after.screenOrder.length - 1)];
        if (neighbor) focusLater(neighbor);

        toast(t.announce.screenRemoved(name), {
          action: {
            label: t.common.undo,
            onClick: () => {
              if (!actions.undoIfLatest(token)) {
                toast(t.common.undoStale);
                return;
              }
              if (wasActive) actions.setActiveScreen(id);
              announce(t.announce.undone);
              focusLater(id);
            },
          },
        });
      },
      focusRow: (id, target) => {
        const { screenOrder } = store.getState();
        const index = screenOrder.indexOf(id);
        const last = screenOrder.length - 1;
        const next =
          target === "first" ? 0 : target === "last" ? last : target === "previous" ? Math.max(0, index - 1) : Math.min(last, index + 1);
        const nextId = screenOrder[next];
        if (nextId) buttonOf(nextId)?.focus();
      },
      registerOffset: (id, value) => {
        if (value) offsets.current.set(id, value);
        else offsets.current.delete(id);
      },
    };
  }, [actions, announce, buttonOf, consumeClick, flip, focusLater, nameOf, onPointerDown, store, t]);

  const total = screens.length;

  return (
    <div className={cn("flex flex-col gap-2", className)}>
      <div className="flex items-center justify-between gap-2">
        <h3 className="text-caption font-semibold tracking-[0.01em] text-fg">{t.screens.title}</h3>
        <Popover
          open={addOpen}
          onOpenChange={setAddOpen}
          label={t.screens.addMenu}
          align="end"
          className="w-80 p-1.5"
          trigger={(props) => (
            <button
              {...props}
              type="button"
              aria-label={t.screens.addLabel}
              className="inline-flex h-8 shrink-0 items-center rounded-control border border-dashed border-app-strong px-2.5 text-small font-medium text-muted transition-colors hover:border-accent/60 hover:text-fg"
            >
              {t.screens.add}
            </button>
          )}
        >
          <p className="px-1.5 pt-0.5 pb-1.5 text-caption font-semibold text-fg">{t.screens.addMenu}</p>
          <ScreenTemplateList appNav={appNav} label={t.screens.addMenu} onPick={addScreen} className="max-h-[min(60vh,28rem)] overflow-y-auto overscroll-contain" />
        </Popover>
      </div>

      <ul ref={listRef} role="list" aria-label={t.screens.list} className="relative flex flex-col gap-1">
        {screens.map((screen, index) => (
          <ScreenRow
            key={screen.id}
            screen={screen}
            index={index}
            total={total}
            active={screen.id === activeId}
            renaming={screen.id === renamingId}
            menuOpen={screen.id === menuId}
            dragging={screen.id === reorder.draggingId}
            hintId={hintId}
            keys={keys}
            handlers={handlers}
          />
        ))}
      </ul>

      <p id={hintId} className="text-caption text-pretty text-muted">
        {/* Touch has no pointer drag here (the row menu moves rows), so the drag hint is for fine pointers. */}
        {total > 1 && <span className="pointer-coarse:hidden">{t.screens.reorderHint(keys.up, keys.down)} </span>}
        {t.screens.renameHint}
      </p>
    </div>
  );
}
