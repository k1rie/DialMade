import type { OutputKind } from "@dialmade/catalog";
import { DEFAULT_PAGE_SECTIONS } from "@dialmade/doc";

export { APP_SHELL_TYPE, APP_SHELL_WIDGETS } from "@dialmade/doc";

/** Root element type of each page (`landing.page`…). A section with this type, if registered, wraps the page. */
export const pageRootType = (kind: OutputKind) => `${kind}.page`;

/** The board of the «Guía de estilo», in order (same as @dialmade/doc). */
export const BRAND_BOARD_SECTIONS: readonly string[] = DEFAULT_PAGE_SECTIONS.brand;

export const VARIANT_PROP = "variant";
