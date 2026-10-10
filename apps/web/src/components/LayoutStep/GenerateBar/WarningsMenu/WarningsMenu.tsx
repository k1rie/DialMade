"use client";

import type { LayoutFix, ScreenId } from "@dialmade/layout";
import { useState } from "react";
import { Popover } from "@/components/ui/Popover";
import { useDictionary } from "@/i18n";
import { layout } from "@/i18n/layout";
import { cn } from "@/lib/cn";
import { CheckIcon, WarningIcon } from "../../icons";
import { WarningList } from "../WarningList";
import type { WarningGroup } from "../warnings";

export type WarningsMenuProps = {
  /** Warnings of every screen, the active one first. */
  groups: readonly WarningGroup[];
  /** Total warnings in the project (the button text). */
  count: number;
  activeScreenId: ScreenId | null;
  onFix: (fix: LayoutFix, screenId: ScreenId, blockName: string) => boolean;
};

/**
 * «2 avisos» in the bar's status: a button that opens the list of warnings with their fixes. It stays a
 * button with no warnings («Sin avisos»), so fixing the last one never removes the control that has the
 * popover (focus then lands on the list, which says everything fits).
 */
export function WarningsMenu({ groups, count, activeScreenId, onFix }: WarningsMenuProps) {
  const t = useDictionary(layout);
  const [open, setOpen] = useState(false);
  const label = t.generate.warningsCount(count);
  const onlyOther = groups.length === 1 && groups[0]?.screenId !== activeScreenId;

  return (
    <Popover
      open={open}
      onOpenChange={setOpen}
      label={t.generate.report.warnings}
      side="top"
      align="center"
      className="w-[22rem]"
      trigger={(props) => (
        <button
          type="button"
          {...props}
          aria-label={label}
          className={cn(
            "inline-flex h-8 min-w-8 shrink-0 items-center justify-center gap-1.5 rounded-control px-2 text-caption font-medium",
            "transition-colors duration-150 hover:bg-white/[0.06] hover:text-fg",
            count > 0 ? "text-fg" : "text-muted",
            open && "bg-white/[0.06] text-fg",
          )}
        >
          {count > 0 ? <WarningIcon className="size-3.5 text-warning" /> : <CheckIcon className="size-3.5 text-success" />}
          <span aria-hidden className="hidden @lg:inline">
            {label}
          </span>
          {count > 0 && (
            <span aria-hidden className="tabular-nums @lg:hidden">
              {count}
            </span>
          )}
        </button>
      )}
    >
      <div className="flex flex-col gap-3">
        <div>
          <p className="m-0 text-small font-semibold text-fg">{t.generate.report.warnings}</p>
          <p className="m-0 mt-0.5 text-caption text-muted">{t.generate.warningsHint}</p>
        </div>
        <WarningList
          groups={groups}
          onFix={onFix}
          showScreenNames={groups.length > 1 || onlyOther}
          className="-mx-1 max-h-[min(55vh,26rem)] overflow-y-auto overscroll-contain px-1 py-0.5"
        />
      </div>
    </Popover>
  );
}
