export const locales = ["es", "en"] as const;
export type Locale = (typeof locales)[number];
export const defaultLocale: Locale = "es";

export const isLocale = (value: unknown): value is Locale =>
  typeof value === "string" && (locales as readonly string[]).includes(value);

export type Dictionary<T> = Record<Locale, T>;

/** `en` must have exactly the shape of `es`. Same contract as apps/web. */
export function defineDictionary<T>(dictionary: { es: T; en: NoInfer<T> }): Dictionary<T> {
  return dictionary;
}
