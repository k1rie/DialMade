import type { LocalizedText } from "@dialmade/catalog";

/** Shorthand for authoring copy: `t("Hola", "Hello")`. */
export const t = (es: string, en: string): LocalizedText => ({ es, en });
