import { defineDictionary } from "./config";

export const common = defineDictionary({
  es: {
    meta: {
      title: "Dialmade · Dirección de diseño",
      description:
        "Suelta tu logo y sal con una dirección de diseño: paleta accesible, guía de estilo, landing y dashboard listos para exportar.",
    },
    app: {
      name: "Dialmade",
      tagline: "Dirección de diseño para devs",
      home: "Inicio de Dialmade",
      skipToContent: "Saltar al contenido",
    },
    locale: {
      label: "Idioma",
      es: "Español",
      en: "English",
      short: { es: "ES", en: "EN" },
    },
    actions: {
      back: "Volver",
      cancel: "Cancelar",
      close: "Cerrar",
      copy: "Copiar",
      copied: "Copiado",
      retry: "Reintentar",
      skip: "Saltar",
    },
    status: {
      label: "Progreso",
      next: "Siguiente",
      done: "Hecho",
      pending: "Pendiente",
      loading: "Cargando…",
    },
    steps: {
      logo: "Logo",
      crop: "Recorte",
      palette: "Paleta",
      contrast: "AA",
      export: "Exportar",
    },
    dnd: {
      roleDescription: "arrastrable",
      instructions:
        "Pulsa Espacio o Enter para coger. Usa las flechas para moverte entre destinos y Espacio o Enter para soltar. Esc cancela.",
      pickedUp: (item: string) => `Has cogido ${item}.`,
      over: (item: string, target: string) => `${item} sobre ${target}.`,
      notOver: (item: string) => `${item} fuera de cualquier destino.`,
      dropped: (item: string, target: string) => `Soltaste ${item} en ${target}.`,
      canceled: (item: string) => `Se canceló mover ${item}.`,
      placed: (item: string, target: string) => `Pusiste ${item} en ${target}.`,
      dropHere: "Suelta aquí",
    },
    errors: {
      generic: "Algo salió mal. Inténtalo de nuevo.",
      unsupportedType: "Formato no soportado. Usa SVG, PNG, JPG o WebP.",
      tooLarge: (maxMb: number) => `El archivo pesa demasiado (máx. ${maxMb} MB).`,
      decodeFailed: "No pudimos leer esa imagen.",
      extractFailed: "No pudimos extraer los colores del logo.",
      workerUnavailable: "Tu navegador no soporta workers; procesamos en la página.",
    },
  },
  en: {
    meta: {
      title: "Dialmade · Design direction",
      description:
        "Drop your logo and leave with a design direction: an accessible palette, a style guide, a landing page and a dashboard, ready to export.",
    },
    app: {
      name: "Dialmade",
      tagline: "Design direction for developers",
      home: "Dialmade home",
      skipToContent: "Skip to content",
    },
    locale: {
      label: "Language",
      es: "Español",
      en: "English",
      short: { es: "ES", en: "EN" },
    },
    actions: {
      back: "Back",
      cancel: "Cancel",
      close: "Close",
      copy: "Copy",
      copied: "Copied",
      retry: "Retry",
      skip: "Skip",
    },
    status: {
      label: "Progress",
      next: "Next",
      done: "Done",
      pending: "Pending",
      loading: "Loading…",
    },
    steps: {
      logo: "Logo",
      crop: "Crop",
      palette: "Palette",
      contrast: "AA",
      export: "Export",
    },
    dnd: {
      roleDescription: "draggable",
      instructions:
        "Press Space or Enter to pick up. Use the arrow keys to move between targets and Space or Enter to drop. Esc cancels.",
      pickedUp: (item: string) => `Picked up ${item}.`,
      over: (item: string, target: string) => `${item} is over ${target}.`,
      notOver: (item: string) => `${item} is no longer over a target.`,
      dropped: (item: string, target: string) => `${item} dropped on ${target}.`,
      canceled: (item: string) => `Moving ${item} was canceled.`,
      placed: (item: string, target: string) => `${item} placed on ${target}.`,
      dropHere: "Drop here",
    },
    errors: {
      generic: "Something went wrong. Please try again.",
      unsupportedType: "Unsupported format. Use SVG, PNG, JPG or WebP.",
      tooLarge: (maxMb: number) => `The file is too large (max ${maxMb} MB).`,
      decodeFailed: "We couldn't read that image.",
      extractFailed: "We couldn't extract the logo's colors.",
      workerUnavailable: "Your browser doesn't support workers; processing on the page.",
    },
  },
});

export type CommonDictionary = (typeof common)["es"];
