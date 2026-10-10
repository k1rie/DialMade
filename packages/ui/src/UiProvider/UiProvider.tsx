"use client";

import type { ReactNode } from "react";
import type { Locale } from "@dialmade/catalog";
import { UiLocaleContext } from "./context";

export interface UiProviderProps {
  locale: Locale;
  children: ReactNode;
}

/** Idioma de los textos internos del kit (cerrar, cargando, paginación…). Sin provider: inglés. */
export function UiProvider({ locale, children }: UiProviderProps) {
  return <UiLocaleContext value={locale}>{children}</UiLocaleContext>;
}
