"use client";

import { useEffect, useId, useRef, useState } from "react";
import { HexColorInput, HexColorPicker } from "react-colorful";
import { Button } from "@/components/ui/Button";
import { useDictionary } from "@/i18n";
import { home } from "@/i18n/home";
import { cn } from "@/lib/cn";
import { COLOR_PRESETS } from "../constants";
import { ArrowRightIcon } from "../icons";

export type ColorPanelProps = {
  initialColor: string;
  onStart: (hex: string) => void;
};

// react-colorful injects unlayered CSS, so the overrides need `!` to win over it. String.raw keeps
// the `\_` escapes Tailwind needs for the underscores in its BEM class names.
const pickerSkin = cn(
  String.raw`[&_.react-colorful\_\_saturation]:rounded-[10px]! [&_.react-colorful\_\_saturation]:border-b-0!`,
  String.raw`[&_.react-colorful\_\_hue]:mt-2.5! [&_.react-colorful\_\_hue]:h-3! [&_.react-colorful\_\_hue]:rounded-[6px]!`,
  String.raw`[&_.react-colorful\_\_pointer]:size-5! [&_.react-colorful\_\_pointer]:border-[3px]!`,
  String.raw`[&_.react-colorful\_\_interactive:focus-visible_.react-colorful\_\_pointer]:shadow-[0_0_0_2px_var(--app-bg),0_0_0_4px_var(--app-accent)]!`,
);

/** «No tengo logo»: pick the brand's main color and jump straight to the palette. */
export function ColorPanel({ initialColor, onStart }: ColorPanelProps) {
  const t = useDictionary(home).color;
  const hexId = useId();
  const presetsId = useId();
  const [color, setColor] = useState(initialColor);
  const current = color.toUpperCase();
  const pickerRef = useRef<HTMLDivElement>(null);

  // react-colorful hardcodes English slider names ("Color", "Hue").
  useEffect(() => {
    const root = pickerRef.current;
    root?.querySelector(".react-colorful__saturation [role='slider']")?.setAttribute("aria-label", t.saturation);
    root?.querySelector(".react-colorful__hue [role='slider']")?.setAttribute("aria-label", t.hue);
  }, [t]);

  return (
    <div>
      <h2 className="text-[0.9375rem] leading-6 font-semibold tracking-[-0.01em] text-fg">{t.title}</h2>
      <p className="mt-0.5 text-small text-muted">{t.description}</p>
      <div ref={pickerRef} role="group" aria-label={t.picker} className={cn("mt-3", pickerSkin)}>
        <HexColorPicker color={color} onChange={setColor} style={{ width: "100%", height: 168 }} />
      </div>
      <div className="mt-3 flex items-center gap-2">
        <span aria-hidden className="size-9 shrink-0 rounded-control border border-white/12 shadow-surface" style={{ backgroundColor: color }} />
        <label htmlFor={hexId} className="sr-only">
          {t.hex}
        </label>
        <div className="flex h-9 min-w-0 flex-1 items-center gap-1 rounded-control border border-app-strong bg-white/[0.04] px-3 transition-[border-color] duration-150 has-[input:focus-visible]:border-accent has-[input:focus-visible]:outline-2 has-[input:focus-visible]:outline-offset-2 has-[input:focus-visible]:outline-accent">
          <span aria-hidden className="font-mono text-mono text-subtle">
            #
          </span>
          <HexColorInput
            id={hexId}
            data-autofocus
            color={color}
            onChange={setColor}
            className="min-w-0 flex-1 bg-transparent font-mono text-mono text-fg uppercase outline-none focus-visible:shadow-none focus-visible:outline-none"
          />
        </div>
      </div>
      <p id={presetsId} className="mt-3 mb-1.5 text-caption text-muted">
        {t.suggestions}
      </p>
      <div role="group" aria-labelledby={presetsId} className="flex flex-wrap gap-1.5">
        {COLOR_PRESETS.map((hex) => (
          <button
            key={hex}
            type="button"
            aria-label={t.use(hex)}
            aria-pressed={current === hex}
            onClick={() => setColor(hex)}
            className="size-7 rounded-chip border border-white/14 shadow-surface transition-transform duration-150 hover:scale-105 aria-pressed:glow-purple"
            style={{ backgroundColor: hex }}
          />
        ))}
      </div>
      <Button variant="primary" className="mt-4 w-full" trailingIcon={<ArrowRightIcon />} onClick={() => onStart(color)}>
        {t.start}
      </Button>
    </div>
  );
}
