// 01 · Identity (`brand/Identity`): the logo on three surfaces, its clear space, minimum size and versions.
import type { BuildContext, SectionBuilder } from "../../context";
import { bool, column, grid, row, text } from "../../nodes";
import type { DesignNode, FrameNode, Paint, Space, Stroke } from "../../types";
import { IDENTITY_COPY } from "./copy";
import { boardPanel, boardSection, brandMark, mono, textOr, type MarkLayout, type MarkSurface } from "./shared";

const SURFACES: readonly { id: "light" | "dark" | "brand"; token: string; fill: Paint; stroke?: Stroke }[] = [
  { id: "light", token: "neutral-50", fill: { color: "color-neutral-50" }, stroke: { color: "color-neutral-950", opacity: 0.1, width: 1 } },
  { id: "dark", token: "neutral-950", fill: { color: "color-neutral-950" }, stroke: { color: "color-neutral-50", opacity: 0.12, width: 1 } },
  {
    id: "brand",
    token: "primary",
    fill: { gradient: { angle: 135, stops: [{ color: "primary", at: 0 }, { color: "primary", at: 0.6 }, { color: "color-brand-600", at: 1 }] } },
  },
];
const SIZES = [48, 32, 24] as const;

/** `gap: 16px 24px` on a wrapping row: lines 16 px apart (`row()` takes one gap). */
const withCrossGap = (crossGap: Space, node: FrameNode): FrameNode =>
  node.layout?.kind === "flex" ? { ...node, layout: { ...node.layout, crossGap } } : node;
const VERSIONS: readonly MarkLayout[] = ["lockup", "stacked", "symbol", "wordmark"];

/** The clear space diagram: the mark inside its bounds, the hatched safe zone and an «x» on each side. */
function clearSpace(build: BuildContext, name: string, logoUrl: string | undefined): FrameNode {
  const em = 24;
  const x = Math.round(em * (logoUrl ? 0.6 : 0.9) * 10) / 10;
  const mark = (label: string) => text("x", "mono-caption", { color: "primary-text", align: "center", name: label, tag: "span" });
  const edge = (label: string) => row({ name: label, width: "fill", height: x, align: "center", justify: "center" }, [mark(label)]);
  const side = (label: string) => column({ name: label, width: x, align: "center", justify: "center" }, [mark(label)]);
  return column(
    { name: "Clear space", width: "fill", minHeight: 168, align: "center", justify: "center", padding: { x: 3, y: 5 }, radius: "md", fill: { color: "muted" } },
    [
      column({ name: "Safe zone", width: "hug", align: "center", fill: { color: "primary", opacity: 0.1 }, stroke: { color: "border-strong", width: 1, dashed: true } }, [
        edge("x top"),
        row({ name: "Middle", width: "hug", align: "center" }, [
          side("x left"),
          row({ name: "Bounds", width: "hug", fill: { color: "muted" }, stroke: { color: "primary", opacity: 0.6, width: 1 } }, [
            brandMark(build, { name, logoUrl, em }),
          ]),
          side("x right"),
        ]),
        edge("x bottom"),
      ]),
    ],
  );
}

export const identityBuilder: SectionBuilder = ({ id, props, variant, ctx, build }) => {
  const copy = IDENTITY_COPY[ctx.locale];
  const { name, logoUrl } = ctx.brand;
  const kind = logoUrl ? "image" : "monogram";
  const spotlight = variant === "spotlight";

  const surface = (entry: (typeof SURFACES)[number], aspect: number | null, em: number) =>
    column({ name: `Surface ${entry.id}`, tag: "li", width: "fill", gap: 2, ...(aspect === null && { height: "fill" as const }) }, [
      column(
        {
          name: "Stage",
          width: "fill",
          ...(aspect !== null ? { aspect } : { height: "fill" as const, minHeight: 240 }),
          align: "center",
          justify: "center",
          padding: 5,
          radius: "card",
          clip: true,
          fill: entry.fill,
          ...(entry.stroke && { stroke: entry.stroke }),
        },
        [brandMark(build, { name, logoUrl, surface: entry.id as MarkSurface, em })],
      ),
      row({ name: "Caption", width: "fill", justify: "between", align: "baseline", gap: 3 }, [
        text(copy.surfaces[entry.id], "small", { tag: "span" }),
        mono(entry.token),
      ]),
    ]);

  const surfaces: DesignNode = spotlight
    ? row({ name: "Surfaces", tag: "ul", width: "fill", gap: 4, align: "stretch" }, [
        { ...surface(SURFACES[2]!, null, 52), width: "fill" },
        column({ name: "Others", width: "fill", gap: 4 }, [surface(SURFACES[0]!, 16 / 9, 30), surface(SURFACES[1]!, 16 / 9, 30)]),
      ])
    : grid({ name: "Surfaces", tag: "ul", columns: 3, gap: 4 }, SURFACES.map((entry) => surface(entry, 4 / 3, 30)));

  const showClearSpace = bool(props.showClearSpace);
  const showSizes = bool(props.showSizes);
  const panels = [
    showClearSpace
      ? boardPanel("Clear space", [clearSpace(build, name, logoUrl), text(copy.clearSpaceBody[kind], "small", { color: "muted-foreground", tag: "p" })], {
          label: copy.clearSpace,
        })
      : null,
    showSizes
      ? boardPanel(
          "Minimum size",
          [
            withCrossGap(4, row(
              { name: "Sizes", tag: "ul", width: "fill", wrap: true, align: "end", gap: 5, minHeight: 168, padding: { x: 4, y: 5 }, radius: "md", fill: { color: "muted" } },
              SIZES.map((size, index) =>
                column({ name: `${size} px`, tag: "li", width: "hug", gap: 2 }, [
                  brandMark(build, { name, logoUrl, em: size / (logoUrl ? 2.4 : 1.8) }),
                  mono(`${size} px${index === SIZES.length - 1 ? ` · ${copy.minLabel}` : ""}`),
                ]),
              ),
            )),
            text(copy.minSizeBody, "small", { color: "muted-foreground", tag: "p" }),
          ],
          { label: copy.minSize, meta: "24 px" },
        )
      : null,
    showSizes && !logoUrl
      ? boardPanel(
          "Versions",
          [
            grid(
              { name: "Versions", tag: "ul", columns: 2, gap: 3 },
              VERSIONS.map((layout) =>
                column({ name: copy.versionNames[layout], tag: "li", gap: 2 }, [
                  column({ name: "Stage", width: "fill", minHeight: 76, align: "center", justify: "center", padding: 3, radius: "md", fill: { color: "muted" } }, [
                    brandMark(build, { name, layout, em: 14 }),
                  ]),
                  mono(copy.versionNames[layout]),
                ]),
              ),
            ),
          ],
          { label: copy.versions },
        )
      : null,
  ].filter((panel): panel is FrameNode => !!panel);

  return boardSection({
    ctx,
    type: "brand.identity",
    elementId: id,
    name: "Identity",
    title: textOr(props.title, copy.title),
    intro: textOr(props.intro, copy.intro),
    children: [surfaces, panels.length > 0 ? grid({ name: "Rules", columns: panels.length, gap: 4 }, panels) : null],
  });
};
