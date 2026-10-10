"use client";

import type { RefObject } from "react";
import { useDictionary } from "@/i18n";
import { palette } from "@/i18n/palette";
import { cn } from "@/lib/cn";
import type { SeedRole } from "../../constants";
import { FloatingPanel } from "../../FloatingPanel";
import { CheckIcon, CopyIcon } from "../../icons";
import { formatHex } from "../../format";

export type SwatchMenuProps = {
  /** Swatch the menu is open for; `null` closes it. */
  swatch: { hex: string; coverage: string } | null;
  anchorRef: RefObject<HTMLElement | null>;
  /** Roles this color already fills (checked items). */
  roles: { primary: boolean; secondary: boolean };
  onUse: (role: SeedRole) => void;
  onCopy: () => void;
  onClose: (restoreFocus: boolean) => void;
};

const itemClass =
  "flex h-9 w-full items-center gap-2.5 rounded-control px-2.5 text-left text-small text-fg transition-colors duration-150 " +
  "hover:bg-white/[0.06] focus-visible:bg-white/[0.08]";

/** Click alternative to dragging a logo color: «Usar como primario / secundario» and «Copiar hex». */
export function SwatchMenu({ swatch, anchorRef, roles, onUse, onCopy, onClose }: SwatchMenuProps) {
  const t = useDictionary(palette);
  const hex = swatch ? formatHex(swatch.hex) : "";
  const items: { role: SeedRole; label: string; checked: boolean }[] = [
    { role: "primary", label: t.colors.usePrimary, checked: roles.primary },
    { role: "secondary", label: t.colors.useSecondary, checked: roles.secondary },
  ];

  return (
    <FloatingPanel open={swatch !== null} onClose={onClose} anchorRef={anchorRef} placement="bottom" role="menu" label={t.colors.menu(hex)} className="w-60 p-1.5">
      {swatch && (
        <>
          <div className="flex items-center gap-2.5 px-2.5 pt-1.5 pb-2" aria-hidden>
            <span className="size-7 shrink-0 rounded-chip shadow-[inset_0_0_0_1px_oklch(1_0_0/0.12)]" style={{ backgroundColor: swatch.hex }} />
            <span className="min-w-0">
              <span className="block font-mono text-mono text-fg">{hex}</span>
              <span className="block text-caption text-muted">{t.colors.coverage(swatch.coverage)}</span>
            </span>
          </div>
          <div role="separator" className="mx-1 mb-1 h-px bg-white/[0.08]" />
          {items.map((item) => (
            <button
              key={item.role}
              type="button"
              role="menuitem"
              tabIndex={-1}
              onClick={() => onUse(item.role)}
              className={itemClass}
            >
              <span aria-hidden className={cn("flex size-4 items-center justify-center text-accent", !item.checked && "opacity-0")}>
                <CheckIcon className="size-3.5" />
              </span>
              {item.label}
            </button>
          ))}
          <div role="separator" className="mx-1 my-1 h-px bg-white/[0.08]" />
          <button type="button" role="menuitem" tabIndex={-1} onClick={onCopy} className={itemClass}>
            <CopyIcon className="size-4 text-muted" />
            {t.colors.copyHex}
          </button>
        </>
      )}
    </FloatingPanel>
  );
}
