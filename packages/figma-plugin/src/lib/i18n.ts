// Texts of the plugin UI, in Spanish and English (from the file's locale or the browser's language).
export const STRINGS = {
  es: {
    title: "Dialmade → Figma",
    intro: "Pega o suelta el figma-plan.json que descargaste en Dialmade (Exportar → Figma).",
    placeholder: "Pega aquí el contenido de figma-plan.json…",
    drop: "Suelta el archivo aquí o",
    choose: "elige un archivo",
    dark: "Crear también cada pantalla en modo oscuro",
    flow: "Crear la página «Flujo» con los enlaces del prototipo",
    create: "Crear en Figma",
    creating: "Creando…",
    invalidJson: "No es un JSON válido.",
    invalidPlan: "No es un figma-plan v1 de Dialmade:",
    ready: (name: string, pages: number) => `Listo: «${name}», ${pages} páginas.`,
    done: "Hecho",
    variables: (created: number, updated: number) => `Variables: ${created} nuevas, ${updated} actualizadas.`,
    styles: (text: number, effects: number) => `Estilos: ${text} de texto, ${effects} de sombra.`,
    pages: (pages: number, frames: number) => `Páginas: ${pages} (${frames} frames).`,
    links: (count: number) => `Enlaces del prototipo: ${count}.`,
    missingFonts: "Fuentes que faltan (se usó otra):",
    warnings: "Avisos:",
    failed: "No se pudo crear:",
  },
  en: {
    title: "Dialmade → Figma",
    intro: "Paste or drop the figma-plan.json you downloaded from Dialmade (Export → Figma).",
    placeholder: "Paste the contents of figma-plan.json here…",
    drop: "Drop the file here or",
    choose: "choose a file",
    dark: "Also create each screen in dark mode",
    flow: "Create the «Flow» page with the prototype links",
    create: "Create in Figma",
    creating: "Creating…",
    invalidJson: "This is not valid JSON.",
    invalidPlan: "This is not a Dialmade figma-plan v1:",
    ready: (name: string, pages: number) => `Ready: “${name}”, ${pages} pages.`,
    done: "Done",
    variables: (created: number, updated: number) => `Variables: ${created} new, ${updated} updated.`,
    styles: (text: number, effects: number) => `Styles: ${text} text, ${effects} shadow.`,
    pages: (pages: number, frames: number) => `Pages: ${pages} (${frames} frames).`,
    links: (count: number) => `Prototype links: ${count}.`,
    missingFonts: "Missing fonts (another one was used):",
    warnings: "Warnings:",
    failed: "Could not create it:",
  },
} as const;

export type Locale = keyof typeof STRINGS;
export type Strings = (typeof STRINGS)[Locale];

export const localeOf = (language: string | undefined): Locale => (language?.toLowerCase().startsWith("es") ? "es" : "en");
