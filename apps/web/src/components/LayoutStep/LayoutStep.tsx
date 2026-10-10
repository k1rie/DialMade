"use client";

import { MAX_SCREENS } from "@dialmade/doc";
import { MAX_BLOCKS, sanitizeLabel, type LibraryBlockType } from "@dialmade/layout";
import { motion, useIsPresent } from "motion/react";
import {
  useCallback,
  useEffect,
  useEffectEvent,
  useId,
  useMemo,
  useRef,
  useState,
  type CSSProperties,
  type KeyboardEvent,
} from "react";
import { toast } from "sonner";
import { useStore } from "zustand";
import { AiKeyDialog } from "@/components/AiKeyDialog";
import { useDndAnnounce } from "@/components/dnd/DndAnnouncer";
import { Button } from "@/components/ui/Button";
import type { AiCopyResult } from "@/hooks/useAiCopy";
import { useToastClearance } from "@/hooks/useToastClearance";
import { locales, useDictionary } from "@/i18n";
import { layout } from "@/i18n/layout";
import { cn } from "@/lib/cn";
import { snappy, tween } from "@/lib/motion";
import { AiRunBar } from "./AiRunBar";
import { BlockInspector } from "./BlockInspector";
import { BlockLibrary } from "./BlockLibrary";
import { LAYOUT_BOTTOM_GAP, LAYOUT_MIN_HEIGHT, NARROW_QUERY, WIDE_QUERY } from "./constants";
import { GenerateBar } from "./GenerateBar";
import { countStats } from "./GenerateBar/barState";
import { BlocksIcon, LayersIcon } from "./icons";
import { LayersList } from "./LayersList";
import { LayoutCanvas } from "./LayoutCanvas";
import { LayoutTopBar } from "./LayoutTopBar";
import { ScreenPanel } from "./ScreenPanel";
import { ScreensPanel } from "./ScreensPanel";
import { TemplatePicker } from "./TemplatePicker";
import type { GenerateResult, LayoutEnv, LayoutStepProps, LeftTab } from "./types";
import { GenerateAiProvider, useGenerateFlow } from "./useGenerateFlow";
import { LayoutAiDialogProvider, type LayoutAiDialog, type LayoutAiDialogRequest, type LayoutAiResult } from "./useLayoutAi";
import { createLayoutStore, LayoutStoreProvider, selectActiveScreen, selectSelectedId } from "./useLayoutStore";
import { TAB_REGION, useLayoutShortcuts } from "./useLayoutShortcuts";
import { useMediaQuery } from "./useMediaQuery";

const LEFT_TABS: readonly LeftTab[] = ["blocks", "layers"];

/** A label that is still a type's default name in any UI language: a type change renames it. */
const isDefaultLabel = (type: LibraryBlockType, label: string) =>
  locales.some((locale) => sanitizeLabel(layout[locale].blocks[type].name) === label);

/** Look of the side panels, the same as the Composer's. */
const PANEL = "flex min-h-0 flex-col overflow-hidden rounded-panel border border-app bg-app-elevated/90 shadow-surface";

/** The inactive tab panel stays mounted (search, open categories, scroll) but hidden; the shown one fades in. */
const TAB_PANEL = { active: { opacity: 1 }, inactive: { opacity: 0 } } as const;

/** Sonner id of the «máximo de pantallas / bloques» refusal: a second refusal replaces it instead of stacking. */
const LIMIT_TOAST_ID = "layout-limit";

/**
 * «2 Layout» (refs 11B Replit + 11F Klaviyo): screens and the block library / layers on the left, the
 * grid canvas in the middle with the floating tools + Generar bar, the inspector (block or screen) on
 * the right, and the layout top bar above. Without screens, the template picker. Edits one layout store
 * (undo/redo of the screens): the flow's (`store`, one per DesignDoc, so the draft survives leaving the
 * step) or its own. The draft follows `doc.screens` (`syncFromDoc`: Ajustar's edits and undo come in).
 * Owns the areas F6 / Shift+F6 cycle through and the props ↔ store wiring. Under 640 px the canvas is
 * replaced by layers + «Añadir bloque» + inspector. Must be rendered inside `DndProvider` (library drags,
 * announcements).
 *
 * «Generar» (`useGenerateFlow`): the flow writes the result (`onGenerate`), the canvas plays the signature moment
 * over the generated page, the optional AI copy runs in one request (its bar replaces the GenerateBar while the
 * page stays) and `onRevealEnd` hands over to «Ajustar». While the moment holds the flow, `onMomentChange` says
 * so (the flow's stepper waits).
 *
 * An action refused by a document limit (24 screens, 200 blocks in a screen) says why in a toast.
 */
export function LayoutStep({
  doc,
  store: externalStore,
  onStoreCreate,
  initialScreens,
  preferredKind,
  hasImportedGuide = false,
  style,
  onStyleChange,
  onGenerate,
  onGenerateIntent,
  onRevealEnd,
  onMomentChange,
  landmark = true,
  className,
}: LayoutStepProps) {
  const t = useDictionary(layout);
  const baseId = useId();
  const narrow = useMediaQuery(NARROW_QUERY);
  // Desktop first on the server: the three columns side by side.
  const wide = useMediaQuery(WIDE_QUERY, true);

  // Ids are only created inside actions (handlers), never here: creating the store makes none. The draft is
  // synced with the doc before the first paint (syncing again is a no-op), so it never shows stale screens.
  const [{ store, created }] = useState(() => {
    const layoutStore =
      externalStore ??
      createLayoutStore({
        ...(initialScreens && { screens: initialScreens }),
        style: style ?? (hasImportedGuide ? "guide" : doc.brief.recipeId),
        labelFor: (type) => t.blocks[type].name,
        screenNameFor: (templateId) => t.templates[templateId].name,
        copyName: t.screens.copyName,
        isDefaultLabel,
      });
    layoutStore.getState().actions.syncFromDoc(doc);
    return { store: layoutStore, created: !externalStore };
  });
  const actions = useStore(store, (state) => state.actions);
  const leftTab = useStore(store, (state) => state.leftTab);
  const hasScreens = useStore(store, (state) => state.screenOrder.length > 0);
  const activeScreenName = useStore(store, (state) => selectActiveScreen(state)?.name ?? null);
  const selectedId = useStore(store, selectSelectedId);

  /* ---- Height: like the Composer, on large screens the step fills the viewport below it. ---- */
  const rootRef = useRef<HTMLDivElement | null>(null);
  const [height, setHeight] = useState<number | null>(null);
  const measureRef = useCallback((root: HTMLDivElement | null) => {
    rootRef.current = root;
    if (!root) return;
    let frame = 0;
    const measure = () => {
      cancelAnimationFrame(frame);
      frame = requestAnimationFrame(() => {
        const top = root.getBoundingClientRect().top + window.scrollY;
        setHeight(Math.max(LAYOUT_MIN_HEIGHT, Math.round(window.innerHeight - top - LAYOUT_BOTTOM_GAP)));
      });
    };
    measure();
    const settle = setTimeout(measure, 450);
    window.addEventListener("resize", measure);
    return () => {
      cancelAnimationFrame(frame);
      clearTimeout(settle);
      window.removeEventListener("resize", measure);
      rootRef.current = null;
    };
  }, []);

  // Toasts («Ajustado · Deshacer») sit above the floating canvas bar instead of covering it.
  const toastClearanceRef = useToastClearance();

  /* ---- F6 areas (the other shortcuts live in the canvas and the layers tree) ---- */
  const { focusRegion, rememberFocus } = useLayoutShortcuts(rootRef, store);

  /* ---- Props ↔ store ---- */
  const reportStore = useEffectEvent(() => onStoreCreate?.(store));
  useEffect(() => {
    if (created) reportStore();
  }, [created]);

  // The doc's screens change outside the step (undo in Ajustar, hidden blocks…): the draft follows.
  const docScreens = doc.screens;
  const docOrder = doc.screenOrder;
  useEffect(() => {
    actions.syncFromDoc({ screens: docScreens, screenOrder: docOrder });
  }, [actions, docScreens, docOrder]);

  // New block and screen names follow the UI language.
  useEffect(() => {
    actions.setLabelers({
      labelFor: (type) => t.blocks[type].name,
      screenNameFor: (templateId) => t.templates[templateId].name,
      copyName: t.screens.copyName,
    });
  }, [actions, t]);

  // `style` from outside wins; a pick inside is reported with onStyleChange (Fase B: setRecipe).
  useEffect(() => {
    if (style !== undefined) actions.setStyle(style);
  }, [actions, style]);
  const reportStyle = useEffectEvent((next: string) => {
    if (next !== style) onStyleChange?.(next);
  });
  useEffect(
    () =>
      store.subscribe((state, previous) => {
        if (state.style !== previous.style) reportStyle(state.style);
      }),
    [store],
  );

  /* ---- «Generar»: the flow writes it, the canvas plays the moment, the optional AI writes the copy ---- */
  const announce = useDndAnnounce({ politeness: "polite" });
  const announceGenerated = useCallback(
    (result: GenerateResult) => {
      const totals = countStats(result.screens);
      announce(t.announce.generated(totals.screens, totals.blocks));
    },
    [announce, t],
  );
  // Inside the flow's AnimatePresence: false while the step leaves (its moment then moves the flow nowhere).
  const present = useIsPresent();
  const flow = useGenerateFlow({ store, narrow, present, onGenerate, onRevealEnd, announceGenerated });
  const { reveal, leaving, generate, endPlaying, holdsFlow } = flow;

  // The flow's stepper waits while the moment holds it (leaving would cancel the AI request); never after unmount.
  const reportMoment = useEffectEvent((holds: boolean) => onMomentChange?.(holds));
  useEffect(() => {
    reportMoment(holdsFlow);
  }, [holdsFlow]);
  useEffect(() => () => reportMoment(false), []);

  // A refusal at a document limit (the store did nothing): say why, whichever control asked.
  const limitText = useRef({ screens: t.screens.limitReached(MAX_SCREENS), blocks: t.common.blockLimit(MAX_BLOCKS) });
  useEffect(() => {
    limitText.current = { screens: t.screens.limitReached(MAX_SCREENS), blocks: t.common.blockLimit(MAX_BLOCKS) };
  }, [t]);
  useEffect(
    () =>
      store.subscribe((state, previous) => {
        if (state.limitHit && state.limitHit !== previous.limitHit) toast(limitText.current[state.limitHit.limit], { id: LIMIT_TOAST_ID });
      }),
    [store],
  );

  // «Bloques» is the left tab on desktop. On a phone the layers list is the main view (no canvas to drag
  // onto); widening again goes back to «Bloques» unless the user picked a tab in between.
  const autoLayers = useRef(false);
  useEffect(() => {
    const { leftTab: tab, actions: storeActions } = store.getState();
    if (narrow) {
      if (tab !== "blocks") return;
      autoLayers.current = true;
      storeActions.setLeftTab("layers");
    } else if (autoLayers.current) {
      autoLayers.current = false;
      if (tab === "layers") storeActions.setLeftTab("blocks");
    }
  }, [narrow, store]);
  const chooseTab = (tab: LeftTab) => {
    autoLayers.current = false;
    actions.setLeftTab(tab);
  };

  // Stable for the env (the parent may pass a new function every render).
  const intentRef = useRef(onGenerateIntent);
  useEffect(() => {
    intentRef.current = onGenerateIntent;
  }, [onGenerateIntent]);
  const generateIntent = useCallback(() => intentRef.current?.(), []);

  const kind = preferredKind ?? doc.brief.focus;
  const env = useMemo<LayoutEnv>(
    () => ({ doc, hasImportedGuide, preferredKind: kind, narrow, onGenerateIntent: generateIntent, generate, reveal, endReveal: endPlaying, focusRegion }),
    [doc, hasImportedGuide, kind, narrow, generateIntent, generate, reveal, endPlaying, focusRegion],
  );

  /* ---- The layout AI's way out («Describe tu producto», «Sugerir con IA»): BYOK or «mi Claude» ---- */
  // Owned here, not by the part that asks: the «¿Qué es esto?» popover closes as soon as the dialog takes the pointer.
  const [layoutAiDialog, setLayoutAiDialog] = useState<LayoutAiDialogRequest | null>(null);
  const [layoutAi] = useState<LayoutAiDialog>(() => ({ open: (request) => setLayoutAiDialog(request) }));

  /* ---- Left tabs (Bloques | Capas) ---- */
  const tabRefs = useRef<(HTMLButtonElement | null)[]>([]);
  const onTabKeyDown = (event: KeyboardEvent<HTMLDivElement>) => {
    const current = LEFT_TABS.indexOf(leftTab);
    let next: number | undefined;
    if (event.key === "ArrowRight" || event.key === "ArrowLeft") {
      next = (current + (event.key === "ArrowRight" ? 1 : -1) + LEFT_TABS.length) % LEFT_TABS.length;
    } else if (event.key === "Home") next = 0;
    else if (event.key === "End") next = LEFT_TABS.length - 1;
    if (next === undefined) return;
    event.preventDefault();
    chooseTab(LEFT_TABS[next]!);
    tabRefs.current[next]?.focus();
  };
  const leftRegion = TAB_REGION[leftTab];

  // The area components take no props and read the store themselves. Stable elements keep this shell's
  // own re-renders (selection follows focus on the canvas, the tab, the screen name) from re-rendering
  // all of them: only the components whose store slices changed render again.
  const parts = useMemo(
    () => ({
      topBar: <LayoutTopBar className="flex-none" />,
      screens: <ScreensPanel />,
      library: <BlockLibrary />,
      layers: <LayersList />,
      canvas: <LayoutCanvas />,
      generateBar: <GenerateBar />,
      blockInspector: <BlockInspector />,
      screenPanel: <ScreenPanel />,
      templatePicker: <TemplatePicker />,
    }),
    [],
  );

  /* ---- The floating bar: Generar, or the AI copy's run while the generated page stays ---- */
  const leaveReveal = flow.keepEditing;
  const keepEditing = useCallback(() => {
    leaveReveal();
    // The boxes come back (the grid is no longer inert after this render): focus returns to the canvas.
    requestAnimationFrame(() => focusRegion("canvas"));
  }, [leaveReveal, focusRegion]);
  const bar = leaving ? null : reveal?.phase === "holding" ? (
    <AiRunBar onCancel={flow.cancel} onKeepEditing={keepEditing} onFinish={flow.finish} />
  ) : (
    parts.generateBar
  );
  const { ai, run } = flow.aiValue;
  const dialogReason = (run.kind === "failed" ? run.fallback : null) ?? (ai.available ? null : ai.fallbackReason);
  // While the generated page shows, the panels pause (no edit can land under it): the bar decides what's next.
  const paused = reveal !== null;
  const pausedLook = reveal?.phase === "holding" && "opacity-60 transition-opacity duration-200";

  /* ---- Areas ---- */
  const screensArea = (
    <section
      data-layout-region="screens"
      aria-label={t.regions.screens}
      tabIndex={-1}
      inert={paused}
      className={cn(PANEL, "shrink-0 overflow-y-auto overscroll-contain p-3 lg:max-h-[42%]", pausedLook)}
    >
      {parts.screens}
    </section>
  );

  const leftArea = (
    <section
      data-layout-region={leftRegion}
      aria-label={t.regions[leftRegion]}
      tabIndex={-1}
      inert={paused}
      className={cn(PANEL, "min-h-[24rem] flex-1 lg:min-h-0", pausedLook)}
    >
      <div role="tablist" aria-label={t.topBar.leftPanel} onKeyDown={onTabKeyDown} className="flex shrink-0 gap-1 border-b border-app px-3 pt-2">
        {LEFT_TABS.map((id, index) => {
          const selected = id === leftTab;
          const Icon = id === "blocks" ? BlocksIcon : LayersIcon;
          return (
            <button
              key={id}
              ref={(element) => {
                tabRefs.current[index] = element;
              }}
              type="button"
              role="tab"
              id={`${baseId}-tab-${id}`}
              aria-selected={selected}
              aria-controls={`${baseId}-panel-${id}`}
              tabIndex={selected ? 0 : -1}
              onClick={() => chooseTab(id)}
              className={cn(
                "relative inline-flex h-9 items-center gap-1.5 rounded-t-[8px] px-2.5 text-small font-medium transition-colors [&_svg]:size-3.5",
                selected ? "text-fg" : "text-muted hover:text-fg",
              )}
            >
              <Icon />
              {t.topBar.leftTabs[id]}
              {selected && (
                <motion.span layoutId={`${baseId}-tab`} aria-hidden className="absolute inset-x-2 -bottom-px h-0.5 rounded-full bg-accent" transition={snappy} />
              )}
            </button>
          );
        })}
      </div>
      {LEFT_TABS.map((id) => {
        const selected = id === leftTab;
        return (
          <motion.div
            key={id}
            role="tabpanel"
            id={`${baseId}-panel-${id}`}
            aria-labelledby={`${baseId}-tab-${id}`}
            hidden={!selected}
            className="flex min-h-0 flex-1 flex-col overflow-y-auto overscroll-contain p-3"
            variants={TAB_PANEL}
            initial={false}
            animate={selected ? "active" : "inactive"}
            transition={tween(0.14)}
          >
            {id === "blocks" ? parts.library : parts.layers}
          </motion.div>
        );
      })}
    </section>
  );

  const inspectorArea = (
    <section
      data-layout-region="inspector"
      aria-label={t.regions.inspector}
      tabIndex={-1}
      inert={paused}
      className={cn(PANEL, "min-h-[16rem] overflow-y-auto overscroll-contain p-4 lg:min-h-0", pausedLook)}
    >
      {selectedId ? parts.blockInspector : parts.screenPanel}
    </section>
  );

  let body;
  if (!hasScreens) {
    // A group, not a landmark: the step (and the flow's stage around it) already is one.
    body = (
      <div role="group" aria-label={t.templatePicker.region} className="flex flex-1 flex-col">
        {parts.templatePicker}
      </div>
    );
  } else if (narrow) {
    body = (
      <div className="flex flex-col gap-3">
        <p className="rounded-control border border-app bg-white/[0.02] px-3 py-2 text-caption text-muted">{t.narrow.message}</p>
        {screensArea}
        <Button variant="primary" size="md" aria-label={t.narrow.addBlockLabel} disabled={paused} onClick={() => focusRegion("library")}>
          {t.narrow.addBlock}
        </Button>
        {leftArea}
        {inspectorArea}
        <div ref={toastClearanceRef} className="sticky bottom-3 z-20 flex justify-center">
          {bar}
        </div>
      </div>
    );
  } else {
    const sideColumn = (
      <div key="side" className="order-2 flex min-h-0 flex-col gap-3 lg:order-none">
        {screensArea}
        {leftArea}
      </div>
    );
    const canvasColumn = (
      <div key="canvas" className="relative order-1 flex min-h-[36rem] min-w-0 flex-col lg:order-none lg:min-h-0">
        <section
          data-layout-region="canvas"
          aria-label={activeScreenName !== null ? t.canvas.region(activeScreenName) : t.regions.canvas}
          tabIndex={-1}
          className="relative flex min-h-0 flex-1 flex-col rounded-panel"
        >
          {parts.canvas}
        </section>
        {/* Floats over the canvas but stays outside its area: canvas-only shortcuts do not fire from the bar. */}
        <div
          ref={toastClearanceRef}
          className="pointer-events-none absolute inset-x-0 bottom-4 z-20 flex justify-center px-4 [&>*]:pointer-events-auto"
        >
          {bar}
        </div>
      </div>
    );
    const inspectorColumn = (
      <div key="inspector" className="order-3 flex min-h-0 flex-col lg:order-none">
        {inspectorArea}
      </div>
    );
    body = (
      <div className="grid min-h-0 flex-1 grid-cols-1 gap-3 lg:grid-cols-[18rem_minmax(0,1fr)_18rem]">
        {/* Stacked (under lg) the canvas is shown first: it goes first in the DOM too, so Tab and F6 follow
            what is seen (2.4.3). The `order` classes keep that look before hydration. */}
        {wide ? [sideColumn, canvasColumn, inspectorColumn] : [canvasColumn, sideColumn, inspectorColumn]}
      </div>
    );
  }

  return (
    <LayoutStoreProvider store={store} env={env}>
      <LayoutAiDialogProvider value={layoutAi}>
        <GenerateAiProvider value={flow.aiValue}>
          <div
            ref={measureRef}
            // Standalone, the step is its own landmark; inside the flow its stage already is «Layout».
            {...(landmark && { role: "region", "aria-label": t.region })}
            onFocus={rememberFocus}
            className={cn("mx-auto flex w-full max-w-[1760px] flex-col gap-3", hasScreens && !narrow && "lg:h-(--layout-h)", className)}
            style={{ "--layout-h": height ? `${height}px` : `max(${LAYOUT_MIN_HEIGHT}px, calc(100dvh - 11rem))` } as CSSProperties}
          >
            {hasScreens && (
              <div inert={paused} className={cn("flex-none", pausedLook)}>
                {parts.topBar}
              </div>
            )}
            {body}
          </div>
          <AiKeyDialog<AiCopyResult>
            open={flow.dialog !== null}
            onOpenChange={(next) => {
              if (!next) flow.closeDialog();
            }}
            reason={dialogReason}
            manual={flow.manual}
            initialView={flow.dialog ?? "key"}
            onManualResult={flow.onManualResult}
            onKeySaved={flow.onKeySaved}
          />
          <AiKeyDialog<LayoutAiResult>
            open={layoutAiDialog !== null}
            onOpenChange={(next) => {
              if (!next) setLayoutAiDialog(null);
            }}
            reason={layoutAiDialog?.reason ?? null}
            manual={layoutAiDialog?.manual ?? null}
            initialView={layoutAiDialog?.view ?? "key"}
            onManualResult={(result) => layoutAiDialog?.onManualResult?.(result)}
            onKeySaved={() => layoutAiDialog?.onKeySaved?.()}
          />
        </GenerateAiProvider>
      </LayoutAiDialogProvider>
    </LayoutStoreProvider>
  );
}
