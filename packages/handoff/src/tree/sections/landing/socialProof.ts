// landing.socialProof: a small title, the fictional logo wall and (optionally) the stats row; `metrics` puts the
// big numbers first (a grid with dividers) and the logos under a rule.
import { hashString } from "@dialmade/sections";
import type { ResolvedTokens } from "@dialmade/doc";
import type { SectionBuilder } from "../../context";
import { column, grid, records, row, shape, str, strings, text } from "../../nodes";
import type { ColorVar, DesignNode, FrameNode, TextStyleId } from "../../types";
import { landingSection, scaleTo, styleOf, withCrossGap } from "./shared";

/** `LOGO_MARKS` of FictionalLogo approximated with shapes (8 marks, same index from the name's hash). */
function logoMark(index: number, color: ColorVar, size: number): DesignNode {
  const solid = { color };
  switch (index) {
    case 0:
      return shape({ name: "Mark", shape: "ellipse", role: "decor", width: size, height: size, fill: solid });
    case 1:
      return row({ name: "Mark", width: size, height: size, align: "center", justify: "center", radius: "full", stroke: { color, width: 3 } }, [
        shape({ name: "Core", shape: "ellipse", role: "decor", width: Math.round(size * 0.28), height: Math.round(size * 0.28), fill: solid }),
      ]);
    case 2:
      return shape({ name: "Mark", role: "decor", width: Math.round(size * 0.74), height: Math.round(size * 0.74), radius: "sm", fill: solid });
    case 3:
      return column({ name: "Mark", width: size, gap: { px: Math.round(size * 0.15) } }, [
        shape({ name: "Bar", role: "decor", width: "fill", height: Math.round(size * 0.22), radius: "full", fill: solid }),
        shape({ name: "Bar", role: "decor", width: Math.round(size * 0.6), height: Math.round(size * 0.22), radius: "full", fill: solid }),
      ]);
    case 4:
      return shape({ name: "Mark", role: "decor", width: size, height: Math.round(size * 0.8), radius: "sm", fill: solid });
    case 5:
      return shape({ name: "Mark", shape: "ellipse", role: "decor", width: size, height: Math.round(size * 0.62), fill: solid });
    case 6:
      return grid({ name: "Mark", columns: 2, gap: { px: 2 }, width: size }, [0, 1, 2, 3].map((i) => shape({ name: "Dot", shape: "ellipse", role: "decor", width: "fill", aspect: 1, fill: { color, ...(i === 3 && { opacity: 0.45 }) } })));
    default:
      return shape({ name: "Mark", role: "decor", width: size, height: size, radius: "md", fill: solid });
  }
}

type FontSizes = ResolvedTokens["fontSizes"];
type Wordmark = { style: TextStyleId; size: keyof FontSizes; px: number; weight: number; transform?: (s: string) => string; mark: number };

/** The four wordmark styles of FictionalLogo.css (18 px heading 700, 14 px caps, 16 px mono, 18 px lowercase 800). */
const WORDMARK: Record<number, Wordmark> = {
  0: { style: "h3", size: "h3", px: 18, weight: 700, mark: 23 },
  1: { style: "overline", size: "caption", px: 14, weight: 600, mark: 22 },
  2: { style: "mono", size: "small", px: 16, weight: 500, mark: 21 },
  3: { style: "body-strong", size: "body", px: 18, weight: 800, transform: (s) => s.toLowerCase(), mark: 23 },
};

/** `FictionalLogo`: a geometric mark and a wordmark, both chosen from the name. */
function fictionalLogo(name: string, color: ColorVar, fs: FontSizes): FrameNode {
  const hash = hashString(name);
  const wordmark = WORDMARK[(hash >>> 8) % 4]!;
  return row({ name: "FictionalLogo", tag: "li", width: "hug", align: "center", gap: 2 }, [
    logoMark(hash % 8, color, wordmark.mark),
    text(wordmark.transform ? wordmark.transform(name) : name, wordmark.style, {
      color,
      tag: "span",
      scale: scaleTo(fs, wordmark.size, wordmark.px),
      weight: wordmark.weight,
    }),
  ]);
}

export const socialProofBuilder: SectionBuilder = ({ props, variant, build }) => {
  const fs = build.light.fontSizes;
  const style = styleOf(props, { spacing: "compact" });
  const metrics = variant === "metrics";
  const center = style.align === "center";
  const textAlign = center ? "center" : "start";
  const logoColor: ColorVar = style.emphasis === "bold" ? "foreground" : "muted-foreground";
  const names = strings(props.logos, (item) => item.name).slice(0, Math.max(1, typeof props.count === "number" ? props.count : 1));
  const stats = records(props.stats);

  const logos =
    names.length > 0
      ? row(
          {
            name: "Logos",
            tag: "ul",
            width: "fill",
            wrap: true,
            align: "center",
            justify: center ? "center" : "start",
            gap: 7,
            ...(style.emphasis === "subtle" && { opacity: 0.62 }),
            ...(metrics && { padding: { top: 6 }, stroke: { color: "border", sides: ["top"] as const } }),
          },
          names.map((name) => fictionalLogo(name, logoColor, fs)),
        )
      : null;
  const logoWall = logos ? withCrossGap(logos, 5) : null;

  const stat = (entry: Record<string, unknown>, i: number, metric: boolean): FrameNode =>
    column(
      {
        name: "Stat",
        width: metric ? "fill" : "hug",
        gap: { px: 2 },
        align: center ? "center" : "start",
        ...(metric && i > 0 && { padding: { left: 5, ...(center && { right: 5 }) }, stroke: { color: "border", sides: ["left"] as const } }),
        ...(metric && i === 0 && center && { padding: { right: 5 } }),
      },
      [
        text(str(entry.value), metric ? "h1" : "h3", {
          name: "Value",
          color: metric && style.emphasis === "bold" ? "primary-text" : "foreground",
          align: textAlign,
          ...(metric && { scale: 1.15 }),
        }),
        text(str(entry.label), "small", { name: "Label", color: "muted-foreground", align: textAlign }),
      ],
    );

  const statList =
    (metrics || props.showStats === true) && stats.length > 0
      ? metrics
        ? grid({ name: "Stats", columns: stats.length === 1 ? 1 : stats.length === 3 ? 3 : stats.length === 4 ? 4 : 2, gap: 5 }, stats.map((entry, i) => stat(entry, i, true)))
        : withCrossGap(
            row(
              { name: "Stats", width: "fill", wrap: true, justify: center ? "center" : "start", gap: 8, padding: { top: 6 }, stroke: { color: "border", sides: ["top"] as const } },
              stats.map((entry, i) => stat(entry, i, false)),
            ),
            5,
          )
      : null;

  const title = metrics
    ? text(props.title, "h2", { name: "Title", tag: "h2", align: textAlign })
    : text(props.title, "small", { name: "Title", tag: "h2", color: "muted-foreground", align: textAlign, weight: 500 });
  const titleBox = title ? row({ name: "TitleMeasure", width: "fill", justify: center ? "center" : "start" }, [{ ...title, width: "fill", maxWidth: metrics ? 576 : 640 }]) : null;

  return landingSection({ name: "SocialProof", style, gap: metrics ? 7 : 6 }, metrics ? [titleBox, statList, logoWall] : [titleBox, logoWall, statList]);
};
