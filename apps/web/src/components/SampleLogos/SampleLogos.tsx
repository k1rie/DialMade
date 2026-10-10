"use client";

import Image from "next/image";
import { useId } from "react";
import { DraggableItem } from "@/components/dnd/DraggableItem";
import { Spinner } from "@/components/ui/Button";
import { useDictionary } from "@/i18n";
import { home } from "@/i18n/home";
import { cn } from "@/lib/cn";
import { SAMPLE_DRAG_TYPE, SAMPLE_LOGOS, type SampleLogo } from "./samples";

export type SampleLogosProps = {
  /** Click/tap alternative to dragging a tile onto a slot that accepts `SAMPLE_DRAG_TYPE`. */
  onPick: (sample: SampleLogo) => void;
  /** Sample currently loading (spinner on its tile). */
  loadingId?: string;
  disabled?: boolean;
  className?: string;
};

/** Row of fictional sample logos. Each tile can be clicked, or dragged (pointer or keyboard) onto a drop slot. */
export function SampleLogos({ onPick, loadingId, disabled = false, className }: SampleLogosProps) {
  const t = useDictionary(home).samples;
  const labelId = useId();

  return (
    <div className={cn("flex flex-col items-center gap-3", className)}>
      <p id={labelId} className="text-small text-muted">
        {t.label}
      </p>
      <ul aria-labelledby={labelId} className="flex flex-wrap justify-center gap-3">
        {SAMPLE_LOGOS.map((sample) => (
          <li key={sample.id} className="flex w-16 flex-col items-center gap-1.5">
            <DraggableItem
              id={`sample-${sample.id}`}
              type={SAMPLE_DRAG_TYPE}
              label={sample.name}
              aria-label={t.pick(sample.name, t.describe[sample.id])}
              data={{ sampleId: sample.id }}
              disabled={disabled}
              onActivate={() => onPick(sample)}
              className="group size-14 rounded-card"
            >
              <span
                className={cn(
                  "relative grid size-full place-items-center rounded-[inherit] border border-white/10 bg-[oklch(0.965_0.004_285)] shadow-surface",
                  "transition-transform duration-200 ease-out group-hover:-translate-y-0.5",
                )}
              >
                <Image src={sample.src} alt="" width={34} height={34} unoptimized draggable={false} className="size-[34px]" />
                {loadingId === sample.id && (
                  <span className="absolute inset-0 grid place-items-center rounded-[inherit] bg-white/75 text-black">
                    <Spinner />
                  </span>
                )}
              </span>
            </DraggableItem>
            <span aria-hidden className="text-caption text-subtle">
              {t.kinds[sample.id]}
            </span>
          </li>
        ))}
      </ul>
    </div>
  );
}
