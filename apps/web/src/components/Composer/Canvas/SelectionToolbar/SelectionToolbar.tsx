"use client";

import type { DesignDoc } from "@dialmade/doc";
import { VARIANT_PROP } from "@dialmade/sections";
import { motion } from "motion/react";
import { useEffect, useRef, useState, type KeyboardEvent, type RefObject } from "react";
import { IconButton } from "@/components/ui/IconButton";
import { Popover } from "@/components/ui/Popover";
import { Segmented } from "@/components/ui/Segmented";
import { useAiBlockActions } from "@/hooks/useAiBlockEdit";
import { useDesignDocActions, useDesignDocStore } from "@/hooks/useDesignDoc";
import { useDictionary, useI18n } from "@/i18n";
import { composer } from "@/i18n/composer";
import { aiBlockOf } from "@/lib/ai/render/edit";
import { setBlockView, showsAi, useAiView, type AiView } from "@/lib/ai/render/view";
import { cn } from "@/lib/cn";
import { tween } from "@/lib/motion";
import { ArrowDownIcon, ArrowUpIcon, ChevronLeftIcon, ChevronRightIcon, CloseIcon, EyeOffIcon, SlidersIcon, SparklesIcon } from "../../icons";
import { canHide, canMove, pageTarget, setPropOps, type PageTarget } from "../../pageOps";
import { sectionInfo } from "../../sectionInfo";
import { AiBlockCard } from "./AiBlockCard";
import { KnobsPanel } from "./KnobsPanel";
import { useToolbarPosition } from "./useToolbarPosition";

export type SelectionToolbarProps = {
  doc: DesignDoc;
  /** The page shown (a page kind's page or a screen's). */
  target: PageTarget;
  id: string;
  logoUrl: string | undefined;
  stageRef: RefObject<HTMLDivElement | null>;
  scrollerRef: RefObject<HTMLDivElement | null>;
  aiAvailable: boolean;
  /** True while the AI rewrites this section. */
  aiBusy: boolean;
  onMove: (id: string, delta: -1 | 1) => void;
  onHide: (id: string) => void;
  onImproveCopy: (id: string) => void;
  onDeselect: () => void;
};

const Divider = () => <span aria-hidden className="mx-0.5 h-5 w-px shrink-0 bg-white/10" />;

const FRAME_SELECTOR = '.dl-page[data-dl-interactive] .dl-el[tabindex="0"]';

/**
 * Floating bar over the selected section (Claude Design-style edit): variant ‹ ›, its knobs, move,
 * hide, «Mejorar copy con IA» and deselect, plus a crisp purple outline around the section. App
 * chrome, outside the user's theme. A block painted by its AI design («Diseño con IA», spec §8.2) has no
 * knobs: the «Bloque de IA» card and «Base | IA» take their place; in base, «Usar IA otra vez» is one click. Selecting with the keyboard moves the focus into the bar, which
 * then behaves as if it sat right after the section: Esc or ⇧Tab go back to it, Tab goes to the next.
 */
export function SelectionToolbar({
  doc,
  target,
  id,
  logoUrl,
  stageRef,
  scrollerRef,
  aiAvailable,
  aiBusy,
  onMove,
  onHide,
  onImproveCopy,
  onDeselect,
}: SelectionToolbarProps) {
  const { locale } = useI18n();
  const t = useDictionary(composer);
  const actions = useDesignDocActions();
  const store = useDesignDocStore();
  const toolbarRef = useRef<HTMLDivElement | null>(null);
  const outlineRef = useRef<HTMLDivElement | null>(null);
  const [knobsOpen, setKnobsOpen] = useState(false);
  const [aiOpen, setAiOpen] = useState(false);
  const blockActions = useAiBlockActions();
  const { x, y } = useToolbarPosition({ stageRef, scrollerRef, toolbarRef, outlineRef, id });

  const frameOf = (target: string) => scrollerRef.current?.querySelector<HTMLElement>(`[data-dl-id="${CSS.escape(target)}"]`) ?? null;

  // Keyboard selection (Enter/Space on the section) moves the focus into the bar: on mount for a new
  // selection, and on a repeated Enter on the section that is already selected.
  useEffect(() => {
    const focusBar = () => toolbarRef.current?.querySelector<HTMLButtonElement>("button:not(:disabled)")?.focus({ preventScroll: true });
    const active = document.activeElement;
    if (active instanceof HTMLElement && active.dataset.dlId === id && active.matches(":focus-visible")) focusBar();
    const scroller = scrollerRef.current;
    const onKeyDown = (event: globalThis.KeyboardEvent) => {
      if (event.key !== "Enter" && event.key !== " ") return;
      if (event.target instanceof HTMLElement && event.target.dataset.dlId === id) requestAnimationFrame(focusBar);
    };
    scroller?.addEventListener("keydown", onKeyDown);
    return () => scroller?.removeEventListener("keydown", onKeyDown);
  }, [id, scrollerRef]);

  const { page, screen } = target;
  const info = sectionInfo(page, id, locale, screen);
  // «Diseño con IA»: the stored AI block of this layout block, and what the canvas shows of it.
  const screenId = screen?.id ?? null;
  const aiBlock = screenId ? aiBlockOf(doc, screenId, id) : undefined;
  const aiActive = aiBlock?.active === true;
  const aiView: AiView = useAiView((state) => (screenId && showsAi(state, screenId, id) ? "ai" : "base"));
  const aiRunning = blockActions.running?.blockId === id && blockActions.running.screenId === screenId;
  // On a screen the layout decides the order (it changes in «Editar layout»), and only blocks hide.
  const movable = !screen;
  const hideable = canHide(target, id);
  const variants = info.def?.variants ?? [];
  const index = Math.max(0, variants.findIndex((v) => v.id === info.variant));

  const stepVariant = (delta: -1 | 1) => {
    const next = variants[(index + delta + variants.length) % variants.length];
    const live = store.getState().doc;
    const liveTarget = live ? pageTarget(live, target.key) : null;
    if (next && next.id !== info.variant && live && liveTarget) actions.applyPatch(setPropOps(live, liveTarget, id, VARIANT_PROP, next.id));
  };

  const onKeyDown = (event: KeyboardEvent<HTMLDivElement>) => {
    if (event.defaultPrevented || !(event.target instanceof HTMLButtonElement)) return;
    const buttons = [...event.currentTarget.querySelectorAll<HTMLButtonElement>("button:not(:disabled)")];
    const at = buttons.indexOf(event.target);
    const frame = frameOf(id);
    if (frame && (event.key === "Escape" || (event.key === "Tab" && event.shiftKey && at === 0))) {
      event.preventDefault();
      event.stopPropagation();
      frame.focus();
      return;
    }
    if (frame && event.key === "Tab" && !event.shiftKey && at === buttons.length - 1) {
      const frames = [...(scrollerRef.current?.querySelectorAll<HTMLElement>(FRAME_SELECTOR) ?? [])];
      const next = frames[frames.indexOf(frame) + 1];
      if (next) {
        event.preventDefault();
        next.focus();
      }
      return;
    }
    if (event.key !== "ArrowLeft" && event.key !== "ArrowRight") return;
    const next = buttons[(at + (event.key === "ArrowRight" ? 1 : -1) + buttons.length) % buttons.length];
    if (!next) return;
    event.preventDefault();
    next.focus();
  };

  return (
    <>
      <motion.div
        ref={outlineRef}
        aria-hidden
        initial={{ opacity: 0 }}
        animate={{ opacity: 1 }}
        exit={{ opacity: 0 }}
        transition={tween(0.12)}
        className="pointer-events-none absolute top-0 left-0 z-10 rounded-[4px] shadow-[0_0_0_2px_var(--app-accent),0_0_24px_-4px_var(--app-glow-purple)]"
        style={{ visibility: "hidden" }}
      />
      <motion.div
        ref={toolbarRef}
        role="toolbar"
        aria-label={t.selection.toolbar(info.label)}
        onKeyDown={onKeyDown}
        style={{ x, y }}
        initial={{ opacity: 0, scale: 0.96 }}
        animate={{ opacity: 1, scale: 1 }}
        exit={{ opacity: 0, scale: 0.98 }}
        transition={tween(0.16)}
        className="absolute top-0 left-0 z-20 flex max-w-[calc(100%-16px)] origin-bottom-left items-center gap-0.5 overflow-x-auto rounded-control border border-app-strong bg-app-elevated/95 p-1 shadow-lift backdrop-blur-md scrollbar-none"
      >
        <span className="flex shrink-0 items-center gap-1.5 ps-1.5 pe-1 text-caption font-semibold text-fg">
          <span aria-hidden className="size-1.5 rounded-full bg-accent shadow-[0_0_8px_var(--app-accent)]" />
          {info.label}
        </span>
        {aiActive && screenId && (
          <>
            <Divider />
            <span className="shrink-0 rounded-chip bg-accent-soft px-1.5 py-0.5 text-[11px] font-semibold text-accent">{t.aiBlock.badge}</span>
            <Popover
              open={aiOpen}
              onOpenChange={setAiOpen}
              label={t.aiBlock.openLabel(info.label)}
              align="start"
              className="max-h-[min(72vh,38rem)] w-80 overflow-y-auto"
              trigger={(triggerProps) => (
                <IconButton
                  size="sm"
                  label={t.aiBlock.openLabel(info.label)}
                  icon={<SparklesIcon />}
                  loading={aiRunning}
                  className={cn("text-accent hover:text-fg", aiOpen && "bg-white/[0.08] text-fg")}
                  {...triggerProps}
                />
              )}
            >
              <AiBlockCard doc={doc} screenId={screenId} blockId={id} label={info.label} blockActions={blockActions} onUseBase={() => setAiOpen(false)} />
            </Popover>
            <Segmented<AiView>
              label={t.aiBlock.compare.label}
              layoutId={`ai-compare-${id}`}
              size="sm"
              value={aiView}
              onChange={(view) => setBlockView(screenId, id, view)}
              options={[
                { value: "base", label: t.aiBlock.compare.base },
                { value: "ai", label: t.aiBlock.compare.ai },
              ]}
            />
          </>
        )}
        {!aiActive && variants.length > 1 && (
          <>
            <Divider />
            <IconButton size="sm" label={t.selection.prevVariant} icon={<ChevronLeftIcon />} onClick={() => stepVariant(-1)} />
            <span className="max-w-36 shrink-0 truncate px-0.5 text-caption text-muted" aria-live="polite">
              <span className="sr-only">{t.selection.variant(info.variantLabel ?? "", index + 1, variants.length)}</span>
              <span aria-hidden>{info.variantLabel}</span>
            </span>
            <IconButton size="sm" label={t.selection.nextVariant} icon={<ChevronRightIcon />} onClick={() => stepVariant(1)} />
          </>
        )}
        {!aiActive && (
          <>
            <Divider />
            <Popover
              open={knobsOpen}
              onOpenChange={setKnobsOpen}
              label={t.selection.knobs}
              align="start"
              className="max-h-[min(70vh,34rem)] w-80 overflow-y-auto"
              trigger={(triggerProps) => (
                <IconButton
                  size="sm"
                  label={t.selection.knobs}
                  icon={<SlidersIcon />}
                  className={cn(knobsOpen && "bg-white/[0.08] text-fg")}
                  {...triggerProps}
                />
              )}
            >
              <p className="mb-3 text-caption font-semibold text-fg">{info.label}</p>
              <KnobsPanel doc={doc} target={target} id={id} logoUrl={logoUrl} />
            </Popover>
            {aiBlock && screenId && (
              <IconButton
                size="sm"
                label={t.aiBlock.useAi}
                icon={<SparklesIcon />}
                className="text-accent hover:text-fg"
                onClick={() => blockActions.setActive(screenId, id, info.label, true)}
              />
            )}
          </>
        )}
        {movable && (
          <>
            <IconButton size="sm" label={t.selection.moveUp} icon={<ArrowUpIcon />} disabled={!canMove(page, id, -1)} onClick={() => onMove(id, -1)} />
            <IconButton size="sm" label={t.selection.moveDown} icon={<ArrowDownIcon />} disabled={!canMove(page, id, 1)} onClick={() => onMove(id, 1)} />
          </>
        )}
        {hideable && <IconButton size="sm" label={t.selection.hide} icon={<EyeOffIcon />} onClick={() => onHide(id)} />}
        {!aiActive && (
          <>
            <Divider />
            <IconButton
              size="sm"
              label={aiAvailable ? t.selection.improveCopy : t.selection.aiOff}
              icon={<SparklesIcon />}
              loading={aiBusy}
              aria-disabled={!aiAvailable || undefined}
              className={cn(aiAvailable ? "text-accent hover:text-fg" : "opacity-60")}
              onClick={() => onImproveCopy(id)}
            />
          </>
        )}
        <IconButton size="sm" label={t.selection.deselect} icon={<CloseIcon />} onClick={onDeselect} />
      </motion.div>
    </>
  );
}
