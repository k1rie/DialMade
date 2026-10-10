"use client";

import type { ScreenId } from "@dialmade/layout";
import { motion, useMotionValue, type MotionValue } from "motion/react";
import { memo, useCallback, useId, useLayoutEffect, type FocusEvent, type KeyboardEvent, type PointerEvent } from "react";
import { IconButton } from "@/components/ui/IconButton";
import { Popover } from "@/components/ui/Popover";
import { useDictionary } from "@/i18n";
import { layout } from "@/i18n/layout";
import { cn } from "@/lib/cn";
import { snappy } from "@/lib/motion";
import { REGION_AUTOFOCUS_ATTR } from "../../constants";
import { MoreIcon } from "../../icons";
import { KindBadge } from "../../KindBadge";
import { LayoutThumbnail } from "../../LayoutThumbnail";
import type { Screen } from "../../types";
import { RenameField } from "./RenameField";
import { ScreenMenu } from "./ScreenMenu";

/** What the rows ask the panel to do. One stable object for every row (rows are memoised). */
export type ScreenRowHandlers = {
  select: (id: ScreenId) => void;
  pointerDown: (id: ScreenId, event: PointerEvent<HTMLElement>) => void;
  /** `true` when the click ends a drag and must be ignored. */
  consumeClick: () => boolean;
  startRename: (id: ScreenId) => void;
  commitRename: (id: ScreenId, value: string, refocus: boolean) => void;
  cancelRename: (id: ScreenId, refocus: boolean) => void;
  setMenu: (id: ScreenId, open: boolean) => void;
  duplicate: (id: ScreenId) => void;
  /** −1 up, +1 down (Alt+↑/↓, menu Subir/Bajar). */
  move: (id: ScreenId, delta: -1 | 1) => void;
  remove: (id: ScreenId) => void;
  /**
   * Every key on the row button (`screenKeyStep`): arrows, Home and End move focus and select; Space/Enter grab and
   * drop; Esc cancels a grab; Alt+↑/↓ moves; F2 renames; the context menu key opens the menu.
   */
  keyDown: (id: ScreenId, event: KeyboardEvent<HTMLButtonElement>) => void;
  /** Focus left the row button (a row held with the keyboard is dropped there). */
  blur: (id: ScreenId, event: FocusEvent<HTMLButtonElement>) => void;
  /** The row's vertical offset, driven by the drag (null on unmount). */
  registerOffset: (id: ScreenId, value: MotionValue<number> | null) => void;
};

/** Shortcut labels for the platform («⌥↑» or «Alt+↑»). */
export type ScreenRowKeys = { rename: string; up: string; down: string };

export type ScreenRowProps = {
  screen: Screen;
  index: number;
  total: number;
  active: boolean;
  renaming: boolean;
  menuOpen: boolean;
  dragging: boolean;
  /** id of the panel hint (drag, Alt+↑/↓, F2) that every row button references. */
  hintId: string;
  keys: ScreenRowKeys;
  handlers: ScreenRowHandlers;
};

const THUMB = "relative block h-8 w-12 shrink-0 overflow-hidden rounded-[6px] border border-app bg-app";

/**
 * One screen of the list: thumbnail, name, kind badge and route. Click selects it, and so does reaching it with
 * ↑/↓, Home or End (one tab stop for the list: the active row and its «⋯»). Space or Enter picks it up: arrows
 * move it, Space or Enter drops it, Esc puts it back. Double click or F2 renames inline; Alt+↑/↓ moves it one
 * place; the «⋯» menu has every action. Dragging (mouse or pen) reorders it, lifted like the other draggables.
 */
export const ScreenRow = memo(function ScreenRow({ screen, index, total, active, renaming, menuOpen, dragging, hintId, keys, handlers }: ScreenRowProps) {
  const t = useDictionary(layout);
  const id = useId();
  const y = useMotionValue(0);
  const { id: screenId, name, kind, route } = screen;

  useLayoutEffect(() => {
    handlers.registerOffset(screenId, y);
    return () => handlers.registerOffset(screenId, null);
  }, [handlers, screenId, y]);

  const onMenuOpenChange = useCallback((open: boolean) => handlers.setMenu(screenId, open), [handlers, screenId]);

  const thumbnail = (
    <span className={THUMB}>
      <LayoutThumbnail layout={screen.layout} shell={screen.shell} className="size-full" />
    </span>
  );

  return (
    <motion.li
      data-screen-row={screenId}
      style={{ y }}
      initial={false}
      animate={{ scale: dragging ? 1.03 : 1 }}
      transition={snappy}
      className={cn("relative", dragging && "z-10")}
    >
      <div
        className={cn(
          "flex items-center gap-1 rounded-control border p-1 transition-[background-color,border-color,box-shadow] duration-150",
          dragging
            ? "glow-purple border-transparent bg-surface shadow-lift"
            : active
              ? "border-app-strong bg-surface-hover shadow-surface"
              : "border-transparent hover:bg-white/[0.04]",
        )}
      >
        {renaming ? (
          <div className="flex min-w-0 flex-1 items-center gap-2.5 p-0.5">
            {thumbnail}
            <RenameField
              name={name}
              label={t.screens.nameField}
              onCommit={(value, refocus) => handlers.commitRename(screenId, value, refocus)}
              onCancel={(refocus) => handlers.cancelRename(screenId, refocus)}
            />
          </div>
        ) : (
          <button
            type="button"
            data-screen-button={screenId}
            {...(active ? { [REGION_AUTOFOCUS_ATTR]: "" } : {})}
            aria-label={t.screens.item(name, t.kinds[kind], index + 1, total)}
            aria-current={active ? "true" : undefined}
            aria-describedby={`${id}-route ${hintId}`}
            aria-keyshortcuts={total > 1 ? "ArrowUp ArrowDown Home End Space Enter Alt+ArrowUp Alt+ArrowDown F2" : "F2"}
            // One tab stop for the list: the active row (arrows reach the others and select them).
            tabIndex={active ? 0 : -1}
            onClick={() => {
              if (!handlers.consumeClick()) handlers.select(screenId);
            }}
            onDoubleClick={() => handlers.startRename(screenId)}
            onContextMenu={(event) => {
              // Right click (and the context menu key) opens the row menu instead of the browser's.
              event.preventDefault();
              handlers.setMenu(screenId, true);
            }}
            onPointerDown={(event) => handlers.pointerDown(screenId, event)}
            onKeyDown={(event) => handlers.keyDown(screenId, event)}
            onBlur={(event) => handlers.blur(screenId, event)}
            className={cn(
              "flex min-w-0 flex-1 items-center gap-2.5 rounded-[8px] p-0.5 text-start select-none",
              total > 1 && (dragging ? "cursor-grabbing" : "cursor-grab"),
            )}
          >
            {thumbnail}
            <span className="block min-w-0 flex-1">
              <span className="flex min-w-0 items-center gap-1.5">
                <span className="truncate text-small font-medium text-fg">{name}</span>
                <KindBadge kind={kind} />
              </span>
              <span id={`${id}-route`} className="block truncate font-mono text-caption text-muted">
                <span className="sr-only">{t.screens.route} </span>
                {route}
              </span>
            </span>
          </button>
        )}
        <Popover
          open={menuOpen}
          onOpenChange={onMenuOpenChange}
          label={t.screens.more(name)}
          align="end"
          className="w-64 p-1.5"
          trigger={(props) => <IconButton {...props} tabIndex={active ? 0 : -1} label={t.screens.more(name)} icon={<MoreIcon />} size="sm" />}
        >
          <ScreenMenu
            name={name}
            canMoveUp={index > 0}
            canMoveDown={index < total - 1}
            canDelete={total > 1}
            keys={keys}
            onRename={() => handlers.startRename(screenId)}
            onDuplicate={() => handlers.duplicate(screenId)}
            onMoveUp={() => handlers.move(screenId, -1)}
            onMoveDown={() => handlers.move(screenId, 1)}
            onDelete={() => handlers.remove(screenId)}
          />
        </Popover>
      </div>
    </motion.li>
  );
});
