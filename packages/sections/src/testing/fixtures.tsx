import { z } from "zod";
import { createDesignDoc, type DesignDoc } from "@dialmade/doc";
import { heroCopy, kpiList } from "../content";
import { contentContextFromDoc } from "../context";
import { defineSection } from "../defineSection";
import { createRegistry } from "../registry";
import type { AnySectionDefinition, ContentContext } from "../types";

export const CREATED_AT = "2026-10-09T12:00:00.000Z";

export function acmeDoc(overrides: { tagline?: string; productType?: string; locale?: "es" | "en" } = {}): DesignDoc {
  return createDesignDoc({
    brand: {
      name: "Acme Cloud",
      ...(overrides.tagline !== undefined ? { tagline: overrides.tagline } : { tagline: "Ship faster, sleep better" }),
      seeds: { primary: "#3A5BD9", secondary: "#f0a024" },
    },
    brief: { productType: overrides.productType ?? "saas-general", focus: "landing", locale: overrides.locale ?? "en" },
    provenance: { createdAt: CREATED_AT },
  });
}

export const acmeContent = (doc: DesignDoc = acmeDoc()): ContentContext => contentContextFromDoc(doc);

const label = (en: string) => ({ es: en, en });

export const navbarSection = defineSection({
  type: "landing.navbar",
  kind: "landing",
  label: { es: "Navegación", en: "Navbar" },
  variants: [{ id: "simple", label: label("Simple") }],
  schema: z.strictObject({ brandName: z.string(), tagline: z.string() }),
  knobs: [],
  bindings: { brandName: "brand.name", tagline: "brand.tagline" },
  defaultProps: (ctx) => ({ brandName: ctx.brand.name, tagline: ctx.brand.tagline ?? "" }),
  Component: ({ brandName, tagline, variant, ctx }) => (
    <nav aria-label="main" data-variant={variant}>
      <a href="#top">{brandName}</a>
      <span data-testid="tagline">{tagline}</span>
      <span data-testid="mode">{ctx.mode}</span>
    </nav>
  ),
});

export const heroSection = defineSection({
  type: "landing.hero",
  kind: "landing",
  label: { es: "Portada", en: "Hero" },
  variants: [
    { id: "centered", label: label("Centered") },
    { id: "split", label: label("Split") },
  ],
  schema: z.strictObject({ title: z.string().min(1), subtitle: z.string(), cta: z.string() }),
  knobs: [
    { key: "variant", label: label("Layout"), control: "select", scope: "section" },
    { key: "title", label: label("Title"), control: "text", scope: "section" },
  ],
  defaultProps: (ctx) => {
    const hero = heroCopy(ctx);
    return { title: hero.title, subtitle: hero.subtitle, cta: hero.primaryCta };
  },
  Component: ({ title, subtitle, cta, variant, elementId }) => (
    <header data-variant={variant} id={`${elementId}-header`}>
      <h1>{title}</h1>
      <p>{subtitle}</p>
      <button type="button">{cta}</button>
    </header>
  ),
});

export const brokenSection = defineSection({
  type: "landing.features",
  kind: "landing",
  label: { es: "Funciones", en: "Features" },
  variants: [{ id: "grid", label: label("Grid") }],
  schema: z.strictObject({ explode: z.boolean() }),
  knobs: [],
  defaultProps: () => ({ explode: false }),
  Component: ({ explode }) => {
    if (explode) throw new Error("boom");
    return <section>features</section>;
  },
});

export const shellSection = defineSection({
  type: "app.shell",
  kind: "app",
  label: { es: "Marco", en: "Shell" },
  variants: [{ id: "sidebar", label: label("Sidebar") }],
  schema: z.strictObject({ title: z.string() }),
  knobs: [],
  container: true,
  defaultChildren: ["app.kpiRow"],
  defaultProps: (ctx) => ({ title: ctx.brand.name }),
  Component: ({ title, children }) => (
    <div className="shell">
      <aside>{title}</aside>
      <main>{children}</main>
    </div>
  ),
});

export const kpiSection = defineSection({
  type: "app.kpiRow",
  kind: "app",
  label: { es: "KPIs", en: "KPIs" },
  variants: [{ id: "cards", label: label("Cards") }],
  schema: z.strictObject({ items: z.array(z.strictObject({ id: z.string(), label: z.string(), display: z.string() })) }),
  knobs: [],
  defaultProps: (ctx) => ({ items: kpiList(ctx).map(({ id, label, display }) => ({ id, label, display })) }),
  Component: ({ items }) => (
    <ul aria-label="kpis">
      {items.map((item) => (
        <li key={item.id}>
          {item.label}: {item.display}
        </li>
      ))}
    </ul>
  ),
});

export const TEST_SECTIONS: readonly AnySectionDefinition[] = [navbarSection, heroSection, brokenSection, shellSection, kpiSection];

export const testRegistry = createRegistry(TEST_SECTIONS);
