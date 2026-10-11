"use client";

import { resolveRecipe } from "@dialmade/catalog";
import type { DesignDoc } from "@dialmade/doc";
import { PALETTE_STYLES, type PaletteStyleId } from "@dialmade/palette";
import { useMemo } from "react";
import { PanelSection } from "@/components/ui/PanelSection";
import type { PreviewMode } from "@/hooks/usePaletteFlow";
import { useDictionary, useI18n } from "@/i18n";
import { composer } from "@/i18n/composer";
import { DARK_PALETTE_STYLES } from "../../constants";
import { sampleVars } from "../../previewVars";
import { useComposerActions } from "../../useComposerActions";
import { SampleCard } from "../SampleCard";

export type PaletteGridProps = {
  doc: DesignDoc;
};

/**
 * «Paleta»: how the brand's color is spread (the 8 palette styles), each card painted with the document's own style
 * and brand. Recipes and their variants have their own pickers; this is the one place of «Ajustar» for the palette.
 */
export function PaletteGrid({ doc }: PaletteGridProps) {
  const { locale } = useI18n();
  const t = useDictionary(composer);
  const { applyPalette } = useComposerActions();

  const preferred = resolveRecipe(doc.brief.recipeId, doc.brief.themeId)?.preferredMode;
  const cards = useMemo(
    () =>
      PALETTE_STYLES.map((style) => {
        const mode: PreviewMode = preferred ?? (DARK_PALETTE_STYLES.has(style.id) ? "dark" : "light");
        const name = style.label[locale];
        return {
          id: style.id,
          mode,
          vars: sampleVars(doc, { paletteStyleId: style.id }, mode),
          name,
          description: t.palette.cardLabel(name, style.description[locale]),
          selected: doc.brief.paletteStyleId === style.id,
        };
      }),
    [doc, locale, t, preferred],
  );

  return (
    <PanelSection title={t.palette.title} hint={t.palette.hint}>
      <ul role="list" className="grid grid-cols-4 gap-x-2 gap-y-3">
        {cards.map((card) => (
          <li key={card.id} className="min-w-0">
            <SampleCard
              value={card.id}
              vars={card.vars}
              mode={card.mode}
              selected={card.selected}
              name={card.name}
              description={card.selected ? `${card.description}, ${t.themes.current}` : card.description}
              onApply={(value, mode) => value && applyPalette(value as PaletteStyleId, mode)}
            />
          </li>
        ))}
      </ul>
    </PanelSection>
  );
}
