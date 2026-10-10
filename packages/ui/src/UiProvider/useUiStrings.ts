"use client";

import { use } from "react";
import type { Locale } from "@dialmade/catalog";
import { UiLocaleContext } from "./context";
import { UI_STRINGS, type UiStrings } from "./strings";

export function useUiLocale(): Locale {
  return use(UiLocaleContext);
}

export function useUiStrings(): UiStrings {
  return UI_STRINGS[use(UiLocaleContext)];
}
