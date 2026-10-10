"use client";

import { hexToOklch } from "@dialmade/palette";
import { LayoutGroup } from "motion/react";
import type { ReactNode } from "react";
import { AppBackground } from "@/components/AppBackground";
import { HomeHero } from "@/components/HomeHero";
import { LogoCropper } from "@/components/LogoCropper";
import { PaletteLab } from "@/components/PaletteLab";
import { FlowStepper, type FlowStepperStep } from "@/components/PaletteFlow/FlowStepper";
import { docHasDesign, useDesignDoc } from "@/hooks/useDesignDoc";
import { usePaletteFlow } from "@/hooks/usePaletteFlow";
import { useDictionary } from "@/i18n";
import { flow } from "@/i18n/flow";
import type { PromoSceneId } from "../../../../../promo/scenes";
import { SCENE_STEP, type PromoData } from "../../setup";
import { useFlowDriver } from "./useFlowDriver";

export type FlowShellProps = {
  scene: PromoSceneId;
  /** `bg=transparent`: no AppBackground. */
  transparent: boolean;
  data: PromoData;
};

const noop = () => {};

/** PaletteFlow's background tint: the brand hue/chroma at a fixed lightness. */
function tintFor(brand: string | undefined): string | undefined {
  const color = brand ? hexToOklch(brand) : null;
  if (!color) return undefined;
  return `oklch(0.62 ${Math.min(color.c, 0.24).toFixed(3)} ${color.h.toFixed(1)})`;
}

/**
 * The chrome PaletteFlow puts around a step (tinted AppBackground, stepper, `<main>`, the step region
 * and the ExportDialog), around the real step component for the scene, with the props PaletteFlow gives
 * it (callbacks are no-ops: nobody clicks). Renders once the flow reached the scene's step, so no other
 * step ever mounts on the way.
 */
export function FlowShell({ scene, transparent, data }: FlowShellProps) {
  const { state, actions } = usePaletteFlow();
  const doc = useDesignDoc((s) => s.doc);
  const f = useDictionary(flow);
  const target = SCENE_STEP[scene];
  useFlowDriver(target, data.brand, actions);
  if (state.step !== target) return null;

  const { LayoutStep, Composer, ExportDialog } = data.views;
  const hasDesign = !!doc && docHasDesign(doc);
  const stepperStep: FlowStepperStep = scene === "export" ? "export" : target === "layout" || target === "compose" ? target : "brand";

  let content: ReactNode = null;
  let label = f.stage.drop;
  switch (target) {
    case "drop":
      content = <HomeHero onFile={noop} onSkip={noop} onImport={noop} />;
      break;
    case "crop":
      label = f.stage.crop;
      content = state.logo ? <LogoCropper logo={state.logo} initialCrop={state.crop} onConfirm={noop} onCancel={noop} /> : null;
      break;
    case "palette":
      label = f.stage.palette;
      content = <PaletteLab />;
      break;
    case "layout":
      label = f.stage.layout;
      content =
        doc && LayoutStep ? (
          <LayoutStep
            doc={doc}
            initialScreens={data.screens}
            preferredKind={state.previewKind}
            hasImportedGuide={false}
            style={doc.brief.recipeId}
            onStyleChange={noop}
            onGenerate={noop}
            onRevealEnd={noop}
            onMomentChange={noop}
            landmark={false}
          />
        ) : null;
      break;
    case "compose":
      label = f.stage.compose;
      content = doc && Composer ? <Composer onExport={noop} onBack={noop} onEditLayout={noop} onEditBrand={noop} /> : null;
      break;
  }

  return (
    <>
      {!transparent && <AppBackground tint={tintFor(state.theme?.light.brand)} />}
      <LayoutGroup id="palette-flow">
        <main id="main" className="flex flex-1 flex-col gap-4 px-4 pt-4 pb-10 sm:px-6">
          {target !== "drop" && (
            <div>
              <FlowStepper
                current={stepperStep}
                available={{ brand: !!state.primary, layout: !!state.primary, compose: hasDesign, export: hasDesign }}
                onSelect={noop}
              />
            </div>
          )}
          <div className="grid flex-1">
            <section
              data-step={state.step}
              aria-label={label}
              tabIndex={-1}
              className="col-start-1 row-start-1 flex min-w-0 flex-col justify-center outline-none"
            >
              {content}
            </section>
          </div>
        </main>
      </LayoutGroup>
      {doc && ExportDialog && <ExportDialog open={scene === "export"} onOpenChange={noop} />}
    </>
  );
}
