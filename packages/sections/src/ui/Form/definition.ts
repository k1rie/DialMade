import { t } from "../../content/t";
import { defineSection } from "../../defineSection";
import type { KnobOption } from "../../types";
import { uiFormFields } from "../content";
import { fitForm } from "./fit";
import { Form } from "./Form";
import { formSchema, type FormProps } from "./schema";
import { visibleForm } from "./visible";

const PURPOSE_OPTIONS: readonly KnobOption[] = [
  { value: "login", label: t("Iniciar sesión", "Sign in") },
  { value: "signup", label: t("Registro", "Sign up") },
  { value: "contact", label: t("Contacto", "Contact") },
  { value: "search", label: t("Búsqueda", "Search") },
  { value: "generic", label: t("Datos", "Details") },
];

export const formSection = defineSection<FormProps>({
  type: "ui.form",
  kind: "app",
  label: t("Formulario", "Form"),
  description: t("Inicio de sesión, registro, contacto o búsqueda.", "Sign in, sign up, contact or search."),
  variants: [
    { id: "card", label: t("Tarjeta centrada", "Centered card") },
    { id: "plain", label: t("A todo el ancho", "Full width") },
  ],
  schema: formSchema,
  knobs: [
    { key: "variant", label: t("Estilo", "Style"), control: "select", scope: "section" },
    { key: "purpose", label: t("Para qué es", "Purpose"), control: "select", options: PURPOSE_OPTIONS, scope: "section" },
    { key: "count", label: t("Campos", "Fields"), control: "slider", min: 1, max: 6, step: 1, scope: "section" },
    { key: "title", label: t("Título", "Title"), control: "text", scope: "section" },
    { key: "submit", label: t("Botón", "Button"), control: "text", scope: "section" },
  ],
  defaultProps: (ctx) => ({ purpose: "generic", fields: uiFormFields(ctx), count: 4, frame: "plain" }),
  layout: { owns: ["purpose", "count", "frame"], fit: fitForm },
  visible: visibleForm,
  Component: Form,
});
