import type { Locale } from "@dialmade/catalog";

const STRINGS = {
  es: {
    // calendar
    calendarTitle: "Calendario",
    today: "Hoy",
    tomorrow: "Mañana",
    moreEvents: (count: number) => `+${count} más`,
    noEvents: "Sin eventos próximos",
    nextEvent: "Próximo",
    hasEvents: "con eventos",
    eventRange: (from: string, to: string) => `${from}–${to}`,
    hours: "Horas",
    // cards and list
    cards: "Tarjetas",
    viewAll: "Ver todo",
    // media
    mediaAlt: (brand: string) => `Vista del producto de ${brand}`,
    // placeholder
    soon: "Pronto",
    freeBlock: "Bloque libre",
    soonBlock: "Bloque en camino",
    vote: "Votar en GitHub",
    opensInNewTab: "(se abre en otra pestaña)",
    noteLabel: "Nota",
    placeholderHint: "Aún no hay una sección para este bloque.",
    loading: "Contenido por definir",
  },
  en: {
    calendarTitle: "Calendar",
    today: "Today",
    tomorrow: "Tomorrow",
    moreEvents: (count: number) => `+${count} more`,
    noEvents: "No upcoming events",
    nextEvent: "Next",
    hasEvents: "with events",
    eventRange: (from: string, to: string) => `${from}–${to}`,
    hours: "Hours",
    cards: "Cards",
    viewAll: "View all",
    mediaAlt: (brand: string) => `${brand} product preview`,
    soon: "Soon",
    freeBlock: "Free block",
    soonBlock: "Block on the way",
    vote: "Vote on GitHub",
    opensInNewTab: "(opens in a new tab)",
    noteLabel: "Note",
    placeholderHint: "This block has no section yet.",
    loading: "Content to be defined",
  },
} as const;

export type UiStrings = (typeof STRINGS)[Locale];

/** Interface texts of the ui.* sections that are not editable copy (labels, hints, links). */
export const uiStrings = (locale: Locale): UiStrings => STRINGS[locale];

/** Issues of the project, where «Pronto» blocks are voted. */
export const VOTE_URL = "https://github.com/k1rie/DialMade/issues";
