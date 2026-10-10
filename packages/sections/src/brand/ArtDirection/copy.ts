import type { Locale } from "@dialmade/catalog";

export const ART_COPY = {
  es: {
    title: "Cómo se siente la marca",
    intro: "Degradados y texturas que salen del color de marca, qué hacer y qué evitar, y la marca aplicada.",
    mosaic: "Degradados y texturas",
    tiles: {
      key: { name: "Visual clave", recipe: "brand 300 → 900" },
      glow: { name: "Brillo", recipe: "brand 500 · neutral 950" },
      mesh: { name: "Malla suave", recipe: "brand 200 · cta 200" },
      dots: { name: "Puntos", recipe: "brand 500 · 16 px" },
      grid: { name: "Retícula", recipe: "brand 200 · 24 px" },
    },
    do: "Haz",
    dont: "Evita",
    dos: [
      "Usa el primario para una sola acción principal por pantalla.",
      "Deja respirar el logo: respeta su zona de respeto.",
      "Combina titulares y texto solo con la pareja tipográfica de esta guía.",
    ],
    donts: [
      "No pongas texto sobre un color sin un par AA de la paleta.",
      "No deformes, gires ni recolorees el logo.",
      "No mezcles radios ni sombras de otras direcciones.",
    ],
    applications: "Aplicaciones",
    landing: "Landing page",
    app: "Dashboard",
  },
  en: {
    title: "How the brand feels",
    intro: "Gradients and textures drawn from the brand color, do's and don'ts, and the brand in use.",
    mosaic: "Gradients and textures",
    tiles: {
      key: { name: "Key visual", recipe: "brand 300 → 900" },
      glow: { name: "Glow", recipe: "brand 500 · neutral 950" },
      mesh: { name: "Soft mesh", recipe: "brand 200 · cta 200" },
      dots: { name: "Dots", recipe: "brand 500 · 16 px" },
      grid: { name: "Grid", recipe: "brand 200 · 24 px" },
    },
    do: "Do",
    dont: "Don't",
    dos: [
      "Use the primary color for one main action per screen.",
      "Give the logo room: keep its clear space.",
      "Pair headlines and text only with this guide's type pairing.",
    ],
    donts: [
      "Don't set text on a color without an AA pair from the palette.",
      "Don't stretch, rotate or recolor the logo.",
      "Don't mix in radii or shadows from other directions.",
    ],
    applications: "Applications",
    landing: "Landing page",
    app: "Dashboard",
  },
} as const satisfies Record<Locale, unknown>;

export type ArtCopy = (typeof ART_COPY)[Locale];
