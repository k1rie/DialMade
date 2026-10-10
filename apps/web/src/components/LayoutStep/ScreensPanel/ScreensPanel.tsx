"use client";

import { MAX_SCREENS } from "@dialmade/doc";
import type { AppNav, ScreenId, ScreenKind, ScreenTemplateId } from "@dialmade/layout";
import type { MotionValue } from "motion/react";
import { useCallback, useId, useMemo, useRef, useState } from "react";
import { toast } from "sonner";
import { useDndAnnounce } from "@/components/dnd/DndAnnouncer";
import { Popover } from "@/components/ui/Popover";
import { usePlatformKeys } from "@/hooks/usePlatformKeys";
import { useDictionary } from "@/i18n";
import { layout } from "@/i18n/layout";
import { cn } from "@/lib/cn";
import { ScreenTemplateList } from "../ScreenTemplateList";
import { selectActiveScreenId, useActiveScreenId, useLayoutActions, useLayoutStore, useLayoutStoreApi, useScreens, type LayoutState } from "../useLayoutStore";
import { screenKeyStep, stepIndex } from "./reorder";
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
 * «+ Pantalla» (every screen template; «En blanco» asks web or app). Click a row, or reach it with the arrow
 * keys, to edit that screen. Rename with double click / F2; reorder by dragging, with Space/Enter (grab, arrows,
 * drop; Esc cancels), Alt+↑/↓ or the row menu; duplicate and delete from the menu (delete shows «Deshacer»).
 * Every change is one undo step and is announced (es/en). At 24 screens a note says it is the maximum.
 */
export function ScreensPanel({ className }: ScreensPanelProps) {
  const t = useDictionary(layout);
  const platform = usePlatformKeys();
  const announce = useDndAnnounce({ politeness: "polite" });
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

  /** After a keyboard drop: React moves the row's node, which can drop its focus (Tab may have moved it on already). */
  const keepFocus = useCallback(
    (id: ScreenId) =>
      requestAnimationFrame(() => {
        const active = document.activeElement;
        if (!active || active === document.body) buttonOf(id)?.focus();
      }),
    [buttonOf],
  );

  /* ---- Pointer and keyboard reorder ---- */
  const onDrop = useCallback(
    (id: ScreenId, to: number, via: "pointer" | "keyboard") => {
      if (!actions.moveScreen(id, to)) return false;
      const total = store.getState().screenOrder.length;
      if (via === "keyboard") {
        announce(t.screens.dropped(nameOf(id), to + 1, total));
        keepFocus(id);
        return true;
      }
      announce(t.announce.screenMoved(nameOf(id), to + 1, total));
      // React moves the row's node, which can drop its focus.
      focusLater(id);
      return true;
    },
    [actions, announce, focusLater, keepFocus, nameOf, store, t],
  );
  const onCancel = useCallback(
    (id: ScreenId, index: number) => announce(t.screens.reorderCanceled(nameOf(id), index + 1, store.getState().screenOrder.length)),
    [announce, nameOf, store, t],
  );
  const reorder = useScreenReorder({ order, listRef, rowOf, offsetOf, onDrop, onCancel });
  const { onPointerDown, consumeClick, flip, keyboardHeld, keyboardGrab, keyboardMove, keyboardDrop, keyboardCancel } = reorder;

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

    const select = (id: ScreenId) => {
      const previous = selectActiveScreenId(store.getState());
      actions.setActiveScreen(id);
      if (previous !== id) announce(t.announce.screenActive(nameOf(id)));
    };
    /** Drops the row held with the keyboard (a drop in the same slot is announced too). */
    const dropHeld = () => {
      const held = keyboardHeld();
      const dropped = keyboardDrop();
      if (!held || !dropped || dropped.to !== dropped.from) return;
      announce(t.screens.dropped(nameOf(held.id), dropped.to + 1, store.getState().screenOrder.length));
    };
    const move = (id: ScreenId, delta: -1 | 1) => {
      closeMenu(id);
      const { screenOrder } = store.getState();
      const to = stepIndex(screenOrder.indexOf(id), delta, screenOrder.length);
      if (to === null) {
        announce(delta < 0 ? t.screens.atTop(nameOf(id)) : t.screens.atBottom(nameOf(id)), "assertive");
        focusLater(id);
        return;
      }
      if (flip(() => actions.moveScreen(id, to))) announce(t.announce.screenMoved(nameOf(id), to + 1, screenOrder.length));
      focusLater(id);
    };

    return {
      select,
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
      move,
      remove: (id) => {
        closeMenu(id);
        const before = store.getState();
        const index = before.screenOrder.indexOf(id);
        const wasActive = selectActiveScreenId(before) === id;
        const name = before.screens[id]?.name ?? "";
        if (!actions.removeScreen(id)) {
          announce(t.screens.lastOne, "assertive");
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
      keyDown: (id, event) => {
        const { screenOrder } = store.getState();
        const total = screenOrder.length;
        const step = screenKeyStep(keyboardHeld(), id, screenOrder.indexOf(id), total, event);
        if (step.type === "none") return;
        if (!(step.type === "drop" && step.keepKey)) event.preventDefault();
        switch (step.type) {
          case "focus": {
            // Automatic activation, like tabs: reaching a row selects its screen.
            const nextId = screenOrder[step.to];
            if (!nextId) return;
            select(nextId);
            buttonOf(nextId)?.focus();
            return;
          }
          case "grab":
            closeMenu(id);
            if (keyboardGrab(id)) announce(t.screens.grabbed(nameOf(id), screenOrder.indexOf(id) + 1, total));
            return;
          case "move":
            if (keyboardMove(step.to)) announce(t.announce.screenMoved(nameOf(id), step.to + 1, total));
            return;
          case "edge":
            announce(step.delta < 0 ? t.screens.atTop(nameOf(id)) : t.screens.atBottom(nameOf(id)), "assertive");
            return;
          case "drop":
            dropHeld();
            return;
          case "cancel": {
            // Esc ends the grab only: nothing else (deselect, close) reacts to it.
            event.stopPropagation();
            const from = keyboardCancel();
            if (from !== null) announce(t.screens.reorderCanceled(nameOf(id), from + 1, total));
            return;
          }
          case "shift":
            move(id, step.delta);
            return;
          case "rename":
            setMenuId(null);
            setRenamingId(id);
            return;
          case "menu":
            setMenuId(id);
            return;
        }
      },
      blur: (id) => {
        if (keyboardHeld()?.id === id) dropHeld();
      },
      registerOffset: (id, value) => {
        if (value) offsets.current.set(id, value);
        else offsets.current.delete(id);
      },
    };
  }, [
    actions,
    announce,
    buttonOf,
    consumeClick,
    flip,
    focusLater,
    keyboardCancel,
    keyboardDrop,
    keyboardGrab,
    keyboardHeld,
    keyboardMove,
    nameOf,
    onPointerDown,
    store,
    t,
  ]);

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

      {total >= MAX_SCREENS && <p className="text-caption text-pretty text-muted">{t.screens.limitHint(MAX_SCREENS)}</p>}
      <p id={hintId} className="text-caption text-pretty text-muted">
        {total > 1 && (
          <>
            {`${t.screens.navigateHint} `}
            {/* Touch has no pointer drag here (the row menu moves rows), so the drag hint is for fine pointers. */}
            <span className="pointer-coarse:hidden">{t.screens.dragHint} </span>
            {`${t.screens.reorderHint(keys.up, keys.down)} `}
          </>
        )}
        {t.screens.renameHint}
      </p>
    </div>
  );
}
