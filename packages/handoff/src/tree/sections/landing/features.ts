// landing.features: section heading and feature cards. `grid` lays them on 6 columns (spans of 2 or 3, four in a
// row from 72rem); `bento` gives the lead card a mini chart and a wider (or taller) cell.
import { chartData, kpiList, type ContentContext } from "@dialmade/sections";
import type { SectionBuilder } from "../../context";
import { card, column, grid, icon, records, row, shape, str, text } from "../../nodes";
import type { DesignNode, FrameNode, GridPlace } from "../../types";
import { landingSection, scaleTo, sectionHeading, styleOf, type Emphasis } from "./shared";

/** `FeatureVisual`: the lead bento tile's mini bar chart and KPI pill. */
function featureVisual(ctx: ContentContext): FrameNode {
  const values = chartData(ctx, 8).series[0]?.values ?? [];
  const max = Math.max(...values, 1);
  const kpi = kpiList(ctx, 1)[0];
  const barsH = 88;
  return column(
    {
      name: "FeatureVisual",
      height: 152,
      justify: "between",
      padding: { top: 3, x: 4, bottom: 0 },
      radius: "md",
      clip: true,
      fill: { gradient: { angle: 200, stops: [{ color: "brand", opacity: 0.2, at: 0 }, { color: "muted", opacity: 0.6, at: 0.6 }, { color: "muted", opacity: 0.6, at: 1 }] } },
      label: kpi?.label,
    },
    [
      kpi
        ? row(
            { name: "Pill", width: "hug", align: "baseline", gap: 2, padding: { x: { px: 10 }, y: { px: 6 } }, stroke: { color: "border" }, radius: "badge", fill: { color: "card" }, shadow: "sm" },
            [text(kpi.label, "caption", { color: "muted-foreground" }), text(kpi.display, "caption-strong", { color: "card-foreground" })],
          )
        : row({ name: "Pill", width: "hug" }, []),
      row(
        { name: "Bars", width: "fill", height: barsH, align: "end", gap: { px: 6 } },
        values.map((value, i) =>
          shape({
            name: `Bar ${i + 1}`,
            role: "bar",
            width: "fill",
            height: Math.round(Math.max(12, Math.round((value / max) * 100)) / 100 * barsH),
            radius: "sm",
            fill:
              i === values.length - 1
                ? { gradient: { angle: 0, stops: [{ color: "brand", at: 0 }, { color: "cta", opacity: 0.8, at: 1 }] } }
                : { color: "brand", opacity: 0.34 },
          }),
        ),
      ),
    ],
  );
}

function featureIcon(name: string, emphasis: Emphasis): DesignNode {
  if (emphasis === "subtle") return icon(name, "primary-text", 24);
  return row(
    {
      name: "Icon",
      width: 40,
      height: 40,
      align: "center",
      justify: "center",
      radius: "md",
      fill:
        emphasis === "bold"
          ? { gradient: { angle: 140, stops: [{ color: "primary", at: 0 }, { color: "primary", at: 0.5 }, { color: "cta", opacity: 0.8, at: 1 }] } }
          : { color: "brand", opacity: 0.13 },
      ...(emphasis === "bold" && { shadow: "sm" as const }),
    },
    [icon(name, emphasis === "bold" ? "primary-foreground" : "primary-text", 20)],
  );
}

/** Column spans of the 6-column list at desktop width (`Features.css`). */
function spans(count: number, bento: boolean): number[] {
  if (count === 1) return [6];
  if (count === 2) return [3, 3];
  if (!bento) {
    if (count === 4) return [1.5, 1.5, 1.5, 1.5]; // four in a row from 72rem
    if (count === 5) return [3, 3, 2, 2, 2];
    return Array.from({ length: count }, () => 2);
  }
  if (count === 4) return [4, 2, 2, 4];
  if (count === 5) return [4, 2, 2, 2, 2];
  return [4, 2, 2, 4, 3, 3];
}

/** Spans packed into rows of 6 columns. */
function placements(widths: number[]): GridPlace[] {
  const out: GridPlace[] = [];
  let rowIndex = 0;
  let col = 0;
  for (const span of widths) {
    if (col + span > 6) {
      rowIndex++;
      col = 0;
    }
    out.push({ col, span, row: rowIndex });
    col += span;
  }
  return out;
}

export const featuresBuilder: SectionBuilder = ({ props, variant, ctx, build }) => {
  const fs = build.light.fontSizes;
  const style = styleOf(props);
  const bento = variant === "bento";
  const items = records(props.items).slice(0, Math.max(1, typeof props.count === "number" ? props.count : 1));

  const featureCard = (item: Record<string, unknown>, i: number): FrameNode => {
    const lead = bento && i === 0;
    const body = column({ name: "Body", gap: 2 }, [
      // Heading font at body × 1.125 (the lead bento card: h3).
      text(str(item.title), "h3", { name: "Title", color: "card-foreground", tag: "h3", ...(!lead && { scale: scaleTo(fs, "h3", fs.body.px * 1.125) }) }),
      text(str(item.description), "body", { name: "Text", color: "muted-foreground", tag: "p", scale: 0.9375 }),
    ]);
    return card("Feature", [lead ? featureVisual(ctx) : null, lead ? null : featureIcon(str(item.icon) || "sparkle", style.emphasis), body], {
      tag: "li",
      gap: 4,
      ...(bento && { minHeight: 192, justify: "between" as const }),
    });
  };
  const cards = items.map(featureCard);

  let list: FrameNode;
  if (bento && cards.length === 3) {
    // The lead card spans two rows beside the other two.
    list = row({ name: "List", tag: "ul", width: "fill", gap: 4, align: "stretch" }, [
      { ...cards[0]!, width: "fill" },
      column({ name: "Stack", width: "fill", gap: 4 }, [cards[1], cards[2]]),
    ]);
  } else {
    const gap = bento ? 4 : 5;
    const widths = spans(cards.length, bento);
    if (widths.every((span) => span === widths[0])) {
      // Equal cells: a plain grid of 6 / span columns.
      list = grid({ name: "List", tag: "ul", columns: 6 / widths[0]!, gap }, cards);
    } else {
      const places = placements(widths);
      list = grid({ name: "List", tag: "ul", columns: 6, gap, rowGap: gap }, cards.map((node, i) => ({ ...node, place: places[i] })));
    }
  }

  return landingSection({ name: "Features", style, gap: 7 }, [sectionHeading(props, style.align), list]);
};
