"use client";

import { useId, useRef, useState, type KeyboardEvent, type ReactNode } from "react";
import { Button, type ButtonVariant } from "../Button";
import { Icon } from "../Icon";
import { renderIcon, type IconSlot } from "../Icon/renderIcon";
import { cx } from "../lib/cx";
import type { PreviewState } from "../lib/types";
import "./DropdownMenu.css";

export interface DropdownMenuItem {
  type?: "item";
  id: string;
  label: ReactNode;
  icon?: IconSlot;
  shortcut?: string;
  destructive?: boolean;
  disabled?: boolean;
  /** Con `checked` (true/false) el elemento es un `menuitemcheckbox`. */
  checked?: boolean;
  previewState?: PreviewState;
  onSelect?: () => void;
}

export type DropdownMenuEntry =
  | DropdownMenuItem
  | { type: "separator"; id: string }
  | { type: "label"; id: string; label: ReactNode };

export interface DropdownMenuProps {
  items: readonly DropdownMenuEntry[];
  /** Nombre accesible del menú. */
  label: string;
  /** Si se pasa, se pinta el botón que lo abre (en estado abierto). */
  trigger?: ReactNode;
  triggerVariant?: ButtonVariant;
  className?: string;
}

const isItem = (entry: DropdownMenuEntry): entry is DropdownMenuItem => entry.type === undefined || entry.type === "item";

/** Menú desplegable en estado abierto, estático: navegación con flechas, Home y End. */
export function DropdownMenu({ items, label, trigger, triggerVariant = "outline", className }: DropdownMenuProps) {
  const menuId = useId();
  const triggerId = useId();
  const enabled = items.filter(isItem).filter((item) => !item.disabled);
  const [activeId, setActiveId] = useState(enabled[0]?.id);
  const itemRefs = useRef(new Map<string, HTMLButtonElement>());

  const focusItem = (id: string | undefined) => {
    if (!id) return;
    setActiveId(id);
    itemRefs.current.get(id)?.focus();
  };

  const onKeyDown = (event: KeyboardEvent<HTMLDivElement>) => {
    const index = enabled.findIndex((item) => item.id === activeId);
    let next: number | null = null;
    if (event.key === "ArrowDown") next = (index + 1) % enabled.length;
    else if (event.key === "ArrowUp") next = (index - 1 + enabled.length) % enabled.length;
    else if (event.key === "Home") next = 0;
    else if (event.key === "End") next = enabled.length - 1;
    if (next === null) return;
    event.preventDefault();
    focusItem(enabled[next]?.id);
  };

  return (
    <div className={cx("dl-dropdown", className)}>
      {trigger != null && (
        <Button
          id={triggerId}
          variant={triggerVariant}
          iconEnd="chevron-down"
          aria-haspopup="menu"
          aria-expanded="true"
          aria-controls={menuId}
        >
          {trigger}
        </Button>
      )}
      <div
        id={menuId}
        role="menu"
        aria-label={trigger == null ? label : undefined}
        aria-labelledby={trigger != null ? triggerId : undefined}
        className="dl-dropdown__menu"
        onKeyDown={onKeyDown}
      >
        {items.map((entry) => {
          if (entry.type === "separator") return <div key={entry.id} role="separator" className="dl-dropdown__separator" />;
          if (entry.type === "label")
            return (
              <div key={entry.id} role="presentation" className="dl-dropdown__label">
                {entry.label}
              </div>
            );
          const isCheckbox = entry.checked !== undefined;
          return (
            <button
              key={entry.id}
              ref={(node) => {
                if (node) itemRefs.current.set(entry.id, node);
                else itemRefs.current.delete(entry.id);
              }}
              type="button"
              role={isCheckbox ? "menuitemcheckbox" : "menuitem"}
              aria-checked={isCheckbox ? entry.checked : undefined}
              aria-disabled={entry.disabled || undefined}
              tabIndex={entry.id === activeId ? 0 : -1}
              className="dl-dropdown__item"
              data-destructive={entry.destructive ? "" : undefined}
              data-preview-state={entry.previewState}
              onFocus={() => setActiveId(entry.id)}
              onClick={() => {
                if (!entry.disabled) entry.onSelect?.();
              }}
            >
              {isCheckbox && (
                <span className="dl-dropdown__check" aria-hidden="true">
                  {entry.checked && <Icon name="check" />}
                </span>
              )}
              {renderIcon(entry.icon, "dl-dropdown__icon")}
              <span className="dl-dropdown__text">{entry.label}</span>
              {entry.shortcut && (
                <kbd className="dl-dropdown__shortcut" aria-hidden="true">
                  {entry.shortcut}
                </kbd>
              )}
            </button>
          );
        })}
      </div>
    </div>
  );
}
