import type { LocalizedText } from "@dialmade/catalog";
import type { LibraryBlockType, ScreenKind } from "@dialmade/layout";
import type { ShellScreenPurpose } from "../../app/Shell/screenCopy";
import { ctaCopy, heroCopy, localize, sectionHeading } from "../../content/generators";
import { contentProfileOf } from "../../content/profiles";
import { rngFor } from "../../content/rng";
import { t } from "../../content/t";
import type { ContentContext } from "../../types";
import { uiStrings } from "./strings";

export interface UiTextCopy {
  eyebrow: string;
  title: string;
  body: string;
  action: string;
}

/**
 * Copy of a free text block: a heading of the profile (features, testimonials or one of its CTA titles),
 * a subtitle as body and the secondary CTA as action. Deterministic by seed: text blocks with different
 * seeds (`deriveSeed(seed, blockId)`) get different headings. Marketing copy: for a text block on a screen,
 * `uiScreenTextCopy` picks copy for what the screen is for.
 */
export function uiTextCopy(ctx: ContentContext): UiTextCopy {
  const profile = contentProfileOf(ctx.productType);
  const r = rngFor(ctx.seed, `${ctx.productType.id}:ui-text`);
  const hero = heroCopy(ctx);
  const features = sectionHeading(ctx, "features");
  const testimonials = sectionHeading(ctx, "testimonials");
  const cta = ctaCopy(ctx);
  // Title and body are picked apart, so two text blocks of a screen rarely repeat both.
  const title = r.pick([features.title, cta.title, testimonials.title, ...profile.cta.titles.map((text) => localize(text, ctx))]);
  const body = r.pick([features.subtitle, cta.subtitle, hero.subtitle, ...profile.hero.subtitles.map((text) => localize(text, ctx))]);
  return {
    eyebrow: localize(r.pick(profile.hero.eyebrows), ctx),
    title,
    body,
    action: hero.secondaryCta,
  };
}

/* ------------------------------------------------------------------------------------------------ */
/* Text blocks on screens (Modo Layout)                                                             */
/* ------------------------------------------------------------------------------------------------ */

/** What a landing screen is for, as its intro text tells it. `home` and `generic` keep the marketing pool. */
export const LANDING_SCREEN_PURPOSES = ["pricing", "contact", "about", "customers", "features", "blog", "home", "generic"] as const;
export type LandingScreenPurpose = (typeof LANDING_SCREEN_PURPOSES)[number];

/** Purposes of an app screen: the same as its frame's page header (`shellScreenPurpose`). */
export type AppTextPurpose = ShellScreenPurpose;

/**
 * Words of a landing screen name that give its purpose, es and en, accents and case ignored, checked in order
 * (the first purpose with a match wins).
 */
const LANDING_KEYWORDS: readonly (readonly [LandingScreenPurpose, readonly string[]])[] = [
  ["pricing", ["precios", "precio", "pricing", "prices", "price", "planes", "plans", "tarifas", "suscripcion", "suscripciones", "subscription"]],
  ["contact", ["contacto", "contact", "contactanos", "soporte", "support", "ayuda", "help", "hablemos"]],
  ["about", ["nosotros", "about", "empresa", "company", "equipo", "team", "historia", "story", "mision", "mission", "quienes"]],
  ["customers", ["clientes", "customers", "casos", "cases", "testimonios", "testimonials", "historias", "stories"]],
  ["features", ["caracteristicas", "features", "producto", "product", "funciones", "funcionalidades", "soluciones", "solutions", "tour"]],
  ["blog", ["blog", "noticias", "news", "recursos", "resources", "novedades", "articulos", "articles", "guias", "guides"]],
  ["home", ["inicio", "home", "portada", "bienvenida", "welcome"]],
];

const words = (name: string): Set<string> =>
  new Set(
    name
      .normalize("NFD")
      .replace(/[̀-ͯ]/g, "")
      .toLowerCase()
      .split(/[^a-z0-9]+/)
      .filter(Boolean),
  );

/**
 * The purpose of a landing screen: the words of its name first (es and en), then its visible blocks (a pricing
 * table → pricing, a form → contact, testimonials → customers, a hero → home). `generic` when nothing tells.
 */
export function landingScreenPurpose(name: string, blocks: readonly LibraryBlockType[]): LandingScreenPurpose {
  const nameWords = words(name);
  for (const [purpose, keywords] of LANDING_KEYWORDS) {
    if (keywords.some((keyword) => nameWords.has(keyword))) return purpose;
  }
  if (blocks.includes("hero")) return "home";
  if (blocks.includes("pricing")) return "pricing";
  if (blocks.includes("form")) return "contact";
  if (blocks.includes("testimonials")) return "customers";
  return "generic";
}

type PurposeCopy = {
  eyebrow: LocalizedText;
  titles: readonly LocalizedText[];
  bodies: readonly LocalizedText[];
  action: LocalizedText;
};

/** Intro copy of a landing screen (`{name}` → brand). `home` and `generic` use the marketing pool instead. */
const LANDING_COPY: Readonly<Record<Exclude<LandingScreenPurpose, "home" | "generic">, PurposeCopy>> = {
  pricing: {
    eyebrow: t("Precios", "Pricing"),
    titles: [t("Un plan para cada etapa", "A plan for every stage"), t("Precios claros, sin sorpresas", "Clear pricing, no surprises"), t("Elige cómo empezar", "Choose how to start")],
    bodies: [
      t("Cambia de plan o cancela cuando quieras, sin permanencia.", "Switch plans or cancel anytime, no lock-in."),
      t("Todos los planes incluyen soporte y actualizaciones.", "Every plan includes support and updates."),
    ],
    action: t("Comparar planes", "Compare plans"),
  },
  contact: {
    eyebrow: t("Contacto", "Contact"),
    titles: [t("Hablemos", "Let's talk"), t("¿En qué podemos ayudarte?", "How can we help?")],
    bodies: [
      t("Cuéntanos qué necesitas y te respondemos en menos de un día laborable.", "Tell us what you need and we'll get back to you within one business day."),
      t("Escríbenos con tus dudas: una persona del equipo te contesta.", "Send us your questions: a real person on the team will reply."),
    ],
    action: t("Escríbenos", "Write to us"),
  },
  about: {
    eyebrow: t("Sobre nosotros", "About us"),
    titles: [t("Quiénes somos", "Who we are"), t("Detrás de {name}", "Behind {name}")],
    bodies: [
      t("Somos un equipo pequeño que construye {name} escuchando a quienes lo usan cada día.", "We're a small team building {name} by listening to the people who use it every day."),
      t("Creemos en herramientas sencillas que respetan tu tiempo.", "We believe in simple tools that respect your time."),
    ],
    action: t("Conoce al equipo", "Meet the team"),
  },
  customers: {
    eyebrow: t("Clientes", "Customers"),
    titles: [t("Equipos que ya confían en {name}", "Teams that already trust {name}"), t("Historias de clientes", "Customer stories")],
    bodies: [
      t("Así trabajan con {name} equipos de todos los tamaños.", "How teams of every size work with {name}."),
      t("Casos reales, resultados medibles y lo que aprendieron por el camino.", "Real cases, measurable results and what they learned along the way."),
    ],
    action: t("Ver casos", "See case studies"),
  },
  features: {
    eyebrow: t("Producto", "Product"),
    titles: [t("Todo lo que {name} hace por ti", "Everything {name} does for you"), t("Cómo funciona {name}", "How {name} works")],
    bodies: [
      t("Herramientas pensadas para el día a día, sin curva de aprendizaje.", "Tools made for everyday work, with no learning curve."),
      t("Un recorrido por lo que puedes hacer desde el primer día.", "A tour of what you can do from day one."),
    ],
    action: t("Ver todas las funciones", "See all features"),
  },
  blog: {
    eyebrow: t("Blog", "Blog"),
    titles: [t("Ideas, guías y novedades", "Ideas, guides and news"), t("Lo último de {name}", "The latest from {name}")],
    bodies: [
      t("Consejos prácticos y novedades del producto, cada semana.", "Practical tips and product news, every week."),
      t("Lo que aprendemos construyendo {name}, contado sin rodeos.", "What we learn building {name}, told plainly."),
    ],
    action: t("Ver todos los artículos", "See all articles"),
  },
};

/**
 * Copy of a text block on an app screen, by purpose: never marketing (no hero eyebrows or CTA titles), and no
 * eyebrow (the frame's page header already names the screen). Bodies never repeat the frame's subtitle for the
 * same purpose (`shellScreenCopy`).
 */
const APP_COPY: Readonly<Record<AppTextPurpose, Omit<PurposeCopy, "eyebrow">>> = {
  overview: {
    titles: [t("Lo más importante hoy", "What matters today"), t("Resumen de la semana", "This week at a glance"), t("Cómo vamos", "How we're doing")],
    bodies: [
      t("Las cifras clave y lo que ha cambiado desde tu última visita.", "The key numbers and what changed since your last visit."),
      t("Un vistazo rápido antes de entrar en el detalle de cada informe.", "A quick look before you dig into each report."),
    ],
    action: t("Ver informe", "View report"),
  },
  list: {
    titles: [t("Todos los registros", "All records"), t("En esta lista", "In this list"), t("Pendientes de revisar", "Waiting for review")],
    bodies: [
      t("Filtra por estado o responsable para encontrar lo que buscas.", "Filter by status or owner to find what you need."),
      t("Los cambios recientes aparecen primero.", "Recent changes show up first."),
    ],
    action: t("Ver todos", "View all"),
  },
  detail: {
    titles: [t("Información general", "General information"), t("Estado actual", "Current status"), t("Notas del equipo", "Team notes")],
    bodies: [
      t("Responsables, fechas y próximos pasos, en un solo vistazo.", "Owners, dates and next steps, at a glance."),
      t("Lo que conviene saber antes de seguir: contexto, acuerdos y pendientes.", "What to know before moving on: context, agreements and open items."),
    ],
    action: t("Ver historial", "View history"),
  },
  settings: {
    titles: [t("Preferencias", "Preferences"), t("Tu espacio de trabajo", "Your workspace"), t("Seguridad y acceso", "Security and access")],
    bodies: [
      t("Los cambios se guardan al momento y se aplican a todo el equipo.", "Changes save instantly and apply to the whole team."),
      t("Decide quién puede ver y editar cada parte de tu espacio.", "Decide who can see and edit each part of your workspace."),
    ],
    action: t("Ver todos los ajustes", "View all settings"),
  },
  profile: {
    titles: [t("Sobre mí", "About me"), t("Biografía", "Bio"), t("Experiencia", "Experience")],
    bodies: [
      t("Un poco de contexto: en qué trabajo, cómo me gusta colaborar y dónde encontrarme.", "A bit of context: what I work on, how I like to collaborate and where to find me."),
      t("Proyectos recientes, especialidades y disponibilidad para nuevos encargos.", "Recent projects, specialties and availability for new work."),
    ],
    action: t("Ver actividad", "View activity"),
  },
  calendar: {
    titles: [t("Próximos días", "Coming up"), t("Tu agenda", "Your schedule"), t("Esta semana", "This week")],
    bodies: [
      t("Revisa lo que viene y reserva huecos sin salir de aquí.", "Check what's ahead and book slots without leaving this page."),
      t("Los cambios de última hora aparecen marcados.", "Last-minute changes are highlighted."),
    ],
    action: t("Ver calendario", "View calendar"),
  },
  form: {
    titles: [t("Antes de empezar", "Before you start"), t("Datos principales", "Main details"), t("Un último paso", "One last step")],
    bodies: [
      t("Los campos con asterisco son obligatorios; puedes guardar y seguir más tarde.", "Fields with an asterisk are required; you can save and come back later."),
      t("Tardarás unos dos minutos. Puedes cambiar estos datos cuando quieras.", "It takes about two minutes. You can change these details anytime."),
    ],
    action: t("Ver instrucciones", "View instructions"),
  },
  checkout: {
    titles: [t("Casi listo", "Almost there"), t("Resumen de tu pedido", "Your order summary"), t("Pago seguro", "Secure payment")],
    bodies: [
      t("Revisa los datos antes de confirmar; podrás cambiarlos hasta el envío.", "Check the details before confirming; you can change them until shipping."),
      t("Tus datos de pago viajan cifrados y nunca se guardan sin tu permiso.", "Your payment details are encrypted and never stored without your permission."),
    ],
    action: t("Ver condiciones", "View terms"),
  },
  generic: {
    titles: [t("Lo esencial", "The essentials"), t("En esta sección", "In this section"), t("Primeros pasos", "Getting started")],
    bodies: [
      t("Todo lo importante de esta parte, ordenado para encontrarlo rápido.", "Everything important here, organized so you find it fast."),
      t("Empieza por aquí: lo demás está a un clic.", "Start here: everything else is one click away."),
    ],
    action: t("Ver más", "See more"),
  },
};

/** A text block on a screen: what the screen is for, and whether it is the screen's intro (its first text). */
export type UiTextScreen =
  | { kind: Extract<ScreenKind, "landing">; purpose: LandingScreenPurpose; intro: boolean }
  | { kind: Extract<ScreenKind, "app">; purpose: AppTextPurpose; intro: boolean };

function purposeCopy(copy: Omit<PurposeCopy, "eyebrow"> & { eyebrow?: LocalizedText }, ctx: ContentContext, label: string): UiTextCopy {
  const r = rngFor(ctx.seed, `${ctx.productType.id}:${label}`);
  return {
    eyebrow: copy.eyebrow ? localize(copy.eyebrow, ctx) : "",
    title: localize(r.pick(copy.titles), ctx),
    body: localize(r.pick(copy.bodies), ctx),
    action: localize(copy.action, ctx),
  };
}

/**
 * Copy of a text block on a screen (Modo Layout, never on template pages), deterministic by seed:
 * - app screens: copy for the screen's purpose (detail, settings, profile…), never marketing copy;
 * - landing screens: the intro (first text) of a pricing, contact, about, customers, features or blog screen
 *   gets copy for that purpose; other text blocks, and the home or a generic screen, keep `uiTextCopy`.
 */
export function uiScreenTextCopy(ctx: ContentContext, screen: UiTextScreen): UiTextCopy {
  if (screen.kind === "app") return purposeCopy(APP_COPY[screen.purpose], ctx, `ui-text-app:${screen.purpose}`);
  if (!screen.intro || screen.purpose === "home" || screen.purpose === "generic") return uiTextCopy(ctx);
  return purposeCopy(LANDING_COPY[screen.purpose], ctx, `ui-text-landing:${screen.purpose}`);
}

export interface UiMediaCopy {
  alt: string;
  caption: string;
}

/** Accessible name of the CSS-only artwork («Vista del producto de Acme»); no caption by default. */
export function uiMediaCopy(ctx: ContentContext): UiMediaCopy {
  return { alt: uiStrings(ctx.locale).mediaAlt(ctx.brand.name), caption: "" };
}
