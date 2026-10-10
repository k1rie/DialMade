import { describe, expect, it } from "vitest";
import { defaultLandingLayout, getLandingLayout, landingLayouts } from "@dialmade/catalog";
import { PageSchema, parseDesignDoc } from "@dialmade/doc";
import { addDefaultPage, buildDefaultPage } from "./buildPage";
import { APP_SHELL_TYPE, APP_SHELL_WIDGETS, BRAND_BOARD_SECTIONS } from "./constants";
import { contentContextFromDoc } from "./context";
import { sectionRegistry } from "./registry";
import { acmeContent, acmeDoc, testRegistry } from "./testing/fixtures";

const childTypes = (page: ReturnType<typeof buildDefaultPage>, id = page.root) =>
  (page.elements[id]?.children ?? []).map((child) => page.elements[child]?.type);

describe("buildDefaultPage", () => {
  const ctx = acmeContent();

  it("landing: las secciones del layout por defecto del producto, con ids de @dialmade/doc", () => {
    const page = buildDefaultPage("landing", ctx);
    const layout = defaultLandingLayout("saas-general");
    expect(page.kind).toBe("landing");
    expect(page.layoutId).toBe(layout.id);
    expect(page.elements.root?.type).toBe("landing.page");
    expect(childTypes(page)).toEqual(layout.sections);
    expect(page.elements.root?.children).toContain("hero-1");
    expect(PageSchema.safeParse(page).success).toBe(true);
  });

  it("landing: respeta el layout pedido y falla con uno desconocido", () => {
    for (const layout of landingLayouts) {
      expect(childTypes(buildDefaultPage("landing", ctx, layout.id))).toEqual(getLandingLayout(layout.id)?.sections);
    }
    expect(() => buildDefaultPage("landing", ctx, "nope")).toThrow(/Unknown landing layout/);
  });

  it("las páginas de un layout (layoutId «custom») no salen de una plantilla", () => {
    expect(() => buildDefaultPage("landing", ctx, "custom")).toThrow(/buildPageFromLayout/);
    expect(() => buildDefaultPage("app", ctx, "custom")).toThrow(/buildPageFromLayout/);
  });

  it("brand: el board completo en orden", () => {
    const page = buildDefaultPage("brand", ctx);
    expect(page.layoutId).toBe("brand-board");
    expect(childTypes(page)).toEqual(BRAND_BOARD_SECTIONS);
  });

  it("app: shell con los widgets dentro y densidad 7", () => {
    const page = buildDefaultPage("app", ctx);
    expect(page.layoutId).toBe("app-dashboard");
    expect(page.dials).toEqual({ density: 7 });
    expect(childTypes(page)).toEqual(["app.shell"]);
    expect(childTypes(page, "shell-1")).toEqual(sectionRegistry.get(APP_SHELL_TYPE)?.defaultChildren ?? APP_SHELL_WIDGETS);
    expect(childTypes(page, "shell-1")).toEqual(APP_SHELL_WIDGETS);
    expect(PageSchema.safeParse(page).success).toBe(true);
  });

  it("app: un shell registrado decide sus widgets", () => {
    const page = buildDefaultPage("app", ctx, undefined, { registry: testRegistry });
    expect(childTypes(page, "shell-1")).toEqual(["app.kpiRow"]);
    expect(page.elements["shell-1"]?.props).toMatchObject({ variant: "sidebar", title: "Acme Cloud" });
  });

  it("guarda variante y props por defecto; los textos de marca como bindings", () => {
    const page = buildDefaultPage("landing", ctx, "minimal", { registry: testRegistry });
    expect(page.elements["navbar-1"]?.props).toEqual({
      variant: "simple",
      brandName: { bind: "brand.name" },
      tagline: { bind: "brand.tagline" },
    });
    const hero = page.elements["hero-1"]?.props;
    expect(hero?.variant).toBe("centered");
    expect(typeof hero?.title).toBe("string");
    expect(page.elements["cta-1"]?.props).toEqual({});
  });

  it("sin tagline no la enlaza: guarda el texto por defecto", () => {
    const page = buildDefaultPage("landing", acmeContent(acmeDoc({ tagline: "" })), "minimal", { registry: testRegistry });
    expect(page.elements["navbar-1"]?.props.tagline).toBe("");
  });

  it("es determinista", () => {
    expect(buildDefaultPage("landing", ctx, undefined, { registry: testRegistry })).toEqual(
      buildDefaultPage("landing", acmeContent(), undefined, { registry: testRegistry }),
    );
  });

  it("addDefaultPage deja un DesignDoc válido", () => {
    let doc = acmeDoc();
    for (const kind of ["brand", "landing", "app"] as const) doc = addDefaultPage(doc, kind, { registry: testRegistry });
    expect(parseDesignDoc(doc).pages.app?.elements["kpi-row-1"]?.type).toBe("app.kpiRow");
    expect(() => addDefaultPage(doc, "landing")).toThrow(/already exists/);
    expect(addDefaultPage(doc, "landing", { layoutId: "conversion", replace: true }).pages.landing?.layoutId).toBe("conversion");
  });

  it("usa el productType del contexto", () => {
    const doc = acmeDoc({ productType: "restaurant-food-service" });
    const page = buildDefaultPage("landing", contentContextFromDoc(doc));
    expect(page.layoutId).toBe(defaultLandingLayout("restaurant-food-service").id);
  });
});
