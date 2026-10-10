"use client";

import { useEffect, useRef } from "react";
import type { FlowStep, PaletteFlowActions } from "@/hooks/usePaletteFlow";
import { PROMO_KIND, type PromoBrand } from "../../setup";

/**
 * Walks the real flow to `target` with its own actions, as a user would: drop the logo (→ crop),
 * receive the extraction, pick the preview tab, then open the Palette Lab, «Crear» or «Ajustar».
 * Runs once; the flow owns the logo's blob URL from then on.
 */
export function useFlowDriver(target: FlowStep, brand: PromoBrand | undefined, actions: PaletteFlowActions) {
  const driven = useRef(false);
  useEffect(() => {
    if (driven.current || target === "drop" || !brand) return;
    driven.current = true;
    actions.setLogo(brand.logo);
    if (target === "crop") return;
    actions.setExtract(brand.extract);
    actions.setPreviewKind(PROMO_KIND);
    if (target === "palette") actions.showPalette();
    else if (target === "create") actions.goToCreate();
    else actions.goToCompose();
  }, [target, brand, actions]);
}
