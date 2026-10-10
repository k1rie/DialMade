"use client";

import { useCallback, useRef, useState, type RefObject } from "react";
import { IconButton } from "@/components/ui/IconButton";
import { useDictionary } from "@/i18n";
import { palette } from "@/i18n/palette";
import type { SeedRole } from "../constants";
import { SwapIcon } from "../icons";
import { ColorPickerPopover } from "./ColorPickerPopover";
import { SeedSlot } from "./SeedSlot";

export type SeedSlotsProps = {
  /** `#rrggbb` */
  primary: string;
  /** `#rrggbb` */
  secondary?: string;
  /** Drops, hex edits and picker changes (live). */
  onChange: (role: SeedRole, hex: string) => void;
  onRemoveSecondary: () => void;
  onSwap: () => void;
  /** The picker floats next to this element (the left panel). */
  boundaryRef: RefObject<HTMLElement | null>;
};

/** «Primario» ⇄ «Secundario»: drop targets for logo colors, each with a floating picker and a hex field. */
export function SeedSlots({ primary, secondary, onChange, onRemoveSecondary, onSwap, boundaryRef }: SeedSlotsProps) {
  const t = useDictionary(palette).seeds;
  const [editing, setEditing] = useState<SeedRole | null>(null);
  const anchorRef = useRef<HTMLElement | null>(null);
  const buttons = useRef<Record<SeedRole, HTMLButtonElement | null>>({ primary: null, secondary: null });

  const edit = useCallback((role: SeedRole) => {
    anchorRef.current = buttons.current[role];
    setEditing((current) => (current === role ? null : role));
  }, []);

  const close = useCallback((restoreFocus: boolean) => {
    setEditing(null);
    if (restoreFocus) anchorRef.current?.focus({ preventScroll: true });
  }, []);

  const labels: Record<SeedRole, string> = { primary: t.primary, secondary: t.secondary };
  const editingColor = editing === "secondary" ? (secondary ?? primary) : primary;

  return (
    <>
      <div className="grid grid-cols-[minmax(0,1fr)_auto_minmax(0,1fr)] items-center gap-1">
        <SeedSlot
          role="primary"
          label={t.primary}
          value={primary}
          onChange={(hex) => onChange("primary", hex)}
          onEdit={() => edit("primary")}
          editing={editing === "primary"}
          colorButtonRef={(element) => {
            buttons.current.primary = element;
          }}
        />
        <IconButton size="sm" label={t.swap} icon={<SwapIcon />} disabled={!secondary} onClick={onSwap} />
        <SeedSlot
          role="secondary"
          label={t.secondary}
          value={secondary}
          onChange={(hex) => onChange("secondary", hex)}
          onEdit={() => edit("secondary")}
          editing={editing === "secondary"}
          onRemove={() => {
            if (editing === "secondary") setEditing(null);
            onRemoveSecondary();
          }}
          colorButtonRef={(element) => {
            buttons.current.secondary = element;
          }}
        />
      </div>
      <ColorPickerPopover
        open={editing !== null}
        role={editing ? labels[editing] : ""}
        color={editingColor}
        onChange={(hex) => editing && onChange(editing, hex)}
        onClose={close}
        anchorRef={anchorRef}
        boundaryRef={boundaryRef}
      />
    </>
  );
}
