"use client";

import { useId, useRef, useState, type KeyboardEvent, type ReactNode } from "react";
import { renderIcon, type IconSlot } from "../Icon/renderIcon";
import { cx } from "../lib/cx";
import type { PreviewState } from "../lib/types";
import "./Tabs.css";

export interface TabItem {
  value: string;
  label: ReactNode;
  content?: ReactNode;
  icon?: IconSlot;
  /** Contenido extra tras la etiqueta, por ejemplo un `<Badge>` con un contador. */
  badge?: ReactNode;
  disabled?: boolean;
  previewState?: PreviewState;
}

export interface TabsProps {
  items: readonly TabItem[];
  /** Nombre accesible de la lista de pestañas. */
  label: string;
  value?: string;
  defaultValue?: string;
  onValueChange?: (value: string) => void;
  variant?: "underline" | "segmented";
  size?: "sm" | "md";
  /** Las pestañas ocupan todo el ancho, a partes iguales. */
  fitted?: boolean;
  className?: string;
}

/** Pestañas con activación automática: flechas, Home y End mueven el foco y seleccionan. */
export function Tabs({
  items,
  label,
  value,
  defaultValue,
  onValueChange,
  variant = "underline",
  size = "md",
  fitted,
  className,
}: TabsProps) {
  const baseId = useId();
  const firstEnabled = items.find((item) => !item.disabled)?.value;
  const [uncontrolled, setUncontrolled] = useState(defaultValue ?? firstEnabled);
  const selected = value ?? uncontrolled;
  const tabRefs = useRef(new Map<string, HTMLButtonElement>());

  const select = (next: string) => {
    if (value === undefined) setUncontrolled(next);
    onValueChange?.(next);
  };

  const onKeyDown = (event: KeyboardEvent<HTMLDivElement>) => {
    const enabled = items.filter((item) => !item.disabled);
    const current = enabled.findIndex((item) => item.value === selected);
    let nextIndex: number | null = null;
    if (event.key === "ArrowRight") nextIndex = (current + 1) % enabled.length;
    else if (event.key === "ArrowLeft") nextIndex = (current - 1 + enabled.length) % enabled.length;
    else if (event.key === "Home") nextIndex = 0;
    else if (event.key === "End") nextIndex = enabled.length - 1;
    const next = nextIndex === null ? undefined : enabled[nextIndex];
    if (!next) return;
    event.preventDefault();
    select(next.value);
    tabRefs.current.get(next.value)?.focus();
  };

  const indexOf = (itemValue: string) => items.findIndex((item) => item.value === itemValue);
  const tabId = (itemValue: string) => `${baseId}-tab-${indexOf(itemValue)}`;
  const panelId = (itemValue: string) => `${baseId}-panel-${indexOf(itemValue)}`;

  return (
    <div className={cx("dl-tabs", className)} data-variant={variant} data-size={size} data-fitted={fitted ? "" : undefined}>
      <div role="tablist" aria-label={label} aria-orientation="horizontal" className="dl-tabs__list" onKeyDown={onKeyDown}>
        {items.map((item) => {
          const isSelected = item.value === selected;
          return (
            <button
              key={item.value}
              ref={(node) => {
                if (node) tabRefs.current.set(item.value, node);
                else tabRefs.current.delete(item.value);
              }}
              type="button"
              role="tab"
              id={tabId(item.value)}
              aria-selected={isSelected}
              aria-controls={item.content !== undefined ? panelId(item.value) : undefined}
              tabIndex={isSelected ? 0 : -1}
              disabled={item.disabled}
              className="dl-tabs__tab"
              data-preview-state={item.previewState}
              onClick={() => select(item.value)}
            >
              {renderIcon(item.icon, "dl-tabs__icon")}
              {item.label}
              {item.badge}
            </button>
          );
        })}
      </div>
      {items.map((item) =>
        item.content === undefined ? null : (
          <div
            key={item.value}
            role="tabpanel"
            id={panelId(item.value)}
            aria-labelledby={tabId(item.value)}
            hidden={item.value !== selected}
            tabIndex={0}
            className="dl-tabs__panel"
          >
            {item.content}
          </div>
        ),
      )}
    </div>
  );
}
