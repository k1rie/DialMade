import type { MetadataRoute } from "next";
import { locales } from "@/i18n/config";
import { SITE_URL } from "@/lib/links";

/** One entry per language, each listing the other as its alternate (hreflang). */
export default function sitemap(): MetadataRoute.Sitemap {
  const languages = Object.fromEntries(locales.map((l) => [l, `${SITE_URL}/${l}`]));
  return locales.map((l) => ({ url: `${SITE_URL}/${l}`, alternates: { languages } }));
}
