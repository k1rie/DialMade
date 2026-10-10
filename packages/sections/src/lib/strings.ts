import type { Locale } from "@dialmade/catalog";

const STRINGS = {
  es: {
    editableSection: "sección editable",
    missingSection: (type: string) => `Sección no disponible: ${type}`,
    sectionError: (label: string) => `No se pudo mostrar «${label}»`,
    sectionErrorHint: "Revisa sus props en el inspector o deshaz el último cambio.",
  },
  en: {
    editableSection: "editable section",
    missingSection: (type: string) => `Section not available: ${type}`,
    sectionError: (label: string) => `Could not render “${label}”`,
    sectionErrorHint: "Check its props in the inspector or undo the last change.",
  },
} as const;

export type SectionStrings = (typeof STRINGS)[Locale];

export const sectionStrings = (locale: Locale): SectionStrings => STRINGS[locale];
