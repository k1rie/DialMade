"use client";

import { parseSvgColors, type Swatch } from "@dialmade/palette";
import { useEffect, useMemo, useState } from "react";
import { isAbortError, usePaletteWorker } from "@/hooks/usePaletteWorker";
import { decodeLogo, type CropRect, type FlowLogo } from "@/lib/image";

const DEBOUNCE_MS = 220;

/** Colors the extraction would find inside `crop`, recomputed (debounced) in the palette worker. */
export function useCropColors(logo: FlowLogo, crop: CropRect): { swatches: Swatch[] | undefined; pending: boolean } {
  const { extract } = usePaletteWorker();
  const declaredColors = useMemo(() => (logo.svgText ? parseSvgColors(logo.svgText) : undefined), [logo.svgText]);
  const key = `${crop.x.toFixed(4)}|${crop.y.toFixed(4)}|${crop.w.toFixed(4)}|${crop.h.toFixed(4)}`;
  const [result, setResult] = useState<{ key: string; swatches: Swatch[] }>();

  useEffect(() => {
    let active = true;
    const [x, y, w, h] = key.split("|").map(Number) as [number, number, number, number];
    const timer = setTimeout(async () => {
      try {
        const pixels = await decodeLogo(logo, { maxSize: 96, crop: { x, y, w, h } });
        const extracted = await extract(pixels, { declaredColors, maxSwatches: 6 });
        if (active) setResult({ key, swatches: extracted.swatches });
      } catch (error) {
        if (active && !isAbortError(error)) setResult({ key, swatches: [] });
      }
    }, DEBOUNCE_MS);
    return () => {
      active = false;
      clearTimeout(timer);
    };
  }, [key, logo, extract, declaredColors]);

  return { swatches: result?.swatches, pending: result?.key !== key };
}
