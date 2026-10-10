import type { FitInput, FitResult } from "../../types";
import { frameFor } from "../lib/fit";
import type { PlaceholderProps } from "./schema";

/**
 * The ×N of repeatable «Pronto» blocks (from the chip) and the frame (landing gutters at full width). The
 * type, name, note and `soon` are layout data that `FitInput` does not carry: buildPageFromLayout writes
 * them on every build.
 */
export function fitPlaceholder(input: FitInput): FitResult<PlaceholderProps> {
  const promised = input.estimate?.kind === "count" ? input.estimate.value : null;
  const count = promised ?? input.count ?? 0;
  return { props: { count: Math.min(99, Math.max(0, Math.round(count))), frame: frameFor(input, "plain") } };
}
