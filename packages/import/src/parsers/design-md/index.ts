import { detectedBy, type Parser } from "../../registry";

/** DESIGN.md: YAML front matter (colors, typography, rounded, spacing, components) and prose notes. */
export const designMdParser: Parser = {
  id: "design-md",
  kind: "design-md",
  version: "1.0.0",
  detect: detectedBy("design-md"),
  parse: (input, ctx) => import("./parse").then((m) => m.parse(input, ctx)),
};
