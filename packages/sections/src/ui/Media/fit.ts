import type { FitInput, FitResult } from "../../types";
import { frameFor, mediaRatioFor, ratioValue } from "../lib/fit";
import type { MediaProps } from "./schema";

/** Ratio from the chip (`estimateContent`); portrait shapes get a phone, landscape ones a browser window. */
export function fitMedia(input: FitInput): FitResult<MediaProps> {
  const ratio = mediaRatioFor(input);
  const value = ratioValue(ratio);
  return {
    variant: value < 0.95 ? "device" : value > 1.05 ? "browser" : "gradient",
    props: { ratio, frame: frameFor(input, "plain") },
  };
}
