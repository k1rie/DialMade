"use client";

import { hexToOklch } from "@dialmade/palette";
import { AnimatePresence, LayoutGroup, motion } from "motion/react";
import dynamic from "next/dynamic";
import { useCallback, useEffect, useRef, useState, type ReactNode } from "react";
import { toast } from "sonner";
import { AppBackground } from "@/components/AppBackground";
import { DndProvider } from "@/components/dnd/DndProvider";
import { HomeHero } from "@/components/HomeHero";
import type { GenerateResult, LayoutStore } from "@/components/LayoutStep";
import { LogoBurst } from "@/components/LogoBurst";
import { LogoCropper } from "@/components/LogoCropper";
import { PaletteLab } from "@/components/PaletteLab";
import {
  DesignDocProvider,
  docHasDesign,
  selectActiveKey,
  useDesignDoc,
  useDesignDocActions,
  useDesignDocStore,
} from "@/hooks/useDesignDoc";
import { PaletteFlowProvider, flowPhaseOf, usePaletteFlow, type FlowStep } from "@/hooks/usePaletteFlow";
import { useDictionary, useI18n } from "@/i18n";
import { composer } from "@/i18n/composer";
import { flow } from "@/i18n/flow";
import { importText } from "@/i18n/import";
import { LogoFileError, MAX_LOGO_MB, readLogoFile } from "@/lib/image";
import { fadeVariants, stageVariants } from "@/lib/motion";
import { EXPORT_TOASTER_ID } from "@/lib/toasters";
import { FlowStepper, type FlowStepperStep } from "./FlowStepper";
import { enterLayout } from "./layoutEntry";
import { PendingLayoutNotice } from "./PendingLayoutNotice";
import { canTakeStepFocus, focusStranded } from "./stepFocus";
import { useCroppedLogoUrl } from "./useCroppedLogoUrl";
import { useDesignDocSync } from "./useDesignDocSync";
import { useFileDropGuard } from "./useFileDropGuard";
import { useLogoExtraction } from "./useLogoExtraction";
import { usePendingLayout } from "./usePendingLayout";

// «Layout», «Ajustar» and «Exportar» pull @dialmade/sections, @dialmade/ui, @dialmade/doc and @dialmade/layout:
// they load on demand through one chunk boundary (./designHalf) so the Home stays light and their CSS ships once.
const loadDesignHalf = () => import("./designHalf");
const loadEngine = () => loadDesignHalf().then((m) => m.designEngine);
// Client only: the layout store creates block and screen ids, and none may be created while prerendering.
const LayoutStep = dynamic(() => loadDesignHalf().then((m) => m.loadLayoutStep()), { ssr: false });
const Composer = dynamic(() => loadDesignHalf().then((m) => m.loadComposer()), { ssr: false });
const ExportDialog = dynamic(() => loadDesignHalf().then((m) => m.loadExportDialog()), { ssr: false });
// «Trae tu marca»: the panel is light and loads on its own; «Esto detectamos» paints with the doc engine.
const ImportPanel = dynamic(() => import("@/components/ImportPanel").then((m) => m.ImportPanel), { ssr: false });
const DetectedReview = dynamic(() => loadDesignHalf().then((m) => m.loadDetectedReview()), { ssr: false });

function preloadDesignStages() {
  loadDesignHalf()
    .then((m) => Promise.all([m.loadLayoutStep(), m.loadComposer(), m.loadExportDialog()]))
    .catch(() => {});
}

function preloadDetectedReview() {
  loadDesignHalf()
    .then((m) => m.loadDetectedReview())
    .catch(() => {});
}

/** Brand hue/chroma at a fixed lightness so the background orb keeps the same intensity for any logo. */
function tintFor(brand: string | undefined): string | undefined {
  const color = brand ? hexToOklch(brand) : null;
  if (!color) return undefined;
  return `oklch(0.62 ${Math.min(color.c, 0.24).toFixed(3)} ${color.h.toFixed(1)})`;
}

type StageProps = { step: FlowStep; label: string; focusOnEnter: boolean; children: ReactNode };

/** How long a lazy step (Layout, Ajustar) may take to render its title before focus settles on the region. */
const FOCUS_TRIES = 30;

/**
 * One step of the flow. Entering it after a step change, when the focused control went away with the
 * previous step (or nothing is focused), focus lands on its title (or on the step region itself), so
 * keyboard and screen reader users keep their place. Focus on the stepper is left alone. A title is only
 * one that can take focus and belongs to the app (`canTakeStepFocus`): the user's own page headings in
 * Ajustar's preview sit in an inert subtree, and focusing them would leave focus on <body>.
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
      const stranded = focusStranded(active, active === document.body, active !== null && section.contains(active), active === section);
      if (!stranded) return;
      const headings = [...section.querySelectorAll<HTMLElement>("h1"), ...section.querySelectorAll<HTMLElement>("h2")];
      const heading = headings.find(canTakeStepFocus);
      if (heading) {
        if (!heading.hasAttribute("tabindex")) heading.setAttribute("tabindex", "-1");
        heading.focus({ preventScroll: true });
        if (document.activeElement === heading) return;
      }
      if (document.activeElement !== section) section.focus({ preventScroll: true });
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

/** How long the «¿Desbloquear y borrar?» question stays up after a Generar that would delete a locked value. */
const LOCKED_TOAST_MS = 15_000;

/** The active screen of a layout draft, when it still exists. */
function activeScreenOf(store: LayoutStore | undefined): string | undefined {
  const state = store?.getState();
  const id = state?.activeScreenId;
  return id && state && Object.hasOwn(state.screens, id) ? id : undefined;
}

function FlowStage() {
  const { state, actions } = usePaletteFlow();
  const designActions = useDesignDocActions();
  const designStore = useDesignDocStore();
  const doc = useDesignDoc((s) => s.doc);
  const { t, locale } = useI18n();
  const f = useDictionary(flow);
  const imp = useDictionary(importText);
  const composerText = useDictionary(composer);
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

  // The Home and «Trae tu marca» take dropped files themselves.
  useFileDropGuard(state.step !== "drop" && state.step !== "import", () =>
    toast(state.step === "review" ? imp.stage.blockedReview : f.fileDrop.blocked),
  );

  useEffect(() => {
    if (state.step === "palette") preloadDesignStages();
    if (state.step === "import") preloadDetectedReview();
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

  /** The import batch was just a logo: the usual logo flow (crop) takes it, as a new brand. */
  const handleImportLogo = useCallback(
    (file: File) => {
      designActions.reset();
      void handleFile(file);
    },
    [designActions, handleFile],
  );

  const hasDesign = !!doc && docHasDesign(doc);
  // «Ajustar» needs something to show: without it (e.g. reached from the Palette Lab) the flow shows «Layout».
  const designStep = phase === "brand" ? null : state.step === "compose" && hasDesign ? "compose" : "layout";

  // Until something is generated there is no stored copy: the content simply follows the app's language.
  const docLocale = doc?.brief.locale;
  useEffect(() => {
    if (designStep === "layout" && docLocale && !hasDesign && docLocale !== locale) designActions.setContentLocale(locale);
  }, [designStep, docLocale, hasDesign, locale, designActions]);

  /* ---- «Layout»: one draft per document, so leaving the step (Marca, Ajustar) keeps it ---- */
  const [layoutDraft, setLayoutDraft] = useState<{ docId: string; store: LayoutStore } | null>(null);
  const layoutStore = layoutDraft && layoutDraft.docId === docId ? layoutDraft.store : undefined;
  const adoptLayoutStore = useCallback(
    (store: LayoutStore) => {
      if (docId) setLayoutDraft({ docId, store });
    },
    [docId],
  );

  // Style: «Tu guía de estilo» (an imported guide; its values stay locked) or a recipe of the catalog. The guide
  // is the default once an import exists (it may land after the step opened), until the user picks a recipe.
  const hasImportedGuide = (doc?.provenance.imports?.length ?? 0) > 0;
  const [guideChoice, setGuideChoice] = useState<{ docId: string; guide: boolean } | null>(null);
  const guideChosen = guideChoice && guideChoice.docId === docId ? guideChoice.guide : null;
  const layoutStyle = doc ? (hasImportedGuide && (guideChosen ?? true) ? "guide" : doc.brief.recipeId) : undefined;

  const chooseLayoutStyle = useCallback(
    (style: string) => {
      if (!docId) return;
      if (style === "guide") {
        setGuideChoice({ docId, guide: true });
        return;
      }
      const apply = () => designActions.setRecipe(style, { cascade: true });
      const result = apply();
      if (result.ok) {
        setGuideChoice({ docId, guide: false });
        return;
      }
      // Not applied: the picker goes back to what the doc says.
      if (layoutStyle) layoutStore?.getState().actions.setStyle(layoutStyle);
      const lock = result.error.reason === "locked" ? result.error.lock : undefined;
      if (!lock) return;
      // The recipe is locked by an imported guide («tu guía manda»): say so and offer «Desbloquear».
      toast(composerText.direction.lockedByGuide, {
        action: {
          label: composerText.direction.unlockAction,
          onClick: () => {
            designActions.beginBatch();
            const unlocked = designActions.unlock(lock);
            const again = unlocked.ok ? apply() : unlocked;
            if (!again.ok) {
              designActions.cancelBatch();
              return;
            }
            designActions.commitBatch();
            setGuideChoice({ docId, guide: false });
          },
        },
      });
    },
    [docId, designActions, layoutStore, layoutStyle, composerText],
  );

  /**
   * One write of the screens into the doc, then the draft is marked as synced. `false` when it could not be written
   * (its toast says why). `fromLayout`: Ajustar opens on the draft's screen; otherwise (Ajustar's own «Generar»)
   * it stays on the screen it shows.
   */
  const writeGenerate = useCallback(
    (result: GenerateResult, fromLayout: boolean): boolean => {
      // From the notice inside «Exportar» (a modal, above the app's Toaster): its toasts go to the dialog's.
      const toastTarget = exportOpen ? { toasterId: EXPORT_TOASTER_ID } : {};
      const activeKey = fromLayout ? activeScreenOf(layoutStore) : undefined;
      const applied = designActions.applyGenerate(result, activeKey ? { activeKey } : {});
      if (applied.ok) {
        layoutStore?.getState().actions.markSynced(applied.doc);
        return true;
      }
      if (applied.error.reason !== "locked") {
        // Not a «try again»: the same draft would fail the same way. Its edits stay in Layout.
        toast.error(f.generate.invalid, toastTarget);
        return false;
      }
      // A removed block holds a value locked by the guide: deleting it is the user's call.
      toast.warning(f.generate.locked, {
        ...toastTarget,
        duration: LOCKED_TOAST_MS,
        action: {
          label: f.generate.unlockAndDelete,
          onClick: () => {
            // The draft may have changed since that Generar: no markSynced, the next visit merges instead.
            const again = designActions.applyGenerate(result, { allowLocked: true, ...(activeKey && { activeKey }) });
            if (!again.ok) {
              toast.error(t.errors.generic, toastTarget);
              return;
            }
            actions.goToCompose();
          },
        },
      });
      return false;
    },
    [designActions, layoutStore, actions, t, f, exportOpen],
  );

  /** «Generar» of the Layout step. `false` keeps the user in «Layout». */
  const handleGenerate = useCallback((result: GenerateResult) => writeGenerate(result, true), [writeGenerate]);

  /* ---- Ajustar and Exportar while the draft has layout changes that are not generated yet ---- */
  const pendingLayout = usePendingLayout(layoutStore, doc, designStep === "compose" || exportOpen);
  // The notice's «Generar» goes away with the notice: once it is gone, focus goes back to Ajustar.
  const refocusAfterNotice = useRef(false);
  const generateFromNotice = useCallback(() => {
    const store = layoutStore;
    if (!store || !pendingLayout) return;
    let asked = false;
    let written = false;
    store.getState().actions.generate({
      accept: (result) => {
        asked = true;
        written = writeGenerate(result, false);
        return written;
      },
    });
    const toastTarget = exportOpen ? { toasterId: EXPORT_TOASTER_ID } : {};
    // Refused before asking (a document limit): Layout says why.
    if (!asked) toast.error(f.pending.blocked, toastTarget);
    if (!written) return;
    toast.success(f.pending.generated, toastTarget);
    // Inside «Exportar», the dialog keeps focus itself (`ExportDialog`'s `notice`).
    if (!exportOpen) refocusAfterNotice.current = true;
  }, [layoutStore, pendingLayout, writeGenerate, f, exportOpen]);
  /** The notice changes the height above the step: the Composer, which fills the viewport, measures again. */
  const remeasure = useCallback(() => window.dispatchEvent(new Event("resize")), []);
  const onNoticeGone = useCallback(() => {
    remeasure();
    if (!refocusAfterNotice.current) return;
    refocusAfterNotice.current = false;
    const active = document.activeElement;
    if (!active || active === document.body) document.querySelector<HTMLElement>('[data-step="compose"]')?.focus({ preventScroll: true });
  }, [remeasure]);

  /* ---- The stepper waits while Layout's «Generar» moment holds the flow (leaving would cancel its AI request) ---- */
  const [layoutHeld, setLayoutHeld] = useState(false);

  const stepperStep: FlowStepperStep = exportOpen ? "export" : (designStep ?? "brand");
  const showStepper = state.step !== "drop";
  const errorMessage = state.error ? t.errors.extractFailed : undefined;

  /**
   * «Editar layout» (and «Layout» in the stepper from Ajustar or Exportar): back to the draft, synced with the doc,
   * on the screen Ajustar was showing. From «Marca» the draft keeps its own screen, like the lab's «Crear layout».
   */
  const openLayout = useCallback(
    (fromCompose: boolean) => {
      const design = designStore.getState();
      enterLayout(layoutStore, design.doc, fromCompose ? selectActiveKey(design) : null);
      actions.goToLayout();
    },
    [designStore, layoutStore, actions],
  );
  const editLayout = useCallback(() => openLayout(true), [openLayout]);

  const selectStep = useCallback(
    (step: FlowStepperStep) => {
      if (step === "export") {
        setExportOpen(true);
        return;
      }
      setExportOpen(false);
      if (step === "brand") actions.showPalette();
      else if (step === "layout") openLayout(designStep === "compose");
      else actions.goToCompose();
    },
    [actions, setExportOpen, openLayout, designStep],
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
                  available={{ brand: !!state.primary, layout: !!state.primary, compose: hasDesign, export: hasDesign }}
                  busy={layoutHeld && designStep === "layout"}
                  onSelect={selectStep}
                />
              </motion.div>
            )}
          </AnimatePresence>
          <AnimatePresence initial={false} onExitComplete={onNoticeGone}>
            {pendingLayout && designStep === "compose" && (
              <motion.div key="pending" variants={fadeVariants} initial="initial" animate="animate" exit="exit" onAnimationComplete={remeasure} className="mx-auto w-full max-w-[1760px]">
                <PendingLayoutNotice onGenerate={generateFromNotice} />
              </motion.div>
            )}
          </AnimatePresence>
          <div className="grid flex-1">
            <AnimatePresence initial={false}>
              {state.step === "drop" && (
                <Stage key="drop" step="drop" label={f.stage.drop} focusOnEnter={stepChanged}>
                  <HomeHero onFile={handleFile} onSkip={actions.chooseColorWithoutLogo} onImport={actions.openImport} busy={reading} />
                </Stage>
              )}
              {state.step === "import" && (
                <Stage key="import" step="import" label={imp.stage.import} focusOnEnter={stepChanged}>
                  <ImportPanel
                    initialFiles={state.importFiles}
                    draft={state.importSession?.draft}
                    logoSeeds={
                      state.logo && state.extract
                        ? {
                            primary: state.extract.seeds.primary.hex,
                            ...(state.extract.seeds.secondary && { secondary: state.extract.seeds.secondary.hex }),
                          }
                        : undefined
                    }
                    onBack={actions.closeImport}
                    onDetected={actions.reviewImport}
                    onLogo={handleImportLogo}
                  />
                </Stage>
              )}
              {state.step === "review" && state.importSession && (
                <Stage key="review" step="review" label={imp.stage.review} focusOnEnter={stepChanged}>
                  <DetectedReview session={state.importSession} onBack={actions.backToImport} />
                </Stage>
              )}
              {state.step === "crop" && state.logo && (
                <Stage key="crop" step="crop" label={f.stage.crop} focusOnEnter={stepChanged}>
                  <LogoCropper
                    logo={state.logo}
                    initialCrop={state.crop}
                    onConfirm={actions.startExtract}
                    onCancel={actions.cancelCrop}
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
              {designStep === "layout" && doc && (
                <Stage key="layout" step="layout" label={f.stage.layout} focusOnEnter={stepChanged}>
                  <LayoutStep
                    key={docId ?? "doc"}
                    doc={doc}
                    store={layoutStore}
                    onStoreCreate={adoptLayoutStore}
                    preferredKind={state.previewKind}
                    hasImportedGuide={hasImportedGuide}
                    style={layoutStyle}
                    onStyleChange={chooseLayoutStyle}
                    onGenerate={handleGenerate}
                    onGenerateIntent={preloadDesignStages}
                    onRevealEnd={actions.goToCompose}
                    onMomentChange={setLayoutHeld}
                    landmark={false}
                  />
                </Stage>
              )}
              {designStep === "compose" && doc && (
                <Stage key="compose" step="compose" label={f.stage.compose} focusOnEnter={stepChanged}>
                  <Composer
                    onExport={() => setExportOpen(true)}
                    onBack={editLayout}
                    onEditLayout={editLayout}
                    onEditBrand={actions.showPalette}
                  />
                </Stage>
              )}
            </AnimatePresence>
          </div>
        </main>
      </LayoutGroup>
      {doc && (
        <ExportDialog
          open={exportOpen}
          onOpenChange={setExportOpen}
          notice={pendingLayout ? <PendingLayoutNotice onGenerate={generateFromNotice} /> : null}
        />
      )}
    </>
  );
}

/**
 * Orchestrates the whole flow: drop → crop → extracting → palette («1 Marca») → layout («2 Layout») →
 * (or drop/palette → import → review, «Trae tu marca», which lands in palette or layout) →
 * compose («3 Ajustar») + ExportDialog («4 Exportar»). Owns the flow state (PaletteFlowProvider), the
 * DesignDoc store (DesignDocProvider), the Layout draft of each document, the DnD context, the tinted
 * AppBackground and the logo-extraction worker. Steps cross-fade inside one LayoutGroup so `layoutId`s
 * animate between them.
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
