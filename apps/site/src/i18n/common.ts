import { defineDictionary } from "./config";

export const common = defineDictionary({
  es: {
    meta: {
      title: "Dialmade · Dibuja tu layout, llévate tu diseño",
      description:
        "Coloca bloques en un lienzo y Dialmade los convierte en un diseño con tu marca. Open source (MIT). Exporta a Figma, Claude Design, Framer o código.",
    },
    app: {
      name: "Dialmade",
      home: "Inicio de Dialmade",
      skipToContent: "Saltar al contenido",
    },
    locale: {
      label: "Idioma",
      es: "Español",
      en: "English",
    },
    notFound: {
      title: "Esta página no existe.",
      body: "Puede que el enlace esté mal escrito o que la página se haya movido.",
      back: "Volver al inicio",
    },
  },
  en: {
    meta: {
      title: "Dialmade · Sketch your layout, walk away with your design",
      description:
        "Place blocks on a canvas and Dialmade turns them into an on-brand design. Open source (MIT). Exports to Figma, Claude Design, Framer or code.",
    },
    app: {
      name: "Dialmade",
      home: "Dialmade home",
      skipToContent: "Skip to content",
    },
    locale: {
      label: "Language",
      es: "Español",
      en: "English",
    },
    notFound: {
      title: "This page doesn't exist.",
      body: "The link may be mistyped, or the page may have moved.",
      back: "Back to home",
    },
  },
});

export type CommonDictionary = (typeof common)["es"];
