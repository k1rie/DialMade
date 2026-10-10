"use client";

import type { Swatch } from "@dialmade/palette";
import { motion } from "motion/react";
import { useCallback, useMemo, useRef, useState, type KeyboardEvent, type MouseEvent } from "react";
import { DraggableItem } from "@/components/dnd/DraggableItem";
import { Button } from "@/components/ui/Button";
import { Tooltip } from "@/components/ui/Tooltip";
import { useDictionary, useI18n } from "@/i18n";
import { palette } from "@/i18n/palette";
import { cn } from "@/lib/cn";
import { swatchFlight } from "@/lib/motion";
import { swatchLayoutId } from "@/lib/layout-ids";
import { SWATCH_TYPE, type SeedRole } from "../constants";
import { UploadIcon } from "../icons";
import { formatHex } from "../format";
import { useClipboard } from "../useClipboard";
import { SwatchMenu } from "./SwatchMenu";

export type LogoColorsProps = {
  /** Extracted swatches, most covered first (the burst flies into them by index). */
  swatches: readonly Swatch[];
  primary?: string;
  secondary?: string;
  /** Click/menu alternative to dropping a swatch on a seed slot. */
  onUse: (role: SeedRole, hex: string) => void;
  /** Empty state (no logo): opens the file picker. */
  onUpload: () => void;
  uploading?: boolean;
  headingId: string;
};

type OpenMenu = { hex: string; coverage: string };

/**
 * «Colores del logo»: rounded swatches that receive the LogoBurst flight (`swatchLayoutId(i)`). Each one
 * shows its coverage on hover, drags onto «Primario»/«Secundario» (Space/Enter + arrows by keyboard) and,
 * on click, opens a menu to use it as primary or secondary. Shift+F10 / the context-menu key open it too.
 */
export function LogoColors({ swatches, primary, secondary, onUse, onUpload, uploading, headingId }: LogoColorsProps) {
  const t = useDictionary(palette);
  const { locale } = useI18n();
  const copy = useClipboard();
  const anchorRef = useRef<HTMLElement | null>(null);
  const itemRefs = useRef(new Map<string, HTMLLIElement>());
  const [menu, setMenu] = useState<OpenMenu | null>(null);

  const percent = useMemo(() => {
    const whole = new Intl.NumberFormat(locale, { style: "percent", maximumFractionDigits: 0 });
    const fine = new Intl.NumberFormat(locale, { style: "percent", maximumFractionDigits: 1 });
    return (coverage: number) => (coverage < 0.095 ? fine : whole).format(coverage);
  }, [locale]);

  const openMenu = useCallback((hex: string, coverage: string) => {
    anchorRef.current = itemRefs.current.get(hex) ?? null;
    setMenu({ hex, coverage });
  }, []);

  const closeMenu = useCallback((restoreFocus: boolean) => {
    const anchor = anchorRef.current;
    setMenu(null);
    if (restoreFocus) anchor?.querySelector<HTMLElement>("[role='button']")?.focus({ preventScroll: true });
  }, []);

  if (swatches.length === 0) {
    return (
      <div className="flex flex-col items-start gap-3 rounded-card border border-dashed border-app-strong p-4">
        <p className="text-small text-muted">{t.colors.empty}</p>
        <Button size="sm" leadingIcon={<UploadIcon />} loading={uploading} onClick={onUpload}>
          {t.colors.upload}
        </Button>
      </div>
    );
  }

  return (
    <>
      <ul aria-labelledby={headingId} className="grid grid-cols-6 gap-2">
        {swatches.map((swatch, index) => {
          const hex = formatHex(swatch.hex);
          const coverage = percent(swatch.coverage);
          const isPrimary = swatch.hex === primary;
          const isSecondary = swatch.hex === secondary;
          const role = isPrimary ? t.colors.roleShort.primary : isSecondary ? t.colors.roleShort.secondary : null;
          const roleName = isPrimary ? t.seeds.primary : isSecondary ? t.seeds.secondary : undefined;
          const onKeyDown = (event: KeyboardEvent) => {
            if (event.key === "ContextMenu" || (event.shiftKey && event.key === "F10")) {
              event.preventDefault();
              openMenu(swatch.hex, coverage);
            }
          };
          const onContextMenu = (event: MouseEvent) => {
            event.preventDefault();
            openMenu(swatch.hex, coverage);
          };
          return (
            <li
              key={swatch.hex}
              ref={(element) => {
                if (element) itemRefs.current.set(swatch.hex, element);
                else itemRefs.current.delete(swatch.hex);
              }}
              className="aspect-square [&>span]:size-full"
              onKeyDown={onKeyDown}
              onContextMenu={onContextMenu}
            >
              <Tooltip content={<span className="font-mono">{`${hex} · ${t.colors.coverage(coverage)}`}</span>}>
                <DraggableItem
                  id={`palette-swatch-${swatch.hex}`}
                  type={SWATCH_TYPE}
                  label={hex}
                  aria-label={t.colors.swatch(hex, coverage, roleName)}
                  data={{ hex: swatch.hex }}
                  className="block size-full rounded-[10px] focus-visible:outline-offset-[5px]"
                  onActivate={() => openMenu(swatch.hex, coverage)}
                >
                  <motion.span
                    layoutId={swatchLayoutId(index)}
                    transition={swatchFlight}
                    className={cn(
                      "relative block size-full rounded-[10px]",
                      role ? "shadow-[0_0_0_2px_var(--app-bg-elevated),0_0_0_3.5px_oklch(1_0_0/0.85)]" : "shadow-[inset_0_0_0_1px_oklch(1_0_0/0.1)]",
                    )}
                    style={{ backgroundColor: swatch.hex }}
                  >
                    {role && (
                      <span
                        aria-hidden
                        className="absolute -top-1.5 -right-1.5 flex size-4 items-center justify-center rounded-[5px] bg-white font-mono text-[10px] leading-none font-semibold text-black shadow-surface"
                      >
                        {role}
                      </span>
                    )}
                  </motion.span>
                </DraggableItem>
              </Tooltip>
            </li>
          );
        })}
      </ul>
      <SwatchMenu
        swatch={menu}
        anchorRef={anchorRef}
        roles={{ primary: menu?.hex === primary, secondary: menu?.hex === secondary }}
        onUse={(role) => {
          if (menu) onUse(role, menu.hex);
          closeMenu(true);
        }}
        onCopy={() => {
          if (menu) void copy(formatHex(menu.hex), t.export.copied(formatHex(menu.hex)));
          closeMenu(true);
        }}
        onClose={closeMenu}
      />
    </>
  );
}
