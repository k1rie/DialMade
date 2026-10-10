import { t } from "../../content/t";
import { defineSection } from "../../defineSection";
import { fitPlaceholder } from "./fit";
import { Placeholder } from "./Placeholder";
import { placeholderSchema, type PlaceholderProps } from "./schema";

export const placeholderSection = defineSection<PlaceholderProps>({
  type: "ui.placeholder",
  kind: "app",
  label: t("Bloque libre", "Free block"),
  description: t(
    "El hueco de un bloque libre o de uno que aún no existe, con su nombre y su nota.",
    "The slot of a free block or of one that does not exist yet, with its name and note.",
  ),
  variants: [
    { id: "dashed", label: t("Recuadro", "Dashed box") },
    { id: "skeleton", label: t("Esqueleto", "Skeleton") },
  ],
  schema: placeholderSchema,
  knobs: [{ key: "variant", label: t("Estilo", "Style"), control: "select", scope: "section" }],
  defaultProps: () => ({ blockType: "free", blockLabel: "", blockNote: "", soon: false, count: 0, frame: "plain" }),
  layout: { owns: ["blockType", "blockLabel", "blockNote", "soon", "count", "frame"], fit: fitPlaceholder },
  Component: Placeholder,
});
