// landing.navbar: brand, links and actions in a bar (or a floating pill) at desktop width, where the disclosure
// menu is hidden. Centered alignment is the CSS grid `1fr auto 1fr` (brand, links, actions).
import type { SectionBuilder } from "../../context";
import { button, records, row, str, type ButtonVariant } from "../../nodes";
import type { FrameNode } from "../../types";
import { brandMark, landingSection, linkBox, styleOf, type Emphasis } from "./shared";

const CTA_VARIANT: Record<Emphasis, ButtonVariant> = { subtle: "outline", default: "primary", bold: "cta" };
const NAV_K = { compact: 0.85, normal: 1, roomy: 1.2 } as const;

export const navbarBuilder: SectionBuilder = ({ id, props, variant, ctx, build }) => {
  const style = styleOf(props, { align: "center", spacing: "normal" });
  const floating = variant === "floating";
  const navH = Math.round(build.light.components.nav.h * NAV_K[style.spacing]);
  const visible = records(props.links).slice(0, Math.max(0, typeof props.linkCount === "number" ? props.linkCount : 0));

  const links = row(
    { name: "Links", tag: "ul", align: "center", gap: { px: 2 }, width: "hug" },
    visible.map((link) => {
      const box = linkBox(str(link.label), "small", "muted-foreground", typeof link.linkTo === "string" ? link.linkTo : undefined, {
        padding: { x: 3 },
        minHeight: 36,
        weight: 500,
      });
      return box ? row({ name: "Item", tag: "li", width: "hug" }, [box]) : null;
    }),
  );
  const actions = row({ name: "Actions", align: "center", gap: 2, width: "hug" }, [
    button(props.secondaryLabel, { variant: "ghost", size: "sm" }),
    button(props.ctaLabel, { variant: CTA_VARIANT[style.emphasis], size: "sm", linkTo: ctx.linkTarget?.(id) ?? undefined }),
  ]);
  const brand = brandMark(str(props.brandName) || ctx.brand.name, "md", true, build.light.fontSizes);

  const children: (FrameNode | null)[] =
    style.align === "center"
      ? [
          row({ name: "Start", width: "fill", align: "center" }, [brand]),
          visible.length > 0 ? links : null,
          row({ name: "End", width: "fill", align: "center", justify: "end" }, [actions]),
        ]
      : [
          brand,
          visible.length > 0 ? row({ name: "LinksWrap", width: "hug", padding: { left: 4 } }, [links]) : null,
          row({ name: "End", width: "fill", align: "center", justify: "end" }, [actions]),
        ];

  const nav = row(
    {
      name: "Nav",
      tag: "nav",
      width: "fill",
      align: "center",
      gap: 4,
      minHeight: floating ? navH - 8 : navH,
      ...(floating && {
        padding: { left: 4, right: { px: 6 } },
        stroke: { color: "border" },
        radius: "xl" as const,
        fill: { color: "card", opacity: 0.88 },
        shadow: "md" as const,
      }),
    },
    children,
  );

  return landingSection(
    {
      name: "Navbar",
      tag: "header",
      style,
      padding: "none",
      ...(floating && { top: style.spacing === "roomy" ? 5 : 3 }),
      ...(!floating && { stroke: { color: "border", sides: ["bottom"] as const } }),
    },
    [nav],
  );
};
