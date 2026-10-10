import type { Locale } from "@dialmade/catalog";

const STRINGS = {
  es: {
    mainNav: "Principal",
    menu: "Menú",
    footerNav: "Pie de página",
    billing: "Periodo de facturación",
    monthly: "Mensual",
    yearly: "Anual",
    save: (percent: number) => `−${percent} %`,
    perMonth: "/mes",
    billedYearly: "facturado anualmente",
    billedMonthly: "facturado mensualmente",
    mostPopular: "Más popular",
    from: "desde",
    free: "Gratis",
    rating: (value: number) => `Valoración: ${value} de 5`,
    email: "Correo electrónico",
    emailPlaceholder: "tu@correo.com",
    logos: "Logotipos",
    overview: "Resumen",
    search: "Buscar…",
    create: "Nuevo",
    recent: "Actividad reciente",
    rights: (year: number, name: string, text: string) => `© ${year} ${name}. ${text}`,
  },
  en: {
    mainNav: "Main",
    menu: "Menu",
    footerNav: "Footer",
    billing: "Billing period",
    monthly: "Monthly",
    yearly: "Yearly",
    save: (percent: number) => `−${percent}%`,
    perMonth: "/mo",
    billedYearly: "billed yearly",
    billedMonthly: "billed monthly",
    mostPopular: "Most popular",
    from: "from",
    free: "Free",
    rating: (value: number) => `Rated ${value} out of 5`,
    email: "Email address",
    emailPlaceholder: "you@company.com",
    logos: "Logos",
    overview: "Overview",
    search: "Search…",
    create: "New",
    recent: "Recent activity",
    rights: (year: number, name: string, text: string) => `© ${year} ${name}. ${text}`,
  },
} as const;

export type LandingStrings = (typeof STRINGS)[Locale];

/** Interface texts of the landing sections that are not editable copy (toggles, menus, labels). */
export const landingStrings = (locale: Locale): LandingStrings => STRINGS[locale];
