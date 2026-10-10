"use client";

import type { Mode } from "@dialmade/import";
import { AnimatePresence, motion } from "motion/react";
import { DropSlot } from "@/components/dnd/DropSlot";
import { IconButton } from "@/components/ui/IconButton";
import { useDictionary } from "@/i18n";
import { importText } from "@/i18n/import";
import { cn } from "@/lib/cn";
import { popVariants } from "@/lib/motion";
import { DETECTED_COLOR_TYPE, slotDomId, slotId } from "../constants";
import { CloseIcon, MoonIcon, SunIcon } from "../icons";
import { hexLabel } from "../labels";
import { SLOT_ROLES, type SlotRole } from "../model";

export type SlotFill = { id: string; hex: string; alpha?: number };

export type RoleSlotsProps = {
  mode: Mode;
  fills: Partial<Record<SlotRole, SlotFill>>;
  /** A color dropped on a slot (its `detectedId`). */
  onDrop: (role: SlotRole, detectedId: string) => void;
  onClear: (role: SlotRole) => void;
  disabled?: boolean;
};

/** «Roles de tu marca»: Primario, Secundario, Fondo, Texto y Acento, filled by dragging a color, its menu or the keyboard. */
export function RoleSlots({ mode, fills, onDrop, onClear, disabled = false }: RoleSlotsProps) {
  const t = useDictionary(importText).review.slots;

  return (
    <div className="flex flex-col gap-2">
      <p className="flex items-center gap-1.5 text-caption text-muted">
        {mode === "dark" ? <MoonIcon className="size-3.5" /> : <SunIcon className="size-3.5" />}
        <span>
          {t.hint} <span className="text-muted">({t.mode[mode]})</span>
        </span>
      </p>
      <ul className="grid grid-cols-3 gap-2 sm:grid-cols-5">
        {SLOT_ROLES.map((role) => {
          const fill = fills[role];
          const name = t.names[role] ?? role;
          return (
            <li key={role} className="min-w-0">
              <DropSlot
                id={slotId(role)}
                accept={DETECTED_COLOR_TYPE}
                label={name}
                disabled={disabled}
                role="group"
                domId={slotDomId(role)}
                tabIndex={-1}
                aria-label={fill ? t.filled(name, hexLabel(fill.hex)) : t.emptyLabel(name)}
                className="rounded-card outline-none focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-accent"
                onDrop={(item) => {
                  const id = item.data.detectedId;
                  if (typeof id === "string") onDrop(role, id);
                }}
              >
                {(state) => (
                  <div
                    className={cn(
                      "flex flex-col gap-1.5 rounded-card border p-1 transition-colors duration-150",
                      fill ? "border-app bg-white/[0.03]" : "border-dashed border-app-strong",
                      state === "over" && "border-accent/70",
                    )}
                  >
                    <div className="relative h-10 overflow-hidden rounded-[9px]">
                      <AnimatePresence initial={false} mode="popLayout">
                        {fill ? (
                          <motion.span
                            key={`${fill.id}-${fill.hex}`}
                            variants={popVariants}
                            initial="initial"
                            animate="animate"
                            exit="exit"
                            aria-hidden
                            className="absolute inset-0 shadow-[inset_0_0_0_1px_oklch(1_0_0/0.12)]"
                            style={{ backgroundColor: fill.alpha === undefined ? fill.hex : `color-mix(in oklab, ${fill.hex} ${Math.round(fill.alpha * 100)}%, transparent)` }}
                          />
                        ) : (
                          <motion.span
                            key="empty"
                            variants={popVariants}
                            initial="initial"
                            animate="animate"
                            exit="exit"
                            aria-hidden
                            className="absolute inset-0 flex items-center justify-center px-1 text-center text-[11px] leading-tight text-muted"
                          >
                            {t.empty}
                          </motion.span>
                        )}
                      </AnimatePresence>
                      {fill && !disabled && (
                        <span className="absolute top-0.5 right-0.5">
                          <IconButton
                            label={t.clear(name)}
                            icon={<CloseIcon />}
                            size="sm"
                            tooltip={false}
                            data-slot-clear={role}
                            onClick={() => onClear(role)}
                            className="size-6 rounded-[7px] bg-black/45 text-white/85 hover:bg-black/60 hover:text-white [&_svg]:size-3.5"
                          />
                        </span>
                      )}
                    </div>
                    <span className="flex min-w-0 flex-col px-0.5">
                      <span className="truncate text-[11px] leading-4 font-medium text-fg" title={name}>
                        {name}
                      </span>
                      <span aria-hidden={fill ? undefined : true} className="truncate font-mono text-[10px] leading-3.5 text-muted">
                        {fill ? hexLabel(fill.hex) : "—"}
                      </span>
                    </span>
                  </div>
                )}
              </DropSlot>
            </li>
          );
        })}
      </ul>
    </div>
  );
}
