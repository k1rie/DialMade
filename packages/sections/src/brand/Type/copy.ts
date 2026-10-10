import type { Locale } from "@dialmade/catalog";

export const TYPE_COPY = {
  es: {
    title: "Titulares, texto y escala",
    intro: "La pareja tipográfica, la escala con sus tamaños reales y los pesos disponibles.",
    headings: "Titulares",
    body: "Texto",
    scale: "Escala tipográfica",
    weights: "Pesos",
    glyphs: "Caracteres",
    mono: "Monoespaciada",
    systemMono: "Monoespaciada del sistema",
    categories: { serif: "Serif", sans: "Sans serif", mono: "Monoespaciada", display: "Display" },
    steps: { display: "Display", h1: "Título 1", h2: "Título 2", h3: "Título 3", body: "Cuerpo", small: "Pequeño", caption: "Leyenda" },
    weightNames: {
      100: "Fina",
      200: "Extraligera",
      300: "Ligera",
      400: "Regular",
      500: "Media",
      600: "Seminegrita",
      700: "Negrita",
      800: "Extranegrita",
      900: "Negra",
    } as Record<number, string>,
  },
  en: {
    title: "Headlines, text and scale",
    intro: "The type pairing, the scale at its real sizes and the available weights.",
    headings: "Headlines",
    body: "Text",
    scale: "Type scale",
    weights: "Weights",
    glyphs: "Characters",
    mono: "Monospace",
    systemMono: "System monospace",
    categories: { serif: "Serif", sans: "Sans serif", mono: "Monospace", display: "Display" },
    steps: { display: "Display", h1: "Heading 1", h2: "Heading 2", h3: "Heading 3", body: "Body", small: "Small", caption: "Caption" },
    weightNames: {
      100: "Thin",
      200: "ExtraLight",
      300: "Light",
      400: "Regular",
      500: "Medium",
      600: "SemiBold",
      700: "Bold",
      800: "ExtraBold",
      900: "Black",
    } as Record<number, string>,
  },
} as const satisfies Record<Locale, unknown>;

export const GLYPHS = ["ABCDEFGHIJKLMNÑOPQRSTUVWXYZ", "abcdefghijklmnñopqrstuvwxyz", "0123456789 ¿?¡!&@#%€$*()"] as const;
