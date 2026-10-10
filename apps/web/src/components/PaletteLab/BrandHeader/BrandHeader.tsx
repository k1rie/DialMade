"use client";

import { IconButton } from "@/components/ui/IconButton";
import { useDictionary } from "@/i18n";
import { palette } from "@/i18n/palette";
import { CropIcon } from "../icons";
import { formatHex } from "../format";

export type BrandHeaderProps = {
  name: string;
  /** Cropped logo (blob URL); without it a monogram on the primary color stands in. */
  logoUrl?: string;
  /** Seed shown as text (`#rrggbb`). */
  seed: string;
  /** Monogram colors: the theme's primary and the text that passes AA on it. */
  primary: string;
  onPrimary: string;
  styleLabel: string;
  /** Back to the cropper (only with a logo). */
  onRecrop?: () => void;
};

/** Top of the left panel: the logo (or monogram), the brand name as the page heading and the current recipe. */
export function BrandHeader({ name, logoUrl, seed, primary, onPrimary, styleLabel, onRecrop }: BrandHeaderProps) {
  const t = useDictionary(palette);
  return (
    <div className="flex items-center gap-3">
      {logoUrl ? (
        // eslint-disable-next-line @next/next/no-img-element -- blob URL of the user's cropped logo
        <img
          src={logoUrl}
          alt={t.brand.logo(name)}
          className="size-11 shrink-0 rounded-control bg-[conic-gradient(oklch(0.95_0_0)_25%,oklch(0.88_0_0)_0_50%,oklch(0.95_0_0)_0_75%,oklch(0.88_0_0)_0)] [background-size:10px_10px] object-contain p-1.5 shadow-surface"
        />
      ) : (
        <span
          aria-hidden
          className="flex size-11 shrink-0 items-center justify-center rounded-control text-h3 font-semibold shadow-surface transition-[background-color,color] duration-300"
          style={{ backgroundColor: primary, color: onPrimary }}
        >
          {name.trim().charAt(0).toLocaleUpperCase() || "·"}
        </span>
      )}
      <div className="min-w-0 flex-1">
        <h1 className="truncate text-[0.9375rem] leading-6 font-semibold tracking-[-0.01em] text-fg">
          <span className="sr-only">{t.lab.titlePrefix} </span>
          {name}
        </h1>
        <p className="truncate text-caption text-muted">
          <span className="font-mono">{formatHex(seed)}</span> · {logoUrl ? styleLabel : `${styleLabel} · ${t.brand.fromColor}`}
        </p>
      </div>
      {onRecrop && <IconButton size="sm" label={t.brand.recrop} icon={<CropIcon />} onClick={onRecrop} />}
    </div>
  );
}
