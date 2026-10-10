"use client";

import type { LayoutFix, ScreenId } from "@dialmade/layout";
import { memo, useId, useLayoutEffect, useRef } from "react";
import { useDictionary } from "@/i18n";
import { layout } from "@/i18n/layout";
import { cn } from "@/lib/cn";
import { CheckIcon } from "../../icons";
import { focusIndexAfterFix, type WarningGroup } from "../warnings";
import { ITEM_ATTR } from "./constants";
import { WarningRow } from "./WarningRow";

export type WarningListProps = {
  groups: readonly WarningGroup[];
  /** Applies a fix of a row; returns whether something changed. */
  onFix: (fix: LayoutFix, screenId: ScreenId, blockName: string) => boolean;
  /** Shows the screen name above each group (when the list spans several screens). */
  showScreenNames?: boolean;
  className?: string;
};

/**
 * Warnings with their one-click fixes («Anidar», «Poner debajo»…). Nothing is corrected silently: each
 * fix is a button. After a fix the row usually disappears, so focus moves to the row that took its
 * place (or the list itself when none is left) instead of falling back to the page.
 */
export const WarningList = memo(function WarningList({ groups, onFix, showScreenNames = false, className }: WarningListProps) {
  const t = useDictionary(layout);
  const baseId = useId();
  const listRef = useRef<HTMLDivElement | null>(null);
  const pendingFocus = useRef<number | null>(null);

  // Runs when the groups change after a fix (the store gives a new list): move focus before paint.
  useLayoutEffect(() => {
    const index = pendingFocus.current;
    const list = listRef.current;
    if (index === null || !list) return;
    pendingFocus.current = null;
    const rows = list.querySelectorAll<HTMLElement>(`[${ITEM_ATTR}]`);
    const target = focusIndexAfterFix(index, rows.length);
    const button = target >= 0 ? rows[target]?.querySelector<HTMLElement>("button") : null;
    (button ?? list).focus({ preventScroll: false });
  }, [groups]);

  const total = groups.reduce((sum, group) => sum + group.items.length, 0);
  let flatIndex = 0;

  return (
    <div ref={listRef} tabIndex={-1} className={cn("flex flex-col gap-3 outline-none", className)}>
      {total === 0 ? (
        <p className="flex items-center gap-2 text-small text-muted">
          <CheckIcon className="size-3.5 shrink-0 text-success" />
          {t.generate.report.noWarnings}
        </p>
      ) : (
        groups.map((group) => {
          const headingId = `${baseId}-${group.screenId}`;
          return (
            <div key={group.screenId} className="flex flex-col gap-2">
              {showScreenNames && (
                <p id={headingId} className="text-caption font-semibold text-muted">
                  {group.screenName}
                </p>
              )}
              <ul aria-labelledby={showScreenNames ? headingId : undefined} className="m-0 flex list-none flex-col gap-2 p-0">
                {group.items.map((item) => {
                  const index = flatIndex++;
                  return (
                    <WarningRow
                      key={item.key}
                      item={item}
                      onFix={(fix, blockName) => {
                        pendingFocus.current = index;
                        if (!onFix(fix, group.screenId, blockName)) pendingFocus.current = null;
                      }}
                    />
                  );
                })}
              </ul>
            </div>
          );
        })
      )}
    </div>
  );
});
