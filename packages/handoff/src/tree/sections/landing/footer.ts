// landing.footer: brand (and tagline) beside the link columns, then the legal line (`columns`), or brand, a few
// inline links and the legal line in one row (`simple`). `bold` adds the brand name as a big wordmark.
import { CONTENT_TODAY } from "@dialmade/sections";
import type { SectionBuilder } from "../../context";
import { column, grid, records, row, str, text } from "../../nodes";
import type { FrameNode } from "../../types";
import { brandMark, landingSection, landingStrings, linkBox, scaleTo, styleOf, withCrossGap } from "./shared";

const linkOf = (link: Record<string, unknown>) => linkBox(str(link.label), "small", "muted-foreground", typeof link.linkTo === "string" ? link.linkTo : undefined);

export const footerBuilder: SectionBuilder = ({ props, variant, ctx, build }) => {
  const style = styleOf(props, { align: "start", spacing: "compact" });
  const center = style.align === "center";
  const brandName = str(props.brandName) || ctx.brand.name;
  const columns = records(props.columns);
  const copyright = landingStrings(ctx.locale).rights(CONTENT_TODAY.year, brandName, str(props.rights));
  const brand = brandMark(brandName, style.emphasis === "subtle" ? "sm" : "md", true, build.light.fontSizes);
  const rights = text(copyright, "caption", { name: "Rights", color: "muted-foreground", align: center ? "center" : "start", tag: "p" });

  let body: (FrameNode | null)[];
  if (variant === "simple") {
    const picks = [0, columns.length - 1].filter((col, i, all) => col >= 0 && all.indexOf(col) === i);
    const links = picks.flatMap((col) => records(columns[col]?.links).map(linkOf));
    const inline = links.length > 0 ? withCrossGap(row({ name: "Links", tag: "ul", width: "hug", wrap: true, gap: 5, justify: center ? "center" : "start" }, links), 2) : null;
    body = [
      center
        ? column({ name: "Row", align: "center", gap: 4 }, [brand, inline, rights])
        : row({ name: "Row", width: "fill", wrap: true, align: "center", justify: "between", gap: 4 }, [brand, inline, rights]),
    ];
  } else {
    const brandBlock = column({ name: "Brand", gap: 3, align: center ? "center" : "start", ...(center ? { width: "hug" as const } : { maxWidth: 352 }) }, [
      brand,
      text(props.tagline, "small", { name: "Tagline", color: "muted-foreground", align: center ? "center" : "start", tag: "p" }),
    ]);
    // Centered columns are `minmax(8rem, auto)`: at least 128 px, wider for long labels (estimated).
    const columnWidth = (entry: Record<string, unknown>) =>
      Math.max(128, ...[str(entry.title), ...records(entry.links).map((link) => str(link.label))].map((label) => Math.ceil(label.length * 7.4)));
    const columnBox = (entry: Record<string, unknown>) =>
      column({ name: "Column", width: center ? columnWidth(entry) : "fill", gap: 3, align: center ? "center" : "start" }, [
        text(str(entry.title), "small-strong", { name: "Heading", color: "foreground", align: center ? "center" : "start", tag: "p" }),
        column({ name: "Links", tag: "ul", width: "hug", gap: 2, align: center ? "center" : "start" }, records(entry.links).map(linkOf)),
      ]);
    const nav =
      columns.length > 0
        ? center
          ? row({ name: "Columns", tag: "nav", width: "hug", gap: 8, align: "start" }, columns.map((entry) => ({ ...columnBox(entry), minHeight: undefined })))
          : grid({ name: "Columns", tag: "nav", columns: columns.length, gap: 5 }, columns.map(columnBox))
        : null;
    const top = center
      ? column({ name: "Top", align: "center", gap: 7 }, [brandBlock, nav])
      : grid({ name: "Top", columns: 3, gap: 7 }, [
          { ...brandBlock, place: { col: 0, span: 1, row: 0 } },
          nav ? { ...nav, place: { col: 1, span: 2, row: 0 } } : null,
        ]);
    body = [top, column({ name: "Bottom", padding: { top: 5 }, stroke: { color: "border", sides: ["top"] as const }, align: center ? "center" : "start" }, [rights])];
  }

  // `font-size: min(150cqi / chars, 14rem)` over the 1440 px section.
  const wordmarkPx = Math.min(224, (1.5 * 1440) / Math.max(4, Array.from(brandName).length));
  const wordmark =
    style.emphasis === "bold"
      ? text(brandName, "display", { name: "Wordmark", color: "brand", opacity: 0.4, align: "center", scale: scaleTo(build.light.fontSizes, "display", wordmarkPx), weight: 700 })
      : null;
  return landingSection({ name: "Footer", tag: "footer", style, gap: 7, clip: true, stroke: { color: "border", sides: ["top"] as const } }, [...body, wordmark]);
};
