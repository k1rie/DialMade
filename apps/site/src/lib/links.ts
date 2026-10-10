import type { Locale } from "@/i18n";

/**
 * A public URL from the environment, without the trailing slash. Without it the local port is used, so
 * `pnpm build` works in a fresh clone; a production build warns, because the links would point to localhost.
 */
function publicUrl(name: string, value: string | undefined, localFallback: string): string {
  if (!value && process.env.NODE_ENV === "production") {
    console.warn(`[site] ${name} no está definida: los enlaces apuntarán a ${localFallback} (ver apps/site/.env.example).`);
  }
  return (value || localFallback).replace(/\/$/, "");
}

/** Where the app (apps/web) lives. In local dev it runs on port 3200. */
export const APP_URL = publicUrl("NEXT_PUBLIC_APP_URL", process.env.NEXT_PUBLIC_APP_URL, "http://localhost:3200");
/** Where this landing lives: base of canonical, hreflang, Open Graph, robots.txt and the sitemap. */
export const SITE_URL = publicUrl("NEXT_PUBLIC_SITE_URL", process.env.NEXT_PUBLIC_SITE_URL, "http://localhost:3400");
export const REPO_URL = "https://github.com/k1rie/DialMade";
export const LICENSE_URL = `${REPO_URL}/blob/main/LICENSE`;

/**
 * CTA «Empieza tu layout»: asks the app for the Modo Layout and the language (docs/onboarding/onboarding.md,
 * entry E1). Until apps/web reads `start` and `lang`, the app ignores them and opens its home.
 */
export const startLayoutUrl = (locale: Locale) => `${APP_URL}/?start=layout&lang=${locale}`;
