import { describe, expect, it } from "vitest";
import { orderedScreens, resolveExport, type DesignDoc, type Page } from "@dialmade/doc";
import { contentContextFromDoc, linkContext, resolveSectionProps, sectionRegistry, type RenderContext } from "@dialmade/sections";
import { FigmaPlanSchema } from "../../../figma/schema";
import { toFigmaPlan } from "../../../figma/toFigmaPlan";
import { everyBlockDoc, legacyDoc, screensDoc } from "../../../testing/fixtures";
import { buildDesignTree } from "../../build";
import type { BuildContext } from "../../context";
import type { DesignNode, DesignTree, FrameNode } from "../../types";
import { LANDING_BUILDERS } from ".";

/** Root names of the landing builders (the generic fallback is named after the section label). */
const ROOT_NAMES: Record<string, string> = {
  "landing.navbar": "Navbar",
  "landing.hero": "Hero",
  "landing.socialProof": "SocialProof",
  "landing.features": "Features",
  "landing.testimonials": "Testimonials",
  "landing.pricing": "Pricing",
  "landing.cta": "Cta",
  "landing.footer": "Footer",
};

type Sectioned = FrameNode & { section?: string };

function walk(node: DesignNode, visit: (node: DesignNode) => void) {
  visit(node);
  if (node.type === "frame") for (const child of node.children) walk(child, visit);
}

const all = (node: DesignNode, test: (node: DesignNode) => boolean): DesignNode[] => {
  const out: DesignNode[] = [];
  walk(node, (entry) => {
    if (test(entry)) out.push(entry);
  });
  return out;
};
const named = (node: DesignNode, name: string) => all(node, (entry) => entry.type !== "text" && entry.type !== "icon" && entry.name === name);
const texts = (node: DesignNode) => all(node, (entry) => entry.type === "text").map((entry) => (entry.type === "text" ? entry.text : ""));
const links = (node: DesignNode) => all(node, (entry) => entry.type === "frame" && !!entry.linkTo).map((entry) => (entry as FrameNode).linkTo);

function landingSections(tree: DesignTree): Sectioned[] {
  const out: Sectioned[] = [];
  for (const page of tree.pages) {
    walk(page.root, (node) => {
      const section = (node as Sectioned).section;
      if (node.type === "frame" && section?.startsWith("landing.")) out.push(node as Sectioned);
    });
  }
  return out;
}

/** Visible `landing.*` elements of every page a tree is built from. */
function landingElements(doc: DesignDoc): string[] {
  const pages: Page[] = orderedScreens(doc).length > 0 ? orderedScreens(doc).map((screen) => screen.page) : (["landing", "app"] as const).flatMap((kind) => (doc.pages[kind] ? [doc.pages[kind]!] : []));
  return pages.flatMap((page) =>
    Object.entries(page.elements)
      .filter(([id, element]) => element.type in ROOT_NAMES && !(page.hidden ?? []).includes(id))
      .map(([id]) => id),
  );
}

/** The legacy document with its landing page replaced by one section per spec (every variant and knob path). */
function specsDoc(specs: readonly [string, Record<string, unknown>][]): DesignDoc {
  const doc = legacyDoc();
  const page = structuredClone(doc.pages.landing!);
  const root = page.elements[page.root]!;
  for (const id of root.children) delete page.elements[id];
  root.children = specs.map(([type, props], i) => {
    page.elements[`v-${i}`] = { type, props, children: [] };
    return `v-${i}`;
  });
  return { ...doc, pages: { ...doc.pages, landing: page } };
}

const VARIANTS: readonly [string, Record<string, unknown>][] = [
  ["landing.navbar", { variant: "floating", align: "start", emphasis: "bold", spacing: "roomy" }],
  ["landing.navbar", { variant: "bar", linkCount: 0, secondaryLabel: "", emphasis: "subtle" }],
  ["landing.hero", { variant: "centered", visual: "gallery", emphasis: "bold", align: "start" }],
  ["landing.hero", { variant: "split", visual: "gallery", emphasis: "subtle" }],
  ["landing.hero", { variant: "split", visual: "none", eyebrow: "", note: "", secondaryCta: "" }],
  ["landing.hero", { variant: "centered", visual: "none", background: "subtle", spacing: "compact" }],
  ["landing.socialProof", { variant: "metrics", emphasis: "bold" }],
  ["landing.socialProof", { variant: "logos", showStats: true, align: "start", emphasis: "subtle", count: 3 }],
  ["landing.features", { variant: "bento", count: 3, emphasis: "bold" }],
  ["landing.features", { variant: "bento", count: 4 }],
  ["landing.features", { variant: "bento", count: 5 }],
  ["landing.features", { variant: "bento", count: 6 }],
  ["landing.features", { variant: "grid", count: 5, emphasis: "subtle", align: "start" }],
  ["landing.features", { variant: "grid", count: 1 }],
  ["landing.testimonials", { variant: "spotlight", emphasis: "bold" }],
  ["landing.testimonials", { variant: "grid", count: 1, showRating: false, align: "start" }],
  ["landing.pricing", { variant: "split", emphasis: "bold", billing: "yearly" }],
  ["landing.pricing", { variant: "cards", count: 2, emphasis: "subtle", showToggle: false }],
  ["landing.pricing", { variant: "cards", count: 1, recurring: false }],
  ["landing.cta", { variant: "split", emphasis: "default", showForm: true }],
  ["landing.cta", { variant: "banner", emphasis: "subtle", align: "start", background: "brand-gradient", secondaryButton: "", note: "" }],
  ["landing.footer", { variant: "simple", emphasis: "bold" }],
  ["landing.footer", { variant: "simple", align: "center" }],
  ["landing.footer", { variant: "columns", align: "center", emphasis: "subtle", tagline: "" }],
];

describe.each([
  ["everyBlockDoc", everyBlockDoc],
  ["screensDoc", screensDoc],
  ["legacyDoc", legacyDoc],
  ["variants", () => specsDoc(VARIANTS)],
])("landing builders on %s", (_, make) => {
  const doc = make();
  const errors: { id: string; type: string; error: unknown }[] = [];
  const tree = buildDesignTree(doc, { onSectionError: (id, type, error) => errors.push({ id, type, error }) });

  it("builds every landing section without errors", () => {
    expect(errors.filter((entry) => entry.type.startsWith("landing."))).toEqual([]);
  });

  it("builds each landing element with its own builder", () => {
    const sections = landingSections(tree);
    const keys = sections.map((node) => node.key);
    for (const id of landingElements(doc)) expect(keys).toContain(id);
    for (const node of sections) {
      expect(node.name, `${node.section} ${node.key}`).toBe(ROOT_NAMES[node.section!]);
      expect(node.width).toBe("fill");
      expect(named(node, "Container")).toHaveLength(1);
    }
  });

  it("emits a valid figma plan", () => {
    expect(() => FigmaPlanSchema.parse(toFigmaPlan(doc))).not.toThrow();
  });
});

describe("landing builders", () => {
  const doc = legacyDoc();
  const { inputs, light, dark } = resolveExport(doc);
  const build: BuildContext = { doc, inputs, light, dark, pageKind: "landing" };
  const ctx: RenderContext = {
    ...contentContextFromDoc(doc),
    mode: "light",
    interactive: false,
    doc,
    ...linkContext({ links: { el: "s-target" }, linkHref: (id) => id }),
  };
  const section = (type: string, props: Record<string, unknown> = {}, id = "el") => {
    const resolved = resolveSectionProps(sectionRegistry.get(type)!, props, ctx);
    return LANDING_BUILDERS[type]!({ id, type, props: resolved.props, variant: resolved.variant, children: [], ctx, build });
  };

  it("registers one builder per landing section", () => {
    expect(Object.keys(LANDING_BUILDERS).sort()).toEqual(Object.keys(ROOT_NAMES).sort());
  });

  it("navbar: brand, counted links with their screens, actions and the primary link", () => {
    const node = section("landing.navbar", {
      links: [
        { label: "Inicio", href: "#", linkTo: "s-home" },
        { label: "Precios", href: "#", linkTo: "s-pricing" },
        { label: "Blog", href: "#blog" },
      ],
      linkCount: 2,
    });
    expect(node.tag).toBe("header");
    expect(texts(node)).toEqual(expect.arrayContaining(["Brisa", "Inicio", "Precios"]));
    expect(texts(node)).not.toContain("Blog");
    expect(links(node)).toEqual(["s-home", "s-pricing", "s-target"]);
    expect(named(section("landing.navbar", { variant: "floating" }), "Nav")[0]).toMatchObject({ radius: "xl", shadow: "md" });
  });

  it("hero: centered mockup or split collage, the primary CTA links, optional copy disappears", () => {
    const centered = section("landing.hero", { variant: "centered", visual: "dashboard" });
    expect(named(centered, "ProductMockup")).toHaveLength(1);
    expect(named(centered, "DashboardScreen")).toHaveLength(1);
    expect(links(centered)).toEqual(["s-target"]);
    const split = section("landing.hero", { variant: "split", visual: "dashboard" });
    expect(named(split, "HeroCollage")).toHaveLength(1);
    const floats = all(split, (n) => n.type === "frame" && !!n.absolute).map((n) => (n as FrameNode).name);
    expect(floats).toEqual(expect.arrayContaining(["StatCard", "EventCard"]));
    const gallery = section("landing.hero", { variant: "centered", visual: "gallery" });
    expect(named(gallery, "GalleryScreen")).toHaveLength(1);
    const bare = section("landing.hero", { visual: "none", eyebrow: "", note: "", secondaryCta: "" });
    expect(named(bare, "ProductMockup")).toHaveLength(0);
    expect(named(bare, "Eyebrow")).toHaveLength(0);
    expect(named(bare, "Note")).toHaveLength(0);
    expect(named(bare, "Button/outline/lg")).toHaveLength(0);
    expect(all(section("landing.hero", { emphasis: "subtle" }), (n) => n.type === "text" && n.style === "h1")).toHaveLength(1);
  });

  it("social proof: counted logos, stats only when asked (always in metrics)", () => {
    const logos = section("landing.socialProof", { count: 3, showStats: false });
    expect(named(logos, "FictionalLogo")).toHaveLength(3);
    expect(named(logos, "Stats")).toHaveLength(0);
    const metrics = section("landing.socialProof", { variant: "metrics" });
    expect(named(metrics, "Stats")).toHaveLength(1);
    expect(named(metrics, "Stat").length).toBeGreaterThan(0);
  });

  it("features: counted cards on the desktop grid, the bento lead with its visual", () => {
    for (const count of [1, 2, 3, 4, 5, 6]) {
      expect(named(section("landing.features", { variant: "grid", count }), "Feature")).toHaveLength(count);
      const bento = section("landing.features", { variant: "bento", count });
      expect(named(bento, "Feature")).toHaveLength(count);
      expect(named(bento, "FeatureVisual")).toHaveLength(1);
    }
    expect(named(section("landing.features", { emphasis: "subtle" }), "Icon")).toHaveLength(0);
  });

  it("testimonials: cards or a spotlight quote, stars only with the rating", () => {
    const grid = section("landing.testimonials", { variant: "grid" });
    expect(named(grid, "Testimonial")).toHaveLength(3);
    expect(named(grid, "RatingStars")).toHaveLength(3);
    const spotlight = section("landing.testimonials", { variant: "spotlight", showRating: false });
    expect(named(spotlight, "Spotlight")).toHaveLength(1);
    expect(named(spotlight, "Testimonial")).toHaveLength(2);
    expect(named(spotlight, "RatingStars")).toHaveLength(0);
  });

  it("pricing: plan cards (rows in split) whose buttons link, toggle and highlight", () => {
    const cards = section("landing.pricing", { variant: "cards" });
    expect(named(cards, "BillingToggle")).toHaveLength(1);
    expect(named(cards, "PlanCard/highlighted")).toHaveLength(1);
    const plans = all(cards, (n) => n.type === "frame" && n.name.startsWith("PlanCard"));
    expect(plans).toHaveLength(3);
    expect(links(cards)).toEqual(["s-target", "s-target", "s-target"]);
    const split = section("landing.pricing", { variant: "split", emphasis: "bold" });
    const highlighted = named(split, "PlanCard/highlighted")[0] as FrameNode;
    expect(highlighted.layout).toMatchObject({ direction: "row" });
    expect(highlighted.fill).toEqual({ color: "primary" });
    const oneOff = section("landing.pricing", { recurring: false, showToggle: true });
    expect(named(oneOff, "BillingToggle")).toHaveLength(0);
  });

  it("cta: panel with the linked button or the email form", () => {
    const banner = section("landing.cta", { variant: "banner" });
    expect(named(banner, "Panel")).toHaveLength(1);
    expect(links(banner)).toEqual(["s-target"]);
    const form = section("landing.cta", { variant: "split", showForm: true });
    expect(named(form, "Form")).toHaveLength(1);
    expect(named(form, "Buttons")).toHaveLength(0);
    expect(links(form)).toEqual(["s-target"]);
  });

  it("footer: columns with linked items, or one row; the bold wordmark", () => {
    const columns = section("landing.footer", {
      columns: [
        { title: "Producto", links: [{ label: "Precios", href: "#", linkTo: "s-pricing" }] },
        { title: "Legal", links: [{ label: "Privacidad", href: "#privacy" }] },
      ],
    });
    expect(columns.tag).toBe("footer");
    expect(named(columns, "Column")).toHaveLength(2);
    expect(links(columns)).toEqual(["s-pricing"]);
    expect(texts(columns).some((value) => value.startsWith("©"))).toBe(true);
    const simple = section("landing.footer", { variant: "simple", emphasis: "bold" });
    expect(named(simple, "Row")).toHaveLength(1);
    expect(all(simple, (n) => n.type === "text" && n.name === "Wordmark")).toHaveLength(1);
  });

  it("applies the section background and spacing knobs", () => {
    expect(section("landing.features", { background: "subtle" }).fill).toEqual({ color: "muted", opacity: 0.62 });
    expect(section("landing.features", { background: "brand-gradient" }).fill).toHaveProperty("gradient");
    expect(section("landing.features", { spacing: "roomy" }).padding).toMatchObject({ top: { sectionPy: 1.4 }, bottom: { sectionPy: 1.4 } });
    expect(section("landing.navbar").padding).toMatchObject({ top: 0, bottom: 0 });
  });
});
