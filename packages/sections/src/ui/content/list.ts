import type { Locale } from "@dialmade/catalog";
import { activityFeed } from "../../content/generators";
import { rngFor } from "../../content/rng";
import { t } from "../../content/t";
import type { Tone } from "../../content/types";
import type { ContentContext } from "../../types";

export interface UiListItem {
  id: string;
  /** Person or subject of the row. */
  primary: string;
  /** What happened or what it is about. */
  secondary: string;
  /** Short trailing text: a relative time by default. */
  meta: string;
  tone: Tone;
}

/** Most rows a list stores: `count` decides how many are shown. */
export const UI_LIST_MAX = 12;

/** Enough titles that lists on different screens (each with its own seed) rarely share one. */
const LIST_TITLES = [
  t("Actividad reciente", "Recent activity"),
  t("Últimos cambios", "Latest changes"),
  t("Novedades del equipo", "Team updates"),
  t("Movimientos recientes", "Recent moves"),
  t("Lo último", "What's new"),
  t("Qué ha pasado hoy", "What happened today"),
] as const;

/** Title of a list block, picked by seed. */
export function uiListTitle(ctx: ContentContext): string {
  return rngFor(ctx.seed, `${ctx.productType.id}:ui-list-title`).pick(LIST_TITLES)[ctx.locale as Locale];
}

/** Up to 12 rows from the profile's activity feed: who, what and when, with fictional people. */
export function uiListItems(ctx: ContentContext, count = UI_LIST_MAX): UiListItem[] {
  return activityFeed(ctx, Math.max(0, Math.min(UI_LIST_MAX, count))).map((item, i) => ({
    id: `item-${i + 1}`,
    primary: item.actor,
    secondary: item.text,
    meta: item.time,
    tone: item.tone,
  }));
}
