"use client";

import type { OutputKind } from "@dialmade/catalog";
import { hexToOklch } from "@dialmade/palette";
import { AnimatePresence, LayoutGroup, motion } from "motion/react";
import dynamic from "next/dynamic";
import { useCallback, useEffect, useRef, useState, type ReactNode } from "react";
import { toast } from "sonner";
import { AppBackground } from "@/components/AppBackground";
import { DndProvider } from "@/components/dnd/DndProvider";
import { HomeHero } from "@/components/HomeHero";
import { LogoBurst } from "@/components/LogoBurst";
import { LogoCropper } from "@/components/LogoCropper";
import { PaletteLab } from "@/components/PaletteLab";
import { DesignDocProvider, useDesignDoc, useDesignDocActions } from "@/hooks/useDesignDoc";
import { PaletteFlowProvider, flowPhaseOf, usePaletteFlow, type FlowStep } from "@/hooks/usePaletteFlow";
import { useDictionary, useI18n } from "@/i18n";
import { flow } from "@/i18n/flow";
import { LogoFileError, MAX_LOGO_MB, readLogoFile } from "@/lib/image";
import { fadeVariants, stageVariants } from "@/lib/motion";
import { FlowStepper, type FlowStepperStep } from "./FlowStepper";
import { useCroppedLogoUrl } from "./useCroppedLogoUrl";
import { useDesignDocSync } from "./useDesignDocSync";
import { useFileDropGuard } from "./useFileDropGuard";
import { useLogoExtraction } from "./useLogoExtraction";

// «Crear», «Ajustar» and «Exportar» pull @dialmade/sections, @dialmade/ui and @dialmade/doc: they load on
// demand through one chunk boundary (./designHalf) so the Home stays light and their CSS ships once.
const loadDesignHalf = () => import("./designHalf");
const loadEngine = () => loadDesignHalf().then((m) => m.designEngine);
const CreateStep = dynamic(() => loadDesignHalf().then((m) => m.loadCreateStep()), { ssr: false });
const Composer = dynamic(() => loadDesignHalf().then((m) => m.loadComposer()), { ssr: false });
const ExportDialog = dynamic(() => loadDesignHalf().then((m) => m.loadExportDialog()), { ssr: false });

function preloadDesignStages() {
  loadDesignHalf()
    .then((m) => Promise.all([m.loadCreateStep(), m.loadComposer(), m.loadExportDialog()]))
    .catch(() => {});
}

/** Brand hue/chroma at a fixed lightness so the background orb keeps the same intensity for any logo. */
function tintFor(brand: string | undefined): string | undefined {
  const color = brand ? hexToOklch(brand) : null;
  if (!color) return undefined;
  return `oklch(0.62 ${Math.min(color.c, 0.24).toFixed(3)} ${color.h.toFixed(1)})`;
}

type StageProps = { step: FlowStep; label: string; focusOnEnter: boolean; children: ReactNode };

/** How long a lazy step (Crear, Ajustar) may take to render its title before focus settles on the region. */
const FOCUS_TRIES = 30;

/**
 * One step of the flow. Entering it after a step change, when the focused control went away with the
 * previous step (or nothing is focused), focus lands on its title (or on the step region itself), so
 * keyboard and screen reader users keep their place. Focus on the stepper is left alone.
 */
function Stage({ step, label, focusOnEnter, children }: StageProps) {
  const ref = useRef<HTMLElement>(null);
  useEffect(() => {
    const section = ref.current;
    if (!focusOnEnter || !section) return;
    let frame = 0;
    let tries = 0;
    const settle = () => {
      const active = document.activeElement;
      const stranded =
        !active || active === document.body || active === section || (active.closest("[data-step]") !== null && !section.contains(active));
      if (!stranded) return;
      const heading = section.querySelector<HTMLElement>("h1") ?? section.querySelector<HTMLElement>("h2");
      if (heading) {
        if (!heading.hasAttribute("tabindex")) heading.setAttribute("tabindex", "-1");
        heading.focus({ preventScroll: true });
        return;
      }
      if (active !== section) section.focus({ preventScroll: true });
      if (++tries < FOCUS_TRIES) frame = requestAnimationFrame(settle);
    };
    settle();
    return () => cancelAnimationFrame(frame);
  }, [focusOnEnter]);

  return (
    <motion.section
      ref={ref}
      key={step}
      data-step={step}
      aria-label={label}
      tabIndex={-1}
      variants={stageVariants}
      initial="initial"
      animate="animate"
      exit="exit"
      className="col-start-1 row-start-1 flex min-w-0 flex-col justify-center outline-none"
    >
      {children}
    </motion.section>
  );
}

function FlowStage() {
  const { state, actions } = usePaletteFlow();
  const designActions = useDesignDocActions();
  const doc = useDesignDoc((s) => s.doc);
  const { t } = useI18n();
  const f = useDictionary(flow);
  const [reading, setReading] = useState(false);
  // Focus moves into a step only after the first step change, never on page load.
  const [shownStep, setShownStep] = useState(state.step);
  const [stepChanged, setStepChanged] = useState(false);
  if (shownStep !== state.step) {
    setShownStep(state.step);
    setStepChanged(true);
  }
  // The dialog belongs to one document: starting over (new doc) never reopens it.
  const docId = doc?.provenance.createdAt ?? null;
  const [exportFor, setExportFor] = useState<string | null>(null);
  const exportOpen = docId !== null && exportFor === docId;
  const setExportOpen = useCallback((open: boolean) => setExportFor(open ? docId : null), [docId]);

  const messageFor = useCallback(
    (error: unknown) => {
      if (error instanceof LogoFileError) {
        if (error.code === "unsupported-type") return t.errors.unsupportedType;
        if (error.code === "too-large") return t.errors.tooLarge(MAX_LOGO_MB);
        return t.errors.decodeFailed;
      }
      return t.errors.extractFailed;
    },
    [t],
  );

  const onExtractError = useCallback((error: unknown) => toast.error(messageFor(error)), [messageFor]);
  useLogoExtraction(state, actions, onExtractError);

  const onDocError = useCallback(() => {
    toast.error(t.errors.generic);
    actions.showPalette();
  }, [t, actions]);
  useDesignDocSync(state, actions, onDocError);

  const phase = flowPhaseOf(state.step);
  const logoUrl = useCroppedLogoUrl(state.logo, state.crop, state.step === "palette" || phase !== "brand");
  useEffect(() => designActions.setLogoUrl(logoUrl), [designActions, logoUrl]);

  useFileDropGuard(state.step !== "drop", () => toast(f.fileDrop.blocked));

  useEffect(() => {
    if (state.step === "palette") preloadDesignStages();
  }, [state.step]);

  const handleFile = useCallback(
    async (file: File) => {
      setReading(true);
      try {
        actions.setLogo(await readLogoFile(file));
      } catch (error) {
        toast.error(messageFor(error));
      } finally {
        setReading(false);
      }
    },
    [actions, messageFor],
  );

  const handleCreate = useCallback(
    (kind: OutputKind) => {
      const result = designActions.setFocus(kind);
      if (!result.ok) {
        toast.error(t.errors.generic);
        return;
      }
      actions.setPreviewKind(kind);
      actions.goToCompose();
    },
    [designActions, actions, t],
  );

  const hasPages = !!doc && Object.values(doc.pages).some(Boolean);
  // «Ajustar» needs a page: without one (e.g. reached from the Palette Lab) the flow shows «Crear».
  const designStep = phase === "brand" ? null : state.step === "compose" && hasPages ? "compose" : "create";
  const stepperStep: FlowStepperStep = exportOpen ? "export" : (designStep ?? "brand");
  const showStepper = state.step !== "drop";
  const errorMessage = state.error ? t.errors.extractFailed : undefined;

  const selectStep = useCallback(
    (step: FlowStepperStep) => {
      if (step === "export") {
        setExportOpen(true);
        return;
      }
      setExportOpen(false);
      if (step === "brand") actions.showPalette();
      else if (step === "create") actions.goToCreate();
      else actions.goToCompose();
    },
    [actions, setExportOpen],
  );

  return (
    <>
      <AppBackground tint={tintFor(state.theme?.light.brand)} />
      <LayoutGroup id="palette-flow">
        <main id="main" className="flex flex-1 flex-col gap-4 px-4 pt-4 pb-10 sm:px-6">
          <AnimatePresence initial={false}>
            {showStepper && (
              <motion.div key="stepper" variants={fadeVariants} initial="initial" animate="animate" exit="exit">
                <FlowStepper
                  current={stepperStep}
                  available={{ brand: !!state.primary, create: !!state.primary, compose: hasPages, export: hasPages }}
                  onSelect={selectStep}
                />
              </motion.div>
            )}
          </AnimatePresence>
          <div className="grid flex-1">
            <AnimatePresence initial={false}>
              {state.step === "drop" && (
                <Stage key="drop" step="drop" label={f.stage.drop} focusOnEnter={stepChanged}>
                  <HomeHero onFile={handleFile} onSkip={actions.chooseColorWithoutLogo} busy={reading} />
                </Stage>
              )}
              {state.step === "crop" && state.logo && (
                <Stage key="crop" step="crop" label={f.stage.crop} focusOnEnter={stepChanged}>
                  <LogoCropper
                    logo={state.logo}
                    initialCrop={state.crop}
                    onConfirm={actions.startExtract}
                    onCancel={actions.reset}
                    error={errorMessage}
                  />
                </Stage>
              )}
              {state.step === "extracting" && state.logo && (
                <Stage key="extracting" step="extracting" label={f.stage.extracting} focusOnEnter={stepChanged}>
                  <LogoBurst logo={state.logo} crop={state.crop} extract={state.extract} onComplete={actions.showPalette} />
                </Stage>
              )}
              {state.step === "palette" && (
                <Stage key="palette" step="palette" label={f.stage.palette} focusOnEnter={stepChanged}>
                  <PaletteLab />
                </Stage>
              )}
              {designStep === "create" && doc && (
                <Stage key="create" step="create" label={f.stage.create} focusOnEnter={stepChanged}>
                  <CreateStep initialKind={state.previewKind} onCreate={handleCreate} onBack={actions.showPalette} />
                </Stage>
              )}
              {designStep === "compose" && doc && (
                <Stage key="compose" step="compose" label={f.stage.compose} focusOnEnter={stepChanged}>
                  <Composer onExport={() => setExportOpen(true)} onBack={actions.goToCreate} onEditBrand={actions.showPalette} />
                </Stage>
              )}
            </AnimatePresence>
          </div>
        </main>
      </LayoutGroup>
      {doc && <ExportDialog open={exportOpen} onOpenChange={setExportOpen} />}
    </>
  );
}

/**
 * Orchestrates the whole flow: drop → crop → extracting → palette («1 Marca») → create («2 Crear») →
 * compose («3 Ajustar») + ExportDialog («4 Exportar»). Owns the flow state (PaletteFlowProvider), the
 * DesignDoc store (DesignDocProvider), the DnD context, the tinted AppBackground and the
 * logo-extraction worker. Steps cross-fade inside one LayoutGroup so `layoutId`s animate between them.
 */
export function PaletteFlow() {
  return (
    <PaletteFlowProvider>
      <DesignDocProvider loadEngine={loadEngine}>
        <DndProvider>
          <FlowStage />
        </DndProvider>
      </DesignDocProvider>
    </PaletteFlowProvider>
  );
}
