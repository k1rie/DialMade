import { defineDictionary } from "./config";

/** Dev-only /promo route (PromoScene): the scene index and its errors. Captures use the app's own texts. */
export const promo = defineDictionary({
  es: {
    meta: {
      title: "Dialmade · Capturas del promo",
    },
    index: {
      title: "Escenas del promo",
      description: "Solo en desarrollo. Cada escena es un estado real de la app, fijo y sin red, para capturarlo con pnpm promo:capture.",
      screen: "Pantalla",
      mobile: "Móvil",
      parts: "Piezas",
      transparent: "sobre transparente",
    },
    errors: {
      title: "No se puede mostrar esta escena",
      unknownScene: (value: string) => `No existe la escena «${value}».`,
      unknownPart: (scene: string, part: string) => `La escena «${scene}» no tiene la pieza «${part}».`,
      unknownLang: (value: string) => `Idioma no válido: «${value}». Usa es o en.`,
      unknownViewport: (value: string) => `Viewport no válido: «${value}». Usa mobile o quítalo.`,
      unknownBg: (value: string) => `Fondo no válido: «${value}». Usa transparent o quítalo.`,
      unsupportedViewport: (scene: string) => `La escena «${scene}» no tiene vista móvil.`,
      setup: (message: string) => `No se pudo preparar la escena: ${message}`,
      timeout: (pending: string) => `La escena no terminó de pintarse a tiempo (${pending}).`,
      stylesheets: (hrefs: string) => `No cargaron estas hojas de estilo: ${hrefs}. Las fuentes de Google necesitan internet.`,
      fonts: (faces: string) => `No cargaron estas fuentes: ${faces}.`,
      images: (sources: string) => `Hay imágenes rotas en la escena: ${sources}.`,
    },
  },
  en: {
    meta: {
      title: "Dialmade · Promo captures",
    },
    index: {
      title: "Promo scenes",
      description: "Development only. Each scene is a real state of the app, fixed and offline, to capture with pnpm promo:capture.",
      screen: "Screen",
      mobile: "Mobile",
      parts: "Parts",
      transparent: "over transparency",
    },
    errors: {
      title: "This scene cannot be shown",
      unknownScene: (value: string) => `There is no scene "${value}".`,
      unknownPart: (scene: string, part: string) => `Scene "${scene}" has no part "${part}".`,
      unknownLang: (value: string) => `Invalid language: "${value}". Use es or en.`,
      unknownViewport: (value: string) => `Invalid viewport: "${value}". Use mobile or leave it out.`,
      unknownBg: (value: string) => `Invalid background: "${value}". Use transparent or leave it out.`,
      unsupportedViewport: (scene: string) => `Scene "${scene}" has no mobile view.`,
      setup: (message: string) => `The scene could not be prepared: ${message}`,
      timeout: (pending: string) => `The scene did not finish painting in time (${pending}).`,
      stylesheets: (hrefs: string) => `These stylesheets did not load: ${hrefs}. Google Fonts need internet.`,
      fonts: (faces: string) => `These fonts did not load: ${faces}.`,
      images: (sources: string) => `The scene has broken images: ${sources}.`,
    },
  },
});

export type PromoDictionary = (typeof promo)["es"];
