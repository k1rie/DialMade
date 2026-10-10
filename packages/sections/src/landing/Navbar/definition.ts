import { z } from "zod";
import { heroCopy, navLinks } from "../../content";
import { defineSection } from "../../defineSection";
import { countedList } from "../../lib/visible";
import { navSecondary } from "../lib/copy";
import { linkSchema, sectionStyleShape, styleKnobs, textKnob, variantKnob } from "../lib/knobs";
import { Navbar } from "./Navbar";
import type { NavbarProps } from "./types";

export const navbarSection = defineSection<NavbarProps>({
  type: "landing.navbar",
  kind: "landing",
  label: { es: "Navegación", en: "Navbar" },
  description: {
    es: "Marca, enlaces y llamada a la acción. En móvil, un menú desplegable.",
    en: "Brand, links and call to action. A disclosure menu on mobile.",
  },
  variants: [
    { id: "bar", label: { es: "Barra", en: "Bar" } },
    { id: "floating", label: { es: "Flotante", en: "Floating" } },
  ],
  schema: z.strictObject({
    brandName: z.string().min(1),
    links: z.array(linkSchema).max(6),
    linkCount: z.number().int().min(0).max(6),
    secondaryLabel: z.string(),
    ctaLabel: z.string().min(1),
    ...sectionStyleShape,
  }),
  knobs: [
    variantKnob<NavbarProps>(),
    ...styleKnobs<NavbarProps>({ es: "Énfasis del botón", en: "Button emphasis" }),
    textKnob<NavbarProps>("ctaLabel", "Botón principal", "Main button"),
    textKnob<NavbarProps>("secondaryLabel", "Acción secundaria", "Secondary action"),
  ],
  bindings: { brandName: "brand.name" },
  defaultProps: (ctx) => {
    const links = navLinks(ctx);
    return {
      brandName: ctx.brand.name,
      links,
      linkCount: links.length,
      secondaryLabel: navSecondary(ctx),
      ctaLabel: heroCopy(ctx).primaryCta,
      align: "center",
      emphasis: "default",
      background: "plain",
      spacing: "normal",
    };
  },
  layout: {
    owns: ["linkCount"],
    // The chip shows 4 links from 9 columns and 3 from 6; narrower bars keep the default.
    fit: ({ estimate }) => (estimate?.kind === "count" ? { props: { linkCount: estimate.value } } : {}),
  },
  visible: countedList("links", "linkCount", 0),
  Component: Navbar,
});
