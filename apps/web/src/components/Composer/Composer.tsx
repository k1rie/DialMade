"use client";

import { outputKindOptions } from "@dialmade/catalog";
import { hasScreens, type PageKey } from "@dialmade/doc";
import { useCallback, useEffect, useMemo, useState, type CSSProperties } from "react";
import { toast } from "sonner";
import { AiCopyError, useAiCopy, type AiCopyRequest, type AiCopyResult } from "@/hooks/useAiCopy";
import {
  selectActiveKey,
  useActiveKey,
  useDesignDerived,
  useDesignDoc,
  useDesignDocActions,
  useDesignDocStore,
  useDesignHistory,
} from "@/hooks/useDesignDoc";
import { useDictionary, useI18n } from "@/i18n";
import { ai as aiText } from "@/i18n/ai";
import { composer } from "@/i18n/composer";
import { cn } from "@/lib/cn";
import type { DroppedItem } from "@/lib/dnd";
import { formatUsd } from "@/lib/money";
import { linkedScreen } from "@/lib/screen-layout";
import { AiRunBar } from "./AiRunBar";
import { opensAiMenu } from "./aiWayOut";
import { BriefPanel } from "./BriefPanel";
import { Canvas } from "./Canvas";
import { ComposerTopBar } from "./ComposerTopBar";
import { DND } from "./constants";
import { DeckFonts } from "./DeckFonts";
import { canHide, hiddenOps, isHidden, moveOps, pageTarget, type PageTarget } from "./pageOps";
import { sectionInfo } from "./sectionInfo";
import { ThemePanel } from "./ThemePanel";
import { useComposerActions } from "./useComposerActions";
import { useComposerShortcuts } from "./useComposerShortcuts";

export type ComposerProps = {
  /** Opens the ExportDialog (stepper «4 Exportar»). */
  onExport: () => void;
  /** Back to «Layout» (the draft of the screens; legacy documents pick a starting set there). */
  onBack: () => void;
  /** Back to the Palette Lab to change colors; the doc keeps its pages and edits. */
  onEditBrand: () => void;
  /** «Editar layout» (default: `onBack`, which also goes to «Layout»). */
  onEditLayout?: () => void;
  className?: string;
};

type Selection = { key: PageKey; id: string };

/** The AI request for a page: the screen (Modo Layout) or the page kind; only `sectionIds` when given. */
function copyRequest(target: PageTarget, sectionIds?: string[], instructions?: string): AiCopyRequest {
  const extra = instructions ? { instructions } : {};
  return target.screen
    ? { screens: [{ id: target.screen.id, ...(sectionIds && { sectionIds }) }], ...extra }
    : { kind: target.kind, ...(sectionIds && { sectionIds }), ...extra };
}

const MIN_HEIGHT = 600;
const BOTTOM_GAP = 24;

/**
 * «3 Ajustar» (DESIGN-BRIEF §6.3, refs 3C Replit + 3A Buffer): brief, dials and direction cards on
 * the left, the live page in a device frame in the middle (select a section → floating toolbar),
 * themes, button color and font packs on the right. Cards apply by click or by dragging onto the
 * page or a slot; every edit is a validated patch with undo/redo (⌘Z / ⇧⌘Z).
 */
export function Composer({ onExport, onBack, onEditBrand, onEditLayout, className }: ComposerProps) {
  const { locale } = useI18n();
  const t = useDictionary(composer);
  const texts = useDictionary(aiText);
  const doc = useDesignDoc((state) => state.doc);
  const mode = useDesignDoc((state) => state.previewMode);
  const device = useDesignDoc((state) => state.device);
  const logoUrl = useDesignDoc((state) => state.logoUrl);
  const activeKey = useActiveKey();
  const derived = useDesignDerived(activeKey);
  const actions = useDesignDocActions();
  const store = useDesignDocStore();
  const history = useDesignHistory();
  const ai = useAiCopy();
  const { applyRecipe, applyPairing } = useComposerActions();

  const [selection, setSelection] = useState<Selection | null>(null);
  const [revealKey, setRevealKey] = useState(0);
  const [aiMenuOpen, setAiMenuOpen] = useState(false);
  const [aiSection, setAiSection] = useState<string | null>(null);
  const [height, setHeight] = useState<number | null>(null);
  // «Probar» (documents with screens): the preview behaves like the site and its links switch screens.
  const [playing, setPlaying] = useState(false);
  const [navigationKey, setNavigationKey] = useState(0);
  // Polite status for the play mode; `n` makes the same message announce again (a second visit to a screen).
  const [status, setStatus] = useState({ text: "", n: 0 });
  const announce = useCallback((text: string) => setStatus((current) => ({ text, n: current.n + 1 })), []);

  // On large screens the Composer fills the viewport below the stepper; the columns scroll inside.
  const measureRef = useCallback((root: HTMLDivElement | null) => {
    if (!root) return;
    let frame = 0;
    const measure = () => {
      cancelAnimationFrame(frame);
      frame = requestAnimationFrame(() => {
        const top = root.getBoundingClientRect().top + window.scrollY;
        setHeight(Math.max(MIN_HEIGHT, Math.round(window.innerHeight - top - BOTTOM_GAP)));
      });
    };
    measure();
    const settle = setTimeout(measure, 450);
    window.addEventListener("resize", measure);
    return () => {
      cancelAnimationFrame(frame);
      clearTimeout(settle);
      window.removeEventListener("resize", measure);
    };
  }, []);

  // On a phone the desktop frame would render at ~20 %: start the preview at the device's own width.
  useEffect(() => {
    if (window.matchMedia("(max-width: 639px)").matches && store.getState().device === "desktop") actions.setDevice("mobile");
  }, [store, actions]);

  /** A screen by its name, a page by its kind («Guía de estilo», legacy «Landing page»…). */
  const labelOf = useCallback(
    (target: Pick<PageTarget, "kind" | "screen">) =>
      target.screen?.name ?? outputKindOptions.find((option) => option.id === target.kind)?.label[locale] ?? target.kind,
    [locale],
  );

  /** The page shown right now, read from the store (handlers run after renders). */
  const activeTarget = useCallback((): PageTarget | null => {
    const state = store.getState();
    const key = selectActiveKey(state);
    return state.doc && key ? pageTarget(state.doc, key) : null;
  }, [store]);

  const selectFromCanvas = useCallback(
    (id: string) => {
      const target = activeTarget();
      if (target) setSelection({ key: target.key, id });
    },
    [activeTarget],
  );
  /** «Editar» / «Probar». Entering play mode drops the selection (its toolbar edits, play mode does not). */
  const changePlaying = useCallback(
    (next: boolean) => {
      setPlaying(next);
      if (next) setSelection(null);
      announce(next ? t.canvas.use.playing : t.canvas.use.editing);
    },
    [announce, t],
  );

  /** A screen link activated in «Probar»: its screen becomes the active page, as if its tab had been picked. */
  const navigate = useCallback(
    (linkId: string) => {
      const doc = store.getState().doc;
      const to = doc ? linkedScreen(doc, linkId) : null;
      if (!doc || !to) return;
      actions.setActiveKey(to);
      setNavigationKey((key) => key + 1);
      announce(t.canvas.use.arrived(doc.screens[to]!.name));
    },
    [store, actions, announce, t],
  );

  const selectFromList = useCallback(
    (id: string) => {
      // Picking a section to adjust is editing.
      if (playing) changePlaying(false);
      selectFromCanvas(id);
      setRevealKey((key) => key + 1);
    },
    [selectFromCanvas, playing, changePlaying],
  );
  const deselect = useCallback(() => setSelection(null), []);

  const moveSection = useCallback(
    (id: string, delta: -1 | 1) => {
      const target = activeTarget();
      // On a screen the layout decides the order: it changes in «Editar layout».
      const ops = target && !target.screen ? moveOps(target.key, target.page, id, delta) : null;
      if (ops && actions.applyPatch(ops).ok) setRevealKey((key) => key + 1);
    },
    [activeTarget, actions],
  );

  const hideSection = useCallback(
    (id: string) => {
      const target = activeTarget();
      if (!target || !canHide(target, id)) return;
      const label = sectionInfo(target.page, id, locale, target.screen).label;
      if (!actions.applyPatch(hiddenOps(target, id, true)).ok) return;
      setSelection(null);
      toast(t.selection.hiddenToast(label), {
        action: {
          label: t.selection.show,
          onClick: () => {
            const doc = store.getState().doc;
            const current = doc ? pageTarget(doc, target.key) : null;
            if (current) actions.applyPatch(hiddenOps(current, id, false));
          },
        },
      });
    },
    [activeTarget, store, actions, locale, t],
  );

  const reportAiError = useCallback(
    (error: unknown) => {
      const code = error instanceof AiCopyError ? error.code : undefined;
      if (code === "aborted") return;
      if (code === "not-implemented") {
        setAiMenuOpen(true);
        return;
      }
      const reason = error instanceof AiCopyError ? error.reason : undefined;
      const fallback =
        reason === "free-tier-exhausted" || reason === "daily-limit"
          ? texts.errors[reason]
          : code === "budget-exceeded"
            ? t.ai.errors.budgetExceeded
            : code === "network"
              ? t.ai.errors.network
              : code === "invalid-response"
                ? t.ai.errors.invalidResponse
                : t.ai.errors.generic;
      // useAiCopy rejects with messages that are already localized; the codes only pick a fallback.
      const message = error instanceof AiCopyError && error.message !== error.code ? error.message : fallback;
      toast.error(message);
      // No free uses, budget spent, daily limit, a rejected key or a design too large for the free AI: the AI menu
      // offers the user's own key and «mi Claude».
      if (opensAiMenu(error)) setAiMenuOpen(true);
    },
    [t, texts],
  );

  const improveSection = useCallback(
    async (id: string) => {
      const target = activeTarget();
      if (!target) return;
      if (!ai.available) {
        setAiMenuOpen(true);
        return;
      }
      setAiSection(id);
      try {
        const result = await ai.generateCopy(copyRequest(target, [id]));
        if (!actions.applyPatch(result.patches).ok) throw new AiCopyError("invalid-response");
        toast.success(t.ai.sectionDone(sectionInfo(target.page, id, locale, target.screen).label), {
          action: { label: t.undoAction, onClick: () => history.undo() },
        });
      } catch (error) {
        reportAiError(error);
      } finally {
        setAiSection(null);
      }
    },
    [activeTarget, ai, actions, history, locale, t, reportAiError],
  );

  const generatePageCopy = useCallback(
    async (instructions: string) => {
      const target = activeTarget();
      if (!target) return;
      try {
        const result = await ai.generateCopy(copyRequest(target, undefined, instructions));
        if (!actions.applyPatch(result.patches).ok) throw new AiCopyError("invalid-response");
        setAiMenuOpen(false);
        toast.success(t.ai.done(formatUsd(result.costUsd, locale)), { action: { label: t.undoAction, onClick: () => history.undo() } });
      } catch (error) {
        reportAiError(error);
      }
    },
    [activeTarget, ai, actions, history, locale, t, reportAiError],
  );

  /** A validated «Copiar prompt para mi Claude» answer: applied as one undo step, like a generated one. */
  const applyManualCopy = useCallback(
    (result: AiCopyResult) => {
      if (!actions.applyPatch(result.patches).ok) {
        toast.error(t.ai.errors.invalidResponse);
        return;
      }
      toast.success(t.ai.manualDone, { action: { label: t.undoAction, onClick: () => history.undo() } });
    },
    [actions, history, t],
  );

  const onCanvasDrop = useCallback(
    (item: DroppedItem) => {
      if (item.type === DND.recipe) applyRecipe(String(item.data.recipeId));
      else if (item.type === DND.pairing) applyPairing(String(item.data.pairingId));
    },
    [applyRecipe, applyPairing],
  );

  const target = useMemo(() => (doc && activeKey ? pageTarget(doc, activeKey) : null), [doc, activeKey]);
  const page = target?.page;
  const selectedId =
    selection && target && page && selection.key === target.key && selection.id !== page.root && page.elements[selection.id] && !isHidden(page, selection.id)
      ? selection.id
      : null;

  const canPlay = doc ? hasScreens(doc) : false;
  const play = playing && canPlay;

  useComposerShortcuts({
    undo: history.undo,
    redo: history.redo,
    // Esc leaves «Probar» first.
    deselect: () => (play ? changePlaying(false) : deselect()),
    move: (delta) => {
      if (selectedId) moveSection(selectedId, delta);
    },
  });

  if (!doc || !target || !derived) return null;
  const pageLabel = labelOf(target);

  return (
    <div
      ref={measureRef}
      aria-label={t.region}
      role="region"
      className={cn("mx-auto flex w-full max-w-[1760px] flex-col gap-3 lg:h-(--composer-h)", className)}
      style={{ "--composer-h": height ? `${height}px` : `max(${MIN_HEIGHT}px, calc(100dvh - 11rem))` } as CSSProperties}
    >
      <DeckFonts />
      <AiRunBar />
      <p role="status" className="sr-only">
        {status.text}
        {status.n % 2 ? "\u200b" : ""}
      </p>
      <ComposerTopBar
        doc={doc}
        target={target}
        pageLabel={pageLabel}
        logoUrl={logoUrl}
        ai={ai}
        aiMenuOpen={aiMenuOpen}
        onAiMenuOpenChange={setAiMenuOpen}
        onGenerateCopy={generatePageCopy}
        onManualCopy={applyManualCopy}
        onBack={onBack}
        onEditBrand={onEditBrand}
        onEditLayout={onEditLayout ?? onBack}
        onExport={onExport}
      />
      <div className="grid min-h-0 flex-1 grid-cols-1 gap-3 lg:grid-cols-[17rem_minmax(0,1fr)_15.5rem] xl:grid-cols-[19rem_minmax(0,1fr)_17.5rem]">
        <BriefPanel
          className="order-2 lg:order-none"
          doc={doc}
          target={target}
          pageLabel={pageLabel}
          mode={mode}
          selectedId={selectedId}
          onSelect={selectFromList}
        />
        <Canvas
          className="order-1 lg:order-none"
          doc={doc}
          target={target}
          labelOf={labelOf}
          mode={mode}
          device={device}
          logoUrl={logoUrl}
          selectedId={selectedId}
          onSelect={selectFromCanvas}
          onDeselect={deselect}
          revealKey={revealKey}
          playing={play}
          onPlayingChange={canPlay ? changePlaying : undefined}
          onNavigate={navigate}
          navigationKey={navigationKey}
          onDrop={onCanvasDrop}
          toolbar={{
            aiAvailable: ai.available,
            aiBusy: aiSection !== null && aiSection === selectedId,
            onMove: moveSection,
            onHide: hideSection,
            onImproveCopy: improveSection,
          }}
        />
        <ThemePanel className="order-3 lg:order-none" doc={doc} theme={derived.theme} />
      </div>
    </div>
  );
}
