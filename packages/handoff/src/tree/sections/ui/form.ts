// ui.form (`Form` + `FormField`): sign in, sign up, contact, search or a generic form with the kit's controls,
// as a centered card or full width (two columns of fields when the block is wide). The purpose texts and field
// order repeat `ui/content/form.ts` of @dialmade/sections (not exported).
import type { Locale } from "@dialmade/catalog";
import type { SectionBuilder } from "../../context";
import { button, card, column, frame, num, records, row, str, text } from "../../nodes";
import type { DesignNode, FrameNode } from "../../types";
import { blockGeometry, control, innerWidth, uiBlock, uiFrameOf, type ControlKind, type ControlSpec } from "./shared";

type Purpose = "login" | "signup" | "contact" | "search" | "generic";
type PurposeText = "title" | "description" | "submit" | "secondary";

const PURPOSE_FIELDS: Readonly<Record<Purpose, readonly string[]>> = {
  login: ["email", "password", "remember"],
  signup: ["email", "password", "name", "terms"],
  contact: ["name", "email", "message", "company", "phone", "subject"],
  search: ["query", "category"],
  generic: ["name", "email", "company", "phone", "subject", "message"],
};

const PURPOSE_COPY: Readonly<Record<Purpose, Record<PurposeText, Record<Locale, string>>>> = {
  login: {
    title: { es: "Inicia sesión en {name}", en: "Sign in to {name}" },
    description: { es: "Qué bueno verte de nuevo.", en: "Good to see you again." },
    submit: { es: "Iniciar sesión", en: "Sign in" },
    secondary: { es: "¿Olvidaste tu contraseña?", en: "Forgot your password?" },
  },
  signup: {
    title: { es: "Crea tu cuenta", en: "Create your account" },
    description: { es: "Empieza gratis en menos de un minuto.", en: "Get started free in under a minute." },
    submit: { es: "Crear cuenta", en: "Create account" },
    secondary: { es: "¿Ya tienes cuenta? Inicia sesión", en: "Already have an account? Sign in" },
  },
  contact: {
    title: { es: "Hablemos", en: "Get in touch" },
    description: { es: "Te respondemos en un día hábil.", en: "We reply within one business day." },
    submit: { es: "Enviar mensaje", en: "Send message" },
    secondary: { es: "", en: "" },
  },
  search: {
    title: { es: "Buscar en {name}", en: "Search {name}" },
    description: { es: "", en: "" },
    submit: { es: "Buscar", en: "Search" },
    secondary: { es: "Limpiar filtros", en: "Clear filters" },
  },
  generic: {
    title: { es: "Tus datos", en: "Your details" },
    description: { es: "Completa el formulario y te contactamos.", en: "Fill in the form and we will get back to you." },
    submit: { es: "Enviar", en: "Submit" },
    secondary: { es: "Cancelar", en: "Cancel" },
  },
};

const PURPOSES: readonly Purpose[] = ["login", "signup", "contact", "search", "generic"];
const KINDS: readonly ControlKind[] = ["text", "email", "password", "tel", "search", "textarea", "select", "checkbox"];

const purposeOf = (value: unknown): Purpose => (PURPOSES as readonly unknown[]).includes(value) ? (value as Purpose) : "generic";

export const formBuilder: SectionBuilder = ({ id, props, variant, ctx, build }) => {
  const frameKind = uiFrameOf(props.frame);
  const purpose = purposeOf(props.purpose);
  const cardVariant = variant === "card";
  const width = innerWidth(blockGeometry(ctx, id), frameKind, build);
  // `@container dl-ui-form (width >= 40rem)`: plain forms lay their fields in two columns.
  const wide = !cardVariant && width !== null && width >= 640;
  const own = (key: PurposeText) => (typeof props[key] === "string" ? (props[key] as string) : undefined);
  const purposeText = (key: PurposeText) => PURPOSE_COPY[purpose][key][ctx.locale].replace("{name}", ctx.brand.name);
  const textOf = (key: PurposeText) => own(key) ?? purposeText(key);
  const heading = textOf("title");
  const intro = textOf("description");
  const submit = textOf("submit") || purposeText("submit");
  const secondary = textOf("secondary");
  const linkSecondary = purpose === "login" || purpose === "signup";

  const pool = records(props.fields);
  const byId = new Map(pool.map((field) => [str(field.id), field]));
  const shown = PURPOSE_FIELDS[purpose]
    .map((fieldId) => byId.get(fieldId))
    .filter((field): field is Record<string, unknown> => field !== undefined)
    .slice(0, Math.max(1, num(props.count, 4)));
  const specs: ControlSpec[] = shown.map((field) => ({
    label: str(field.label),
    kind: (KINDS as readonly unknown[]).includes(field.kind) ? (field.kind as ControlKind) : "text",
    placeholder: str(field.placeholder),
    required: field.required === true,
  }));

  const search = wide && purpose === "search";
  let fields: FrameNode;
  if (search) {
    // Query and filters on one line (2fr 1fr), the button beside them.
    fields = frame({
      name: "Fields",
      width: "fill",
      layout: { kind: "grid", columns: 3, gap: 4 },
      children: specs.map((spec, i) => ({ ...control(spec), place: { col: i === 0 ? 0 : 2, span: i === 0 ? 2 : 1, row: Math.max(0, i - 1) } })),
    });
  } else if (wide) {
    // Two columns; a textarea or checkbox takes the whole row.
    let col = 0;
    let line = 0;
    const children: DesignNode[] = specs.map((spec) => {
      const full = spec.kind === "textarea" || spec.kind === "checkbox";
      if (full && col === 1) {
        line++;
        col = 0;
      }
      const place = { col, span: full ? 2 : 1, row: line };
      if (full || col === 1) {
        line++;
        col = 0;
      } else {
        col = 1;
      }
      return { ...control(spec), place };
    });
    fields = frame({ name: "Fields", width: "fill", layout: { kind: "grid", columns: 2, gap: 4, rowGap: 4 }, children });
  } else {
    fields = column({ name: "Fields", width: "fill", gap: 4 }, specs.map(control));
  }

  const target = ctx.linkTarget?.(id) ?? undefined;
  const submitButton = button(submit, { variant: "primary", linkTo: target, width: cardVariant ? "fill" : "hug" });
  const secondaryNode = secondary
    ? linkSecondary
      ? text(secondary, "small", { color: "primary-text", tag: "span", align: "center", width: cardVariant ? "fill" : "hug", weight: 500 })
      : button(secondary, { variant: "ghost" })
    : null;
  const actions = cardVariant
    ? column({ name: "Actions", width: "fill", gap: 3, align: "stretch" }, [submitButton, secondaryNode])
    : row({ name: "Actions", width: search ? "hug" : "fill", gap: 3, align: "center", wrap: true }, [submitButton, secondaryNode]);

  const introNode =
    heading || intro
      ? column({ name: "Intro", width: "fill", gap: 1 }, [
          text(heading, "h3", { tag: props.level === "h1" ? "h1" : "h2", align: cardVariant ? "center" : "start", name: "Title" }),
          text(intro, "small", { color: "muted-foreground", tag: "p", align: cardVariant ? "center" : "start" }),
        ])
      : null;
  const formNode = search
    ? row({ name: "Form", tag: "form", width: "fill", gap: 5, align: "end" }, [{ ...fields, width: "fill" }, actions])
    : column({ name: "Form", tag: "form", width: "fill", gap: 5 }, [fields, actions]);

  const panel = cardVariant
    ? card("Panel", [introNode, formNode], { gap: 5, maxWidth: 416, width: "fill" })
    : column({ name: "Panel", width: "fill", gap: 5 }, [introNode, formNode]);

  return uiBlock("Form", frameKind, [cardVariant ? column({ name: "Center", width: "fill", align: "center" }, [panel]) : panel], { justify: "center" });
};
