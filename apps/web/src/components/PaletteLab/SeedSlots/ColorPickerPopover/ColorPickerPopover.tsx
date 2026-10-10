"use client";

import { useCallback, useEffect, useRef, useState, type RefObject } from "react";
import { HexColorPicker } from "react-colorful";
import { IconButton } from "@/components/ui/IconButton";
import { useDictionary } from "@/i18n";
import { palette } from "@/i18n/palette";
import { cn } from "@/lib/cn";
import { FloatingPanel } from "../../FloatingPanel";
import { CloseIcon, EyedropperIcon } from "../../icons";
import { HexInput } from "../HexInput";

export type ColorPickerPopoverProps = {
  open: boolean;
  /** `#rrggbb` being edited. */
  color: string;
  /** Live changes (throttled to one per frame). */
  onChange: (hex: string) => void;
  onClose: (restoreFocus: boolean) => void;
  /** Swatch button that opened it. */
  anchorRef: RefObject<HTMLElement | null>;
  /** The picker floats next to this element (the left panel), like Recraft's popover. */
  boundaryRef?: RefObject<HTMLElement | null>;
  /** «Primario» / «Secundario». */
  role: string;
};

type EyeDropperApi = { open: () => Promise<{ sRGBHex: string }> };
type EyeDropperCtor = new () => EyeDropperApi;

// react-colorful injects unlayered CSS, so the overrides need `!` to win over it.
const pickerSkin = cn(
  String.raw`[&_.react-colorful]:w-full! [&_.react-colorful]:h-auto! [&_.react-colorful]:gap-0!`,
  String.raw`[&_.react-colorful\_\_saturation]:h-40! [&_.react-colorful\_\_saturation]:rounded-[10px]! [&_.react-colorful\_\_saturation]:border-b-0!`,
  String.raw`[&_.react-colorful\_\_hue]:mt-3! [&_.react-colorful\_\_hue]:h-3! [&_.react-colorful\_\_hue]:rounded-[6px]!`,
  String.raw`[&_.react-colorful\_\_pointer]:size-5! [&_.react-colorful\_\_pointer]:border-[3px]!`,
  String.raw`[&_.react-colorful\_\_interactive:focus-visible_.react-colorful\_\_pointer]:shadow-[0_0_0_2px_var(--app-bg),0_0_0_4px_var(--app-accent)]!`,
);

const hexToRgb = (hex: string): [number, number, number] => {
  const n = Number.parseInt(hex.slice(1), 16);
  return [(n >> 16) & 255, (n >> 8) & 255, n & 255];
};
const rgbToHex = (rgb: readonly number[]) => `#${rgb.map((v) => Math.round(v).toString(16).padStart(2, "0")).join("")}`;

function getEyeDropper(): EyeDropperCtor | undefined {
  if (typeof window === "undefined") return undefined;
  return (window as unknown as { EyeDropper?: EyeDropperCtor }).EyeDropper;
}

/**
 * Floating color picker for a seed: saturation/hue (react-colorful), editable hex in mono, R/G/B fields
 * and, where the browser has it, an eyedropper. Changes apply live; focus is trapped while open; Esc
 * closes and returns focus to the swatch.
 */
export function ColorPickerPopover({ open, color, onChange, onClose, anchorRef, boundaryRef, role }: ColorPickerPopoverProps) {
  const t = useDictionary(palette);
  const pickerRef = useRef<HTMLDivElement>(null);
  const frame = useRef(0);
  const pending = useRef<string | null>(null);
  const [local, setLocal] = useState({ seen: color, value: color });
  const [hasEyeDropper] = useState(() => getEyeDropper() !== undefined);

  // The seed also changes from outside (hex field, drops, our own throttled echo): follow the prop
  // whenever it changes, and keep the local value in between so dragging never lags a frame behind.
  let value = local.value;
  if (local.seen !== color) {
    value = color;
    setLocal({ seen: color, value: color });
  }

  const emit = useCallback(
    (hex: string) => {
      setLocal((previous) => ({ ...previous, value: hex }));
      pending.current = hex;
      cancelAnimationFrame(frame.current);
      frame.current = requestAnimationFrame(() => {
        if (pending.current) onChange(pending.current);
        pending.current = null;
      });
    },
    [onChange],
  );

  useEffect(() => () => cancelAnimationFrame(frame.current), []);

  // react-colorful hardcodes English names on its sliders.
  useEffect(() => {
    if (!open) return;
    const id = requestAnimationFrame(() => {
      const root = pickerRef.current;
      root?.querySelector(".react-colorful__saturation [role='slider']")?.setAttribute("aria-label", t.picker.saturation);
      root?.querySelector(".react-colorful__hue [role='slider']")?.setAttribute("aria-label", t.picker.hue);
    });
    return () => cancelAnimationFrame(id);
  }, [open, t]);

  const rgb = hexToRgb(value);
  const channels = [
    { key: "r", label: t.picker.rgb.r, short: "R" },
    { key: "g", label: t.picker.rgb.g, short: "G" },
    { key: "b", label: t.picker.rgb.b, short: "B" },
  ] as const;

  const pickFromScreen = async () => {
    const EyeDropper = getEyeDropper();
    if (!EyeDropper) return;
    try {
      const { sRGBHex } = await new EyeDropper().open();
      if (/^#[0-9a-f]{6}$/i.test(sRGBHex)) emit(sRGBHex.toLowerCase());
    } catch {
      // Canceled by the user.
    }
  };

  return (
    <FloatingPanel
      open={open}
      onClose={onClose}
      anchorRef={anchorRef}
      boundaryRef={boundaryRef}
      placement="right"
      role="dialog"
      label={t.picker.label(role)}
      trapFocus
      className="w-[min(17rem,calc(100vw-1.5rem))] p-3"
    >
      <div className="mb-2.5 flex items-center justify-between gap-2">
        <p className="flex items-center gap-2 text-small font-semibold text-fg">
          <span aria-hidden className="size-3 rounded-[4px] shadow-[inset_0_0_0_1px_oklch(1_0_0/0.15)]" style={{ backgroundColor: value }} />
          {role}
        </p>
        <IconButton size="sm" label={t.picker.close} icon={<CloseIcon />} tooltip={false} onClick={() => onClose(true)} />
      </div>
      <div ref={pickerRef} role="group" aria-label={t.picker.label(role)} className={pickerSkin}>
        <HexColorPicker color={value} onChange={(hex) => emit(hex.toLowerCase())} />
      </div>
      <div className="mt-3 flex items-center gap-2">
        {hasEyeDropper && (
          <IconButton size="sm" variant="secondary" label={t.picker.eyedropper} icon={<EyedropperIcon />} onClick={pickFromScreen} />
        )}
        <HexInput value={value} onCommit={emit} label={t.picker.hex} invalidLabel={t.seeds.invalid} size="sm" autoFocus className="flex-1" />
      </div>
      <div className="mt-2 grid grid-cols-3 gap-2">
        {channels.map((channel, index) => (
          <label
            key={channel.key}
            className="flex h-8 items-center gap-1.5 rounded-control border border-app-strong bg-white/[0.04] px-2 transition-[border-color] duration-150 has-[input:focus-visible]:border-accent has-[input:focus-visible]:outline-2 has-[input:focus-visible]:outline-offset-2 has-[input:focus-visible]:outline-accent"
          >
            <span aria-hidden className="font-mono text-caption text-subtle">
              {channel.short}
            </span>
            <input
              type="number"
              inputMode="numeric"
              min={0}
              max={255}
              step={1}
              aria-label={channel.label}
              value={rgb[index]}
              onChange={(event) => {
                const next = Number(event.target.value);
                if (!Number.isFinite(next)) return;
                const channelsValue = [...rgb];
                channelsValue[index] = Math.min(255, Math.max(0, Math.round(next)));
                emit(rgbToHex(channelsValue));
              }}
              className="w-full min-w-0 [appearance:textfield] bg-transparent font-mono text-mono text-fg tabular-nums outline-none focus-visible:shadow-none focus-visible:outline-none [&::-webkit-inner-spin-button]:appearance-none [&::-webkit-outer-spin-button]:appearance-none"
            />
          </label>
        ))}
      </div>
    </FloatingPanel>
  );
}
