import type { IconName } from "@dialmade/ui";
import { featureList, statList, tableData, type TableRow } from "../../content/generators";
import type { TableColumnKind } from "../../content/generators";
import type { ContentContext } from "../../types";

export interface UiCardItem {
  icon: IconName;
  title: string;
  description: string;
  /** Short figure or tag («12 k», «$1,249», «Pendiente»). */
  meta: string;
}

/** Most cards a block stores: `count` (1–12) only decides how many are shown. */
export const UI_CARDS_MAX = 12;

const TITLE_KINDS: readonly TableColumnKind[] = ["person", "company", "id"];
const DESCRIPTION_KINDS: readonly TableColumnKind[] = ["choice", "status", "relative", "date"];
const META_KINDS: readonly TableColumnKind[] = ["money", "number", "percent", "duration", "time", "date"];

function cellText(row: TableRow, keys: readonly string[]): string {
  for (const key of keys) {
    const text = row.cells[key]?.text;
    if (text) return text;
  }
  return "";
}

/**
 * Up to 12 cards: the profile's features first (only 6 exist), then rows of its dashboard table
 * (customers, orders, deployments…) for cards 7–12. `meta` is a stat of the profile for the features
 * and a figure of the row for the rest. Never real brands: the people and companies are fictional.
 */
export function uiCardItems(ctx: ContentContext, count = UI_CARDS_MAX): UiCardItem[] {
  const total = Math.max(0, Math.min(UI_CARDS_MAX, count));
  const features = featureList(ctx, 6);
  const stats = statList(ctx);
  const items: UiCardItem[] = features.slice(0, total).map((feature, i) => ({
    icon: feature.icon,
    title: feature.title,
    description: feature.description,
    meta: stats.length > 0 ? stats[i % stats.length]!.value : "",
  }));
  const missing = total - items.length;
  if (missing <= 0) return items;

  const table = tableData(ctx, missing);
  const keysOf = (kinds: readonly TableColumnKind[]) =>
    kinds.flatMap((kind) => table.columns.filter((column) => column.kind === kind).map((column) => column.key));
  const titleKeys = keysOf(TITLE_KINDS);
  const descriptionKeys = keysOf(DESCRIPTION_KINDS);
  const metaKeys = keysOf(META_KINDS);
  const icons: readonly IconName[] = features.length > 0 ? features.map((feature) => feature.icon) : ["file"];
  table.rows.forEach((row, i) => {
    items.push({
      icon: icons[i % icons.length]!,
      title: cellText(row, titleKeys) || `${table.title} ${i + 1}`,
      description: cellText(row, descriptionKeys) || table.title,
      meta: cellText(row, metaKeys),
    });
  });
  return items;
}
