"use client";

// Loaded on demand (./loadPreviewStage): it pulls @dialmade/doc, @dialmade/sections and @dialmade/ui, which
// must stay out of the Home bundle.
import type { Locale, OutputKind } from "@dialmade/catalog";
import { compileThemeVars, createDesignDoc, resolveThemeInputs, type DesignDoc } from "@dialmade/doc";
import type { Theme } from "@dialmade/palette";
import { SketchApp, SketchBrand, SketchLanding, contentContextFromDoc } from "@dialmade/sections";
import { AnimatePresence, motion } from "motion/react";
import { useMemo } from "react";
import { ThemeScope } from "@/components/ThemeScope";
import { useDesignDoc } from "@/hooks/useDesignDoc";
import type { PreviewMode } from "@/hooks/usePaletteFlow";
import { tween } from "@/lib/motion";
import { MINI_BASE_WIDTH } from "../../constants";
import { FitScale } from "./FitScale";

export type PreviewStageProps = {
  kind: OutputKind;
  /** Live theme of the Palette Lab (it wins over the doc's palette, which only syncs on «Layout»). */
  theme: Theme;
  mode: PreviewMode;
  locale: Locale;
  brandName: string;
  logoUrl?: string;
};

// Sketches, not the real minis: before the user picks a direction, the preview must not read as the final design.
const SKETCHES = { brand: SketchBrand, landing: SketchLanding, app: SketchApp } as const;
const MINI_HEIGHT = (MINI_BASE_WIDTH * 5) / 8;

/** Placeholder doc while the flow has none: catalog defaults (recipe, pairing, motion) for a generic product. */
function draftDoc(name: string, locale: Locale): DesignDoc {
  return createDesignDoc({ brand: { name, seeds: { primary: "#7c5cff" }, achromatic: false }, brief: { locale } });
}

/**
 * The sketch of the selected output kind (named boxes, «Esquema» tag), painted with the live theme inside
 * ThemeScope and scaled to the frame. With a DesignDoc (the user came back from «Layout»), its fonts apply.
 */
export function PreviewStage({ kind, theme, mode, locale, brandName, logoUrl }: PreviewStageProps) {
  const storeDoc = useDesignDoc((state) => state.doc);
  const draft = useMemo(() => (storeDoc ? null : draftDoc(brandName, locale)), [storeDoc, brandName, locale]);
  const doc = storeDoc ?? draft!;

  const inputs = useMemo(() => resolveThemeInputs(doc, { theme }), [doc, theme]);
  const vars = useMemo(() => compileThemeVars(doc, { ...inputs, mode }), [doc, inputs, mode]);
  const ctx = useMemo(
    () => contentContextFromDoc(doc, { locale, ...(logoUrl && { logoUrl }) }),
    [doc, locale, logoUrl],
  );
  const Sketch = SKETCHES[kind];

  return (
    <ThemeScope vars={vars} pairing={inputs.pairing} mode={mode} kind={null} locale={locale} className="relative aspect-[8/5] w-full overflow-hidden">
      <FitScale width={MINI_BASE_WIDTH} height={MINI_HEIGHT}>
        <AnimatePresence initial={false}>
          <motion.div
            key={kind}
            className="col-start-1 row-start-1 w-full"
            initial={{ opacity: 0, y: 4, scale: 0.985 }}
            animate={{ opacity: 1, y: 0, scale: 1 }}
            exit={{ opacity: 0, scale: 0.985 }}
            transition={tween(0.24)}
          >
            <Sketch ctx={ctx} />
          </motion.div>
        </AnimatePresence>
      </FitScale>
    </ThemeScope>
  );
}
