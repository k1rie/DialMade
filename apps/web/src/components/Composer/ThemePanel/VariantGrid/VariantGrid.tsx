"use client";

import { getStyleRecipe, getThemeRecipe, resolveRecipe, themesByArchetype, type ThemeShape } from "@dialmade/catalog";
import type { DesignDoc } from "@dialmade/doc";
import { useMemo, useState } from "react";
import { PanelSection } from "@/components/ui/PanelSection";
import type { PreviewMode } from "@/hooks/usePaletteFlow";
import { useDictionary, useI18n } from "@/i18n";
import { composer } from "@/i18n/composer";
import { deriveDesign } from "@/lib/design-derived";
import { CARDS_VISIBLE } from "../../constants";
import { recipeChoice, sampleVars } from "../../previewVars";
import { useComposerActions } from "../../useComposerActions";
import { SampleCard } from "../SampleCard";

export type VariantGridProps = {
  doc: DesignDoc;
};

const SOURCE_NAME: Record<ThemeShape["source"], string> = { daisyui: "daisyUI", tweakcn: "tweakcn" };

/**
 * «Variantes»: the imported themes (daisyUI, tweakcn) that belong to the current style, plus the plain style, painted
 * with the user's palette. A variant changes the shape (radii, border, shadow, button) and never the colors.
 */
export function VariantGrid({ doc }: VariantGridProps) {
  const { locale } = useI18n();
  const t = useDictionary(composer);
  const { applyVariant } = useComposerActions();
  const [expanded, setExpanded] = useState(false);
  const groups = useMemo(() => themesByArchetype(), []);

  const recipeId = doc.brief.recipeId;
  const recipe = getStyleRecipe(recipeId);
  const variants = useMemo(() => groups[recipeId] ?? [], [groups, recipeId]);
  const activeId = resolveRecipe(recipeId, doc.brief.themeId)?.id ?? recipeId;
  const defaultMode: PreviewMode = deriveDesign(doc).theme.defaultMode;

  const cards = useMemo(() => {
    if (!recipe || variants.length === 0) return [];
    const style = recipe.label[locale];
    const plain = {
      id: null as string | null,
      mode: recipe.preferredMode ?? defaultMode,
      vars: sampleVars(doc, recipeChoice(doc, recipeId), recipe.preferredMode ?? defaultMode),
      name: t.variants.base,
      description: t.variants.baseLabel(style),
      selected: activeId === recipeId,
    };
    const themed = variants.map((shape) => {
      const mode: PreviewMode = getThemeRecipe(shape.id)?.preferredMode ?? defaultMode;
      return {
        id: shape.id as string | null,
        mode,
        vars: sampleVars(doc, { ...recipeChoice(doc, recipeId), themeId: shape.id }, mode),
        name: shape.label,
        description: t.variants.cardLabel(shape.label, SOURCE_NAME[shape.source]),
        selected: activeId === shape.id,
      };
    });
    return [plain, ...themed];
  }, [doc, recipe, recipeId, variants, locale, t, defaultMode, activeId]);

  if (!recipe || cards.length === 0) return null;
  const visible = expanded ? cards : cards.slice(0, CARDS_VISIBLE);
  const hiddenCount = cards.length - CARDS_VISIBLE;

  return (
    <PanelSection title={t.variants.title} hint={t.variants.hint(recipe.label[locale])}>
      <ul role="list" className="grid grid-cols-4 gap-x-2 gap-y-3">
        {visible.map((card) => (
          <li key={card.id ?? "base"} className="min-w-0">
            <SampleCard
              value={card.id}
              vars={card.vars}
              mode={card.mode}
              selected={card.selected}
              name={card.name}
              description={card.selected ? `${card.description}, ${t.variants.current}` : card.description}
              onApply={(value, mode) => applyVariant(value, mode)}
            />
          </li>
        ))}
      </ul>
      {hiddenCount > 0 && (
        <button
          type="button"
          aria-expanded={expanded}
          onClick={() => setExpanded((value) => !value)}
          className="self-end rounded-[8px] border border-app px-2 py-1 text-caption font-medium text-muted transition-colors hover:border-app-strong hover:text-fg"
        >
          {expanded ? t.variants.less : t.variants.more(hiddenCount)}
        </button>
      )}
    </PanelSection>
  );
}
