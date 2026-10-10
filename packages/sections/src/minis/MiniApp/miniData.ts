import type { LocalizedText } from "@dialmade/catalog";
import { appNav, kpiList, tableData } from "../../content/generators";
import { monogramOf } from "../../content/people";
import { contentProfileOf } from "../../content/profiles";
import { t } from "../../content/t";
import type { StatusOption } from "../../content/types";
import type { ContentContext } from "../../types";

const FALLBACK_STATUS: Record<"success" | "warning", LocalizedText> = {
  success: t("Activo", "Active"),
  warning: t("Pendiente", "Pending"),
};

/** Heights (in %) of the mini bar chart: a gentle climb, the same for every product. */
export const MINI_BARS = [42, 58, 50, 72, 64, 86, 78] as const;

function statusLabel(ctx: ContentContext, tone: "success" | "warning"): string {
  const options: StatusOption[] = contentProfileOf(ctx.productType).table.columns.flatMap((column) =>
    column.kind === "status" ? column.options : [],
  );
  return (options.find((option) => option.tone === tone)?.label ?? FALLBACK_STATUS[tone])[ctx.locale];
}

/** Everything the thumbnail paints, from the same deterministic copy as the full dashboard. */
export function miniAppData(ctx: ContentContext) {
  const table = tableData(ctx, 2);
  const firstKey = table.columns[0]?.key ?? "";
  return {
    initials: monogramOf(ctx.brand.name),
    title: ctx.locale === "es" ? "Resumen" : "Overview",
    nav: appNav(ctx).slice(0, 5),
    kpis: kpiList(ctx, 3),
    rows: table.rows.map((row, index) => ({
      id: row.id,
      label: row.cells[firstKey]?.text ?? "",
      tone: index === 0 ? ("success" as const) : ("warning" as const),
      status: statusLabel(ctx, index === 0 ? "success" : "warning"),
    })),
  };
}
