import { t } from "../../content/t";
import { defineSection } from "../../defineSection";
import { appStrings, brandSlug } from "../content";
import { SettingsForm } from "./SettingsForm";
import { settingsFormSchema, type SettingsFormProps } from "./schema";

export const settingsFormSection = defineSection<SettingsFormProps>({
  type: "app.settingsForm",
  kind: "app",
  label: t("Formulario de ajustes", "Settings form"),
  description: t("Campos, selectores e interruptores con tu tema.", "Fields, selects and switches with your theme."),
  variants: [
    { id: "stacked", label: t("Apilado", "Stacked") },
    { id: "split", label: t("En dos columnas", "Two columns") },
  ],
  schema: settingsFormSchema,
  knobs: [
    { key: "variant", label: t("Composición", "Layout"), control: "select", scope: "section" },
    { key: "title", label: t("Título", "Title"), control: "text", scope: "section" },
    { key: "email", label: t("Correo", "Email"), control: "text", scope: "section" },
  ],
  bindings: { workspaceName: "brand.name", about: "brand.tagline" },
  defaultProps: (ctx) => {
    const strings = appStrings(ctx.locale).settings;
    return {
      title: strings.title,
      description: strings.description,
      workspaceName: ctx.brand.name,
      email: `${ctx.locale === "es" ? "hola" : "hello"}@${brandSlug(ctx.brand.name)}.com`,
      about: ctx.brand.tagline ?? strings.aboutFallback,
      language: ctx.locale,
      timezone: strings.timezones[0],
      notifications: strings.toggles.map((toggle, index) => ({ ...toggle, enabled: index < 2 })),
    };
  },
  layout: {
    owns: [],
    // Labels beside the fields need room: two columns from 8 grid columns.
    fit: ({ w }) => ({ variant: w >= 8 ? "split" : "stacked" }),
  },
  Component: SettingsForm,
});
