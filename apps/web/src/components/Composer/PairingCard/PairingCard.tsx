"use client";

import type { Locale, TypographyPairing } from "@dialmade/catalog";
import { memo, type CSSProperties } from "react";
import { DraggableItem } from "@/components/dnd/DraggableItem";
import { cn } from "@/lib/cn";
import { DND } from "../constants";
import { CheckIcon } from "../icons";

export type PairingCardProps = {
  pairing: TypographyPairing;
  selected: boolean;
  onApply: (pairingId: string) => void;
  /** Keeps DnD ids unique when the same pairing shows in two places. */
  idPrefix: string;
  /** "deck": big «Aa» card; "pack": Buffer-style tile (family name + body sample). */
  variant: "deck" | "pack";
  locale: Locale;
  sample: string;
  currentLabel: string;
};

const face = (family: string, fallback: string, weight?: number): CSSProperties => ({
  fontFamily: `"${family}", ${fallback}`,
  ...(weight && { fontWeight: weight }),
});

const headingWeight = (pairing: TypographyPairing) => pairing.heading.weights.find((w) => w >= 600) ?? pairing.heading.weights.at(-1) ?? 600;

/** A typography pairing in its real fonts; click applies it, dragging drops it on the page or the slot. */
export const PairingCard = memo(function PairingCard({ pairing, selected, onApply, idPrefix, variant, locale, sample, currentLabel }: PairingCardProps) {
  const name = pairing.label[locale];
  const heading = face(pairing.heading.family, pairing.heading.fallback, headingWeight(pairing));
  const body = face(pairing.body.family, pairing.body.fallback, 400);
  return (
    <DraggableItem
      id={`${idPrefix}-${pairing.id}`}
      type={DND.pairing}
      label={name}
      aria-label={selected ? `${name}, ${currentLabel}` : name}
      data={{ pairingId: pairing.id }}
      onActivate={() => onApply(pairing.id)}
      className="rounded-card"
    >
      <div
        className={cn(
          "relative flex h-full flex-col overflow-hidden rounded-card border bg-surface transition-[border-color,background-color] duration-150",
          selected ? "glow-purple border-transparent bg-accent-soft/40" : "border-app hover:border-app-strong hover:bg-surface-hover",
          variant === "deck" ? "gap-2 p-3" : "gap-1 px-3 py-2.5",
        )}
      >
        {variant === "deck" ? (
          <>
            <span aria-hidden className="text-[1.75rem] leading-none text-fg" style={heading}>
              Aa
            </span>
            <span className="min-w-0">
              <span className="block truncate text-caption font-medium text-fg">{name}</span>
              <span className="block truncate text-caption text-muted">
                {pairing.heading.family === pairing.body.family ? pairing.heading.family : `${pairing.heading.family} · ${pairing.body.family}`}
              </span>
            </span>
          </>
        ) : (
          <>
            <span className="truncate pe-5 text-[0.9375rem] leading-5 text-fg" style={heading}>
              {pairing.heading.family}
            </span>
            <span className="truncate text-caption text-muted" style={body}>
              {sample}
            </span>
          </>
        )}
        {selected && (
          <span aria-hidden className="absolute top-2 right-2 grid size-4 place-items-center rounded-full bg-accent text-white [&_svg]:size-2.5">
            <CheckIcon strokeWidth={2.2} />
          </span>
        )}
      </div>
    </DraggableItem>
  );
});
