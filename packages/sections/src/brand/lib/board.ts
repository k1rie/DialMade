import type { LocalizedText } from "@dialmade/catalog";
import { BRAND_BOARD_SECTIONS } from "../../constants";
import { t } from "../../content";
import type { RenderContext } from "../../types";

export const COVER_TYPE = "brand.cover";

/** Names of the numbered sections of the board (the cover has no number). */
export const BOARD_SECTION_NAMES: Readonly<Record<string, LocalizedText>> = {
  "brand.identity": t("Identidad", "Identity"),
  "brand.palette": t("Paleta", "Palette"),
  "brand.type": t("Tipografía", "Typography"),
  "brand.shape": t("Formas", "Shape"),
  "brand.components": t("Componentes", "Components"),
  "brand.artDirection": t("Dirección de arte", "Art direction"),
};

export interface BoardEntry {
  type: string;
  number: string;
  label: string;
  /** Element id in the doc's page, when the board comes from the doc. */
  id?: string;
}

export const boardNumber = (index: number): string => String(index + 1).padStart(2, "0");

/** Visible numbered sections in page order: hidden sections and the cover do not count. */
export function boardIndex(ctx: Pick<RenderContext, "doc" | "locale">): BoardEntry[] {
  const page = ctx.doc?.pages.brand;
  const hidden = new Set(page?.hidden ?? []);
  const entries: { type: string; id?: string }[] = page
    ? (page.elements[page.root]?.children ?? [])
        .filter((id) => !hidden.has(id))
        .map((id) => ({ type: page.elements[id]?.type ?? "", id }))
    : BRAND_BOARD_SECTIONS.map((type) => ({ type }));
  return entries
    .filter(({ type }) => type !== COVER_TYPE && type in BOARD_SECTION_NAMES)
    .map(({ type, id }, index) => ({
      type,
      number: boardNumber(index),
      label: BOARD_SECTION_NAMES[type]![ctx.locale],
      ...(id && { id }),
    }));
}

/** Number of a section on the board («03»): by element id when the board comes from the doc, else by type. */
export function boardNumberOf(ctx: Pick<RenderContext, "doc" | "locale">, elementId: string, type: string): string | undefined {
  const index = boardIndex(ctx);
  return (index.find((entry) => entry.id === elementId) ?? index.find((entry) => entry.type === type && !entry.id))?.number;
}

/** An optional text prop, or its localized default when empty. */
export const textOr = (value: string | undefined, fallback: string): string => (value && value.trim() ? value : fallback);
