import { DEFAULT_PAIRING_ID, getTypographyPairing, type TypographyPairing } from "@dialmade/catalog";
import { fontsUrlFor, type DesignDoc } from "@dialmade/doc";

const VAR_NAME = /^--[A-Za-z0-9_-]+$/;
const UNSAFE_VALUE = /[;{}<>\\]|\/\*/;

/** Theme variables that are safe to write into a style attribute or a <style> block. */
export function safeThemeEntries(vars: Readonly<Record<string, string>>): [string, string][] {
  return Object.entries(vars).filter(
    ([name, value]) => VAR_NAME.test(name) && typeof value === "string" && value.trim() !== "" && !UNSAFE_VALUE.test(value),
  );
}

/** `:root{--a:b;…}` (or any selector). Unsafe names or values are skipped. */
export function themeVarsCss(vars: Readonly<Record<string, string>>, selector = ":root"): string {
  const body = safeThemeEntries(vars)
    .map(([name, value]) => `${name}:${value.trim()};`)
    .join("");
  return `${selector}{${body}}`;
}

/** The typography pairing of the doc (Google Fonts URL, families). */
export function pairingForDoc(doc: Pick<DesignDoc, "brief">): TypographyPairing {
  return getTypographyPairing(doc.brief.pairingId) ?? (getTypographyPairing(DEFAULT_PAIRING_ID) as TypographyPairing);
}

/**
 * The Google Fonts stylesheet the doc needs: its own families (`tokens.typography`, Google source or
 * free substitute) when it has them, the pairing's otherwise; `null` when nothing loads from Google.
 */
export function fontsUrlForDoc(doc: Pick<DesignDoc, "brief" | "tokens">): string | null {
  return fontsUrlFor(doc, pairingForDoc(doc));
}
