import type { Locale } from "@dialmade/catalog";

export const IDENTITY_COPY = {
  es: {
    title: "El logo en cada superficie",
    intro: "Cómo se ve sobre claro, oscuro y su propio color, con la zona de respeto y el tamaño mínimo que necesita.",
    surfaces: { light: "Sobre claro", dark: "Sobre oscuro", brand: "Sobre color de marca" },
    clearSpace: "Zona de respeto",
    clearSpaceBody: {
      monogram: "Deja libre alrededor del logo al menos x, la mitad del alto del símbolo. Ni texto ni bordes entran en esa zona.",
      image: "Deja libre alrededor del logo al menos x, una cuarta parte de su alto. Ni texto ni bordes entran en esa zona.",
    },
    minSize: "Tamaño mínimo",
    minSizeBody: "Por debajo de 24 px de alto el logo pierde detalle: a ese tamaño, usa solo el símbolo.",
    minLabel: "mín.",
    versions: "Versiones",
    versionNames: { lockup: "Horizontal", stacked: "Vertical", symbol: "Símbolo", wordmark: "Solo nombre" },
  },
  en: {
    title: "The logo on every surface",
    intro: "How it looks on light, dark and its own color, with the clear space and minimum size it needs.",
    surfaces: { light: "On light", dark: "On dark", brand: "On brand color" },
    clearSpace: "Clear space",
    clearSpaceBody: {
      monogram: "Keep at least x free around the logo, half the height of the symbol. No text or edges go inside that area.",
      image: "Keep at least x free around the logo, a quarter of its height. No text or edges go inside that area.",
    },
    minSize: "Minimum size",
    minSizeBody: "Below 24 px tall the logo loses detail: at that size, use the symbol alone.",
    minLabel: "min.",
    versions: "Versions",
    versionNames: { lockup: "Horizontal", stacked: "Stacked", symbol: "Symbol", wordmark: "Wordmark" },
  },
} as const satisfies Record<Locale, unknown>;
