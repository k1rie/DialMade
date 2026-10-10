import type { FitInput, FitResult } from "../../types";
import { frameFor } from "../lib/fit";
import type { TextProps } from "./schema";

/** Text has no chip promise (`estimateContent` → null): the size alone decides what shows. */
export function fitText(input: FitInput): FitResult<TextProps> {
  const hpx = input.heightPx;
  const wide = input.w >= 10;
  return {
    variant: hpx >= 320 && input.w <= 8 ? "prose" : "heading",
    props: {
      // h1 is decided with the whole screen in view (first text without hero or page header): buildPageFromLayout.
      level: "h2",
      align: input.kind === "landing" && wide ? "center" : "start",
      showBody: hpx > 64,
      showAction: hpx >= 160,
      frame: frameFor(input, "plain"),
    },
  };
}
