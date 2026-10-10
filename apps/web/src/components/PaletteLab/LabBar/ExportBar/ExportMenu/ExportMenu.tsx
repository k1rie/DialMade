"use client";

import type { ReactNode, RefObject } from "react";
import { FloatingPanel } from "../../../FloatingPanel";

export type ExportAction = { id: string; label: string; hint: string; icon: ReactNode; run: () => void };

export type ExportMenuProps = {
  open: boolean;
  onClose: (restoreFocus: boolean) => void;
  anchorRef: RefObject<HTMLElement | null>;
  label: string;
  actions: ExportAction[];
};

/** Upward menu of export actions (each with its hint); running one closes it and returns focus. */
export function ExportMenu({ open, onClose, anchorRef, label, actions }: ExportMenuProps) {
  return (
    <FloatingPanel open={open} onClose={onClose} anchorRef={anchorRef} placement="top" role="menu" label={label} className="w-72 p-1.5">
      {actions.map((action) => (
        <button
          key={action.id}
          type="button"
          role="menuitem"
          tabIndex={-1}
          onClick={() => {
            action.run();
            onClose(true);
          }}
          className="flex w-full items-start gap-2.5 rounded-control px-2.5 py-2 text-left transition-colors duration-150 hover:bg-white/[0.06] focus-visible:bg-white/[0.08]"
        >
          <span className="mt-0.5 text-muted [&_svg]:size-4">{action.icon}</span>
          <span className="min-w-0">
            <span className="block text-small font-medium text-fg">{action.label}</span>
            <span className="block text-caption text-muted">{action.hint}</span>
          </span>
        </button>
      ))}
    </FloatingPanel>
  );
}
