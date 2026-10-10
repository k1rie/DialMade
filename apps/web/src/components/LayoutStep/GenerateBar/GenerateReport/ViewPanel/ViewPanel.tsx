"use client";

import type { LayoutFix, ScreenId } from "@dialmade/layout";
import { useMemo } from "react";
import { useDictionary } from "@/i18n";
import { layout } from "@/i18n/layout";
import type { GeneratedScreen } from "../../../types";
import { WarningList } from "../../WarningList";
import { warningItems, type WarningGroup } from "../../warnings";
import { CodePanel } from "../CodePanel";
import { hasBlocks, layoutJson, type ReportView } from "../report";

export type ViewPanelProps = {
  view: ReportView;
  screen: GeneratedScreen;
  onCopy: (text: string, what: string) => Promise<boolean>;
  onFix: (fix: LayoutFix, screenId: ScreenId, blockName: string) => boolean;
};

/** The open view of one screen: its wireframe, CSS or JSON with «Copiar», or its warnings with their fixes. */
export function ViewPanel({ view, screen, onCopy, onFix }: ViewPanelProps) {
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
