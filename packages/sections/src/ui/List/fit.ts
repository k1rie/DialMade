import type { FitInput, FitResult } from "../../types";
import { frameFor, listItemsFor } from "../lib/fit";
import type { ListProps } from "./schema";

/** Rows from the chip: one per 56 px after the header, 3–8 (`estimateContent`). The style is left alone. */
export function fitList(input: FitInput): FitResult<ListProps> {
  return { props: { count: listItemsFor(input), frame: frameFor(input, "card") } };
}
