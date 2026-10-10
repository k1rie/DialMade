import type { FigmaPlan } from "@dialmade/handoff/figma-plan";

/** UI → main thread. */
export type ToMain = { type: "create"; plan: FigmaPlan; options: { dark: boolean; flow: boolean } } | { type: "close" };

export type Report = {
  variables: { created: number; updated: number };
  textStyles: number;
  effectStyles: number;
  pages: number;
  frames: number;
  links: number;
  /** «Satoshi → Inter». */
  missingFonts: string[];
  warnings: string[];
};

/** Main thread → UI. */
export type ToUi = { type: "progress"; message: string } | { type: "done"; report: Report } | { type: "error"; message: string };
