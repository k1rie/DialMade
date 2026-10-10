"use client";

import { memo } from "react";
import { DraggableItem } from "@/components/dnd/DraggableItem";
import type { ThemeVars } from "@/hooks/useDesignDoc";
import type { PreviewMode } from "@/hooks/usePaletteFlow";
import { cn } from "@/lib/cn";
import { DND, type ThemeCombo } from "../../../constants";
import { CheckIcon } from "../../../icons";
import { StyleSample } from "../../../StyleSample";

export type ThemeCardProps = {
  combo: ThemeCombo;
  vars: ThemeVars;
  mode: PreviewMode;
  selected: boolean;
  /** Short visible name («Cristal · Marca»). */
  name: string;
  /** Accessible name. */
  description: string;
  onApply: (combo: ThemeCombo, mode: PreviewMode) => void;
};

/** A palette style × recipe theme, painted with the user's brand; click or drag it onto the page. */
export const ThemeCard = memo(function ThemeCard({ combo, vars, mode, selected, name, description, onApply }: ThemeCardProps) {
  return (
    <DraggableItem
      id={`theme-${combo.id}`}
      type={DND.theme}
      label={name}
      aria-label={description}
      title={name}
      data={{ comboId: combo.id, mode }}
      onActivate={() => onApply(combo, mode)}
      className="rounded-card"
    >
      <div
        className={cn(
          "relative aspect-[4/5] overflow-hidden rounded-card border transition-[border-color] duration-150",
          selected ? "glow-purple border-transparent" : "border-app hover:border-app-strong",
        )}
      >
        <StyleSample vars={vars} mode={mode} layout="theme" />
        {selected && (
          <span aria-hidden className="absolute right-1 bottom-1 grid size-4 place-items-center rounded-full bg-accent text-white [&_svg]:size-2.5">
            <CheckIcon strokeWidth={2.2} />
          </span>
        )}
      </div>
    </DraggableItem>
  );
});
