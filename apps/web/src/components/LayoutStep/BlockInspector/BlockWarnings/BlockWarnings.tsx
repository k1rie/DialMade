"use client";

import type { BlockId, LayoutDoc, LayoutFix, ScreenId } from "@dialmade/layout";
import { useId, useMemo, useRef } from "react";
import { useDndAnnounce } from "@/components/dnd/DndAnnouncer";
import { Button } from "@/components/ui/Button";
import { useDictionary } from "@/i18n";
import { layout as layoutText } from "@/i18n/layout";
import { WarningIcon } from "../../icons";
import { useLayoutActions, useScreenStructure } from "../../useLayoutStore";

export type BlockWarningsProps = {
  blockId: BlockId;
  layout: LayoutDoc;
  screenId: ScreenId;
  /** Where focus goes when the last warning is fixed (the inspector heading). */
  fallbackFocusId: string;
};

/** Warnings of the screen that involve this block, each with its one-click fixes («Anidar», «Poner debajo»…). */
export function BlockWarnings({ blockId, layout, screenId, fallbackFocusId }: BlockWarningsProps) {
  const t = useDictionary(layoutText);
  const actions = useLayoutActions();
  const announce = useDndAnnounce({ politeness: "polite" });
  const structure = useScreenStructure(screenId);
  const titleId = useId();
  const listRef = useRef<HTMLUListElement>(null);

  const warnings = useMemo(() => (structure?.warnings ?? []).filter((warning) => warning.ids.includes(blockId)), [structure, blockId]);
  if (warnings.length === 0) return null;

  const nameOf = (id: BlockId) => layout.blocks[id]?.label ?? id;

  const fix = (item: LayoutFix) => {
    if (!actions.applyFix(item, screenId)) return;
    announce(t.announce.fixApplied(t.fixes[item.kind], nameOf(item.id)));
    // The fixed row goes away with its button: move to the next fix, or to the heading when none is left.
    requestAnimationFrame(() => {
      const next = listRef.current?.querySelector<HTMLButtonElement>("button:not([disabled])");
      (next ?? document.getElementById(fallbackFocusId))?.focus();
    });
  };

  return (
    <div role="group" aria-labelledby={titleId} className="flex flex-col gap-2 rounded-card border border-warning/30 bg-warning/[0.06] p-3">
      <p id={titleId} className="flex items-center gap-1.5 text-caption font-semibold text-fg">
        <WarningIcon className="size-3.5 shrink-0 text-warning" />
        {t.generate.report.warnings}
      </p>
      <ul ref={listRef} className="flex flex-col gap-2.5">
        {warnings.map((warning, index) => (
          <li key={`${warning.code}:${warning.ids.join("+")}:${index}`} className="flex flex-col gap-1.5">
            <p className="text-caption text-muted">{t.warnings[warning.code](warning.ids.map(nameOf))}</p>
            {warning.fixes.length > 0 && (
              <div className="flex flex-wrap gap-1.5">
                {warning.fixes.map((item, fixIndex) => (
                  <Button
                    key={`${item.kind}:${item.id}:${fixIndex}`}
                    size="sm"
                    aria-label={t.generate.report.fixLabel(t.fixes[item.kind], nameOf(item.id))}
                    onClick={() => fix(item)}
                  >
                    {t.fixes[item.kind]}
                  </Button>
                ))}
              </div>
            )}
          </li>
        ))}
      </ul>
    </div>
  );
}
