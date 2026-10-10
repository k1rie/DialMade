import { useCallback, useEffect, useMemo, useRef } from "react";
import { ResponsiveCollector, type CellWidths, type ResponsiveVerdict } from "@/lib/ai/render/responsive";

/**
 * Gate 5 for one island: pass the returned handler as `onMeasure` (with `measureWidths`), and `onVerdict` gets the
 * verdict (`AiBlock.gates.responsive` and its warnings) after each round of measurements: on every render of the
 * block, and when the cell widths change. `layoutHeightPx` only for blocks of app screens (spec §7).
 */
export function useResponsiveGate(widths: CellWidths, layoutHeightPx: number | undefined, onVerdict: (verdict: ResponsiveVerdict) => void) {
  const callback = useRef(onVerdict);
  useEffect(() => {
    callback.current = onVerdict;
  });
  const { desktop, tablet, mobile } = widths;
  const collector = useMemo(
    () => new ResponsiveCollector({ ...(desktop && { desktop }), ...(tablet && { tablet }), ...(mobile && { mobile }) }, layoutHeightPx),
    [desktop, tablet, mobile, layoutHeightPx],
  );
  return useCallback(
    (measure: Parameters<ResponsiveCollector["add"]>[0]) => {
      const verdict = collector.add(measure);
      if (verdict) callback.current(verdict);
    },
    [collector],
  );
}
