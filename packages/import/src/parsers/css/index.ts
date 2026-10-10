import { detectedBy, type Parser } from "../../registry";

/** CSS: shadcn (oklch and legacy HSL channels), Tailwind v4 @theme, compiled CSS; alpha kept. */
export const cssParser: Parser = {
  id: "css",
  kind: "css",
  version: "1.0.0",
  detect: detectedBy("css"),
  parse: (input, ctx) => import("./parse").then((m) => m.parse(input, ctx)),
};
