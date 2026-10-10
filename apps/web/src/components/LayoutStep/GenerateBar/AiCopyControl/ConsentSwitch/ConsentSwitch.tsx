"use client";

import { useId, type ReactNode } from "react";
import { Switch } from "@/components/ui/Switch";
import { cn } from "@/lib/cn";

export type ConsentSwitchProps = {
  checked: boolean;
  onCheckedChange: (checked: boolean) => void;
  disabled?: boolean;
  /** Visible label; clicking it toggles the switch. */
  label: string;
  /** Lines under the label (cost, uses left, scope): the switch's description. */
  children?: ReactNode;
};

/**
 * The AI switch with its label and the lines under it. The label names the switch and the lines describe it;
 * the description never includes the label, so screen readers do not read it twice.
 */
export function ConsentSwitch({ checked, onCheckedChange, disabled = false, label, children }: ConsentSwitchProps) {
  const switchId = useId();
  const labelId = useId();
  const detailId = useId();
  return (
    <div className="flex items-start gap-3 rounded-control border border-app bg-white/[0.02] px-3 py-2.5">
      <Switch
        id={switchId}
        checked={checked}
        onCheckedChange={onCheckedChange}
        disabled={disabled}
        aria-labelledby={labelId}
        aria-describedby={detailId}
        className="mt-0.5"
      />
      <div className="flex min-w-0 flex-1 flex-col gap-1">
        <label id={labelId} htmlFor={switchId} className={cn("text-small font-medium text-fg", !disabled && "cursor-pointer")}>
          {label}
        </label>
        {/* `contents`: the lines stay items of the column above, as if this wrapper were not there. */}
        <div id={detailId} className="contents">
          {children}
        </div>
      </div>
    </div>
  );
}
