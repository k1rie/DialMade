"use client";

import type { ScaleStep, ScaleStepNumber, Theme } from "@dialmade/palette";
import { motion } from "motion/react";
import { useState } from "react";
import { Chip } from "@/components/ui/Chip";
import { Tooltip } from "@/components/ui/Tooltip";
import { useDictionary } from "@/i18n";
import { palette } from "@/i18n/palette";
import { cn } from "@/lib/cn";
import { snappy } from "@/lib/motion";
import { formatHex } from "../format";
import { useClipboard } from "../useClipboard";

export type ScaleStripProps = {
  theme: Theme;
};

type ScaleName = "brand" | "accent" | "neutral";

/** Steps 50–950 of the brand, accent and neutral scales; the anchor step is marked and a click copies the hex. */
export function ScaleStrip({ theme }: ScaleStripProps) {
  const t = useDictionary(palette);
  const copy = useClipboard();
  const [picked, setPicked] = useState<ScaleName>("brand");
  const available: ScaleName[] = theme.scales.accent ? ["brand", "accent", "neutral"] : ["brand", "neutral"];
  const scale: ScaleName = available.includes(picked) ? picked : "brand";
  const steps: ScaleStep[] = (scale === "accent" ? theme.scales.accent : theme.scales[scale]) ?? theme.scales.brand;
  const anchor: ScaleStepNumber | undefined = scale === "brand" ? theme.anchors.brand : scale === "accent" ? theme.anchors.accent : undefined;
  const name = t.scale.names[scale];

  return (
    <div className="flex flex-col gap-2.5">
      <div role="group" aria-label={t.scale.tabs} className="flex flex-wrap gap-1">
        {available.map((id) => (
          <Chip key={id} size="sm" selected={id === scale} onSelectedChange={() => setPicked(id)}>
            {t.scale.names[id]}
          </Chip>
        ))}
      </div>
      <ol className="flex gap-0.5" aria-label={anchor ? `${name} · ${t.scale.anchorStep(anchor)}` : name}>
        {steps.map((step, index) => {
          const isAnchor = step.step === anchor;
          const hex = formatHex(step.hex);
          return (
            <li key={step.step} className="flex min-w-0 flex-1 flex-col items-center gap-1 [&>span:first-child]:w-full">
              <Tooltip content={<span className="font-mono">{`${step.step} · ${hex}`}</span>}>
                <button
                  type="button"
                  aria-label={t.scale.copy(name, step.step, hex)}
                  onClick={() => void copy(hex, t.export.copied(hex))}
                  className={cn(
                    "relative h-9 w-full transition-[background-color,transform] duration-300 ease-out hover:-translate-y-0.5",
                    index === 0 && "rounded-l-control",
                    index === steps.length - 1 && "rounded-r-control",
                  )}
                  style={{ backgroundColor: step.hex }}
                >
                  {isAnchor && (
                    <motion.span
                      layoutId={`palette-scale-anchor-${scale}`}
                      transition={snappy}
                      aria-hidden
                      className="absolute inset-x-1 bottom-1 mx-auto h-1 max-w-3 rounded-full bg-white shadow-[0_0_0_1px_oklch(0_0_0/0.25)]"
                    />
                  )}
                </button>
              </Tooltip>
              <span aria-hidden className={cn("font-mono text-[10px] leading-3 tabular-nums", isAnchor ? "font-semibold text-fg" : "text-subtle")}>
                {step.step}
              </span>
            </li>
          );
        })}
      </ol>
    </div>
  );
}
