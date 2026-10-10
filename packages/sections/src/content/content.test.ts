import { describe, expect, it } from "vitest";
import { productGroups, productTypes, type Locale } from "@dialmade/catalog";
import { ICON_NAMES } from "@dialmade/ui";
import { GENERIC_PRODUCT_TYPE, resolveProductType } from "../context";
import type { ContentContext } from "../types";
import {
  CONTENT_PROFILES,
  GROUP_PROFILES,
  activityFeed,
  appNav,
  chartData,
  contentProfileIdOf,
  createRng,
  ctaCopy,
  featureList,
  footerCopy,
  formatDelta,
  formatDuration,
  formatValue,
  hashString,
  heroCopy,
  kpiList,
  logoWall,
  navLinks,
  pricingPlans,
  relativeTime,
  sectionHeading,
  shortDate,
  statList,
  tableData,
  testimonialList,
} from ".";

const LOCALES: Locale[] = ["es", "en"];

const ctxFor = (productType: string, locale: Locale, seed = 7): ContentContext => ({
  brand: { name: "Acme Cloud", tagline: "Ship faster" },
  productType: resolveProductType(productType),
  locale,
  seed,
});

const everything = (ctx: ContentContext) => ({
  hero: heroCopy(ctx),
  nav: navLinks(ctx),
  features: featureList(ctx),
  featuresHeading: sectionHeading(ctx, "features"),
  testimonialsHeading: sectionHeading(ctx, "testimonials"),
  stats: statList(ctx),
  logos: logoWall(ctx),
  testimonials: testimonialList(ctx),
  pricing: pricingPlans(ctx),
  cta: ctaCopy(ctx),
  footer: footerCopy(ctx),
  appNav: appNav(ctx),
  kpis: kpiList(ctx),
  chart: chartData(ctx),
  table: tableData(ctx, 8),
  activity: activityFeed(ctx, 6),
});

const strings = (value: unknown): string[] =>
  typeof value === "string"
    ? [value]
    : Array.isArray(value)
      ? value.flatMap(strings)
      : value && typeof value === "object"
        ? Object.values(value).flatMap(strings)
        : [];

describe("rng", () => {
  it("es determinista y uniforme en rango", () => {
    const a = createRng(42);
    const b = createRng(42);
    const seqA = Array.from({ length: 50 }, () => a.next());
    expect(seqA).toEqual(Array.from({ length: 50 }, () => b.next()));
    expect(seqA.every((n) => n >= 0 && n < 1)).toBe(true);
    const r = createRng(1);
    for (let i = 0; i < 200; i++) {
      const n = r.int(3, 5);
      expect(n >= 3 && n <= 5).toBe(true);
    }
    expect(createRng(9).sample([1, 2, 3, 4, 5], 3)).toHaveLength(3);
    expect(new Set(createRng(9).shuffle([1, 2, 3, 4, 5]))).toEqual(new Set([1, 2, 3, 4, 5]));
    expect(hashString("dialmade")).toBe(hashString("dialmade"));
    expect(hashString("dialmade")).not.toBe(hashString("dialet"));
  });
});

describe("perfiles de contenido", () => {
  it("cubren los 17 grupos del catálogo", () => {
    expect(Object.keys(GROUP_PROFILES).sort()).toEqual(productGroups.map((group) => group.id).sort());
    expect(contentProfileIdOf(GENERIC_PRODUCT_TYPE)).toBe("saas");
  });

  it.each(Object.values(CONTENT_PROFILES).map((profile) => [profile.id, profile]))("%s está completo en es y en", (_, profile) => {
    expect(profile.features.length).toBeGreaterThanOrEqual(6);
    expect(profile.kpis.length).toBeGreaterThanOrEqual(4);
    expect(profile.quotes.length).toBeGreaterThanOrEqual(3);
    expect(profile.roles.length).toBeGreaterThanOrEqual(3);
    expect(profile.activity.length).toBeGreaterThanOrEqual(5);
    expect(profile.appNav.length).toBeGreaterThanOrEqual(5);
    expect(profile.landingNav).toHaveLength(4);
    expect(profile.table.columns.length).toBeGreaterThanOrEqual(4);
    for (const icon of [...profile.features.map((f) => f.icon), ...profile.appNav.map((n) => n.icon)]) expect(ICON_NAMES).toContain(icon);
    const texts = JSON.stringify(profile);
    expect(/lorem|ipsum/i.test(texts) || /\bTODO\b/.test(texts)).toBe(false);
    const localized = strings(profile).filter((s) => s.length > 0);
    expect(localized.length).toBeGreaterThan(80);
    for (const activity of profile.activity) for (const locale of LOCALES) expect(activity.text[locale]).toContain("{target}");
  });
});

describe("generadores", () => {
  it("son deterministas y dependen de la semilla", () => {
    expect(everything(ctxFor("saas-general", "es"))).toEqual(everything(ctxFor("saas-general", "es")));
    const seeds = new Set(Array.from({ length: 12 }, (_, seed) => JSON.stringify(everything(ctxFor("saas-general", "en", seed)))));
    expect(seeds.size).toBeGreaterThan(1);
  });

  it.each(LOCALES)("dan copy completo y JSON para los 192 tipos de producto (%s)", (locale) => {
    for (const productType of [...productTypes.map((p) => p.id), "generic"]) {
      const content = everything(ctxFor(productType, locale));
      expect(JSON.parse(JSON.stringify(content))).toEqual(content);
      for (const text of strings(content)) {
        expect(text, `${productType}: "${text}"`).not.toMatch(/\{name\}|\{target\}|undefined|NaN/);
      }
      expect(content.hero.title.length).toBeGreaterThan(0);
      expect(content.features).toHaveLength(6);
      expect(content.pricing.plans).toHaveLength(3);
      expect(content.pricing.plans.filter((plan) => plan.highlighted)).toHaveLength(1);
      expect(content.kpis).toHaveLength(4);
      expect(content.chart.series).toHaveLength(2);
      expect(content.chart.series[0]?.values).toHaveLength(content.chart.categories.length);
      expect(content.table.rows).toHaveLength(8);
      for (const row of content.table.rows) expect(Object.keys(row.cells)).toEqual(content.table.columns.map((c) => c.key));
      expect(content.activity).toHaveLength(6);
    }
  });

  it("sustituye el nombre de la marca y usa nombres ficticios distintos", () => {
    const ctx = ctxFor("saas-general", "es");
    expect(strings(everything(ctx)).some((text) => text.includes("Acme Cloud"))).toBe(true);
    const names = testimonialList(ctx).map((t) => t.name.split(" ")[0]);
    expect(new Set(names).size).toBe(names.length);
    expect(testimonialList(ctx)[0]?.company).toBeTruthy();
    expect(testimonialList(ctxFor("e-commerce", "es"))[0]?.company).toBeUndefined();
  });

  it("los KPIs traen tendencia que acaba en el valor y delta con signo", () => {
    for (const kpi of kpiList(ctxFor("analytics-dashboard", "en"))) {
      expect(kpi.trend).toHaveLength(10);
      expect(kpi.trend.at(-1)).toBe(kpi.value);
      expect(kpi.deltaLabel).toMatch(kpi.delta > 0 ? /^\+/ : /^-|^−/);
    }
  });

  it("las columnas numéricas se alinean al final y los estados llevan tono", () => {
    const table = tableData(ctxFor("e-commerce", "es"));
    expect(table.columns.find((c) => c.key === "total")?.align).toBe("end");
    expect(table.rows.every((row) => row.cells.status?.tone)).toBe(true);
    expect(table.rows[0]?.cells.order?.text).toMatch(/^#\d+$/);
  });
});

describe("formato", () => {
  it("sigue las convenciones de cada idioma", () => {
    const nbsp = (s: string) => s.replace(/[  ]/g, " ");
    expect(nbsp(formatValue(29, "currency", "es"))).toBe("$29");
    expect(nbsp(formatValue(1249.5, "currency", "es"))).toBe("$1,249.50");
    expect(formatValue(29, "currency", "en")).toBe("$29");
    expect(formatValue(48200, "currency", "en")).toBe("$48.2K");
    expect(nbsp(formatValue(12480, "number", "es"))).toBe("12,480");
    expect(formatValue(12480, "number", "en")).toBe("12,480");
    expect(nbsp(formatValue(4.5, "percent", "es"))).toBe("4.5%");
    expect(formatValue(4.5, "percent", "en")).toBe("4.5%");
    expect(formatValue(182, "ms", "en")).toBe("182 ms");
    expect(formatDuration(272, "es")).toBe("4 min 32 s");
    expect(formatDuration(3900, "en")).toBe("1h 05m");
    expect(formatDelta(12.4, "en")).toBe("+12.4%");
    expect(relativeTime(5, "es")).toBe("hace 5 min");
    expect(relativeTime(1440, "en")).toBe("yesterday");
    expect(shortDate(0, "es")).toBe("30 sept");
    expect(shortDate(0, "en")).toBe("Sep 30");
  });
});
