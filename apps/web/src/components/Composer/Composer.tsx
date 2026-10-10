"use client";

import { outputKindOptions, type OutputKind } from "@dialmade/catalog";
import { useCallback, useEffect, useState, type CSSProperties } from "react";
import { toast } from "sonner";
import { AiCopyError, useAiCopy } from "@/hooks/useAiCopy";
import {
  selectActivePageKind,
  useActivePageKind,
  useDesignDerived,
  useDesignDoc,
  useDesignDocActions,
  useDesignDocStore,
  useDesignHistory,
} from "@/hooks/useDesignDoc";
import { useDictionary, useI18n } from "@/i18n";
import { composer } from "@/i18n/composer";
import { cn } from "@/lib/cn";
import type { DroppedItem } from "@/lib/dnd";
import { formatUsd } from "./aiEstimate";
import { BriefPanel } from "./BriefPanel";
import { Canvas } from "./Canvas";
import { ComposerTopBar } from "./ComposerTopBar";
import { DND, THEME_COMBOS } from "./constants";
import { DeckFonts } from "./DeckFonts";
import { hiddenOps, isHidden, moveOps } from "./pageOps";
import { sectionInfo } from "./sectionInfo";
import { ThemePanel } from "./ThemePanel";
import { useComposerActions } from "./useComposerActions";
import { useComposerShortcuts } from "./useComposerShortcuts";

export type ComposerProps = {
  /** Opens the ExportDialog (stepper «4 Exportar»). */
  onExport: () => void;
  /** Back to «Crear» (pick or switch the output kind). */
  onBack: () => void;
  /** Back to the Palette Lab to change colors; the doc keeps its pages and edits. */
  onEditBrand: () => void;
  className?: string;
};

type Selection = { kind: OutputKind; id: string };

const MIN_HEIGHT = 600;
const BOTTOM_GAP = 24;

/**
 * «3 Ajustar» (DESIGN-BRIEF §6.3, refs 3C Replit + 3A Buffer): brief, dials and direction cards on
 * the left, the live page in a device frame in the middle (select a section → floating toolbar),
 * themes, button color and font packs on the right. Cards apply by click or by dragging onto the
 * page or a slot; every edit is a validated patch with undo/redo (⌘Z / ⇧⌘Z).
 */
export function Composer({ onExport, onBack, onEditBrand, className }: ComposerProps) {
  const { locale } = useI18n();
  const t = useDictionary(composer);
  const doc = useDesignDoc((state) => state.doc);
  const mode = useDesignDoc((state) => state.previewMode);
  const device = useDesignDoc((state) => state.device);
  const logoUrl = useDesignDoc((state) => state.logoUrl);
  const active = useActivePageKind();
  const derived = useDesignDerived(active);
  const actions = useDesignDocActions();
  const store = useDesignDocStore();
  const history = useDesignHistory();
  const ai = useAiCopy();
  const { applyRecipe, applyPairing, applyTheme } = useComposerActions();

  const [selection, setSelection] = useState<Selection | null>(null);
  const [revealKey, setRevealKey] = useState(0);
  const [aiMenuOpen, setAiMenuOpen] = useState(false);
  const [aiSection, setAiSection] = useState<string | null>(null);
  const [height, setHeight] = useState<number | null>(null);

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

  const labelOf = useCallback((kind: OutputKind) => outputKindOptions.find((option) => option.id === kind)?.label[locale] ?? kind, [locale]);

  const activeKind = useCallback(() => selectActivePageKind(store.getState()), [store]);

  const selectFromCanvas = useCallback(
    (id: string) => {
      const kind = activeKind();
      if (kind) setSelection({ kind, id });
    },
    [activeKind],
  );
  const selectFromList = useCallback(
    (id: string) => {
      selectFromCanvas(id);
      setRevealKey((key) => key + 1);
    },
    [selectFromCanvas],
  );
  const deselect = useCallback(() => setSelection(null), []);

  const moveSection = useCallback(
    (id: string, delta: -1 | 1) => {
      const kind = activeKind();
      const page = kind ? store.getState().doc?.pages[kind] : undefined;
      const ops = kind && page ? moveOps(kind, page, id, delta) : null;
      if (ops && actions.applyPatch(ops).ok) setRevealKey((key) => key + 1);
    },
    [activeKind, store, actions],
  );

  const hideSection = useCallback(
    (id: string) => {
      const kind = activeKind();
      const page = kind ? store.getState().doc?.pages[kind] : undefined;
      if (!kind || !page) return;
      const label = sectionInfo(page, id, locale).label;
      if (!actions.applyPatch(hiddenOps(kind, page, id, true)).ok) return;
      setSelection(null);
      toast(t.selection.hiddenToast(label), {
        action: {
          label: t.selection.show,
          onClick: () => {
            const current = store.getState().doc?.pages[kind];
            if (current) actions.applyPatch(hiddenOps(kind, current, id, false));
          },
        },
      });
    },
    [activeKind, store, actions, locale, t],
  );

  const reportAiError = useCallback(
    (error: unknown) => {
      const code = error instanceof AiCopyError ? error.code : undefined;
      if (code === "aborted") return;
      if (code === "not-implemented") {
        setAiMenuOpen(true);
        return;
      }
      const fallback =
        code === "budget-exceeded"
          ? t.ai.errors.budgetExceeded
          : code === "network"
            ? t.ai.errors.network
            : code === "invalid-response"
              ? t.ai.errors.invalidResponse
              : t.ai.errors.generic;
      // useAiCopy rejects with messages that are already localized; the codes only pick a fallback.
      const message = error instanceof AiCopyError && error.message !== error.code ? error.message : fallback;
      toast.error(message);
      // Budget spent, daily limit or a rejected key: the AI menu offers the user's own key.
      const reason = error instanceof AiCopyError ? error.reason : undefined;
      if (code === "budget-exceeded" || reason === "invalid-key" || reason === "ai-not-configured") setAiMenuOpen(true);
    },
    [t],
  );

  const improveSection = useCallback(
    async (id: string) => {
      const kind = activeKind();
      const page = kind ? store.getState().doc?.pages[kind] : undefined;
      if (!kind || !page) return;
      if (!ai.available) {
        setAiMenuOpen(true);
        return;
      }
      setAiSection(id);
      try {
        const result = await ai.generateCopy({ kind, sectionIds: [id] });
        if (!actions.applyPatch(result.patches).ok) throw new AiCopyError("invalid-response");
        toast.success(t.ai.sectionDone(sectionInfo(page, id, locale).label), {
          action: { label: t.undoAction, onClick: () => history.undo() },
        });
      } catch (error) {
        reportAiError(error);
      } finally {
        setAiSection(null);
      }
    },
    [activeKind, store, ai, actions, history, locale, t, reportAiError],
  );

  const generatePageCopy = useCallback(
    async (instructions: string) => {
      const kind = activeKind();
      if (!kind) return;
      try {
        const result = await ai.generateCopy({ kind, ...(instructions && { instructions }) });
        if (!actions.applyPatch(result.patches).ok) throw new AiCopyError("invalid-response");
        setAiMenuOpen(false);
        toast.success(t.ai.done(formatUsd(result.costUsd, locale)), { action: { label: t.undoAction, onClick: () => history.undo() } });
      } catch (error) {
        reportAiError(error);
      }
    },
    [activeKind, ai, actions, history, locale, t, reportAiError],
  );

  const onCanvasDrop = useCallback(
    (item: DroppedItem) => {
      if (item.type === DND.recipe) applyRecipe(String(item.data.recipeId));
      else if (item.type === DND.pairing) applyPairing(String(item.data.pairingId));
      else if (item.type === DND.theme) {
        const combo = THEME_COMBOS.find((c) => c.id === item.data.comboId);
        if (combo) applyTheme(combo, item.data.mode === "dark" ? "dark" : "light");
      }
    },
    [applyRecipe, applyPairing, applyTheme],
  );

  const page = doc && active ? doc.pages[active] : undefined;
  const selectedId =
    selection && page && selection.kind === active && selection.id !== page.root && page.elements[selection.id] && !isHidden(page, selection.id)
      ? selection.id
      : null;

  useComposerShortcuts({
    undo: history.undo,
    redo: history.redo,
    deselect,
    move: (delta) => {
      if (selectedId) moveSection(selectedId, delta);
    },
  });

  if (!doc || !active || !page || !derived) return null;
  const pageLabel = labelOf(active);

  return (
    <div
      ref={measureRef}
      aria-label={t.region}
      role="region"
      className={cn("mx-auto flex w-full max-w-[1760px] flex-col gap-3 lg:h-(--composer-h)", className)}
      style={{ "--composer-h": height ? `${height}px` : `max(${MIN_HEIGHT}px, calc(100dvh - 11rem))` } as CSSProperties}
    >
      <DeckFonts />
      <ComposerTopBar
        doc={doc}
        kind={active}
        pageLabel={pageLabel}
        logoUrl={logoUrl}
        ai={ai}
        aiMenuOpen={aiMenuOpen}
        onAiMenuOpenChange={setAiMenuOpen}
        onGenerateCopy={generatePageCopy}
        onBack={onBack}
        onEditBrand={onEditBrand}
        onExport={onExport}
      />
      <div className="grid min-h-0 flex-1 grid-cols-1 gap-3 lg:grid-cols-[17rem_minmax(0,1fr)_15.5rem] xl:grid-cols-[19rem_minmax(0,1fr)_17.5rem]">
        <BriefPanel
          className="order-2 lg:order-none"
          doc={doc}
          kind={active}
          pageLabel={pageLabel}
          mode={mode}
          selectedId={selectedId}
          onSelect={selectFromList}
        />
        <Canvas
          className="order-1 lg:order-none"
          doc={doc}
          kind={active}
          labelOf={labelOf}
          mode={mode}
          device={device}
          logoUrl={logoUrl}
          selectedId={selectedId}
          onSelect={selectFromCanvas}
          onDeselect={deselect}
          revealKey={revealKey}
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
