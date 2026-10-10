import type { Locale } from "@dialmade/catalog";
import type { Rng } from "./rng";

// Generic, fictional names and organizations. Never real customers, people or brands.
const FIRST_NAMES: Record<Locale, readonly string[]> = {
  es: [
    "Lucía", "Marcos", "Carmen", "Elena", "Javier", "Paula", "Andrés", "Sara", "Tomás", "Nuria",
    "Álvaro", "Irene", "Pablo", "Marta", "Raúl", "Clara", "Hugo", "Alba", "Sergio", "Inés",
  ],
  en: [
    "Maya", "Daniel", "Priya", "Owen", "Hannah", "Samuel", "Grace", "Leo", "Nora", "Ethan",
    "Chloe", "Marcus", "Ava", "Julian", "Zoe", "Isaac", "Ruby", "Felix", "Iris", "Noah",
  ],
};

const LAST_NAMES: Record<Locale, readonly string[]> = {
  es: [
    "Herrera", "Ibáñez", "Soler", "Navarro", "Prieto", "Morales", "Ríos", "Campos", "Delgado", "Vidal",
    "Gil", "Peña", "Castro", "Molina", "Ortega", "Rubio", "Serrano", "Blanco", "Méndez", "Vega",
  ],
  en: [
    "Brooks", "Reyes", "Nair", "Carter", "Lee", "Ortiz", "Kim", "Fischer", "Walsh", "Park",
    "Bennett", "Hill", "Murphy", "Patel", "Rossi", "Nguyen", "Santos", "Cole", "Hayes", "Moreau",
  ],
};

export const COMPANY_NAMES: readonly string[] = [
  "Arce Studio", "Brisa Labs", "Cobalto", "Copperwren", "Delta Norte", "Fernlight", "Granito & Co.", "Harbor & Pine",
  "Helio Sur", "Índigo Works", "Kestrel Nine", "Lumen Atelier", "Maple Quarry", "Marea Alta", "Nimbo", "Orchid Ridge",
  "Pico Nueve", "Quillstone", "Roble Digital", "Saltmarsh Co.", "Tidewell", "Vértice Uno", "Willowbyte", "Zafiro Group",
];

export const PUBLICATION_NAMES: Record<Locale, readonly string[]> = {
  es: ["Revista Brújula", "Cuaderno Abierto", "La Gaceta Clara", "Puerto Diario", "Revista Mirador", "Hoja de Ruta", "El Faro Semanal"],
  en: ["The Weekly Compass", "Northline Daily", "Brightside Magazine", "Field Notes Review", "Harbor Post", "Metro Ledger", "Open Notebook"],
};

export const personName = (rng: Rng, locale: Locale): string =>
  `${rng.pick(FIRST_NAMES[locale])} ${rng.pick(LAST_NAMES[locale])}`;

/** Distinct names (first names never repeat within one call). */
export function personNames(rng: Rng, locale: Locale, count: number): string[] {
  const firsts = rng.sample(FIRST_NAMES[locale], Math.min(count, FIRST_NAMES[locale].length));
  return Array.from({ length: count }, (_, i) => `${firsts[i % firsts.length]} ${rng.pick(LAST_NAMES[locale])}`);
}

export const companyNames = (rng: Rng, count: number): string[] => rng.sample(COMPANY_NAMES, count);

export function initialsOf(name: string): string {
  return name
    .split(/\s+/)
    .filter((word) => /^\p{L}/u.test(word))
    .slice(0, 2)
    .map((word) => word.charAt(0).toUpperCase())
    .join("");
}

/** The brand's monogram when there is no logo («Nimbus Pay» → «NP»), the same in every page and mini. */
export const monogramOf = (name: string): string => initialsOf(name) || Array.from(name.trim())[0]?.toUpperCase() || "·";
