import type { FitInput, FitResult } from "../../types";
import type { FormPurpose } from "../content";
import { formFieldsFor, frameFor } from "../lib/fit";
import type { FormProps } from "./schema";

/** Purpose from the note keywords (login, signup, contact, search), in that priority; otherwise generic. */
export function purposeOf(input: Pick<FitInput, "note">): FormPurpose {
  const { keywords } = input.note;
  if (keywords.includes("login")) return "login";
  if (keywords.includes("signup")) return "signup";
  if (keywords.includes("contact")) return "contact";
  if (keywords.includes("search")) return "search";
  return "generic";
}

/**
 * Purpose from the note, fields from the chip (one per 72 px, 2–6). Sign-in and sign-up forms get the
 * centered card; the rest fill the block (a card surface on app screens, the landing frame when full width).
 */
export function fitForm(input: FitInput): FitResult<FormProps> {
  const purpose = purposeOf(input);
  const card = purpose === "login" || purpose === "signup";
  return {
    variant: card ? "card" : "plain",
    props: { purpose, count: formFieldsFor(input), frame: frameFor(input, card ? "plain" : "card") },
  };
}
