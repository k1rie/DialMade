import type { SectionBuilder } from "../../context";
import { calendarBuilder } from "./calendar";
import { cardsBuilder } from "./cards";
import { formBuilder } from "./form";
import { listBuilder } from "./list";
import { mediaBuilder } from "./media";
import { placeholderBuilder } from "./placeholder";
import { regionBuilder } from "./region";
import { textBuilder } from "./text";

/** Builders of the `ui.*` sections. */
export const UI_BUILDERS: Readonly<Record<string, SectionBuilder>> = {
  "ui.text": textBuilder,
  "ui.media": mediaBuilder,
  "ui.cards": cardsBuilder,
  "ui.calendar": calendarBuilder,
  "ui.list": listBuilder,
  "ui.form": formBuilder,
  "ui.placeholder": placeholderBuilder,
  "ui.region": regionBuilder,
};
