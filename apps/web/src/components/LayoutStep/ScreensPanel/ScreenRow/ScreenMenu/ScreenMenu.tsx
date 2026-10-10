"use client";

import { useId, useRef, type KeyboardEvent, type ReactNode } from "react";
import { Kbd } from "@/components/ui/Kbd";
import { useDictionary } from "@/i18n";
import { layout } from "@/i18n/layout";
import { ArrowDownIcon, ArrowUpIcon, DuplicateIcon, TrashIcon } from "../../../icons";
import { PencilIcon } from "../../icons";

export type ScreenMenuProps = {
  name: string;
  canMoveUp: boolean;
  canMoveDown: boolean;
  /** The last screen cannot be deleted. */
  canDelete: boolean;
  /** Shortcut labels shown next to the items (the shortcuts act on the focused row). */
  keys: { rename: string; up: string; down: string };
  onRename: () => void;
  onDuplicate: () => void;
  onMoveUp: () => void;
  onMoveDown: () => void;
  onDelete: () => void;
};

type ItemProps = {
  label: string;
  /** Names the screen too («Subir Ajustes»): the menu may be reached without seeing the row. */
  ariaLabel: string;
  icon: ReactNode;
  onSelect: () => void;
  disabled?: boolean;
  kbd?: string;
  describedBy?: string;
};

const ITEM =
  "flex h-9 w-full items-center gap-2 rounded-[8px] px-2.5 text-start text-small text-fg transition-colors duration-150 " +
  "hover:bg-white/[0.06] focus-visible:bg-white/[0.06] [&_svg]:size-3.5 [&_svg]:text-muted " +
  "aria-disabled:cursor-not-allowed aria-disabled:opacity-45 aria-disabled:hover:bg-transparent";

/** Disabled items stay focusable (APG menus) so the reason can be read; activating them does nothing. */
function Item({ label, ariaLabel, icon, onSelect, disabled = false, kbd, describedBy }: ItemProps) {
  return (
    <button
      type="button"
      aria-label={ariaLabel}
      aria-disabled={disabled || undefined}
      aria-describedby={describedBy}
      onClick={() => {
        if (!disabled) onSelect();
      }}
      className={ITEM}
    >
      {icon}
      <span className="min-w-0 flex-1 truncate">{label}</span>
      {kbd && (
        <Kbd aria-hidden="true" className="ms-auto">
          {kbd}
        </Kbd>
      )}
    </button>
  );
}

/**
 * The row «⋯» menu: Renombrar, Duplicar, Subir, Bajar and Borrar (the click alternatives of double click /
 * F2 and of dragging). ↑/↓, Home and End move between the items; Esc closes (Popover).
 */
export function ScreenMenu({ name, canMoveUp, canMoveDown, canDelete, keys, onRename, onDuplicate, onMoveUp, onMoveDown, onDelete }: ScreenMenuProps) {
  const t = useDictionary(layout);
  const id = useId();
  const ref = useRef<HTMLDivElement | null>(null);

  const onKeyDown = (event: KeyboardEvent<HTMLDivElement>) => {
    if (event.altKey || event.ctrlKey || event.metaKey) return;
    const items = Array.from(ref.current?.querySelectorAll<HTMLButtonElement>("button") ?? []);
    const index = items.indexOf(event.target as HTMLButtonElement);
    if (index < 0) return;
    let next: number | undefined;
    if (event.key === "ArrowDown") next = (index + 1) % items.length;
    else if (event.key === "ArrowUp") next = (index - 1 + items.length) % items.length;
    else if (event.key === "Home") next = 0;
    else if (event.key === "End") next = items.length - 1;
    if (next === undefined) return;
    event.preventDefault();
    items[next]?.focus();
  };

  return (
    <div ref={ref} onKeyDown={onKeyDown} className="flex flex-col">
      <Item label={t.screens.rename} ariaLabel={t.screens.renameLabel(name)} icon={<PencilIcon />} onSelect={onRename} kbd={keys.rename} />
      <Item label={t.screens.duplicate} ariaLabel={t.screens.duplicateLabel(name)} icon={<DuplicateIcon />} onSelect={onDuplicate} />
      <Item
        label={t.screens.moveUp}
        ariaLabel={t.screens.moveUpLabel(name)}
        icon={<ArrowUpIcon />}
        onSelect={onMoveUp}
        disabled={!canMoveUp}
        kbd={keys.up}
      />
      <Item
        label={t.screens.moveDown}
        ariaLabel={t.screens.moveDownLabel(name)}
        icon={<ArrowDownIcon />}
        onSelect={onMoveDown}
        disabled={!canMoveDown}
        kbd={keys.down}
      />
      <span aria-hidden="true" className="my-1 h-px bg-white/[0.08]" />
      <Item
        label={t.screens.delete}
        ariaLabel={t.screens.deleteLabel(name)}
        icon={<TrashIcon />}
        onSelect={onDelete}
        disabled={!canDelete}
        describedBy={canDelete ? undefined : `${id}-last`}
      />
      {!canDelete && (
        <p id={`${id}-last`} className="px-2.5 pt-1 pb-0.5 text-caption text-muted">
          {t.screens.lastOne}
        </p>
      )}
    </div>
  );
}
