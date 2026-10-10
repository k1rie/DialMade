"use client";

import { useEffect } from "react";
import { useI18n } from "@/i18n";
import { LOCALE_STORAGE_KEY } from "@/i18n/config";
import type { PromoLang } from "../../../promo/scenes";

function readStored(): string | null {
  try {
    return window.localStorage.getItem(LOCALE_STORAGE_KEY);
  } catch {
    return null;
  }
}

function restoreStored(value: string | null) {
  try {
    if (value === null) window.localStorage.removeItem(LOCALE_STORAGE_KEY);
    else window.localStorage.setItem(LOCALE_STORAGE_KEY, value);
  } catch {}
}

/**
 * Puts the whole page (AppHeader included) in `lang` for this visit only: the app's `setLocale`
 * stores the choice, so the stored preference is put back right after. True once `lang` is active.
 */
export function usePromoLocale(lang: PromoLang): boolean {
  const { locale, setLocale } = useI18n();
  useEffect(() => {
    if (locale === lang) return;
    const stored = readStored();
    setLocale(lang);
    restoreStored(stored);
  }, [lang, locale, setLocale]);
  return locale === lang;
}
