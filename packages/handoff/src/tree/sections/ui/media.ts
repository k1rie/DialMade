// ui.media (`Media`): CSS-only artwork from the brand colors at the block's ratio: soft shapes over a gradient,
// a browser window or a phone. Percent insets of the CSS become px from the block's desktop width.
import { MEDIA_RATIOS } from "@dialmade/layout";
import type { SectionBuilder } from "../../context";
import { column, frame, row, shape, str, text } from "../../nodes";
import type { FrameNode, Paint } from "../../types";
import { blockGeometry, innerWidth, uiBlock, uiFrameOf } from "./shared";

const ratioValue = (id: string): number => MEDIA_RATIOS.find(([candidate]) => candidate === id)?.[1] ?? 16 / 9;

/** The art's background: brand and CTA glows over the page (radial gradients become one diagonal ramp). */
const ART_FILL: Paint = {
  gradient: {
    angle: 135,
    stops: [
      { color: "brand", opacity: 0.42, at: 0 },
      { color: "brand", opacity: 0.16, at: 0.4 },
      { color: "cta", opacity: 0.14, at: 0.62 },
      { color: "cta", opacity: 0.36, at: 1 },
    ],
  },
};

const px = (value: number) => ({ px: Math.max(0, Math.round(value)) });

/** A rounded bar of the window or phone screen (`dl-ui-media__line`). */
const line = (name: string, width: number, opacity: number) =>
  shape({ name, width: Math.max(8, Math.round(width)), height: 10, radius: "full", fill: { color: "foreground", opacity } });

/** The screen inside the window or phone: two lines and tiles over a brand glow. */
function screen(width: number, height: number, device: boolean): FrameNode {
  const inner = width * (device ? 0.8 : 0.84);
  const tile = (i: number, fill: boolean) =>
    shape({
      name: "Tile",
      width: "fill",
      height: fill ? "fill" : Math.max(16, Math.round(height * 0.22)),
      radius: "md",
      fill: i === 1 ? { color: "cta", opacity: 0.22 } : { color: "brand", opacity: 0.16 },
    });
  return column(
    {
      name: "Screen",
      width: "fill",
      height: "fill",
      gap: px(10),
      padding: { top: px(height * (device ? 0.18 : 0.08)), x: px(width * (device ? 0.1 : 0.08)) },
      fill: { gradient: { angle: 180, stops: [{ color: "brand", opacity: 0.12, at: 0 }, { color: "card", at: 0.6 }] } },
    },
    device
      ? [line("Line", inner * 0.55, 0.22), line("Line", inner * 0.38, 0.12), tile(0, false), tile(1, false)]
      : [
          line("Line", inner * 0.55, 0.22),
          line("Line", inner * 0.38, 0.12),
          row({ name: "Tiles", width: "fill", height: "fill", gap: px(10), padding: { top: px(6) }, align: "stretch" }, [tile(0, true), tile(1, true), tile(2, true)]),
        ],
  );
}

function browser(width: number, height: number): FrameNode[] {
  const windowW = width * 0.86;
  return [
    column(
      {
        name: "Window",
        width: "fill",
        height: "fill",
        radius: "lg",
        clip: true,
        fill: { color: "card" },
        stroke: { color: "border", sides: ["top", "left", "right"] },
        shadow: "lg",
      },
      [
        row(
          {
            name: "Toolbar",
            width: "fill",
            height: 32,
            align: "center",
            gap: px(6),
            padding: { x: px(12) },
            fill: { color: "muted" },
            stroke: { color: "border", sides: ["bottom"] },
          },
          [
            shape({ name: "Dot", shape: "ellipse", width: 8, height: 8, fill: { color: "border-strong" } }),
            shape({ name: "Dot", shape: "ellipse", width: 8, height: 8, fill: { color: "border-strong" } }),
            shape({ name: "Dot", shape: "ellipse", width: 8, height: 8, fill: { color: "border-strong" } }),
            row({ name: "Address", width: "fill", justify: "center" }, [
              shape({ name: "Address bar", width: Math.round(windowW * 0.4), height: 10, radius: "full", fill: { color: "card" } }),
            ]),
          ],
        ),
        screen(windowW, height * 0.91 - 32, false),
      ],
    ),
  ];
}

function device(height: number): FrameNode[] {
  const phoneH = height * 0.84;
  const phoneW = Math.round(phoneH * (9 / 19));
  return [
    column(
      {
        name: "Phone",
        width: phoneW,
        height: "fill",
        align: "center",
        radius: "xl",
        clip: true,
        fill: { color: "card" },
        stroke: { color: "foreground", opacity: 0.88, width: 6 },
        shadow: "lg",
      },
      [
        { ...shape({ name: "Notch", width: Math.round(phoneW * 0.36), height: 10, radius: "full", fill: { color: "foreground", opacity: 0.88 } }), offsetTop: px(6) },
        screen(phoneW, phoneH, true),
      ],
    ),
  ];
}

/** Gradient: three soft shapes placed like the CSS (absolute boxes). */
function shapes(height: number): FrameNode[] {
  const at = (left: number, top: number, width: number) => ({ left, top: Math.round(top), width });
  return [
    frame({
      name: "Shape",
      absolute: at(0.14, height * 0.18, 0.34),
      aspect: 1,
      radius: "full",
      fill: { color: "background", opacity: 0.22 },
      stroke: { color: "background", opacity: 0.45 },
      shadow: "md",
    }),
    frame({
      name: "Shape",
      absolute: at(0.48, height * 0.38, 0.4),
      height: Math.round(height * 0.34),
      radius: "xl",
      fill: { color: "card", opacity: 0.7 },
      stroke: { color: "background", opacity: 0.45 },
      shadow: "md",
    }),
    frame({
      name: "Shape",
      absolute: at(0.3, height * 0.76, 0.22),
      height: Math.round(height * 0.12),
      radius: "full",
      fill: { color: "cta", opacity: 0.7 },
      stroke: { color: "background", opacity: 0.45 },
      shadow: "md",
    }),
  ];
}

export const mediaBuilder: SectionBuilder = ({ id, props, variant, ctx, build }) => {
  const frameKind = uiFrameOf(props.frame);
  const ratio = ratioValue(str(props.ratio));
  const width = innerWidth(blockGeometry(ctx, id), frameKind, build) ?? 640;
  const height = width / ratio;
  const alt = str(props.alt).trim();
  const art = column(
    {
      name: "Artwork",
      width: "fill",
      aspect: ratio,
      radius: "xl",
      clip: true,
      fill: ART_FILL,
      ...(alt && { label: alt }),
      ...(variant === "browser" && { padding: { top: px(height * 0.09), x: px(width * 0.07) } }),
      ...(variant === "device" && { align: "center" as const, padding: { y: px(height * 0.08) } }),
    },
    variant === "browser" ? browser(width, height) : variant === "device" ? device(height) : shapes(height),
  );
  return uiBlock("Media", frameKind, [
    column({ name: "Figure", tag: "figure", width: "fill", gap: 2 }, [art, text(props.caption, "small", { color: "muted-foreground", tag: "p" })]),
  ], { tag: "div" });
};
