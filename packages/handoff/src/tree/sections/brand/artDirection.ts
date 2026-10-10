// 06 · Art direction (`brand/ArtDirection`): the mosaic of gradients and textures drawn from the brand scales,
// the applications (landing and dashboard thumbnails as image placeholders in browser frames) and the do's
// and don'ts. Moodboard: mosaic, applications, rules; Guidelines: rules with visuals, compact strip, applications.
import type { BuildContext, SectionBuilder } from "../../context";
import { bool, column, dot, frame, grid, icon, image, row, shape, strings, text } from "../../nodes";
import type { DesignNode, FrameNode, Paint, TrackArea } from "../../types";
import { ART_COPY } from "./copy";
import { boardPanel, boardSection, boardWidth, brandMark, mono, sizedText, spacePx, textOr } from "./shared";

type Copy = (typeof ART_COPY)["es" | "en"];
type Tile = "key" | "glow" | "mesh" | "dots" | "grid";
const TILES: readonly Tile[] = ["key", "glow", "mesh", "dots", "grid"];

const FILLS: Record<Tile, Paint> = {
  key: {
    gradient: {
      angle: 140,
      stops: [
        { color: "color-brand-300", at: 0 },
        { color: "color-brand-600", at: 0.48 },
        { color: "color-brand-900", at: 1 },
      ],
    },
  },
  glow: {
    gradient: {
      angle: 180,
      stops: [
        { color: "color-neutral-950", at: 0 },
        { color: "color-neutral-950", at: 0.55 },
        { color: "color-brand-700", at: 0.88 },
        { color: "color-brand-500", at: 1 },
      ],
    },
  },
  mesh: {
    gradient: {
      angle: 160,
      stops: [
        { color: "color-brand-200", at: 0 },
        { color: "color-neutral-50", at: 0.5 },
        { color: "color-brand-100", at: 1 },
      ],
    },
  },
  dots: { color: "color-brand-50" },
  grid: { color: "color-neutral-50" },
};

const layer = (name: string): TrackArea => ({ name, colStart: 1, colEnd: 2, rowStart: 1, rowEnd: 2 });

/** Layers stacked in one cell (a single-track grid): the texture under the caption. */
function layered(name: string, height: number, fill: Paint, layers: FrameNode[], extra: Partial<FrameNode> = {}): FrameNode {
  return frame({
    name,
    tag: "li",
    width: "fill",
    height,
    radius: "card",
    clip: true,
    fill,
    layout: { kind: "tracks", columns: [1], rows: [height], areas: null },
    children: layers.map((child, i) => ({ ...child, area: layer(`${name}-${i}`) })),
    ...extra,
  });
}

/** `radial-gradient(brand-500 1.5px) / 16px`: rows of 3 px dots every 16 px. */
function dotField(width: number, height: number): FrameNode {
  const cols = Math.ceil(width / 16);
  const rows = Math.ceil(height / 16);
  return column(
    { name: "Dots", width: "fill", height: "fill", gap: { px: 13 }, padding: { px: 6 }, clip: true },
    Array.from({ length: rows }, (_, r) =>
      row({ name: `Dots ${r + 1}`, gap: { px: 13 } }, Array.from({ length: cols }, (_, c) => dot(`Dot ${c + 1}`, 3, "color-brand-500"))),
    ),
  );
}

/** `linear-gradient(brand-200 1px) / 24px` both ways: 1 px lines every 24 px. */
function gridLines(width: number, height: number): FrameNode[] {
  const line = (name: string, w: number | "fill", h: number | "fill") => shape({ name, role: "decor", width: w, height: h, fill: { color: "color-brand-200" } });
  return [
    row({ name: "Columns", width: "fill", height: "fill", gap: { px: 23 }, padding: { left: { px: 23 } }, clip: true },
      Array.from({ length: Math.ceil(width / 24) }, (_, i) => line(`Column ${i + 1}`, 1, "fill"))),
    column({ name: "Rows", width: "fill", height: "fill", gap: { px: 23 }, padding: { top: { px: 23 } }, clip: true },
      Array.from({ length: Math.ceil(height / 24) }, (_, i) => line(`Row ${i + 1}`, "fill", 1))),
  ];
}

function mosaic(build: BuildContext, copy: Copy, brandName: string, compact: boolean): FrameNode {
  const width = boardWidth(build);
  const gap = spacePx(build, 3);
  const cols = compact ? 5 : 4;
  const rowH = compact ? 128 : 168;
  const colW = (width - gap * (cols - 1)) / cols;
  const areas: Record<Tile, TrackArea> = compact
    ? Object.fromEntries(TILES.map((tile, i) => [tile, { name: tile, colStart: i + 1, colEnd: i + 2, rowStart: 1, rowEnd: 2 }])) as Record<Tile, TrackArea>
    : {
        key: { name: "key", colStart: 1, colEnd: 3, rowStart: 1, rowEnd: 3 },
        glow: { name: "glow", colStart: 3, colEnd: 4, rowStart: 1, rowEnd: 2 },
        mesh: { name: "mesh", colStart: 4, colEnd: 5, rowStart: 1, rowEnd: 2 },
        dots: { name: "dots", colStart: 3, colEnd: 4, rowStart: 2, rowEnd: 3 },
        grid: { name: "grid", colStart: 4, colEnd: 5, rowStart: 2, rowEnd: 3 },
      };
  const tiles = TILES.map((tile) => {
    const area = areas[tile];
    const w = colW * (area.colEnd - area.colStart) + gap * (area.colEnd - area.colStart - 1);
    const h = rowH * (area.rowEnd - area.rowStart) + gap * (area.rowEnd - area.rowStart - 1);
    const caption = column({ name: "Caption layer", width: "fill", height: "fill", justify: "end", align: "start", padding: 3 }, [
      column({ name: "Caption", width: "hug", gap: { px: 1 }, padding: { x: 2, y: 1 }, radius: "sm", fill: { color: "card" } }, [
        text(copy.tiles[tile].name, "caption-strong", { color: "card-foreground", tag: "span" }),
        mono(copy.tiles[tile].recipe),
      ]),
    ]);
    const layers: FrameNode[] = [];
    if (tile === "dots") layers.push(dotField(w, h));
    if (tile === "grid") layers.push(...gridLines(w, h));
    if (tile === "key") {
      layers.push(
        compact
          ? column({ name: "Mark", width: "fill", height: "fill", padding: 3 }, [brandMark(build, { name: brandName, surface: "brand", layout: "symbol", em: 14 })])
          : column({ name: "Mark", width: "fill", height: "fill", align: "center", justify: "center" }, [
              brandMark(build, { name: brandName, surface: "brand", layout: "symbol", em: 56 }),
            ]),
      );
    }
    layers.push(caption);
    return {
      ...layered(tile, Math.round(h), FILLS[tile], layers, tile === "glow" ? { stroke: { color: "color-neutral-50", opacity: 0.1, width: 1 } } : {}),
      area,
    };
  });
  return frame({
    name: "Mosaic",
    tag: "ul",
    width: "fill",
    layout: { kind: "tracks", columns: Array.from({ length: cols }, () => 1), rows: Array.from({ length: compact ? 1 : 2 }, () => rowH), gap: 3, areas: null },
    children: tiles,
  });
}

function applications(copy: Copy): FrameNode {
  const item = (label: string, alt: string) =>
    column({ name: label, tag: "li", gap: 2 }, [
      column(
        {
          name: "Stage",
          width: "fill",
          align: "center",
          padding: { px: 40 },
          radius: "card",
          clip: true,
          fill: { gradient: { angle: 180, stops: [{ color: "muted", at: 0 }, { color: "muted", at: 0.55 }, { color: "accent", at: 1 }] } },
        },
        [
          column({ name: "Window", width: "fill", maxWidth: 400, radius: "lg", clip: true, fill: { color: "background" }, stroke: { color: "border" }, shadow: "lg" }, [
            row({ name: "Chrome", width: "fill", gap: { px: 5 }, padding: { x: { px: 10 }, y: { px: 8 } }, fill: { color: "card" }, stroke: { color: "border", sides: ["bottom"] } }, [
              dot("Dot", 7, "border-strong"),
              dot("Dot", 7, "border-strong"),
              dot("Dot", 7, "border-strong"),
            ]),
            image(alt, { aspect: 1.6, radius: "none", label: alt }),
          ]),
        ],
      ),
      text(label, "small", { tag: "p" }),
    ]);
  return grid({ name: "Applications", tag: "ul", columns: 2, gap: 4 }, [item(copy.landing, `${copy.landing} · miniatura`), item(copy.app, `${copy.app} · miniatura`)]);
}

/** The illustration of the first two rules of each column (Guidelines variant). */
function visual(build: BuildContext, tone: "do" | "dont", index: number, brandName: string, logoUrl: string | undefined): FrameNode | null {
  if (index > 1) return null;
  const kind = tone === "do" ? (index === 0 ? "action" : "space") : index === 0 ? "contrast" : "distort";
  const content: DesignNode[] =
    kind === "action"
      ? [
          frame({ name: "Fake primary", width: 96, height: 36, radius: "button", fill: { color: "primary" }, shadow: "button", children: [] }),
          frame({ name: "Fake ghost", width: 72, height: 36, radius: "button", stroke: { color: "border-strong", width: 1 }, children: [] }),
        ]
      : kind === "contrast"
        ? [sizedText(build, "Aa", 48, { color: "color-brand-300", tag: "span" })!]
        : kind === "space"
          ? [column({ name: "Logo", width: "hug", padding: { px: 16 }, stroke: { color: "border-strong", width: 1, dashed: true } }, [brandMark(build, { name: brandName, logoUrl, em: 18 })])]
          : [column({ name: "Logo (distorted)", width: "hug", opacity: 0.7 }, [brandMark(build, { name: brandName, logoUrl, em: 18, surface: "dark" })])];
  return row(
    { name: `Visual ${kind}`, width: "fill", aspect: 16 / 7, align: "center", justify: "center", gap: 3, radius: "md", clip: true, fill: { color: kind === "contrast" ? "color-brand-200" : "muted" } },
    content,
  );
}

function doDont(build: BuildContext, copy: Copy, dos: string[], donts: string[], brandName: string, logoUrl: string | undefined, withVisuals: boolean): FrameNode {
  const columns = [
    { tone: "do" as const, title: copy.do, items: dos, color: "success", head: "check-circle", mark: "check" },
    { tone: "dont" as const, title: copy.dont, items: donts, color: "destructive", head: "alert-circle", mark: "x" },
  ];
  return grid(
    { name: "Do and don't", columns: 2, gap: 4 },
    columns.map((col) =>
      column(
        { name: col.title, width: "fill", radius: "card", clip: true, fill: { color: "card" }, stroke: { color: "border", card: true }, shadow: "card" },
        [
          shape({ name: "Tone rule", role: "decor", width: "fill", height: 3, fill: { color: col.color } }),
          column({ name: "Content", width: "fill", gap: 3, padding: 5 }, [
            row({ name: "Title", tag: "div", gap: 2, align: "center" }, [icon(col.head, col.color, 16), text(col.title, "small-strong", { color: col.color, tag: "h3" })]),
            column(
              { name: "Rules", tag: "ul", width: "fill", gap: withVisuals ? 5 : 3 },
              col.items.map((item, index) =>
                column({ name: "Rule", tag: "li", width: "fill", gap: 3 }, [
                  withVisuals ? visual(build, col.tone, index, brandName, logoUrl) : null,
                  row({ name: "Text", width: "fill", gap: 2, align: "start" }, [
                    icon(col.mark, col.color, 16),
                    text(item, "small", { color: "card-foreground", width: "fill" }),
                  ]),
                ]),
              ),
            ),
          ]),
        ],
      ),
    ),
  );
}

export const artDirectionBuilder: SectionBuilder = ({ id, props, variant, ctx, build }) => {
  const copy = ART_COPY[ctx.locale];
  const guidelines = variant === "guidelines";
  const { name, logoUrl } = ctx.brand;
  const rulesOr = (value: unknown, fallback: readonly string[]) => {
    const filled = strings(value);
    return filled.length > 0 ? filled : [...fallback];
  };
  const rules = doDont(build, copy, rulesOr(props.dos, copy.dos), rulesOr(props.donts, copy.donts), name, logoUrl, guidelines);
  const mosaicPanel = boardPanel("Mosaic", [mosaic(build, copy, name, guidelines)], { label: copy.mosaic, tone: "plain" });
  const apps = bool(props.showApplications) ? boardPanel("Applications", [applications(copy)], { label: copy.applications, tone: "plain" }) : null;
  return boardSection({
    ctx,
    type: "brand.artDirection",
    elementId: id,
    name: "Art direction",
    title: textOr(props.title, copy.title),
    intro: textOr(props.intro, copy.intro),
    children: guidelines ? [rules, mosaicPanel, apps] : [mosaicPanel, apps, rules],
  });
};
