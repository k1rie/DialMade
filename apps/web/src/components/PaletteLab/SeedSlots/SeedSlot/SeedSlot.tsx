"use client";

import type { Ref } from "react";
import { DropSlot } from "@/components/dnd/DropSlot";
import { useDictionary } from "@/i18n";
import { palette } from "@/i18n/palette";
import { cn } from "@/lib/cn";
import { SLOT_IDS, SWATCH_TYPE, type SeedRole } from "../../constants";
import { CloseIcon, PlusIcon } from "../../icons";
import { formatHex } from "../../format";
import { HexInput } from "../HexInput";

export type SeedSlotProps = {
  role: SeedRole;
  label: string;
  /** `#rrggbb`; undefined = empty (only the secondary can be). */
  value?: string;
  /** Any drop, hex edit or picker change. */
  onChange: (hex: string) => void;
  /** Opens the picker anchored to the color button. */
  onEdit: () => void;
  editing: boolean;
  /** Secondary only: clears it. */
  onRemove?: () => void;
  colorButtonRef: Ref<HTMLButtonElement>;
};

/** One seed («Primario»/«Secundario»): drop target for logo swatches, color button (picker) and hex field. */
export function SeedSlot({ role, label, value, onChange, onEdit, editing, onRemove, colorButtonRef }: SeedSlotProps) {
  const t = useDictionary(palette).seeds;
  const hex = value ? formatHex(value) : "";

  return (
    <DropSlot<{ hex?: unknown }>
      id={SLOT_IDS[role]}
      accept={SWATCH_TYPE}
      label={label}
      className="min-w-0 rounded-card"
      onDrop={(item) => {
        if (typeof item.data.hex === "string") onChange(item.data.hex);
      }}
    >
      {(state) => (
        <div
          className={cn(
            "rounded-card border p-2.5 transition-[border-color,background-color] duration-150",
            state === "over" || state === "compatible"
              ? "border-transparent"
              : value
                ? "border-app bg-white/[0.03]"
                : "border-dashed border-app-strong",
          )}
        >
          <div className="mb-2 flex h-5 items-center justify-between gap-1">
            <span className={cn("truncate text-caption", state === "over" ? "text-fg" : "text-muted")}>
              {state === "over" || state === "compatible" ? t.dropHere : label}
            </span>
            {onRemove && value && (
              <button
                type="button"
                aria-label={t.remove}
                title={t.remove}
                onClick={onRemove}
                className="flex size-5 shrink-0 items-center justify-center rounded-[6px] text-subtle transition-colors duration-150 hover:bg-white/[0.08] hover:text-fg"
              >
                <CloseIcon className="size-3" />
              </button>
            )}
          </div>
          <div className="flex items-center gap-2">
            <button
              ref={colorButtonRef}
              type="button"
              aria-label={value ? t.edit(label, hex) : t.add}
              aria-haspopup="dialog"
              aria-expanded={editing}
              onClick={onEdit}
              className={cn(
                "flex size-8 shrink-0 items-center justify-center rounded-control transition-transform duration-150 hover:scale-[1.04] active:scale-[0.97]",
                !value && "border border-dashed border-app-strong text-muted hover:text-fg",
                editing ? "glow-purple" : value && "shadow-[inset_0_0_0_1px_oklch(1_0_0/0.14)]",
              )}
              style={value ? { backgroundColor: value } : undefined}
            >
              {!value && <PlusIcon className="size-3.5" />}
            </button>
            <HexInput
              value={value}
              onCommit={onChange}
              label={t.hex(label)}
              invalidLabel={t.invalid}
              placeholder="RRGGBB"
              size="sm"
              className="flex-1"
            />
          </div>
        </div>
      )}
    </DropSlot>
  );
}
