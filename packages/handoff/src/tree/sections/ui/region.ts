// ui.region (`Region`): a «Contenedor» (role `group`) paints its element wrapper — no surface, a card or a muted
// tint, and padding sm / md / lg (`Region.css`) — around its laid-out children. Scopes and inferred regions are
// structural (the walker lays them out itself): a transparent column of their children.
import type { SectionBuilder } from "../../context";
import { column } from "../../nodes";
import type { Space } from "../../types";

const PADDING: Record<string, Space> = { none: 0, sm: 3, md: 5, lg: 7 };

export const regionBuilder: SectionBuilder = ({ props, variant, children }) => {
  if (props.role === "scope" || props.role === "inferred") return column({ name: "Region", width: "fill" }, children);
  const padding = PADDING[typeof props.padding === "string" ? props.padding : "none"] ?? 0;
  const surface =
    variant === "card"
      ? { fill: { color: "card" }, stroke: { color: "border", card: true }, radius: "card" as const, shadow: "card" as const }
      : variant === "muted"
        ? { fill: { color: "muted", opacity: 0.55 }, radius: "lg" as const }
        : { radius: "lg" as const };
  return column({ name: "Group", width: "fill", ...surface, ...(padding !== 0 && { padding }) }, children);
};
