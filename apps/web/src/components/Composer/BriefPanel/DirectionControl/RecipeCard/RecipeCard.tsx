"use client";

import type { Locale, StyleRecipe } from "@dialmade/catalog";
import { memo } from "react";
import { DraggableItem } from "@/components/dnd/DraggableItem";
import type { ThemeVars } from "@/hooks/useDesignDoc";
import type { PreviewMode } from "@/hooks/usePaletteFlow";
import { cn } from "@/lib/cn";
import { DND } from "../../../constants";
import { CheckIcon } from "../../../icons";
import { StyleSample } from "../../../StyleSample";

export type RecipeCardProps = {
  recipe: StyleRecipe;
  selected: boolean;
  vars: ThemeVars;
  mode: PreviewMode;
  onApply: (recipeId: string) => void;
  locale: Locale;
  buttonLabel: string;
  currentLabel: string;
};

/** A style recipe with a live sample (card + button) in the user's colors. */
export const RecipeCard = memo(function RecipeCard({ recipe, selected, vars, mode, onApply, locale, buttonLabel, currentLabel }: RecipeCardProps) {
  const name = recipe.label[locale];
  return (
    <DraggableItem
      id={`recipe-${recipe.id}`}
      type={DND.recipe}
      label={name}
      aria-label={selected ? `${name}, ${currentLabel}` : name}
      title={recipe.description[locale]}
      data={{ recipeId: recipe.id }}
      onActivate={() => onApply(recipe.id)}
      className="rounded-card"
    >
      <div
        className={cn(
          "relative flex h-full flex-col overflow-hidden rounded-card border bg-surface transition-[border-color] duration-150",
          selected ? "glow-purple border-transparent" : "border-app hover:border-app-strong",
        )}
      >
        <div className="h-[4.25rem] border-b border-app">
          <StyleSample vars={vars} mode={mode} layout="recipe" buttonLabel={buttonLabel} />
        </div>
        <span className="flex min-w-0 items-center gap-1.5 px-2.5 py-2">
          <span className="truncate text-caption font-medium text-fg">{name}</span>
          {selected && (
            <span aria-hidden className="ms-auto grid size-4 shrink-0 place-items-center rounded-full bg-accent text-white [&_svg]:size-2.5">
              <CheckIcon strokeWidth={2.2} />
            </span>
          )}
        </span>
      </div>
    </DraggableItem>
  );
});
