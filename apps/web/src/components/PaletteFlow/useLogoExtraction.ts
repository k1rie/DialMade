"use client";

import { parseSvgColors } from "@dialmade/palette";
import { useEffect, useRef } from "react";
import { isAbortError, usePaletteWorker } from "@/hooks/usePaletteWorker";
import type { PaletteFlowActions, PaletteFlowView } from "@/hooks/usePaletteFlow";
import { decodeLogo } from "@/lib/image";

/** While step === "extracting": crop + decode (≤256 px) → worker extractFromPixels → setExtract. */
export function useLogoExtraction(state: PaletteFlowView, actions: PaletteFlowActions, onError: (error: unknown) => void) {
  const { extract } = usePaletteWorker();
  const { step, logo, crop } = state;
  const onErrorRef = useRef(onError);
  useEffect(() => {
    onErrorRef.current = onError;
  });

  useEffect(() => {
    if (step !== "extracting" || !logo) return;
    let active = true;
    (async () => {
      try {
        const pixels = await decodeLogo(logo, { maxSize: 256, crop });
        const declaredColors = logo.svgText ? parseSvgColors(logo.svgText) : undefined;
        const result = await extract(pixels, { declaredColors });
        if (active) actions.setExtract(result);
      } catch (error) {
        if (active && !isAbortError(error)) {
          onErrorRef.current(error);
          actions.failExtract(error instanceof Error ? error.message : String(error));
        }
      }
    })();
    return () => {
      active = false;
    };
  }, [step, logo, crop, extract, actions]);
}
