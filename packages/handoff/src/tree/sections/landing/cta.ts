// landing.cta: a rounded panel with title, subtitle and the main button (or an email field), plus a note.
// `banner` centers everything; `split` puts the copy beside the actions. `bold` makes the panel primary.
import type { SectionBuilder } from "../../context";
import { button, column, row, text } from "../../nodes";
import type { ColorVar, FrameNode, Paint, Stroke } from "../../types";
import { centered, landingSection, landingStrings, recolor, styleOf } from "./shared";

export const ctaBuilder: SectionBuilder = ({ id, props, variant, ctx }) => {
  const style = styleOf(props, { emphasis: "bold" });
  const split = variant === "split";
  const bold = style.emphasis === "bold";
  const center = !split && style.align === "center";
  const textAlign = center ? "center" : "start";
  const fg: ColorVar = bold ? "primary-foreground" : "card-foreground";
  const muted: ColorVar = bold ? "primary-foreground" : "muted-foreground";
  const mutedOpacity = bold ? 0.82 : undefined;
  const linkTo = ctx.linkTarget?.(id) ?? undefined;

  const panelFill: Paint = bold
    ? { gradient: { angle: 225, stops: [{ color: "primary-hover", at: 0 }, { color: "primary", at: 0.45 }, { color: "primary", at: 1 }] } }
    : style.emphasis === "subtle"
      ? { color: "card" }
      : { gradient: { angle: 225, stops: [{ color: "brand", opacity: 0.16, at: 0 }, { color: "brand", opacity: 0.06, at: 0.55 }, { color: "brand", opacity: 0.06, at: 1 }] } };
  const panelStroke: Stroke | undefined = bold ? undefined : style.emphasis === "subtle" ? { color: "border" } : { color: "brand", opacity: 0.22 };

  const onPanel = (node: FrameNode | null, kind: "cta" | "outline"): FrameNode | null => {
    if (!node || !bold) return node;
    return kind === "cta"
      ? recolor(node, { fill: { color: "primary-foreground" }, text: "primary" })
      : recolor(node, { text: "primary-foreground", stroke: { color: "primary-foreground", opacity: 0.48 } });
  };

  const copy = column({ name: "Copy", width: "fill", gap: 3, align: center ? "center" : "start", maxWidth: 640 }, [
    text(props.title, "h2", { name: "Title", color: fg, align: textAlign, tag: "h2" }),
    text(props.subtitle, "lead", { name: "Subtitle", color: muted, opacity: mutedOpacity, align: textAlign, tag: "p" }),
  ]);

  const strings = landingStrings(ctx.locale);
  const form = row({ name: "Form", tag: "form", width: 448, gap: 2, align: "center" }, [
    row(
      { name: "Input", width: "fill", minHeight: 40, align: "center", padding: { x: 3 }, fill: { color: "background" }, stroke: { color: "input" }, radius: "input" },
      [text(strings.emailPlaceholder, "small", { color: "muted-foreground", width: "fill" })],
    ),
    onPanel(button(props.button, { variant: "cta", linkTo }), "cta"),
  ]);
  const buttons = row({ name: "Buttons", width: "hug", gap: 2, wrap: true, justify: center ? "center" : "start" }, [
    onPanel(button(props.button, { variant: "cta", size: "lg", linkTo }), "cta"),
    onPanel(button(props.secondaryButton, { variant: "outline", size: "lg" }), "outline"),
  ]);
  // In `split` the copy takes the room the actions leave (`1.25fr 1fr`: the form is about the 1fr column).
  const actions = column({ name: "Actions", width: "hug", gap: 3, align: split ? "end" : center ? "center" : "start" }, [
    props.showForm === true ? form : buttons,
    text(props.note, "small", { name: "Note", color: muted, opacity: mutedOpacity, align: split ? "end" : textAlign, tag: "p" }),
  ]);

  const panelBase = {
    name: "Panel",
    width: "fill" as const,
    radius: "xl" as const,
    clip: true,
    fill: panelFill,
    ...(panelStroke && { stroke: panelStroke }),
    ...(bold && { shadow: "lg" as const }),
  };
  const panel = split
    ? row({ ...panelBase, align: "center", gap: 8, padding: 8 }, [copy, actions])
    : column({ ...panelBase, align: center ? "center" : "start", gap: 6, padding: { y: 9, x: 7 } }, [centered(copy, center ? "center" : "start", 640, "CopyMeasure"), actions]);

  return landingSection({ name: "Cta", style }, [panel]);
};
