import type { Locale } from "@dialmade/catalog";
import { GALLERY_SECTIONS, type GallerySectionId } from "@dialmade/ui";

export const ESSENTIAL_SECTIONS: readonly GallerySectionId[] = ["buttons", "forms", "selection", "badges", "cards", "table", "overlays"];

export const gallerySectionsFor = (scope: "all" | "essentials"): readonly GallerySectionId[] =>
  scope === "essentials" ? ESSENTIAL_SECTIONS : GALLERY_SECTIONS;

/** Index labels. They match the section titles of the @dialmade/ui gallery. */
export const GALLERY_INDEX_LABELS: Readonly<Record<Locale, Record<GallerySectionId, string>>> = {
  es: {
    buttons: "Botones",
    forms: "Campos de texto",
    selection: "Controles de selección",
    badges: "Etiquetas",
    avatars: "Avatares",
    navigation: "Navegación",
    cards: "Tarjetas",
    stats: "Métricas",
    table: "Tabla",
    charts: "Gráficas",
    overlays: "Capas",
    feedback: "Estado y avisos",
  },
  en: {
    buttons: "Buttons",
    forms: "Text fields",
    selection: "Selection controls",
    badges: "Badges",
    avatars: "Avatars",
    navigation: "Navigation",
    cards: "Cards",
    stats: "Metrics",
    table: "Table",
    charts: "Charts",
    overlays: "Overlays",
    feedback: "Feedback",
  },
};

/** Heading ids of the @dialmade/ui gallery sections (`GallerySection`). */
export const gallerySectionAnchor = (id: GallerySectionId) => `dl-gallery-${id}`;
