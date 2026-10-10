import type { Locale } from "@dialmade/catalog";

export const COVER_COPY: Record<
  Locale,
  { eyebrow: string; index: string; facts: string; type: string; style: string; primary: string; motion: string }
> = {
  es: {
    eyebrow: "Guía de estilo",
    index: "Índice de la guía",
    facts: "Ficha de la marca",
    type: "Tipografía",
    style: "Estilo",
    primary: "Color primario",
    motion: "Movimiento",
  },
  en: {
    eyebrow: "Style guide",
    index: "Guide contents",
    facts: "Brand facts",
    type: "Typography",
    style: "Style",
    primary: "Primary color",
    motion: "Motion",
  },
};
