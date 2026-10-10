import type { FirstUseOption, LocalizedText, OutputKindOption } from "../types";

export const outputKindOptions: readonly OutputKindOption[] = [
  {
    id: "brand",
    label: { es: "Guía de estilo", en: "Style guide" },
    forYouIf: {
      es: "vas a pasarle tu marca a un diseñador o a tu IA (Claude, Cursor, v0).",
      en: "you're handing your brand to a designer or to your AI (Claude, Cursor, v0).",
    },
  },
  {
    id: "landing",
    label: { es: "Landing page", en: "Landing page" },
    forYouIf: {
      es: "vas a lanzar o validar algo y necesitas una web.",
      en: "you're launching or validating something and need a website.",
    },
  },
  {
    id: "app",
    label: { es: "Dashboard y componentes", en: "Dashboard & components" },
    forYouIf: {
      es: "ya construyes una app web: un SaaS, un panel o una herramienta interna.",
      en: "you're already building a web app: a SaaS, an admin panel or an internal tool.",
    },
  },
];

// Pregunta determinista (sin IA) para quien no sabe qué crear.
export const firstUseQuestion: { prompt: LocalizedText; options: readonly FirstUseOption[] } = {
  prompt: {
    es: "¿Qué vas a hacer primero con este diseño?",
    en: "What will you do first with this design?",
  },
  options: [
    {
      answer: "launch",
      kind: "landing",
      label: { es: "Lanzar o validar una web", en: "Launch or validate a website" },
    },
    {
      answer: "build",
      kind: "app",
      label: { es: "Construir la interfaz de mi producto", en: "Build my product's interface" },
    },
    {
      answer: "handoff",
      kind: "brand",
      label: { es: "Pasárselo a mi diseñador o a mi IA", en: "Hand it to my designer or my AI" },
    },
  ],
};
