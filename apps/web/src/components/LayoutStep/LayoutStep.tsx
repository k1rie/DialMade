"use client";

import { motion } from "motion/react";
import {
  useCallback,
  useEffect,
  useEffectEvent,
  useId,
  useMemo,
  useRef,
  useState,
  type CSSProperties,
  type FocusEvent,
  type KeyboardEvent,
  type ReactNode,
} from "react";
import { useStore } from "zustand";
import { Button } from "@/components/ui/Button";
import { useDictionary } from "@/i18n";
import { layout } from "@/i18n/layout";
import { cn } from "@/lib/cn";
import { snappy, tween } from "@/lib/motion";
import {
  LAYOUT_BOTTOM_GAP,
  LAYOUT_MIN_HEIGHT,
  NARROW_QUERY,
  REGION_ATTR,
  REGION_AUTOFOCUS_ATTR,
  regionSelector,
} from "./constants";
import { BlocksIcon, LayersIcon } from "./icons";
import type { GenerateResult, LayoutEnv, LayoutRegion, LayoutStepProps, LeftTab } from "./types";
import { useMediaQuery } from "./useMediaQuery";
import {
  createLayoutStore,
  LayoutStoreProvider,
  selectActiveScreen,
  selectSelectedId,
  useChangedCount,
  useLayoutActions,
  useLayoutEnv,
  useLayoutStore,
} from "./useLayoutStore";

const LEFT_TABS: readonly LeftTab[] = ["blocks", "layers"];
const TAB_REGION: Record<LeftTab, LayoutRegion> = { blocks: "library", layers: "layers" };

/** Look of the side panels, the same as the Composer's. */
const PANEL = "flex min-h-0 flex-col overflow-hidden rounded-panel border border-app bg-app-elevated/90 shadow-surface";

const TABBABLE =
  'a[href], button:not([disabled]), input:not([disabled]):not([type="hidden"]), select:not([disabled]), textarea:not([disabled]), [tabindex]:not([tabindex="-1"]), [contenteditable="true"]';

const isVisible = (element: HTMLElement) => element.getClientRects().length > 0;

/**
 * Focuses an F6 area: where focus last was inside it, else its `data-region-autofocus` element, else its
 * first tabbable element, else the area itself (it has tabIndex -1).
 */
function focusInto(region: HTMLElement, remembered: Map<string, HTMLElement>) {
  const name = region.getAttribute(REGION_ATTR) ?? "";
  const last = remembered.get(name);
  const target =
    (last && last.isConnected && region.contains(last) && isVisible(last) ? last : null) ??
    region.querySelector<HTMLElement>(`[${REGION_AUTOFOCUS_ATTR}]`) ??
    Array.from(region.querySelectorAll<HTMLElement>(TABBABLE)).find((element) => element.tabIndex >= 0 && isVisible(element)) ??
    region;
  target.focus();
}

/**
 * «2 Layout» (refs 11B Replit + 11F Klaviyo): screens and the block library / layers on the left, the
 * grid canvas in the middle with the floating tools + Generar bar, the inspector (block or screen) on
 * the right, and the layout top bar above. Owns one layout store per instance (undo/redo of the
 * screens) and the F6 / Shift+F6 cycle between areas. Under 640 px the canvas is replaced by layers +
 * «Añadir bloque» + inspector. Must be rendered inside `DndProvider` (library drags, announcements).
 */
export function LayoutStep({
  doc,
  initialScreens,
  hasImportedGuide = false,
  style,
  onStyleChange,
  onGenerate,
  onGenerateIntent,
  className,
}: LayoutStepProps) {
  const t = useDictionary(layout);
  const baseId = useId();
  const narrow = useMediaQuery(NARROW_QUERY);

  // Ids are only created inside actions (handlers), never here: creating the store makes none.
  const [store] = useState(() =>
    createLayoutStore({
      ...(initialScreens && { screens: initialScreens }),
      style: style ?? (hasImportedGuide ? "guide" : doc.brief.recipeId),
      labelFor: (type) => t.blocks[type].name,
      screenNameFor: (templateId) => t.templates[templateId].name,
      copyName: t.screens.copyName,
    }),
  );
  const actions = useStore(store, (state) => state.actions);
  const leftTab = useStore(store, (state) => state.leftTab);
  const hasScreens = useStore(store, (state) => state.screenOrder.length > 0);
  const activeScreen = useStore(store, selectActiveScreen);
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

  /* ---- F6 areas ---- */
  const remembered = useRef(new Map<string, HTMLElement>());
  const rememberFocus = (event: FocusEvent<HTMLDivElement>) => {
    const region = (event.target as Element).closest<HTMLElement>(`[${REGION_ATTR}]`);
    const name = region?.getAttribute(REGION_ATTR);
    if (name && event.target instanceof HTMLElement && event.target !== region) remembered.current.set(name, event.target);
  };

  const focusRegion = useCallback(
    (region: LayoutRegion) => {
      const tab = (Object.keys(TAB_REGION) as LeftTab[]).find((key) => TAB_REGION[key] === region);
      const focus = () => {
        const element = rootRef.current?.querySelector<HTMLElement>(regionSelector(region));
        if (element) focusInto(element, remembered.current);
      };
      if (tab && store.getState().leftTab !== tab) {
        store.getState().actions.setLeftTab(tab);
        requestAnimationFrame(focus); // after the tab panel renders
        return;
      }
      focus();
    },
    [store],
  );

  useEffect(() => {
    const onKeyDown = (event: globalThis.KeyboardEvent) => {
      if (event.key !== "F6" || event.defaultPrevented || event.altKey || event.ctrlKey || event.metaKey) return;
      const root = rootRef.current;
      if (!root) return;
      const active = document.activeElement;
      // Only from inside the step (or from nothing); a dialog keeps its own focus trap.
      if (active && active !== document.body && !root.contains(active)) return;
      if (active?.closest('[role="dialog"], [aria-modal="true"]')) return;
      const regions = Array.from(root.querySelectorAll<HTMLElement>(`[${REGION_ATTR}]`)).filter(isVisible);
      if (regions.length === 0) return;
      event.preventDefault();
      const current = active?.closest<HTMLElement>(`[${REGION_ATTR}]`) ?? null;
      const index = current ? regions.indexOf(current) : -1;
      const step = event.shiftKey ? -1 : 1;
      const next = index < 0 ? (step > 0 ? 0 : regions.length - 1) : (index + step + regions.length) % regions.length;
      focusInto(regions[next]!, remembered.current);
    };
    document.addEventListener("keydown", onKeyDown);
    return () => document.removeEventListener("keydown", onKeyDown);
  }, []);

  /* ---- Props ↔ store ---- */
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
  const reportGenerate = useEffectEvent((result: GenerateResult) => onGenerate?.(result));
  useEffect(
    () =>
      store.subscribe((state, previous) => {
        if (state.style !== previous.style) reportStyle(state.style);
        if (state.generated && state.generated !== previous.generated) reportGenerate(state.generated);
      }),
    [store],
  );

  // On a phone the layers list is the main view (no free drag on a canvas).
  useEffect(() => {
    if (narrow) actions.setLeftTab("layers");
  }, [actions, narrow]);

  // Stable for the env (the parent may pass a new function every render).
  const intentRef = useRef(onGenerateIntent);
  useEffect(() => {
    intentRef.current = onGenerateIntent;
  }, [onGenerateIntent]);
  const generateIntent = useCallback(() => intentRef.current?.(), []);

  const env = useMemo<LayoutEnv>(
    () => ({ doc, hasImportedGuide, narrow, onGenerateIntent: generateIntent, focusRegion }),
    [doc, hasImportedGuide, narrow, generateIntent, focusRegion],
  );

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
    actions.setLeftTab(LEFT_TABS[next]!);
    tabRefs.current[next]?.focus();
  };
  const leftRegion = TAB_REGION[leftTab];

  /* ---- Areas ---- */
  const topBar = (
    // PLACEHOLDER → <LayoutTopBar /> (LayoutStep/LayoutTopBar): screen name + kind, device, «Ver estructura», undo/redo, shortcuts, «Estilo».
    <RegionPlaceholder component="LayoutTopBar" name={t.topBar.label} className="min-h-12 flex-none" />
  );

  const screensArea = (
    <section
      data-layout-region="screens"
      aria-label={t.regions.screens}
      tabIndex={-1}
      className={cn(PANEL, "shrink-0 overflow-y-auto overscroll-contain p-3 lg:max-h-[42%]")}
    >
      {/* PLACEHOLDER → <ScreensPanel /> (LayoutStep/ScreensPanel): list, rename, duplicate, reorder, «+ Pantalla». */}
      <RegionPlaceholder component="ScreensPanel" name={t.regions.screens} />
    </section>
  );

  const leftArea = (
    <section
      data-layout-region={leftRegion}
      aria-label={t.regions[leftRegion]}
      tabIndex={-1}
      className={cn(PANEL, "min-h-[24rem] flex-1 lg:min-h-0")}
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
              aria-controls={selected ? `${baseId}-panel-${id}` : undefined}
              tabIndex={selected ? 0 : -1}
              onClick={() => actions.setLeftTab(id)}
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
      <motion.div
        key={leftTab}
        role="tabpanel"
        id={`${baseId}-panel-${leftTab}`}
        aria-labelledby={`${baseId}-tab-${leftTab}`}
        className="flex min-h-0 flex-1 flex-col overflow-y-auto overscroll-contain p-3"
        initial={{ opacity: 0 }}
        animate={{ opacity: 1 }}
        transition={tween(0.14)}
      >
        {leftTab === "blocks" ? (
          // PLACEHOLDER → <BlockLibrary /> (LayoutStep/BlockLibrary): search, «Sugeridos», categories; click/Enter inserts.
          <RegionPlaceholder component="BlockLibrary" name={t.regions.library} />
        ) : (
          // PLACEHOLDER → <LayersList /> (LayoutStep/LayersList): APG treeview in reading order.
          <RegionPlaceholder component="LayersList" name={t.regions.layers} />
        )}
      </motion.div>
    </section>
  );

  const inspectorArea = (
    <section
      data-layout-region="inspector"
      aria-label={t.regions.inspector}
      tabIndex={-1}
      className={cn(PANEL, "min-h-[16rem] overflow-y-auto overscroll-contain p-4 lg:min-h-0")}
    >
      {selectedId ? (
        // PLACEHOLDER → <BlockInspector /> (LayoutStep/BlockInspector): props of the selected block.
        <RegionPlaceholder component="BlockInspector" name={t.inspector.title} />
      ) : (
        // PLACEHOLDER → <ScreenPanel /> (LayoutStep/ScreenPanel): screen props, navigation frame, StylePicker.
        <RegionPlaceholder component="ScreenPanel" name={t.screenPanel.title} />
      )}
    </section>
  );

  const generateBar = (
    // PLACEHOLDER → <GenerateBar /> (LayoutStep/GenerateBar): Dibujar · Editar · Mano + status + Generar.
    <GenerateBarPlaceholder name={t.bottomBar.label} />
  );

  let body;
  if (!hasScreens) {
    body = (
      <section aria-label={t.templatePicker.region} className="flex flex-1 flex-col">
        {/* PLACEHOLDER → <TemplatePicker /> (LayoutStep/TemplatePicker): «SaaS app», «Landing», «En blanco». */}
        <RegionPlaceholder component="TemplatePicker" name={t.templatePicker.region} className="min-h-[24rem]">
          <div className="flex flex-wrap justify-center gap-2">
            <Button size="sm" onClick={() => actions.applySet("saas-app")}>
              {t.sets["saas-app"].name}
            </Button>
            <Button size="sm" onClick={() => actions.applySet("landing")}>
              {t.sets.landing.name}
            </Button>
          </div>
        </RegionPlaceholder>
      </section>
    );
  } else if (narrow) {
    body = (
      <div className="flex flex-col gap-3">
        <p className="rounded-control border border-app bg-white/[0.02] px-3 py-2 text-caption text-muted">{t.narrow.message}</p>
        {screensArea}
        <Button variant="primary" size="md" aria-label={t.narrow.addBlockLabel} onClick={() => focusRegion("library")}>
          {t.narrow.addBlock}
        </Button>
        {leftArea}
        {inspectorArea}
        <div className="sticky bottom-3 z-20 flex justify-center">{generateBar}</div>
      </div>
    );
  } else {
    body = (
      <div className="grid min-h-0 flex-1 grid-cols-1 gap-3 lg:grid-cols-[18rem_minmax(0,1fr)_18rem]">
        <div className="order-2 flex min-h-0 flex-col gap-3 lg:order-none">
          {screensArea}
          {leftArea}
        </div>
        <div className="relative order-1 flex min-h-[36rem] min-w-0 flex-col lg:order-none lg:min-h-0">
          <section
            data-layout-region="canvas"
            aria-label={activeScreen ? t.canvas.region(activeScreen.name) : t.regions.canvas}
            tabIndex={-1}
            className="relative flex min-h-0 flex-1 flex-col rounded-panel"
          >
            {/* PLACEHOLDER → <LayoutCanvas /> (LayoutStep/LayoutCanvas): grid frame, blocks, gestures, draw tool. */}
            <RegionPlaceholder component="LayoutCanvas" name={t.regions.canvas} className="rounded-panel" />
          </section>
          {/* Floats over the canvas but stays outside its area: canvas-only shortcuts do not fire from the bar. */}
          <div className="pointer-events-none absolute inset-x-0 bottom-4 z-20 flex justify-center px-4 [&>*]:pointer-events-auto">{generateBar}</div>
        </div>
        <div className="order-3 flex min-h-0 flex-col lg:order-none">{inspectorArea}</div>
      </div>
    );
  }

  return (
    <LayoutStoreProvider store={store} env={env}>
      <div
        ref={measureRef}
        role="region"
        aria-label={t.region}
        onFocus={rememberFocus}
        className={cn("mx-auto flex w-full max-w-[1760px] flex-col gap-3", hasScreens && !narrow && "lg:h-(--layout-h)", className)}
        style={{ "--layout-h": height ? `${height}px` : `max(${LAYOUT_MIN_HEIGHT}px, calc(100dvh - 11rem))` } as CSSProperties}
      >
        {hasScreens && topBar}
        {body}
      </div>
    </LayoutStoreProvider>
  );
}

/* ------------------------------------------------------------------------------------------------ */
/* TEMPORARY scaffolding: each placeholder is replaced by its component (see the comment at each use). */
/* ------------------------------------------------------------------------------------------------ */

type RegionPlaceholderProps = { component: string; name: string; className?: string; children?: ReactNode };

function RegionPlaceholder({ component, name, className, children }: RegionPlaceholderProps) {
  return (
    <div
      data-region={component}
      data-placeholder=""
      className={cn(
        "flex min-h-16 flex-1 flex-col items-center justify-center gap-3 rounded-card border border-dashed border-app-strong p-4 text-center text-caption text-subtle",
        className,
      )}
    >
      <span className="font-medium text-muted">{name}</span>
      {children}
    </div>
  );
}

/** Keeps «Generar» usable from the dev route until GenerateBar lands. */
function GenerateBarPlaceholder({ name }: { name: string }) {
  const t = useDictionary(layout);
  const actions = useLayoutActions();
  const { onGenerateIntent } = useLayoutEnv();
  const generated = useLayoutStore((state) => state.generated !== null);
  const changed = useChangedCount();
  const label = !generated ? t.generate.button : changed > 0 ? t.generate.regenerate(changed) : t.generate.upToDate;
  return (
    <div
      data-region="GenerateBar"
      data-placeholder=""
      role="toolbar"
      aria-label={name}
      className="glass flex items-center gap-3 rounded-panel border border-app p-2 shadow-lift"
    >
      <span className="ps-2 text-caption text-subtle">{name}</span>
      <Button variant="primary" size="sm" onClick={() => actions.generate()} onPointerEnter={onGenerateIntent} onFocus={onGenerateIntent}>
        {label}
      </Button>
    </div>
  );
}
