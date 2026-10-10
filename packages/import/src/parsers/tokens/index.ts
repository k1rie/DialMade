import { detectedBy, type Parser } from "../../registry";

const fromDetector = detectedBy("tokens");
const SNIFF = 64 * 1024;

/**
 * Token JSON: DTCG 2025.10 (+ resolver and local `$ref`), Figma's native export, Tokens Studio and
 * Style Dictionary. Refines the detector for Tokens Studio's multi-file sync (`$themes.json`,
 * `$metadata.json`), which has no `$value` to sniff.
 */
export const tokensParser: Parser = {
  id: "tokens",
  kind: "tokens",
  version: "1.0.0",
  detect(file) {
    const match = fromDetector(file);
    if (!match || match.format !== "json") return match;
    const head = (file.text ?? "").slice(0, SNIFF);
    const name = file.name.toLowerCase();
    if (name === "$themes.json" || head.includes('"selectedTokenSets"')) return { format: "tokens-studio", score: 0.9 };
    if (name === "$metadata.json" || head.includes('"tokenSetOrder"')) return { format: "tokens-studio", score: 0.9 };
    return match;
  },
  parse: (input, ctx) => import("./parse").then((m) => m.parse(input, ctx)),
};
