import type { LibraryBlockType } from "@dialmade/layout";
import type { LocalizedText } from "@dialmade/catalog";
import { contentProfileIdOf } from "../../content/profiles";
import { t } from "../../content/t";
import type { ContentProfileId } from "../../content/types";
import type { ContentContext } from "../../types";
import { appCopyOf, text } from "../content";

/**
 * What an app screen is for, as its frame's page header tells it: each purpose has its own subtitle and
 * primary action, so a Settings screen never repeats the Dashboard's «Así van tus cuentas este mes».
 */
export const SHELL_SCREEN_PURPOSES = [
  "overview",
  "list",
  "detail",
  "settings",
  "profile",
  "calendar",
  "form",
  "checkout",
  "generic",
] as const;
export type ShellScreenPurpose = (typeof SHELL_SCREEN_PURPOSES)[number];

/**
 * `app.shell` props that belong to one screen (its page header and its active nav item): never shared
 * between app screens, unlike the navigation, the brand, the user and the style.
 */
export const SHELL_SCREEN_KEYS = ["title", "subtitle", "primaryAction", "activeId", "showPageHeader"] as const;

/**
 * Words of a screen name that give its purpose, es and en, accents and case ignored. Checked in this order
 * (the first purpose with a match wins), so «Ajustes del perfil» is settings and «Nuevo pedido» a form.
 */
const NAME_KEYWORDS: readonly (readonly [ShellScreenPurpose, readonly string[]])[] = [
  ["checkout", ["checkout", "pago", "payment", "pagar", "pay", "carrito", "cart", "compra", "purchase"]],
  [
    "settings",
    ["ajustes", "settings", "configuracion", "configuration", "config", "preferencias", "preferences", "opciones", "options", "cuenta", "account", "seguridad", "security", "privacidad", "privacy"],
  ],
  [
    "calendar",
    ["calendario", "calendar", "agenda", "schedule", "horario", "horarios", "citas", "appointments", "reservas", "bookings", "eventos", "events", "planner"],
  ],
  ["profile", ["perfil", "profile", "usuario", "user", "bio", "biografia"]],
  ["detail", ["detalle", "detalles", "detail", "details", "ficha"]],
  ["form", ["nuevo", "nueva", "new", "crear", "create", "editar", "edit", "formulario", "form", "alta"]],
  [
    "list",
    ["lista", "list", "listado", "listing", "todos", "todas", "all", "elementos", "items", "registros", "records", "tabla", "table", "directorio", "directory", "inventario", "inventory", "catalogo", "catalog"],
  ],
  [
    "overview",
    ["dashboard", "panel", "resumen", "overview", "summary", "inicio", "home", "metricas", "metrics", "estadisticas", "statistics", "stats", "analitica", "analytics", "insights", "informes", "reports", "reportes"],
  ],
];

const words = (name: string): string[] =>
  name
    .normalize("NFD")
    .replace(/[̀-ͯ]/g, "")
    .toLowerCase()
    .split(/[^a-z0-9]+/)
    .filter(Boolean);

/**
 * The purpose of an app screen: the words of its name first (es and en), then its visible blocks (a settings
 * form → settings, a calendar → calendar, KPIs or a chart → overview, a form without a table → form, a table
 * or a list → list, media with cards → profile, media or text → detail). `generic` when nothing tells.
 */
export function shellScreenPurpose(name: string, blocks: readonly LibraryBlockType[]): ShellScreenPurpose {
  const nameWords = new Set(words(name));
  for (const [purpose, keywords] of NAME_KEYWORDS) {
    if (keywords.some((keyword) => nameWords.has(keyword))) return purpose;
  }
  const has = (type: LibraryBlockType) => blocks.includes(type);
  if (has("settings")) return "settings";
  if (has("calendar")) return "calendar";
  if (has("kpis") || has("chart")) return "overview";
  if (has("form") && !has("table")) return "form";
  if (has("table") || has("list")) return "list";
  if (has("media") && has("cards")) return "profile";
  if (has("media") || has("text")) return "detail";
  return "generic";
}

type ScreenCopy = { subtitle: LocalizedText; primaryAction: LocalizedText };

/** Copy of the purposes that do not depend on the product (overview, list, calendar and generic do). */
const PURPOSE_COPY: Readonly<Record<Exclude<ShellScreenPurpose, "overview" | "list" | "calendar" | "generic">, ScreenCopy>> = {
  detail: {
    subtitle: t("Toda la información en un solo sitio: estado, historial y archivos.", "Everything in one place: status, history and files."),
    primaryAction: t("Añadir nota", "Add note"),
  },
  settings: {
    subtitle: t("Tu espacio, tu equipo y tus preferencias.", "Your workspace, team and preferences."),
    primaryAction: t("Añadir miembro", "Add member"),
  },
  profile: {
    subtitle: t("Datos, actividad y lo que se comparte.", "Details, activity and what's shared."),
    primaryAction: t("Editar perfil", "Edit profile"),
  },
  form: {
    subtitle: t("Completa los datos y guarda los cambios.", "Fill in the details and save your changes."),
    primaryAction: t("Guardar borrador", "Save draft"),
  },
  checkout: {
    subtitle: t("Revisa tu pedido y completa el pago.", "Review your order and complete the payment."),
    primaryAction: t("Seguir comprando", "Continue shopping"),
  },
};

const LIST_SUBTITLE = t("Busca, filtra y ordena todos tus registros.", "Search, filter and sort all your records.");
const CALENDAR_SUBTITLE = t("Tus próximos días, de un vistazo.", "Your next few days at a glance.");
const CALENDAR_ACTION = t("Nuevo evento", "New event");
const GENERIC_SUBTITLE = t("Lo importante de esta sección, de un vistazo.", "What matters in this section, at a glance.");
/** Profiles whose dashboard action already schedules something (a calendar screen reuses it). */
const SCHEDULING_PROFILES: ReadonlySet<ContentProfileId> = new Set(["health", "services", "community"]);

/**
 * Subtitle and primary action of an app screen's page header, in the content's language and for its product:
 * the overview keeps the product's dashboard copy, a list or an unknown screen gets the product's «create»
 * action, a calendar the product's booking action when it has one. Deterministic, never empty.
 */
export function shellScreenCopy(
  purpose: ShellScreenPurpose,
  ctx: Pick<ContentContext, "locale" | "productType">,
): { subtitle: string; primaryAction: string } {
  const profile = appCopyOf(ctx);
  let copy: ScreenCopy;
  switch (purpose) {
    case "overview":
      copy = { subtitle: profile.subtitle, primaryAction: profile.primaryAction };
      break;
    case "list":
      copy = { subtitle: LIST_SUBTITLE, primaryAction: profile.empty.action };
      break;
    case "calendar":
      copy = {
        subtitle: CALENDAR_SUBTITLE,
        primaryAction: SCHEDULING_PROFILES.has(contentProfileIdOf(ctx.productType)) ? profile.primaryAction : CALENDAR_ACTION,
      };
      break;
    case "generic":
      copy = { subtitle: GENERIC_SUBTITLE, primaryAction: profile.empty.action };
      break;
    default:
      copy = PURPOSE_COPY[purpose];
  }
  return { subtitle: text(copy.subtitle, ctx), primaryAction: text(copy.primaryAction, ctx) };
}

/**
 * Every subtitle and primary action `shellScreenCopy` writes for this language and product: a stored value
 * in these sets was generated (the old shared dashboard copy included) and may be rewritten for the screen's
 * purpose; any other value is the user's or the AI's and is kept.
 */
export function shellCopyCandidates(ctx: Pick<ContentContext, "locale" | "productType">): {
  subtitle: ReadonlySet<string>;
  primaryAction: ReadonlySet<string>;
} {
  const subtitle = new Set<string>();
  const primaryAction = new Set<string>();
  for (const purpose of SHELL_SCREEN_PURPOSES) {
    const copy = shellScreenCopy(purpose, ctx);
    subtitle.add(copy.subtitle);
    primaryAction.add(copy.primaryAction);
  }
  return { subtitle, primaryAction };
}
