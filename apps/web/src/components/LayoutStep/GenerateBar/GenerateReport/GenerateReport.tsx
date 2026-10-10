"use client";

import type { LayoutFix, ScreenId } from "@dialmade/layout";
import { motion } from "motion/react";
import { useCallback, useEffect, useId, useMemo, useRef, useState, type MouseEvent, type RefObject } from "react";
import { toast, Toaster } from "sonner";
import { IconButton } from "@/components/ui/IconButton";
import { useDndAnnounce } from "@/components/dnd/DndAnnouncer";
import { useDictionary } from "@/i18n";
import { layout } from "@/i18n/layout";
import { cn } from "@/lib/cn";
import { tween } from "@/lib/motion";
import { CloseIcon } from "../../icons";
import type { GeneratedScreen, GenerateResult } from "../../types";
import { useLayoutActions, useLayoutStore } from "../../useLayoutStore";
import { countStats } from "../barState";
import { WarningList } from "../WarningList";
import { warningItems, type WarningGroup } from "../warnings";
import { copyText } from "./clipboard";
import { CodePanel } from "./CodePanel";
import { REPORT_TOASTER_ID, REPORT_TOASTER_STYLE } from "./constants";
import { hasBlocks, layoutJson, pickScreenId, REPORT_VIEWS, type ReportView } from "./report";
import { panelId, ReportTabs, tabId } from "./ReportTabs";

export type GenerateReportProps = {
  open: boolean;
  /** Esc, the backdrop and the close button call it with `false`. */
  onOpenChange: (open: boolean) => void;
  /** Screen shown first (the active screen). */
  initialScreenId: ScreenId | null;
};

/** A click on the ::backdrop targets the dialog itself, outside its box (not on its scrollbar). */
function isBackdropClick(event: MouseEvent<HTMLDialogElement>): boolean {
  if (event.target !== event.currentTarget) return false;
  const box = event.currentTarget.getBoundingClientRect();
  const { clientX: x, clientY: y } = event;
  return x < box.left || x > box.right || y < box.top || y > box.bottom;
}

/**
 * «Resultado» of the last Generar: one tab per screen and, per screen, Wireframe (ASCII), CSS and JSON
 * (each with «Copiar») and Avisos with their fixes. A native modal <dialog>: the page behind is inert
 * (focus stays inside), Esc and the backdrop close it and focus returns to the opener. A fix applied
 * here runs Generar again, so every tab shows the corrected result.
 */
export function GenerateReport({ open, onOpenChange, initialScreenId }: GenerateReportProps) {
  const titleId = useId();
  const descriptionId = useId();
  const dialogRef = useRef<HTMLDialogElement | null>(null);
  const openerRef = useRef<HTMLElement | null>(null);
  const initialFocusRef = useRef<HTMLButtonElement | null>(null);
  const generated = useLayoutStore((state) => state.generated);

  useEffect(() => {
    const dialog = dialogRef.current;
    if (!dialog) return;
    if (open && !dialog.open) {
      openerRef.current = document.activeElement instanceof HTMLElement ? document.activeElement : null;
      dialog.showModal();
      initialFocusRef.current?.focus();
    }
    if (!open && dialog.open) dialog.close();
  }, [open]);

  const onClose = () => {
    onOpenChange(false);
    const opener = openerRef.current;
    openerRef.current = null;
    if (opener?.isConnected) opener.focus({ preventScroll: true });
  };

  return (
    <dialog
      ref={dialogRef}
      aria-modal="true"
      aria-labelledby={titleId}
      aria-describedby={descriptionId}
      onClose={onClose}
      onClick={(event) => {
        if (isBackdropClick(event)) onOpenChange(false);
      }}
      className={cn(
        "pointer-events-auto m-auto max-h-[calc(100dvh-2rem)] w-[min(100vw-2rem,52rem)] overflow-y-auto overscroll-contain",
        "rounded-panel border border-app-strong bg-app-elevated p-0 text-body text-fg shadow-lift scrollbar-none",
        "backdrop:bg-black/60 backdrop:backdrop-blur-sm",
      )}
    >
      {open && generated && (
        <ReportBody
          result={generated}
          initialScreenId={initialScreenId}
          titleId={titleId}
          descriptionId={descriptionId}
          dialogRef={dialogRef}
          initialFocusRef={initialFocusRef}
          onClose={() => onOpenChange(false)}
        />
      )}
      <Toaster
        id={REPORT_TOASTER_ID}
        theme="dark"
        position="bottom-center"
        gap={10}
        offset={24}
        style={REPORT_TOASTER_STYLE}
        toastOptions={{ className: "!shadow-surface !text-small", classNames: { description: "!text-muted" } }}
      />
    </dialog>
  );
}

type ReportBodyProps = {
  result: GenerateResult;
  initialScreenId: ScreenId | null;
  titleId: string;
  descriptionId: string;
  dialogRef: RefObject<HTMLDialogElement | null>;
  initialFocusRef: RefObject<HTMLButtonElement | null>;
  onClose: () => void;
};

/** Mounted only while the dialog is open, so every opening starts on the active screen. */
function ReportBody({ result, initialScreenId, titleId, descriptionId, dialogRef, initialFocusRef, onClose }: ReportBodyProps) {
  const t = useDictionary(layout);
  const r = t.generate.report;
  const actions = useLayoutActions();
  const announce = useDndAnnounce();
  const screensId = useId();
  const viewsId = useId();
  const [picked, setPicked] = useState<ScreenId | null>(() => pickScreenId(result, initialScreenId));
  const [view, setView] = useState<ReportView>("wireframe");

  // The pick survives a regenerate (a fix); a screen that disappeared falls back to the active one.
  const screenId = pickScreenId(result, initialScreenId, picked);
  const screen = result.screens.find((entry) => entry.screenId === screenId) ?? null;
  const stats = useMemo(
    () => countStats(result.screens.map((entry) => ({ layout: entry.layout, warnings: entry.warnings }))),
    [result],
  );

  const setFocusTarget = useCallback(
    (element: HTMLButtonElement | null) => {
      initialFocusRef.current = element;
    },
    [initialFocusRef],
  );

  const copy = useCallback(
    async (text: string, what: string) => {
      const ok = await copyText(text, dialogRef.current);
      if (ok) toast.success(r.copiedToast(what), { toasterId: REPORT_TOASTER_ID });
      else toast.error(r.copyFailed, { toasterId: REPORT_TOASTER_ID });
      return ok;
    },
    [dialogRef, r],
  );

  const fix = useCallback(
    (layoutFix: LayoutFix, target: ScreenId, blockName: string) => {
      if (!actions.applyFix(layoutFix, target)) return false;
      actions.generate();
      announce(t.announce.fixApplied(t.fixes[layoutFix.kind], blockName));
      return true;
    },
    [actions, announce, t],
  );

  const screenTabs = useMemo(
    () =>
      result.screens.map((entry) => ({
        id: entry.screenId,
        label: (
          <>
            {entry.name}
            {entry.warnings.length > 0 && <WarningCount n={entry.warnings.length} />}
          </>
        ),
      })),
    [result],
  );

  const multiScreen = result.screens.length > 1;
  // The first tablist receives the initial focus: screens when there are several, else the views.
  const viewTabs = REPORT_VIEWS.map((id) => ({
    id,
    label: (
      <>
        {r[id]}
        {id === "warnings" && screen && screen.warnings.length > 0 && <WarningCount n={screen.warnings.length} />}
      </>
    ),
  }));

  return (
    <motion.div
      initial={{ opacity: 0, y: 12, scale: 0.985 }}
      animate={{ opacity: 1, y: 0, scale: 1 }}
      transition={{ ...tween(0.28), opacity: tween(0.2) }}
      className="flex flex-col gap-4 p-5 sm:p-6"
    >
      <header className="flex items-start justify-between gap-4">
        <div className="min-w-0">
          <h2 id={titleId} className="m-0 text-h3">
            {r.title}
          </h2>
          <p id={descriptionId} className="m-0 mt-1 text-small text-muted">
            {t.generate.status(stats)}
            <span aria-hidden className="mx-1.5 text-subtle">
              ·
            </span>
            {t.generate.noAi}
          </p>
        </div>
        <IconButton label={t.common.close} icon={<CloseIcon />} tooltip={false} className="-mt-1 -mr-1" onClick={onClose} />
      </header>

      {multiScreen && (
        <ReportTabs
          label={r.screens}
          tabs={screenTabs}
          value={screenId ?? ""}
          onChange={setPicked}
          idBase={screensId}
          selectedRef={setFocusTarget}
        />
      )}

      {screen && (
        <div
          role={multiScreen ? "tabpanel" : undefined}
          id={multiScreen ? panelId(screensId) : undefined}
          aria-labelledby={multiScreen ? tabId(screensId, screen.screenId) : undefined}
          className="flex min-h-0 flex-col gap-3"
        >
          <p className="m-0 flex flex-wrap items-baseline gap-x-2 text-caption text-muted">
            {!multiScreen && <span className="text-small font-medium text-fg">{screen.name}</span>}
            <span>{r.meta(t.kinds[screen.kind], screen.route)}</span>
          </p>
          <ReportTabs
            label={r.views}
            tabs={viewTabs}
            value={view}
            onChange={setView}
            idBase={viewsId}
            selectedRef={multiScreen ? undefined : setFocusTarget}
          />
          <div role="tabpanel" id={panelId(viewsId)} aria-labelledby={tabId(viewsId, view)} className="min-h-0">
            <ViewPanel view={view} screen={screen} onCopy={copy} onFix={fix} />
          </div>
        </div>
      )}
    </motion.div>
  );
}

type ViewPanelProps = {
  view: ReportView;
  screen: GeneratedScreen;
  onCopy: (text: string, what: string) => Promise<boolean>;
  onFix: (fix: LayoutFix, screenId: ScreenId, blockName: string) => boolean;
};

function ViewPanel({ view, screen, onCopy, onFix }: ViewPanelProps) {
  const r = useDictionary(layout).generate.report;
  const json = useMemo(() => layoutJson(screen.layout), [screen.layout]);
  const groups = useMemo<WarningGroup[]>(
    () => [{ screenId: screen.screenId, screenName: screen.name, items: warningItems(screen.warnings, screen.layout) }],
    [screen],
  );

  if (view === "warnings") return <WarningList groups={groups} onFix={onFix} />;
  if (view === "json") return <CodePanel key={view} code={json} what={r.json} label={r.code(r.json, screen.name)} onCopy={onCopy} />;
  if (!hasBlocks(screen.layout)) return <p className="m-0 py-6 text-center text-small text-muted">{r.empty}</p>;
  const code = view === "css" ? screen.css : screen.ascii;
  const what = view === "css" ? r.css : r.wireframe;
  return <CodePanel key={view} code={code} what={what} label={r.code(what, screen.name)} onCopy={onCopy} />;
}

/** Small amber count next to a tab label. */
function WarningCount({ n }: { n: number }) {
  return (
    <span className="inline-flex h-4 min-w-4 items-center justify-center rounded-full bg-warning/15 px-1 text-[10px] leading-none font-semibold text-warning tabular-nums">
      {n}
    </span>
  );
}
