import type { FitInput, FitResult } from "../../types";
import { cardColumns, frameFor, mobileBehaviorOf, repeatCount } from "../lib/fit";
import type { CardsProps } from "./schema";

/** Library bounds of «Tarjetas» (`LIBRARY` of @dialmade/layout: repeatable 1–12, default 3). */
const CARDS_REPEAT = { min: 1, max: 12, default: 3 } as const;
/** Below this height per row of cards only the compact layout fits. */
const ROW_MIN_PX = 120;

/** Count from the chip, one column per 240 px, compact cards when the rows get short. */
export function fitCards(input: FitInput): FitResult<CardsProps> {
  const count = repeatCount(input, CARDS_REPEAT);
  const columns = cardColumns(input, count, 6);
  const rows = Math.ceil(count / columns);
  return {
    variant: input.heightPx / rows < ROW_MIN_PX ? "compact" : "feature",
    props: {
      count,
      columns: String(columns) as CardsProps["columns"],
      mobile: mobileBehaviorOf(input) === "carousel" ? "carousel" : "one-column",
      frame: frameFor(input, "plain"),
    },
  };
}
