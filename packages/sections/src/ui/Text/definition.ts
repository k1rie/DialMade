import { t } from "../../content/t";
import { defineSection } from "../../defineSection";
import type { KnobOption } from "../../types";
import { uiTextCopy } from "../content";
import { fitText } from "./fit";
import { textSchema, type TextProps } from "./schema";
import { Text } from "./Text";
import { visibleText } from "./visible";

const LEVEL_OPTIONS: readonly KnobOption[] = [
  { value: "h1", label: t("Título de página (H1)", "Page title (H1)") },
  { value: "h2", label: t("Título de sección (H2)", "Section title (H2)") },
  { value: "h3", label: t("Subtítulo (H3)", "Subtitle (H3)") },
];

const ALIGN_OPTIONS: readonly KnobOption[] = [
  { value: "start", label: t("Izquierda", "Left") },
  { value: "center", label: t("Centrado", "Centered") },
];

export const textSection = defineSection<TextProps>({
  type: "ui.text",
  kind: "app",
  label: t("Texto", "Text"),
  description: t("Un título con su párrafo y una acción opcional.", "A heading with its paragraph and an optional action."),
  variants: [
    { id: "heading", label: t("Encabezado", "Heading") },
    { id: "prose", label: t("Párrafos", "Prose") },
    { id: "callout", label: t("Destacado", "Callout") },
  ],
  schema: textSchema,
  knobs: [
    { key: "variant", label: t("Estilo", "Style"), control: "select", scope: "section" },
    { key: "align", label: t("Alineación", "Alignment"), control: "select", options: ALIGN_OPTIONS, scope: "section" },
    { key: "level", label: t("Nivel del título", "Heading level"), control: "select", options: LEVEL_OPTIONS, scope: "section" },
    { key: "title", label: t("Título", "Title"), control: "text", scope: "section" },
    { key: "action", label: t("Acción", "Action"), control: "text", scope: "section" },
  ],
  defaultProps: (ctx) => {
    const copy = uiTextCopy(ctx);
    return {
      eyebrow: copy.eyebrow,
      title: copy.title,
      body: copy.body,
      action: copy.action,
      level: "h2",
      align: "start",
      showBody: true,
      showAction: true,
      frame: "plain",
    };
  },
  layout: { owns: ["level", "align", "showBody", "showAction", "frame"], fit: fitText },
  visible: visibleText,
  Component: Text,
});
