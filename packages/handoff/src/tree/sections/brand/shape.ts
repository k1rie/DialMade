// 04 · Shape (`brand/Shape`): radii, elevation, borders and focus, the spacing scale, control heights and the
// brief's dials. Specimens use the radius, shadow and color tokens; values are text labels.
import type { SectionBuilder } from "../../context";
import { bool, button, column, frame, grid, row, shape, text } from "../../nodes";
import type { FrameNode, Radius, Shadow } from "../../types";
import { SHAPE_COPY } from "./copy";
import { boardPanel, boardSection, formatPx, mono, textOr, tokensOf } from "./shared";

const RADII = ["sm", "md", "lg", "xl", "full"] as const;
const ELEVATIONS = ["none", "sm", "md", "lg"] as const;
const SPACES = [1, 2, 3, 4, 5, 6, 7, 8, 9, 10] as const;
const DIALS = ["density", "variance", "motion"] as const;
const BUTTON_SIZES = [
  ["sm", "hSm"],
  ["md", "hMd"],
  ["lg", "hLg"],
] as const;

const label = (name: string, value?: string) =>
  row({ name: "Label", width: "fill", justify: "between", gap: 2, wrap: true, align: "baseline" }, [text(name, "small", { tag: "span" }), mono(value)]);

export const shapeBuilder: SectionBuilder = ({ id, props, variant, ctx, build }) => {
  const copy = SHAPE_COPY[ctx.locale];
  const { locale } = ctx;
  const tokens = tokensOf(build, ctx.mode);
  const summary = variant === "summary";
  const showSpacing = bool(props.showSpacing);
  const flat = build.inputs.recipe.shadow === "none";
  const px = (value: number) => formatPx(value, locale);

  const radius = boardPanel(
    "Radius",
    [
      grid(
        { name: "Radii", tag: "ul", columns: summary ? 3 : 5, gap: 3, rowGap: 3 },
        RADII.map((name) =>
          column({ name, tag: "li", gap: 2 }, [
            shape({
              name: `Radius ${name}`,
              width: "fill",
              aspect: 1,
              radius: name as Radius,
              fill: { color: "primary", opacity: 0.12 },
              stroke: { color: "primary", width: 2 },
            }),
            label(name, name === "full" ? "∞" : px(tokens.radius[name])),
          ]),
        ),
      ),
    ],
    { label: copy.radius },
  );

  const elevation = boardPanel(
    "Elevation",
    [
      grid(
        { name: "Elevations", tag: "ul", columns: 2, gap: 4, padding: { x: 4, y: 5 }, radius: "md", fill: { color: "muted" } },
        ELEVATIONS.map((name) =>
          column(
            {
              name: `Elevation ${name}`,
              tag: "li",
              minHeight: 72,
              align: "center",
              justify: "center",
              radius: "md",
              fill: { color: "card" },
              stroke: name === "none" ? { color: "border", width: 1 } : { color: "border", opacity: 0.6, width: 1 },
              ...(name !== "none" && { shadow: name as Shadow }),
            },
            [text(name === "none" ? copy.flat : name, "small", { color: "card-foreground", tag: "span", width: "hug" })],
          ),
        ),
      ),
      flat ? text(copy.noShadows, "small", { color: "muted-foreground", tag: "p" }) : null,
    ],
    { label: copy.elevation },
  );

  const borderSample = (name: string, color: string, cssVar: string, ring = false) => {
    const sample = frame({ name: "Sample", width: "fill", height: 40, radius: "input", fill: { color: "background" }, stroke: { color }, children: [] });
    return column({ name, tag: "li", gap: 2 }, [
      ring ? column({ name: "Focus ring", width: "fill", padding: { px: 2 }, radius: "input", stroke: { color: "ring", width: 2 } }, [sample]) : sample,
      label(name, cssVar),
    ]);
  };
  const borders = boardPanel(
    "Borders",
    [
      column({ name: "Borders", tag: "ul", width: "fill", gap: 4 }, [
        borderSample(copy.border, "border", "--border"),
        borderSample(copy.borderStrong, "border-strong", "--border-strong"),
        borderSample(copy.focus, "input", "--ring", true),
      ]),
    ],
    { label: copy.borders, meta: px(tokens.borderWidth) },
  );

  const spacing = boardPanel(
    "Spacing",
    [
      column(
        { name: "Spaces", tag: "ul", width: "fill", gap: 2 },
        SPACES.map((step) =>
          row({ name: `Space ${step}`, tag: "li", width: "fill", gap: 3, align: "center" }, [
            mono(String(step), "muted-foreground", { width: 20 }),
            row({ name: "Track", width: "fill" }, [shape({ name: "Bar", role: "bar", width: tokens.space[step - 1] ?? 0, height: 10, fill: { color: "primary" } })]),
            mono(px(tokens.space[step - 1] ?? 0)),
          ]),
        ),
      ),
    ],
    { label: copy.spacing },
  );

  const controls = boardPanel(
    "Controls",
    [
      column(
        { name: "Dials", width: "fill", gap: 4 },
        DIALS.map((dial) => {
          const value = tokens.dials[dial] ?? 5;
          return column({ name: copy.dials[dial], gap: 2 }, [
            row({ name: "Label", width: "fill", justify: "between", gap: 3 }, [text(copy.dials[dial], "small", { tag: "span" }), mono(`${value}/10`)]),
            grid(
              { name: "Track", columns: 10, gap: { px: 3 } },
              Array.from({ length: 10 }, (_, i) =>
                shape({
                  name: `Segment ${i + 1}`,
                  role: "bar",
                  width: "fill",
                  height: 8,
                  radius: "sm",
                  fill: { color: i < value ? "primary" : "muted" },
                  ...(i >= value && { stroke: { color: "border", width: 1 } }),
                }),
              ),
            ),
          ]);
        }),
      ),
      column({ name: "Control heights", width: "fill", gap: 3, padding: { top: 4 }, stroke: { color: "border", width: 1, sides: ["top"] } }, [
        text(copy.controlHeights, "small", { color: "muted-foreground", tag: "p" }),
        row(
          { name: "Buttons", tag: "ul", gap: 3, wrap: true, align: "end" },
          BUTTON_SIZES.map(([size, key]) =>
            column({ name: size, tag: "li", width: "hug", gap: 1, align: "center" }, [
              button(size.toUpperCase(), { variant: "secondary", size }),
              mono(px(tokens.components.button[key])),
            ]),
          ),
        ),
        grid({ name: "Specs", columns: 2, gap: 3 }, [
          column({ name: copy.tableRow, gap: 0 }, [text(copy.tableRow, "caption", { color: "muted-foreground" }), mono(px(tokens.components.table.rowH), "card-foreground", {}, "mono")]),
          column({ name: copy.cardPadding, gap: 0 }, [
            text(copy.cardPadding, "caption", { color: "muted-foreground" }),
            mono(px(tokens.components.card.padding.px), "card-foreground", {}, "mono"),
          ]),
        ]),
      ]),
    ],
    { label: copy.controls },
  );

  let tiles: FrameNode;
  if (summary) {
    const panels = [radius, elevation, borders, showSpacing ? controls : null].filter((panel): panel is FrameNode => !!panel);
    tiles = grid({ name: "Tiles", columns: panels.length, gap: 4 }, panels);
  } else {
    const place = (node: FrameNode, col: number, span: number, rowIndex: number) => ({ ...node, place: { col, span, row: rowIndex } });
    tiles = frame({
      name: "Tiles",
      width: "fill",
      layout: { kind: "grid", columns: 12, gap: 4, rowGap: 4 },
      children: showSpacing
        ? [place(radius, 0, 7, 0), place(elevation, 7, 5, 0), place(borders, 0, 4, 1), place(spacing, 4, 4, 1), place(controls, 8, 4, 1)]
        : [place(radius, 0, 7, 0), place(elevation, 7, 5, 0), place(borders, 0, 12, 1)],
    });
  }

  return boardSection({
    ctx,
    type: "brand.shape",
    elementId: id,
    name: "Shape",
    title: textOr(props.title, copy.title),
    intro: textOr(props.intro, copy.intro),
    children: [tiles],
  });
};
