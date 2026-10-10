import type { LocalizedText, Locale } from "@dialmade/catalog";
import { localize } from "../../content/generators";
import { COMPANY_NAMES, personName } from "../../content/people";
import { contentProfileOf } from "../../content/profiles";
import { rngFor } from "../../content/rng";
import { t } from "../../content/t";
import type { ContentContext } from "../../types";

export const FORM_PURPOSES = ["login", "signup", "contact", "search", "generic"] as const;
export type FormPurpose = (typeof FORM_PURPOSES)[number];

export const FIELD_KINDS = ["text", "email", "password", "tel", "search", "textarea", "select", "checkbox"] as const;
export type FieldKind = (typeof FIELD_KINDS)[number];

/** Ids of the stored field pool. A purpose shows a subset, in its own order. */
export const FIELD_IDS = [
  "name",
  "email",
  "password",
  "company",
  "phone",
  "subject",
  "message",
  "query",
  "category",
  "remember",
  "terms",
] as const;
export type FieldId = (typeof FIELD_IDS)[number];

export interface UiFormField {
  id: string;
  label: string;
  kind: FieldKind;
  placeholder: string;
  required: boolean;
  options?: string[];
}

/**
 * Fields each purpose shows, in order; `count` cuts the list. Every purpose reads the same stored pool, so
 * switching purpose (or the note changing it) never loses an edited label.
 */
export const PURPOSE_FIELDS: Readonly<Record<FormPurpose, readonly FieldId[]>> = {
  login: ["email", "password", "remember"],
  signup: ["email", "password", "name", "terms"],
  contact: ["name", "email", "message", "company", "phone", "subject"],
  search: ["query", "category"],
  generic: ["name", "email", "company", "phone", "subject", "message"],
};

interface PurposeCopy {
  title: LocalizedText;
  description: LocalizedText;
  submit: LocalizedText;
  secondary: LocalizedText;
}

/** Texts of each purpose, used while the block keeps no text of its own for them (see `ui.form`). */
const PURPOSE_COPY: Readonly<Record<FormPurpose, PurposeCopy>> = {
  login: {
    title: t("Inicia sesión en {name}", "Sign in to {name}"),
    description: t("Qué bueno verte de nuevo.", "Good to see you again."),
    submit: t("Iniciar sesión", "Sign in"),
    secondary: t("¿Olvidaste tu contraseña?", "Forgot your password?"),
  },
  signup: {
    title: t("Crea tu cuenta", "Create your account"),
    description: t("Empieza gratis en menos de un minuto.", "Get started free in under a minute."),
    submit: t("Crear cuenta", "Create account"),
    secondary: t("¿Ya tienes cuenta? Inicia sesión", "Already have an account? Sign in"),
  },
  contact: {
    title: t("Hablemos", "Get in touch"),
    description: t("Te respondemos en un día hábil.", "We reply within one business day."),
    submit: t("Enviar mensaje", "Send message"),
    secondary: t("", ""),
  },
  search: {
    title: t("Buscar en {name}", "Search {name}"),
    description: t("", ""),
    submit: t("Buscar", "Search"),
    secondary: t("Limpiar filtros", "Clear filters"),
  },
  generic: {
    title: t("Tus datos", "Your details"),
    description: t("Completa el formulario y te contactamos.", "Fill in the form and we will get back to you."),
    submit: t("Enviar", "Submit"),
    secondary: t("Cancelar", "Cancel"),
  },
};

export type PurposeText = keyof PurposeCopy;

/** Default text of a purpose («Iniciar sesión»), with the brand name filled in. */
export function purposeText(purpose: FormPurpose, key: PurposeText, ctx: Pick<ContentContext, "brand" | "locale">): string {
  return localize(PURPOSE_COPY[purpose][key], ctx);
}

const SUBJECTS: readonly LocalizedText[] = [t("Ventas", "Sales"), t("Soporte", "Support"), t("Prensa", "Press"), t("Otro", "Other")];

const label = (es: string, en: string, locale: Locale) => (locale === "es" ? es : en);

/**
 * The stored field pool (11 fields), localized. Placeholders use fictional people and companies; the
 * search categories are the profile's own app sections («Pedidos», «Productos»…).
 */
export function uiFormFields(ctx: ContentContext): UiFormField[] {
  const { locale } = ctx;
  const r = rngFor(ctx.seed, `${ctx.productType.id}:ui-form`);
  const profile = contentProfileOf(ctx.productType);
  const categories = profile.appNav.slice(1, 5).map((item) => item.label[locale]);
  return [
    { id: "name", label: label("Nombre", "Full name", locale), kind: "text", placeholder: personName(r, locale), required: true },
    {
      id: "email",
      label: label("Correo electrónico", "Email", locale),
      kind: "email",
      placeholder: label("tu@correo.com", "you@company.com", locale),
      required: true,
    },
    {
      id: "password",
      label: label("Contraseña", "Password", locale),
      kind: "password",
      placeholder: label("Mínimo 8 caracteres", "At least 8 characters", locale),
      required: true,
    },
    { id: "company", label: label("Empresa", "Company", locale), kind: "text", placeholder: r.pick(COMPANY_NAMES), required: false },
    {
      id: "phone",
      label: label("Teléfono", "Phone", locale),
      kind: "tel",
      placeholder: label("+52 55 1234 5678", "+1 (555) 012-3456", locale),
      required: false,
    },
    {
      id: "subject",
      label: label("Asunto", "Topic", locale),
      kind: "select",
      placeholder: label("Elige un tema", "Choose a topic", locale),
      required: false,
      options: SUBJECTS.map((subject) => subject[locale]),
    },
    {
      id: "message",
      label: label("Mensaje", "Message", locale),
      kind: "textarea",
      placeholder: label("Cuéntanos en qué te podemos ayudar", "Tell us how we can help", locale),
      required: true,
    },
    {
      id: "query",
      label: label("Buscar", "Search", locale),
      kind: "search",
      placeholder: label(`Buscar en ${ctx.brand.name}`, `Search ${ctx.brand.name}`, locale),
      required: false,
    },
    {
      id: "category",
      label: label("Categoría", "Category", locale),
      kind: "select",
      placeholder: label("Todas", "All", locale),
      required: false,
      options: categories.length > 0 ? categories : SUBJECTS.map((subject) => subject[locale]),
    },
    { id: "remember", label: label("Recordarme", "Remember me", locale), kind: "checkbox", placeholder: "", required: false },
    {
      id: "terms",
      label: label("Acepto los términos y la política de privacidad", "I agree to the terms and the privacy policy", locale),
      kind: "checkbox",
      placeholder: "",
      required: true,
    },
  ];
}

/** Fields a purpose shows, in its order, cut to `count`. Ids missing from `fields` are skipped. */
export function visibleFields<F extends { id: string }>(fields: readonly F[], purpose: FormPurpose, count: number): F[] {
  const byId = new Map(fields.map((field) => [field.id, field]));
  const ordered = PURPOSE_FIELDS[purpose].map((id) => byId.get(id)).filter((field): field is F => field !== undefined);
  return ordered.slice(0, Math.max(1, count));
}
