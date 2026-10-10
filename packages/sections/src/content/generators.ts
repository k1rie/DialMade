import type { LocalizedText } from "@dialmade/catalog";
import type { IconName } from "@dialmade/ui";
import type { ContentContext } from "../types";
import {
  CONTENT_TODAY,
  clockTime,
  formatDelta,
  formatDuration,
  formatMoney,
  formatValue,
  monthLabel,
  relativeTime,
  shortDate,
  weekdayLabel,
} from "./format";
import { COMPANY_NAMES, PUBLICATION_NAMES, initialsOf, personNames } from "./people";
import { contentProfileOf } from "./profiles";
import { rngFor, type Rng } from "./rng";
import { t } from "./t";
import type { ContentProfile, ProfileColumn, Tone, ValueFormat } from "./types";

const profileOf = (ctx: ContentContext): ContentProfile => contentProfileOf(ctx.productType);

/** Localized copy with `{name}` → brand name. */
export function localize(text: LocalizedText, ctx: Pick<ContentContext, "brand" | "locale">): string {
  return text[ctx.locale].replaceAll("{name}", ctx.brand.name);
}

const rng = (ctx: ContentContext, label: string): Rng => rngFor(ctx.seed, `${ctx.productType.id}:${label}`);

const slug = (value: string) =>
  value
    .normalize("NFD")
    .replace(/[̀-ͯ]/g, "")
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/^-|-$/g, "");

const round = (value: number, digits = 0) => {
  const factor = 10 ** digits;
  return Math.round(value * factor) / factor;
};

const precisionOf = (format: ValueFormat) => (format === "percent" || format === "decimal" ? 1 : 0);

// ── landing ───────────────────────────────────────────────────────────────────

export interface HeroCopy {
  eyebrow: string;
  title: string;
  subtitle: string;
  primaryCta: string;
  secondaryCta: string;
}

export function heroCopy(ctx: ContentContext): HeroCopy {
  const { hero } = profileOf(ctx);
  const r = rng(ctx, "hero");
  return {
    eyebrow: localize(r.pick(hero.eyebrows), ctx),
    title: localize(r.pick(hero.titles), ctx),
    subtitle: localize(r.pick(hero.subtitles), ctx),
    primaryCta: localize(hero.primaryCta, ctx),
    secondaryCta: localize(hero.secondaryCta, ctx),
  };
}

export interface NavLink {
  label: string;
  href: string;
}

export function navLinks(ctx: ContentContext): NavLink[] {
  return profileOf(ctx).landingNav.map((label) => ({ label: label[ctx.locale], href: `#${slug(label.en)}` }));
}

export interface SectionHeading {
  title: string;
  subtitle: string;
}

const DEFAULT_HEADINGS = {
  features: {
    title: t("Todo lo que necesitas, nada que sobre", "Everything you need, nothing you don't"),
    subtitle: t("Pensado para el día a día y listo desde el primer minuto.", "Built for everyday use and ready from minute one."),
  },
  testimonials: {
    title: t("Lo que dicen quienes ya lo usan", "What people are saying"),
    subtitle: t("Historias reales de nuestra comunidad.", "Stories from our community."),
  },
  pricing: {
    title: t("Precios simples y transparentes", "Simple, transparent pricing"),
    subtitle: t("Empieza gratis y cambia de plan cuando lo necesites.", "Start free and switch plans whenever you need to."),
  },
} as const;

export function sectionHeading(ctx: ContentContext, section: "features" | "testimonials" | "pricing"): SectionHeading {
  const profile = profileOf(ctx);
  const heading =
    section === "features"
      ? (profile.featuresHeading ?? DEFAULT_HEADINGS.features)
      : section === "pricing"
        ? {
            title: profile.pricing.title ?? DEFAULT_HEADINGS.pricing.title,
            subtitle: profile.pricing.subtitle ?? DEFAULT_HEADINGS.pricing.subtitle,
          }
        : DEFAULT_HEADINGS.testimonials;
  return { title: localize(heading.title, ctx), subtitle: localize(heading.subtitle, ctx) };
}

export interface FeatureItem {
  icon: IconName;
  title: string;
  description: string;
}

/** Up to 6 features, in a stable, seed-dependent order. */
export function featureList(ctx: ContentContext, count = 6): FeatureItem[] {
  const features = rng(ctx, "features").shuffle(profileOf(ctx).features);
  return features.slice(0, Math.max(0, count)).map((feature) => ({
    icon: feature.icon,
    title: localize(feature.title, ctx),
    description: localize(feature.description, ctx),
  }));
}

export interface StatItem {
  value: string;
  label: string;
}

export function statList(ctx: ContentContext): StatItem[] {
  return profileOf(ctx).stats.map((stat) => ({
    value: `${formatValue(stat.value, stat.format ?? (Number.isInteger(stat.value) ? "number" : "decimal"), ctx.locale)}${stat.suffix ?? ""}`,
    label: localize(stat.label, ctx),
  }));
}

export interface LogoWall {
  title: string;
  names: string[];
}

/** Fictional companies (B2B) or publications (B2C): never real brands. */
export function logoWall(ctx: ContentContext, count = 5): LogoWall {
  const profile = profileOf(ctx);
  const pool = profile.b2b ? COMPANY_NAMES : PUBLICATION_NAMES[ctx.locale];
  return { title: localize(profile.proofTitle, ctx), names: rng(ctx, "logos").sample(pool, Math.min(count, pool.length)) };
}

export interface Testimonial {
  quote: string;
  name: string;
  initials: string;
  role: string;
  company?: string;
}

export function testimonialList(ctx: ContentContext, count = 3): Testimonial[] {
  const profile = profileOf(ctx);
  const r = rng(ctx, "testimonials");
  const quotes = r.shuffle(profile.quotes).slice(0, count);
  const names = personNames(r, ctx.locale, quotes.length);
  const roles = r.shuffle(profile.roles);
  const companies = r.sample(COMPANY_NAMES, quotes.length);
  return quotes.map((quote, i) => {
    const name = names[i] as string;
    return {
      quote: localize(quote, ctx),
      name,
      initials: initialsOf(name),
      role: localize(roles[i % roles.length] as LocalizedText, ctx),
      ...(profile.b2b && { company: companies[i] as string }),
    };
  });
}

export interface PricingPlan {
  id: string;
  name: string;
  price: number;
  /** «29 €» / «$29»; «Gratis» / «Free» at 0. */
  priceLabel: string;
  /** «/mes» / «/mo», or «desde» / «from» for one-off prices. */
  period: string;
  description: string;
  features: string[];
  cta: string;
  highlighted: boolean;
}

export interface PricingCopy extends SectionHeading {
  plans: PricingPlan[];
  note: string;
}

export function pricingPlans(ctx: ContentContext): PricingCopy {
  const profile = profileOf(ctx);
  const { pricing } = profile;
  const monthly = pricing.period === "month";
  const plans = pricing.plans.map((plan, i): PricingPlan => {
    const free = plan.price === 0;
    return {
      id: slug(plan.name.en) || `plan-${i + 1}`,
      name: localize(plan.name, ctx),
      price: plan.price,
      priceLabel: free ? (ctx.locale === "es" ? "Gratis" : "Free") : formatMoney(plan.price, ctx.locale),
      period: free ? "" : monthly ? (ctx.locale === "es" ? "/mes" : "/mo") : ctx.locale === "es" ? "desde" : "from",
      description: localize(plan.description, ctx),
      features: plan.features.map((feature) => localize(feature, ctx)),
      cta: free ? localize(profile.hero.primaryCta, ctx) : ctx.locale === "es" ? `Elegir ${localize(plan.name, ctx)}` : `Choose ${localize(plan.name, ctx)}`,
      highlighted: i === 1,
    };
  });
  return { ...sectionHeading(ctx, "pricing"), plans, note: localize(pricing.note, ctx) };
}

export interface CtaCopy {
  title: string;
  subtitle: string;
  button: string;
}

export function ctaCopy(ctx: ContentContext): CtaCopy {
  const { cta } = profileOf(ctx);
  return {
    title: localize(rng(ctx, "cta").pick(cta.titles), ctx),
    subtitle: localize(cta.subtitle, ctx),
    button: localize(cta.button, ctx),
  };
}

export interface FooterColumn {
  title: string;
  links: NavLink[];
}

export interface FooterCopy {
  columns: FooterColumn[];
  /** «Todos los derechos reservados.» (the section adds © year and name). */
  rights: string;
}

export function footerCopy(ctx: ContentContext): FooterCopy {
  const link = (label: LocalizedText): NavLink => ({ label: label[ctx.locale], href: `#${slug(label.en)}` });
  return {
    columns: [
      { title: ctx.locale === "es" ? "Producto" : "Product", links: profileOf(ctx).landingNav.map(link) },
      {
        title: ctx.locale === "es" ? "Empresa" : "Company",
        links: [t("Sobre nosotros", "About"), t("Empleo", "Careers"), t("Blog", "Blog"), t("Contacto", "Contact")].map(link),
      },
      {
        title: "Legal",
        links: [t("Privacidad", "Privacy"), t("Términos", "Terms"), t("Cookies", "Cookies")].map(link),
      },
    ],
    rights: ctx.locale === "es" ? "Todos los derechos reservados." : "All rights reserved.",
  };
}

// ── app ───────────────────────────────────────────────────────────────────────

export interface AppNavItem {
  id: string;
  icon: IconName;
  label: string;
  active: boolean;
  count?: number;
}

export function appNav(ctx: ContentContext): AppNavItem[] {
  const r = rng(ctx, "app-nav");
  return profileOf(ctx).appNav.map((item, i) => ({
    id: slug(item.label.en) || `item-${i + 1}`,
    icon: item.icon,
    label: item.label[ctx.locale],
    active: i === 0,
    ...(i === 2 && { count: r.int(2, 24) }),
  }));
}

export interface Kpi {
  id: string;
  label: string;
  value: number;
  /** Formatted value with unit. */
  display: string;
  format: ValueFormat;
  /** Change vs. the previous period, in %. */
  delta: number;
  deltaLabel: string;
  /** A drop is good news: pass to StatCard `invertDelta`. */
  invert: boolean;
  /** 10 points ending at `value`, for a sparkline. */
  trend: number[];
  icon?: IconName;
}

export function kpiList(ctx: ContentContext, count = 4): Kpi[] {
  const r = rng(ctx, "kpis");
  return profileOf(ctx)
    .kpis.slice(0, Math.max(0, count))
    .map((kpi) => {
      const digits = precisionOf(kpi.format);
      const value = round(r.float(kpi.min, kpi.max), digits);
      const good = r.chance(0.75);
      const sign = (good ? 1 : -1) * (kpi.invert ? -1 : 1);
      const delta = round(sign * r.float(Math.min(1, kpi.deltaMax), kpi.deltaMax), 1);
      const start = value / (1 + delta / 100);
      const trend = Array.from({ length: 10 }, (_, i) => {
        if (i === 9) return value;
        const base = start + ((value - start) * i) / 9;
        return round(Math.max(0, base * (1 + r.float(-0.04, 0.04))), digits);
      });
      return {
        id: kpi.id,
        label: localize(kpi.label, ctx),
        value,
        display: `${formatValue(value, kpi.format, ctx.locale)}${kpi.unit ? kpi.unit[ctx.locale] : ""}`,
        format: kpi.format,
        delta,
        deltaLabel: formatDelta(delta, ctx.locale),
        invert: Boolean(kpi.invert),
        trend,
        ...(kpi.icon && { icon: kpi.icon }),
      };
    });
}

export interface ChartSeriesData {
  name: string;
  values: number[];
}

export interface ChartData {
  title: string;
  categories: string[];
  series: ChartSeriesData[];
  format: ValueFormat;
}

function chartCategories(period: "month" | "week" | "day", points: number, locale: ContentContext["locale"]): string[] {
  return Array.from({ length: points }, (_, i) => {
    const back = points - 1 - i;
    if (period === "month") return monthLabel(CONTENT_TODAY.month - back, locale);
    if (period === "week") return locale === "es" ? `Sem ${i + 1}` : `Wk ${i + 1}`;
    return weekdayLabel(i, locale);
  });
}

/** Two series with a gentle upward trend; `points` defaults to 6 (7 for daily charts). */
export function chartData(ctx: ContentContext, points?: number): ChartData {
  const { chart } = profileOf(ctx);
  const r = rng(ctx, "chart");
  const count = points ?? (chart.period === "day" ? 7 : 6);
  const digits = precisionOf(chart.format);
  const start = r.float(chart.min, chart.min + (chart.max - chart.min) * 0.45);
  const end = r.float(chart.min + (chart.max - chart.min) * 0.65, chart.max);
  const primary = Array.from({ length: count }, (_, i) => {
    const base = start + ((end - start) * i) / Math.max(1, count - 1);
    return round(Math.min(chart.max, Math.max(chart.min, base * (1 + r.float(-0.08, 0.08)))), digits);
  });
  const ratio = r.float(0.4, 0.75);
  const secondary = primary.map((value) => round(value * ratio * (1 + r.float(-0.1, 0.1)), digits));
  return {
    title: localize(chart.title, ctx),
    categories: chartCategories(chart.period, count, ctx.locale),
    series: [
      { name: chart.series[0][ctx.locale], values: primary },
      { name: chart.series[1][ctx.locale], values: secondary },
    ],
    format: chart.format,
  };
}

export type TableColumnKind = ProfileColumn["kind"];

export interface TableColumnSpec {
  key: string;
  label: string;
  kind: TableColumnKind;
  align: "start" | "end";
}

export interface TableCell {
  text: string;
  value?: number;
  tone?: Tone;
}

export interface TableRow {
  id: string;
  cells: Record<string, TableCell>;
}

export interface TableData {
  title: string;
  columns: TableColumnSpec[];
  rows: TableRow[];
}

const NUMERIC_KINDS = new Set<TableColumnKind>(["money", "number", "percent", "duration"]);

function weightedPick<T extends { weight?: number }>(r: Rng, options: readonly T[]): T {
  const total = options.reduce((sum, option) => sum + (option.weight ?? 1), 0);
  let roll = r.float(0, total);
  for (const option of options) {
    roll -= option.weight ?? 1;
    if (roll < 0) return option;
  }
  return options[options.length - 1] as T;
}

/** Rows of the dashboard table of the profile (orders, deployments, appointments…). */
export function tableData(ctx: ContentContext, rowCount = 6): TableData {
  const { table } = profileOf(ctx);
  const r = rng(ctx, "table");
  const { locale } = ctx;
  const count = Math.max(0, rowCount);
  const names = personNames(r, locale, count);
  const companies = r.shuffle(COMPANY_NAMES);
  const uniqueChoices = new Map<string, LocalizedText[]>();
  let daysAgo = 0;
  let minutesAgo = r.int(2, 9);
  let clock = 9 * 60;

  const rows = Array.from({ length: count }, (_, i): TableRow => {
    daysAgo += r.int(0, 2);
    minutesAgo = i === 0 ? minutesAgo : Math.round(minutesAgo * r.float(1.6, 2.8));
    clock += i === 0 ? 0 : r.pick([30, 45, 60]);
    const cells: Record<string, TableCell> = {};
    for (const column of table.columns) {
      switch (column.kind) {
        case "id":
          cells[column.key] = { text: `${column.prefix}${column.start - i * r.int(1, 7)}` };
          break;
        case "person":
          cells[column.key] = { text: names[i] as string };
          break;
        case "company":
          cells[column.key] = { text: companies[i % companies.length] as string };
          break;
        case "choice": {
          let option: LocalizedText;
          if (column.unique) {
            const pool = uniqueChoices.get(column.key) ?? r.shuffle(column.options);
            uniqueChoices.set(column.key, pool);
            option = pool[i % pool.length] as LocalizedText;
          } else option = r.pick(column.options);
          cells[column.key] = { text: option[locale] };
          break;
        }
        case "status": {
          const option = weightedPick(r, column.options);
          cells[column.key] = { text: option.label[locale], tone: option.tone };
          break;
        }
        case "money": {
          const value = Math.round(r.float(column.min, column.max));
          cells[column.key] = { text: formatMoney(value, locale), value };
          break;
        }
        case "number": {
          const value = r.int(column.min, column.max);
          const text = formatValue(value, column.compact ? "compact" : "number", locale);
          cells[column.key] = { text: `${text}${column.unit ? column.unit[locale] : ""}`, value };
          break;
        }
        case "percent": {
          const value = round(r.float(column.min, column.max), 1);
          cells[column.key] = { text: formatValue(value, "percent", locale), value };
          break;
        }
        case "duration": {
          const value = r.int(column.min, column.max);
          cells[column.key] = { text: formatDuration(value, locale), value };
          break;
        }
        case "date":
          cells[column.key] = { text: shortDate(daysAgo, locale) };
          break;
        case "relative":
          cells[column.key] = { text: relativeTime(minutesAgo, locale) };
          break;
        case "time":
          cells[column.key] = { text: clockTime(clock, locale) };
          break;
      }
    }
    return { id: `row-${i + 1}`, cells };
  });

  return {
    title: localize(table.title, ctx),
    columns: table.columns.map((column) => ({
      key: column.key,
      label: column.label[locale],
      kind: column.kind,
      align: NUMERIC_KINDS.has(column.kind) ? "end" : "start",
    })),
    rows,
  };
}

export interface ActivityItem {
  id: string;
  actor: string;
  initials: string;
  /** Action without the actor: «completó la migración de datos». */
  text: string;
  time: string;
  tone: Tone;
  icon?: IconName;
}

const ACTIVITY_MINUTES = [4, 26, 75, 190, 1440, 2900, 4400, 8700];

export function activityFeed(ctx: ContentContext, count = 5): ActivityItem[] {
  const r = rng(ctx, "activity");
  const templates = r.shuffle(profileOf(ctx).activity);
  const names = personNames(r, ctx.locale, count);
  return Array.from({ length: Math.max(0, count) }, (_, i) => {
    const template = templates[i % templates.length]!;
    const actor = names[i] as string;
    const minutes = ACTIVITY_MINUTES[i] ?? 1440 * (i - 2);
    return {
      id: `activity-${i + 1}`,
      actor,
      initials: initialsOf(actor),
      text: template.text[ctx.locale].replace("{target}", r.pick(template.targets)[ctx.locale]),
      time: relativeTime(minutes, ctx.locale),
      tone: template.tone,
      ...(template.icon && { icon: template.icon }),
    };
  });
}
