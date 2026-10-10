import type { LocalizedText } from "@dialmade/catalog";
import type { IconName } from "@dialmade/ui";
import {
  COMPANY_NAMES,
  activityFeed,
  appNav,
  chartData,
  contentProfileIdOf,
  featureList,
  formatDuration,
  formatMoney,
  kpiList,
  localize,
  rngFor,
  t,
  type ActivityItem,
  type AppNavItem,
  type ChartData,
  type ContentProfileId,
  type Kpi,
} from "../../content";
import type { ContentContext } from "../../types";

export type HeroVisual = "dashboard" | "gallery" | "none";
type SectionEyebrow = "features" | "testimonials" | "pricing";

interface LandingExtras {
  heroNote: LocalizedText;
  ctaNote: LocalizedText;
  navSecondary: LocalizedText;
  visual: Exclude<HeroVisual, "none">;
  /** Yearly discount of the pricing toggle, in %. 0 hides the toggle. */
  yearlyDiscount: number;
  eyebrows?: Partial<Record<SectionEyebrow, LocalizedText>>;
}

const LOG_IN = t("Iniciar sesión", "Log in");
const SIGN_IN = t("Acceder", "Sign in");

const EXTRAS: Record<ContentProfileId, LandingExtras> = {
  saas: {
    heroNote: t("Gratis hasta 5 personas · Sin tarjeta de crédito", "Free for up to 5 people · No credit card required"),
    ctaNote: t("Configuración en 2 minutos. Cancela cuando quieras.", "Set up in 2 minutes. Cancel anytime."),
    navSecondary: LOG_IN,
    visual: "dashboard",
    yearlyDiscount: 20,
  },
  analytics: {
    heroNote: t("Prueba de 14 días · Sin tarjeta de crédito", "14-day trial · No credit card required"),
    ctaNote: t("Tus datos se quedan en tu región.", "Your data stays in your region."),
    navSecondary: LOG_IN,
    visual: "dashboard",
    yearlyDiscount: 20,
  },
  devtools: {
    heroNote: t("Plan gratuito para siempre · Open source", "Free forever plan · Open source"),
    ctaNote: t("Sin tarjeta. Despliega desde la CLI o desde Git.", "No credit card. Deploy from the CLI or from Git."),
    navSecondary: SIGN_IN,
    visual: "dashboard",
    yearlyDiscount: 15,
  },
  commerce: {
    heroNote: t("Devoluciones gratis durante 30 días", "Free returns within 30 days"),
    ctaNote: t("Sin spam. Date de baja cuando quieras.", "No spam. Unsubscribe anytime."),
    navSecondary: t("Mi cuenta", "Account"),
    visual: "gallery",
    yearlyDiscount: 0,
    eyebrows: { features: t("Nuestra tienda", "Our shop"), pricing: t("Packs", "Bundles") },
  },
  finance: {
    heroNote: t("Sin comisiones de mantenimiento · Alta en 5 minutos", "No maintenance fees · Sign up in 5 minutes"),
    ctaNote: t("Tu dinero, protegido y regulado.", "Your money, protected and regulated."),
    navSecondary: SIGN_IN,
    visual: "dashboard",
    yearlyDiscount: 15,
  },
  health: {
    heroNote: t("Profesionales colegiados · Cita en 24 horas", "Licensed professionals · Appointments within 24 hours"),
    ctaNote: t("Cancela o cambia tu cita sin coste.", "Cancel or reschedule for free."),
    navSecondary: SIGN_IN,
    visual: "dashboard",
    yearlyDiscount: 15,
    eyebrows: { features: t("Servicios", "Services") },
  },
  education: {
    heroNote: t("Primera lección gratis · Certificado al terminar", "First lesson free · Certificate on completion"),
    ctaNote: t("Sin tarjeta. Aprende desde cualquier dispositivo.", "No credit card. Learn on any device."),
    navSecondary: LOG_IN,
    visual: "dashboard",
    yearlyDiscount: 25,
  },
  media: {
    heroNote: t("Un mes gratis · Cancela cuando quieras", "First month free · Cancel anytime"),
    ctaNote: t("Sin anuncios y sin permanencia.", "No ads, no commitment."),
    navSecondary: SIGN_IN,
    visual: "gallery",
    yearlyDiscount: 20,
    eyebrows: { features: t("Qué incluye", "What's included"), pricing: t("Planes", "Plans") },
  },
  creative: {
    heroNote: t("Respuesta en 48 horas · Presupuesto sin compromiso", "Reply within 48 hours · No-obligation quote"),
    ctaNote: t("Sin compromiso. Te enviamos una propuesta a medida.", "No commitment. We'll send a tailored proposal."),
    navSecondary: t("Escríbenos", "Email us"),
    visual: "gallery",
    yearlyDiscount: 0,
    eyebrows: { features: t("Servicios", "Services"), testimonials: t("Clientes", "Clients"), pricing: t("Tarifas", "Rates") },
  },
  community: {
    heroNote: t("Gratis para siempre · Más de 50.000 miembros", "Free forever · 50,000+ members"),
    ctaNote: t("Gratis. Solo necesitas un correo.", "Free. All you need is an email."),
    navSecondary: SIGN_IN,
    visual: "dashboard",
    yearlyDiscount: 20,
    eyebrows: { features: t("Comunidad", "Community"), pricing: t("Membresías", "Memberships") },
  },
  services: {
    heroNote: t("Confirmación inmediata · Cancelación gratuita", "Instant confirmation · Free cancellation"),
    ctaNote: t("Te respondemos en menos de 24 horas.", "We reply within 24 hours."),
    navSecondary: SIGN_IN,
    visual: "dashboard",
    yearlyDiscount: 10,
    eyebrows: { features: t("Servicios", "Services") },
  },
  consumer: {
    heroNote: t("Gratis en móvil y web · Sin anuncios", "Free on mobile and web · No ads"),
    ctaNote: t("Configúrala en menos de un minuto.", "Set it up in under a minute."),
    navSecondary: LOG_IN,
    visual: "dashboard",
    yearlyDiscount: 30,
  },
  public: {
    heroNote: t("Información abierta · Accesible para todas las personas", "Open information · Accessible to everyone"),
    ctaNote: t("Puedes darte de baja cuando quieras.", "You can leave at any time."),
    navSecondary: SIGN_IN,
    visual: "dashboard",
    yearlyDiscount: 0,
    eyebrows: { features: t("Nuestro trabajo", "Our work"), pricing: t("Hazte socio", "Membership") },
  },
};

const DEFAULT_EYEBROWS: Record<SectionEyebrow, LocalizedText> = {
  features: t("Funciones", "Features"),
  testimonials: t("Opiniones", "Testimonials"),
  pricing: t("Precios", "Pricing"),
};

const extrasOf = (ctx: ContentContext): LandingExtras => EXTRAS[contentProfileIdOf(ctx.productType)];

export const heroNote = (ctx: ContentContext): string => localize(extrasOf(ctx).heroNote, ctx);
export const ctaNote = (ctx: ContentContext): string => localize(extrasOf(ctx).ctaNote, ctx);
export const navSecondary = (ctx: ContentContext): string => localize(extrasOf(ctx).navSecondary, ctx);
export const defaultHeroVisual = (ctx: ContentContext): Exclude<HeroVisual, "none"> => extrasOf(ctx).visual;
export const yearlyDiscount = (ctx: ContentContext): number => extrasOf(ctx).yearlyDiscount;

export function sectionEyebrow(ctx: ContentContext, section: SectionEyebrow): string {
  return localize(extrasOf(ctx).eyebrows?.[section] ?? DEFAULT_EYEBROWS[section], ctx);
}

/** `acme-cloud` → `acmecloud`, for the fictional address bar of the mockups. */
export function brandDomain(name: string): string {
  const slug = name
    .normalize("NFD")
    .replace(/[̀-ͯ]/g, "")
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, "");
  return `${slug || "brand"}.com`;
}

// ── visuals of the hero ───────────────────────────────────────────────────────

export interface DashboardMock {
  domain: string;
  nav: AppNavItem[];
  kpis: Kpi[];
  chart: ChartData;
  activity: ActivityItem[];
}

export function dashboardMock(ctx: ContentContext): DashboardMock {
  return {
    domain: `app.${brandDomain(ctx.brand.name)}`,
    nav: appNav(ctx).slice(0, 5),
    kpis: kpiList(ctx, 3),
    chart: chartData(ctx),
    activity: activityFeed(ctx, 4),
  };
}

export interface GalleryItem {
  id: string;
  title: string;
  meta: string;
  /** Generative artwork of the tile, 1–6. */
  art: number;
  icon?: IconName;
}

const PRODUCTS: readonly [LocalizedText, number][] = [
  [t("Bolso de lona", "Canvas tote"), 39],
  [t("Taza de gres", "Stoneware mug"), 18],
  [t("Manta de lino", "Linen throw"), 64],
  [t("Vela de soja", "Soy candle"), 22],
  [t("Jarrón de cerámica", "Ceramic vase"), 48],
  [t("Cuaderno cosido", "Stitched notebook"), 14],
];

const EPISODES: readonly [LocalizedText, number][] = [
  [t("La ciudad dormida", "The Sleeping City"), 38],
  [t("Voces del puerto", "Harbor Voices"), 52],
  [t("Mapas del silencio", "Maps of Silence"), 45],
  [t("El último verano", "The Last Summer"), 72],
  [t("Cartas desde el norte", "Letters from the North"), 41],
  [t("Hora azul", "Blue Hour"), 29],
];

const DISCIPLINES: readonly LocalizedText[] = [
  t("Identidad visual", "Brand identity"),
  t("Sitio web", "Website"),
  t("Packaging", "Packaging"),
  t("App móvil", "Mobile app"),
  t("Campaña", "Campaign"),
  t("Editorial", "Editorial"),
];

/** Tiles of the gallery visual: products, episodes or projects depending on the product type. */
export function galleryItems(ctx: ContentContext, count = 4): GalleryItem[] {
  const r = rngFor(ctx.seed, `${ctx.productType.id}:landing-gallery`);
  const arts = r.shuffle([1, 2, 3, 4, 5, 6]);
  const artOf = (i: number) => arts[i % arts.length] as number;
  const profile = contentProfileIdOf(ctx.productType);
  const n = Math.max(0, Math.min(count, 6));

  if (profile === "commerce") {
    return r.sample(PRODUCTS, n).map(([name, price], i) => ({
      id: `item-${i + 1}`,
      title: name[ctx.locale],
      meta: formatMoney(price, ctx.locale),
      art: artOf(i),
    }));
  }
  if (profile === "media") {
    const episode = ctx.locale === "es" ? "Episodio" : "Episode";
    return r.sample(EPISODES, n).map(([title, minutes], i) => ({
      id: `item-${i + 1}`,
      title: title[ctx.locale],
      meta: `${episode} ${r.int(4, 48)} · ${formatDuration(minutes * 60, ctx.locale)}`,
      art: artOf(i),
    }));
  }
  if (profile === "creative") {
    const clients = r.sample(COMPANY_NAMES, n);
    return r.sample(DISCIPLINES, n).map((discipline, i) => ({
      id: `item-${i + 1}`,
      title: clients[i] as string,
      meta: discipline[ctx.locale],
      art: artOf(i),
    }));
  }
  return featureList(ctx, n).map((feature, i) => ({
    id: `item-${i + 1}`,
    title: feature.title,
    meta: "",
    art: artOf(i),
    icon: feature.icon,
  }));
}
