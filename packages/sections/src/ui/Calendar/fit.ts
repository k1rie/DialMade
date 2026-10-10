import type { FitInput, FitResult } from "../../types";
import { calendarViewFor, frameFor, mobileBehaviorOf } from "../lib/fit";
import type { CalendarProps } from "./schema";

/** View from the chip (note keywords, then size; «mini» at ≤3 columns), agenda on mobile unless «stack». */
export function fitCalendar(input: FitInput): FitResult<CalendarProps> {
  return {
    variant: calendarViewFor(input),
    props: { mobile: mobileBehaviorOf(input) === "stack" ? "keep" : "agenda", frame: frameFor(input, "card") },
  };
}
