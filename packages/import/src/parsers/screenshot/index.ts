import { detectedBy, type Parser } from "../../registry";

export { aggregateScreenshots, type ScreenshotConsensus, type ScreenshotVote } from "./consensus";

/** Screenshots: mode, neutral tint, vibrancy and accent candidate from pixels (minCoverage 0.002). No AI. */
export const screenshotParser: Parser = {
  id: "screenshot",
  kind: "screenshot",
  version: "1.0.0",
  detect: detectedBy("screenshot"),
  parse: (input, ctx) => import("./parse").then((m) => m.parse(input, ctx)),
};
