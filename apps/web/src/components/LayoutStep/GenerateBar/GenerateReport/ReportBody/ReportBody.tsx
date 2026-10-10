"use client";

import type { LayoutFix, ScreenId } from "@dialmade/layout";
import { motion } from "motion/react";
import { useCallback, useId, useMemo, useState, type RefObject } from "react";
import { toast } from "sonner";
import { IconButton } from "@/components/ui/IconButton";
import { useDictionary } from "@/i18n";
import { layout } from "@/i18n/layout";
import { tween } from "@/lib/motion";
import { CloseIcon } from "../../../icons";
import type { GenerateResult } from "../../../types";
import { useLayoutActions } from "../../../useLayoutStore";
import { countStats } from "../../barState";
import { copyText } from "../clipboard";
import { REPORT_TOASTER_ID } from "../constants";
import { pickScreenId, REPORT_VIEWS, type ReportView } from "../report";
import { panelId, ReportTabs, tabId } from "../ReportTabs";
import { ViewPanel } from "../ViewPanel";
import { WarningCount } from "../WarningCount";

export type ReportBodyProps = {
  result: GenerateResult;
  /** Speaks through the report's live region (inside the dialog). */
  announce: (text: string) => void;
  initialScreenId: ScreenId | null;
  titleId: string;
  descriptionId: string;
  dialogRef: RefObject<HTMLDialogElement | null>;
  initialFocusRef: RefObject<HTMLButtonElement | null>;
  onClose: () => void;
};

/** Mounted only while the dialog is open, so every opening starts on the active screen. */
export function ReportBody({ result, announce, initialScreenId, titleId, descriptionId, dialogRef, initialFocusRef, onClose }: ReportBodyProps) {
  const t = useDictionary(layout);
  const r = t.generate.report;
  const actions = useLayoutActions();
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
