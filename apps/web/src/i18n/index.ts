"use client";

import { createContext, createElement, useCallback, useContext, useMemo, useSyncExternalStore, type ReactNode } from "react";
import { common, type CommonDictionary } from "./common";
import { LOCALE_STORAGE_KEY, defaultLocale, isLocale, type Dictionary, type Locale } from "./config";

export { common, type CommonDictionary } from "./common";
export { defaultLocale, defineDictionary, isLocale, locales, type Dictionary, type Locale } from "./config";

const listeners = new Set<() => void>();
let current: Locale | undefined;

function readStoredLocale(): Locale {
  try {
    const stored = window.localStorage.getItem(LOCALE_STORAGE_KEY);
    if (isLocale(stored)) return stored;
  } catch {}
  return defaultLocale;
}

const subscribe = (listener: () => void) => {
  listeners.add(listener);
  return () => void listeners.delete(listener);
};
const getSnapshot = (): Locale => (current ??= readStoredLocale());
const getServerSnapshot = (): Locale => defaultLocale;

function writeLocale(locale: Locale) {
  current = locale;
  try {
    window.localStorage.setItem(LOCALE_STORAGE_KEY, locale);
  } catch {}
  document.documentElement.lang = locale;
  listeners.forEach((listener) => listener());
}

type I18nContextValue = { locale: Locale; setLocale: (locale: Locale) => void; t: CommonDictionary };

const I18nContext = createContext<I18nContextValue | null>(null);

export function I18nProvider({ children }: { children: ReactNode }) {
  const locale = useSyncExternalStore(subscribe, getSnapshot, getServerSnapshot);
  const setLocale = useCallback((next: Locale) => writeLocale(next), []);
  const value = useMemo(() => ({ locale, setLocale, t: common[locale] }), [locale, setLocale]);
  return createElement(I18nContext.Provider, { value }, children);
}

/** `{ locale, setLocale, t }` where `t` is the common dictionary in the active locale. */
export function useI18n(): I18nContextValue {
  const value = useContext(I18nContext);
  if (!value) throw new Error("useI18n must be used inside <I18nProvider>");
  return value;
}

export const useLocale = (): Locale => useI18n().locale;

/** Picks a namespace dictionary (`defineDictionary({ es, en })`) for the active locale. */
export function useDictionary<T>(dictionary: Dictionary<T>): T {
  return dictionary[useI18n().locale];
}
