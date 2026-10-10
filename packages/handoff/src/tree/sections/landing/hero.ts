// landing.hero: eyebrow pill, headline, subtitle, CTAs and note; `centered` stacks the copy over a product
// mockup (faded at the bottom), `split` puts the copy beside a collage of cards (two columns at desktop width).
import { navLinks } from "@dialmade/sections";
import type { SectionBuilder } from "../../context";
import { button, column, dot, frame, icon, row, text } from "../../nodes";
import type { FrameNode } from "../../types";
import { heroCollage, productMockup } from "./heroVisuals";
import { balancedWidth, centered, landingSection, SPACING_K, styleOf } from "./shared";

export const heroBuilder: SectionBuilder = ({ id, props, variant, ctx, build }) => {
  const style = styleOf(props, { background: "brand-gradient" });
  const visual = props.visual === "dashboard" || props.visual === "gallery" ? props.visual : null;
  const split = variant === "split" && visual !== null;
  const align = split ? "start" : style.align;
  const textAlign = align === "center" ? "center" : "start";
  const size = style.emphasis === "subtle" ? "md" : "lg";
  const titleStyle = style.emphasis === "subtle" ? "h1" : "display";
  const titlePx = build.light.fontSizes[titleStyle].px * (style.emphasis === "bold" ? 1.22 : 1);
  const bold = style.emphasis === "bold";

  const eyebrowText = text(props.eyebrow, "small", { color: bold ? "accent-foreground" : "foreground", tag: "span", weight: 500 });
  const eyebrow = eyebrowText
    ? row(
        {
          name: "Eyebrow",
          width: "hug",
          align: "center",
          gap: 2,
          padding: { top: { px: 5 }, bottom: { px: 5 }, left: { px: 10 }, right: { px: 14 } },
          radius: "badge",
          ...(bold ? { fill: { color: "accent" } } : { fill: { color: "card", opacity: 0.76 }, stroke: { color: "border" }, shadow: "sm" as const }),
        },
        [
          row({ name: "Dot", width: 16, height: 16, align: "center", justify: "center", radius: "full", fill: { color: "brand", opacity: 0.22 } }, [dot("Dot", 8, "brand")]),
          eyebrowText,
        ],
      )
    : null;

  const title = text(props.title, titleStyle, {
    name: "Title",
    tag: "h1",
    align: textAlign,
    ...(bold && { scale: 1.22, weight: Math.max(build.light.heading.weight, 700) }),
  });
  // `calc(var(--dl-fs-body) * 1.1875)` at desktop width; `lead` is body × 1.0625.
  const subtitle = text(props.subtitle, "lead", { name: "Subtitle", color: "muted-foreground", align: textAlign, tag: "p", scale: 1.1875 / 1.0625 });
  const actions = row({ name: "Actions", width: "fill", gap: 3, wrap: true, justify: align === "center" ? "center" : "start", offsetTop: 2 }, [
    button(props.primaryCta, { variant: "cta", size, icon: "arrow-right", linkTo: ctx.linkTarget?.(id) ?? undefined }),
    button(props.secondaryCta, { variant: "outline", size }),
  ]);
  const noteText = text(props.note, "small", { color: "muted-foreground", tag: "span" });
  const note = noteText ? row({ name: "Note", width: "hug", align: "center", gap: 2 }, [icon("check-circle", "primary-text", 16), noteText]) : null;

  const copy = column({ name: "Copy", width: "fill", gap: 5, align: align === "center" ? "center" : "start" }, [
    eyebrow,
    centered(title, align, balancedWidth(String(props.title ?? ""), titlePx, 22, bold ? 0.72 : 0.65), "Headline"),
    centered(subtitle, align, 640, "Subtitle"),
    actions,
    note,
  ]);

  const navLabels = navLinks(ctx).slice(0, 3).map((link) => link.label);
  let layout: FrameNode;
  if (split && visual) {
    layout = row({ name: "Layout", width: "fill", align: "center", gap: 8 }, [
      copy,
      column({ name: "Visual", width: "fill" }, [heroCollage(ctx, build, visual)]),
    ]);
  } else if (visual) {
    const mockup = productMockup(ctx, build, visual, navLabels);
    // The visual fades out at the bottom (`mask-image` from 64 %): a gradient to the background over its last third.
    const fadeTop = visual === "dashboard" ? Math.round((40 + 544) * 0.64) : 280;
    const fade = frame({
      name: "Fade",
      absolute: { left: 0, top: fadeTop, width: 1 },
      height: visual === "dashboard" ? Math.round((40 + 544) * 0.36) + 2 : 200,
      fill: { gradient: { angle: 180, stops: [{ color: "background", opacity: 0, at: 0 }, { color: "background", opacity: 0.85, at: 0.7 }, { color: "background", at: 1 }] } },
    });
    layout = column({ name: "Layout", width: "fill", gap: 8 }, [
      align === "center" ? (centered(copy, "center", 896, "CopyMeasure") ?? copy) : copy,
      column({ name: "Visual", width: "fill" }, [mockup, fade]),
    ]);
  } else {
    layout = column({ name: "Layout", width: "fill" }, [align === "center" ? (centered(copy, "center", 896, "CopyMeasure") ?? copy) : copy]);
  }

  const k = SPACING_K[style.spacing];
  return landingSection(
    {
      name: "Hero",
      style,
      clip: true,
      ...(variant === "centered" && visual && { bottom: { sectionPy: k * 0.4 } }),
    },
    [layout],
  );
};
