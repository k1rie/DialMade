// app.confirmDialog: a confirmation drawn open and static: the bare panel (icon, question, description, the
// subject box, child elements of a «Modal» block, Cancel and Confirm) or the same panel over a dimmed page.
// The confirm button opens the block's screen when it links to one.
import type { SectionBuilder } from "../../context";
import { button, column, icon, row, shape, str, text } from "../../nodes";
import type { DesignNode, FrameNode } from "../../types";
import { iconButton, overlay } from "./shared";

/** `DialogPanel` (size sm): icon, title and description, an optional body and the footer buttons. */
export function dialogPanel(options: {
  title: unknown;
  description: unknown;
  glyph: string;
  destructive: boolean;
  body?: (DesignNode | null)[];
  footer: (DesignNode | null)[];
  close?: boolean;
}): FrameNode {
  const tone = options.destructive ? "destructive" : "primary";
  const body = (options.body ?? []).filter((node): node is DesignNode => !!node);
  return column(
    { name: "Dialog panel", tag: "dialog", width: "fill", maxWidth: 352, gap: 4, padding: 6, radius: "xl", fill: { color: "popover" }, stroke: { color: "border" }, shadow: "lg" },
    [
      row({ name: "Header", width: "fill", align: "start", gap: 3 }, [
        row({ name: "Icon", width: 40, height: 40, align: "center", justify: "center", radius: "full", fill: { color: tone, opacity: 0.12 } }, [
          icon(options.glyph, options.destructive ? "destructive" : "primary-text", 20),
        ]),
        column({ name: "Heading", width: "fill", gap: 1 }, [
          text(options.title, "h3", { color: "popover-foreground", tag: "h2" }),
          text(options.description, "small", { color: "muted-foreground", tag: "p" }),
        ]),
        options.close ? iconButton("Close", "x", "foreground") : null,
      ]),
      body.length > 0 ? column({ name: "Body", width: "fill", gap: 1 }, body) : null,
      row({ name: "Footer", width: "fill", justify: "end", gap: 2, padding: { top: 2 }, wrap: true }, options.footer),
    ],
  );
}

/** `DialogPreview`: a sketch of the page, the backdrop and the panel centered on top, `height` px tall. */
export function dialogPreview(panel: FrameNode, height: number): FrameNode {
  const line = (name: string, width: number | "fill", h: number) => row({ name, width: "fill" }, [shape({ name: "Line", width, height: h, radius: "full", fill: { color: "muted" } })]);
  const page = column({ name: "Page sketch", width: "fill", height, gap: 3, padding: 5 }, [
    line("Line 1", 180, 20),
    line("Line 2", "fill", 12),
    line("Line 3", "fill", 12),
    shape({ name: "Block", width: "fill", height: "fill", radius: "lg", fill: { color: "muted" } }),
  ]);
  return {
    ...overlay("Dialog preview", height, [
      page,
      column({ name: "Backdrop", width: "fill", height, fill: { color: "color-neutral-950", opacity: 0.45 } }, []),
      row({ name: "Surface", width: "fill", height, align: "center", justify: "center", padding: { x: 4 } }, [panel]),
    ]),
    radius: "lg",
    stroke: { color: "border" },
    fill: { color: "background" },
    clip: true,
  };
}

export const confirmDialogBuilder: SectionBuilder = ({ id, props, variant, ctx, children }) => {
  const destructive = props.destructive === true;
  const link = ctx.linkTarget?.(id) ?? undefined;
  const subject = str(props.subject);
  const panel = dialogPanel({
    title: props.title,
    description: props.description,
    glyph: destructive ? "alert-triangle" : "info",
    destructive,
    body: [
      subject
        ? row({ name: "Subject", width: "fill", padding: { y: 3, x: 4 }, radius: "md", fill: { color: "muted" }, stroke: { color: "border" } }, [
            text(subject, "small", { color: "foreground", width: "fill", tag: "p" }),
          ])
        : null,
      children.length > 0 ? column({ name: "Content", width: "fill", gap: 3 }, children) : null,
    ],
    footer: [
      button(props.cancelLabel, { variant: "outline" }),
      button(props.confirmLabel, { variant: destructive ? "destructive" : "primary", ...(link && { linkTo: link }) }),
    ],
  });

  if (variant === "panel") return column({ name: "Confirm dialog", width: "fill", align: "center", padding: { y: 5 } }, [panel]);
  return column({ name: "Confirm dialog", width: "fill" }, [dialogPreview(panel, 320)]);
};
