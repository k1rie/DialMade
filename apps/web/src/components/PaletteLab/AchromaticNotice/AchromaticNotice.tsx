"use client";

import { motion } from "motion/react";
import { useDictionary } from "@/i18n";
import { palette } from "@/i18n/palette";
import { cn } from "@/lib/cn";
import { snappy } from "@/lib/motion";
import { SUGGESTED_ACCENTS } from "../constants";
import { AlertIcon } from "../icons";
import { formatHex } from "../format";

export type AchromaticNoticeProps = {
  /** `#rrggbb` of the secondary seed (the accent of an achromatic brand). */
  secondary?: string;
  /** The palette style already brings an accent (e.g. «Lujo oscuro»). */
  styleAccent: boolean;
  onPick: (hex: string) => void;
};

/** Gray, black or white logos: explains where the accent comes from and offers three to pick from. */
export function AchromaticNotice({ secondary, styleAccent, onPick }: AchromaticNoticeProps) {
  const t = useDictionary(palette).achromatic;
  const message = secondary ? t.hasAccent : styleAccent ? t.styleAccent : t.body;

  return (
    <div role="note" className="rounded-card border border-warning/30 bg-warning/[0.06] p-3">
      <p className="flex items-center gap-2 text-small font-semibold text-fg">
        <AlertIcon className="size-4 shrink-0 text-warning" />
        {t.title}
      </p>
      <p className="mt-1 text-small text-muted">{message}</p>
      <div className="mt-2.5 flex flex-wrap gap-1.5">
        {SUGGESTED_ACCENTS.map((accent) => {
          const name = t.accents[accent.id];
          const selected = secondary === accent.hex;
          return (
            <button
              key={accent.id}
              type="button"
              aria-pressed={selected}
              aria-label={t.use(name, formatHex(accent.hex))}
              onClick={() => onPick(accent.hex)}
              className={cn(
                "inline-flex h-7 items-center gap-1.5 rounded-chip border px-2 text-small transition-[background-color,border-color] duration-150",
                selected ? "glow-purple border-transparent bg-accent-soft text-fg" : "border-app bg-white/[0.03] text-muted hover:border-app-strong hover:text-fg",
              )}
            >
              <motion.span
                aria-hidden
                className="size-3.5 rounded-[5px] shadow-[inset_0_0_0_1px_oklch(1_0_0/0.15)]"
                style={{ backgroundColor: accent.hex }}
                animate={{ scale: selected ? 1.12 : 1 }}
                transition={snappy}
              />
              {name}
            </button>
          );
        })}
      </div>
    </div>
  );
}
