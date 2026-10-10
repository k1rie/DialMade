"use client";

import { DEFAULT_PAIRING_ID, defaultPairing, getStyleRecipe, getTypographyPairing, typographyPairings, type TypographyPairing } from "@dialmade/catalog";
import type { DesignDoc } from "@dialmade/doc";
import { useMemo } from "react";
import { useDictionary, useI18n } from "@/i18n";
import { composer } from "@/i18n/composer";
import { FONT_PACKS_VISIBLE } from "../../constants";
import { PairingCard } from "../../PairingCard";
import { PanelSection } from "../../PanelSection";
import { useComposerActions } from "../../useComposerActions";

export type FontPacksProps = {
  doc: DesignDoc;
};

/** «Packs de fuentes» (Buffer): the pairings that suit the current style and product, in their fonts. */
export function FontPacks({ doc }: FontPacksProps) {
  const { locale } = useI18n();
  const t = useDictionary(composer);
  const { applyPairing } = useComposerActions();
  const recipe = getStyleRecipe(doc.brief.recipeId);

  const packs = useMemo(() => {
    // Depends on the style and product only, so picking a pack never reshuffles the list.
    const ids = [recipe?.pairingId, defaultPairing(doc.brief.productType).id, DEFAULT_PAIRING_ID, ...typographyPairings.map((p) => p.id)];
    const unique = [...new Set(ids.filter((id): id is string => !!id))];
    return unique
      .map((id) => getTypographyPairing(id))
      .filter((p): p is TypographyPairing => !!p)
      .slice(0, FONT_PACKS_VISIBLE);
  }, [recipe?.pairingId, doc.brief.productType]);

  return (
    <PanelSection title={t.fonts.title} hint={recipe ? t.fonts.suggested(recipe.label[locale]) : undefined}>
      <ul role="list" className="grid grid-cols-2 gap-2">
        {packs.map((pairing) => (
          <li key={pairing.id}>
            <PairingCard
              pairing={pairing}
              selected={pairing.id === doc.brief.pairingId}
              onApply={applyPairing}
              idPrefix="pack-pairing"
              variant="pack"
              locale={locale}
              sample={t.fonts.sample}
              currentLabel={t.themes.current}
            />
          </li>
        ))}
      </ul>
    </PanelSection>
  );
}
