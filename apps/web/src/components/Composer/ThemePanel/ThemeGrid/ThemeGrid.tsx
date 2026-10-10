"use client";

import { getStyleRecipe } from "@dialmade/catalog";
import type { DesignDoc } from "@dialmade/doc";
import { AnimatePresence, motion } from "motion/react";
import { useMemo, useState } from "react";
import { PanelSection } from "@/components/ui/PanelSection";
import type { PreviewMode } from "@/hooks/usePaletteFlow";
import { useDictionary, useI18n } from "@/i18n";
import { composer } from "@/i18n/composer";
import { smooth } from "@/lib/motion";
import { DARK_PALETTE_STYLES, THEME_COMBOS, THEMES_VISIBLE, type ThemeCombo } from "../../constants";
import { recipeChoice, sampleVars } from "../../previewVars";
import { paletteStyleLabel, useComposerActions } from "../../useComposerActions";
import { ThemeCard } from "./ThemeCard";

export type ThemeGridProps = {
  doc: DesignDoc;
};

const cardMode = (combo: ThemeCombo): PreviewMode =>
  getStyleRecipe(combo.recipeId)?.preferredMode ?? (DARK_PALETTE_STYLES.has(combo.paletteStyleId) ? "dark" : "light");

/** «Temas» (Buffer): a grid of theme cards, 8 visible and the rest behind «Ver más». */
export function ThemeGrid({ doc }: ThemeGridProps) {
  const { locale } = useI18n();
  const t = useDictionary(composer);
  const { applyTheme } = useComposerActions();
  const [expanded, setExpanded] = useState(false);

  const cards = useMemo(
    () =>
      THEME_COMBOS.map((combo) => {
        const mode = cardMode(combo);
        const recipe = getStyleRecipe(combo.recipeId);
        const style = recipe?.label[locale] ?? combo.recipeId;
        const palette = paletteStyleLabel(combo.paletteStyleId, locale);
        return {
          combo,
          mode,
          vars: sampleVars(doc, { paletteStyleId: combo.paletteStyleId, ...recipeChoice(doc, combo.recipeId) }, mode),
          name: t.themes.card(style, palette),
          description: t.themes.cardLabel(style, palette),
          selected: doc.brief.paletteStyleId === combo.paletteStyleId && doc.brief.recipeId === combo.recipeId,
        };
      }),
    [doc, locale, t],
  );
  const visible = expanded ? cards : cards.slice(0, THEMES_VISIBLE);
  const current = cards.find((card) => card.selected);
  const hiddenCount = cards.length - THEMES_VISIBLE;

  return (
    <PanelSection title={t.themes.title} hint={t.themes.hint}>
      <motion.ul role="list" layout className="grid grid-cols-4 gap-2" transition={smooth}>
        <AnimatePresence initial={false}>
          {visible.map((card) => (
            <motion.li
              key={card.combo.id}
              layout="position"
              initial={{ opacity: 0, scale: 0.94 }}
              animate={{ opacity: 1, scale: 1 }}
              exit={{ opacity: 0, scale: 0.94 }}
              transition={smooth}
            >
              <ThemeCard
                combo={card.combo}
                vars={card.vars}
                mode={card.mode}
                selected={card.selected}
                name={card.name}
                description={card.selected ? `${card.description}, ${t.themes.current}` : card.description}
                onApply={applyTheme}
              />
            </motion.li>
          ))}
        </AnimatePresence>
      </motion.ul>
      <motion.div layout="position" transition={smooth} className="flex items-center justify-between gap-2">
        <p className="min-w-0 truncate text-caption text-muted">{current ? `${t.themes.current}: ${current.name}` : " "}</p>
        <button
          type="button"
          aria-expanded={expanded}
          onClick={() => setExpanded((value) => !value)}
          className="shrink-0 rounded-[8px] border border-app px-2 py-1 text-caption font-medium text-muted transition-colors hover:border-app-strong hover:text-fg"
        >
          {expanded ? t.themes.less : t.themes.more(hiddenCount)}
        </button>
      </motion.div>
    </PanelSection>
  );
}
