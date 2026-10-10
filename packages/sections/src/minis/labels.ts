import type { Locale, OutputKind } from "@dialmade/catalog";

const KIND_LABELS: Record<OutputKind, Record<Locale, string>> = {
  brand: { es: "Guía de estilo", en: "Style guide" },
  landing: { es: "Landing page", en: "Landing page" },
  app: { es: "Dashboard y componentes", en: "Dashboard & components" },
};

/** Accessible name of a mini preview: «Vista previa de Landing page: Acme». */
export function miniLabel(kind: OutputKind, locale: Locale, brandName: string): string {
  const kindLabel = KIND_LABELS[kind][locale];
  return locale === "es" ? `Vista previa de ${kindLabel}: ${brandName}` : `${kindLabel} preview: ${brandName}`;
}

/** Accessible name of a sketch: «Esquema de Landing page con los colores de Acme (no es el diseño final)». */
export function sketchLabel(kind: OutputKind, locale: Locale, brandName: string): string {
  const kindLabel = KIND_LABELS[kind][locale];
  return locale === "es"
    ? `Esquema de ${kindLabel} con los colores de ${brandName} (no es el diseño final)`
    : `${kindLabel} sketch in ${brandName}'s colors (not the final design)`;
}
