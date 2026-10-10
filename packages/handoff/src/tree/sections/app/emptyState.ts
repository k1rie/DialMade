// app.emptyState: a list before it has data: icon (or the illustrated sheets and badge), title, one sentence
// and the actions. The primary action opens the block's screen when it links to one.
import type { SectionBuilder } from "../../context";
import { button, column, icon, row, shape, str, text } from "../../nodes";
import type { FrameNode } from "../../types";
import { overlay } from "./shared";

/** `.dl-app-empty__art`: two tilted sheets behind a front sheet with lines, and the icon badge. */
function art(glyph: string): FrameNode {
  const sheet = (name: string, muted: boolean, lines: boolean) =>
    column(
      { name, width: 104, height: 80, justify: "center", gap: { px: 6 }, padding: { x: 3 }, radius: "md", fill: { color: muted ? "muted" : "card" }, stroke: { color: "border" }, shadow: "sm" },
      lines
        ? [
            row({ name: "Line 1", width: "fill" }, [shape({ name: "Line", width: 44, height: 6, radius: "full", fill: { color: "primary", opacity: 0.3 } })]),
            shape({ name: "Line 2", width: "fill", height: 6, radius: "full", fill: { color: "muted" } }),
            row({ name: "Line 3", width: "fill" }, [shape({ name: "Line", width: 60, height: 6, radius: "full", fill: { color: "muted" } })]),
          ]
        : [],
    );
  return overlay(
    "Illustration",
    104,
    [
      row({ name: "Back sheets", width: 152, height: 104, justify: "between", padding: { top: 3 } }, [sheet("Sheet left", true, false), sheet("Sheet right", true, false)]),
      row({ name: "Front", width: 152, height: 104, padding: { left: 6 } }, [sheet("Sheet", false, true)]),
      row({ name: "Badge layer", width: 152, height: 104, align: "end", justify: "end", padding: { right: 3 } }, [
        row({ name: "Badge", width: 36, height: 36, align: "center", justify: "center", radius: "full", fill: { color: "primary" }, stroke: { color: "card", width: 3 } }, [
          icon(glyph, "primary-foreground", 16),
        ]),
      ]),
    ],
    { width: 152, label: "" },
  );
}

export const emptyStateBuilder: SectionBuilder = ({ id, props, variant, ctx }) => {
  const illustrated = variant === "illustrated";
  const glyph = str(props.icon) || "folder";
  const link = ctx.linkTarget?.(id) ?? undefined;
  return column(
    {
      name: "Empty state",
      tag: "section",
      width: "fill",
      align: "center",
      justify: "center",
      gap: 4,
      padding: { y: 7, x: 5 },
      radius: "card",
      ...(illustrated
        ? { fill: { color: "card" }, stroke: { color: "border", card: true }, shadow: "card" as const }
        : { fill: { color: "muted", opacity: 0.35 }, stroke: { color: "border-strong", dashed: true } }),
    },
    [
      illustrated
        ? { ...art(glyph), offsetTop: 0 }
        : row({ name: "Icon", width: 48, height: 48, align: "center", justify: "center", radius: "lg", fill: { color: "primary", opacity: 0.12 } }, [icon(glyph, "primary-text", 22)]),
      illustrated ? shape({ name: "Art gap", width: 1, height: 4, role: "decor" }) : null,
      // 28rem of copy, centered (a `fill` box with a max width inside a centered row).
      row({ name: "Text row", width: "fill", justify: "center" }, [
        column({ name: "Text", width: "fill", maxWidth: 448, align: "center", gap: 1 }, [
          text(props.title, "body-strong", { align: "center", tag: "h2" }),
          text(props.description, "small", { color: "muted-foreground", align: "center", tag: "p" }),
        ]),
      ]),
      row({ name: "Actions", align: "center", justify: "center", gap: 2, wrap: true, offsetTop: 1 }, [
        button(props.primaryAction, { variant: "primary", leadingIcon: "plus", ...(link && { linkTo: link }) }),
        button(props.secondaryAction, { variant: "outline" }),
      ]),
    ],
  );
};
