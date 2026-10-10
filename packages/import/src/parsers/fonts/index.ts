import { detectedBy, type Parser } from "../../registry";

const detected = detectedBy("fonts");

/**
 * Font names: pasted family lists and next/font imports (layout.tsx), never executed. A text file the
 * user marked «Fuente por nombre» is read as a list whatever it looks like.
 */
export const fontsParser: Parser = {
  id: "fonts",
  kind: "font-name",
  version: "1.0.0",
  detect: (file) =>
    detected(file) ??
    (file.role === "font" && file.detected.category === "text" && !file.detected.unsupported ? { format: "font-names", score: 1 } : null),
  parse: (input, ctx) => import("./parse").then((m) => m.parse(input, ctx)),
};
