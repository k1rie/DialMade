// «Maqueta · Presentable · Producto final» (the generator's quality tiers). A tier is how much care a generation asks
// for, never a model name: the effort the model may spend thinking, the output room that thinking needs, and a short
// quality brief at the end of the screen message. The free tier runs `mockup` only (the server ignores any other
// tier); with the user's key the tier combines with the model they chose; «mi Claude» gets the brief in the prompt.
import type { AiRenderTier } from "@dialmade/doc";

export { AI_RENDER_TIERS, type AiRenderTier } from "@dialmade/doc";

export type TierSettings = {
  effort: "low" | "medium" | "high";
  /** Output cap of one screen: thinking and HTML share it. */
  screenMaxTokens: number;
  /** Output cap of «Otra versión» / «Pedir cambio». */
  blockMaxTokens: number;
  /**
   * Closes the screen message. Empty for `mockup` on purpose: asking Haiku 5.5 to «check» its work switches its
   * adaptive thinking on and can cut a screen short (measured, see docs/design/diseno-con-ia-calidad.md).
   */
  brief: string;
  /** Output tokens per block relative to `mockup` (thinking included), for the cost estimate. */
  outputFactor: number;
};

export const TIER_SETTINGS: Readonly<Record<AiRenderTier, TierSettings>> = {
  mockup: { effort: "low", screenMaxTokens: 16_000, blockMaxTokens: 4_000, brief: "", outputFactor: 1 },
  presentable: {
    effort: "medium",
    screenMaxTokens: 24_000,
    blockMaxTokens: 8_000,
    brief:
      "Quality: presentable (this screen will be shown to a client). Every number agrees with its label, its chart and the other blocks; dates, names and amounts look real and stay consistent across the screen; no copy that sounds like a placeholder.",
    outputFactor: 1.6,
  },
  final: {
    effort: "high",
    screenMaxTokens: 32_000,
    blockMaxTokens: 12_000,
    brief:
      "Quality: final product. Everything a presentable screen needs, plus finished details in every block: specific microcopy, units and captions, states (selected, pending, empty), figures that add up across blocks, and each block's main gesture carried out precisely down to its small devices.",
    outputFactor: 2.4,
  },
};

export const tierSettings = (tier: AiRenderTier | undefined): TierSettings => TIER_SETTINGS[tier ?? "mockup"];

/**
 * The default model of each finish when the caller does not pick one (from the flow duel of 2026-10-11,
 * docs/design/prueba-skills.md): «Maqueta» is Haiku 5.5 with the frontend-design guidance, «Presentable» and
 * «Producto final» are Sonnet 5.5 (the final finish with more room and effort). A model picked with the user's key or
 * «Acceso completo» always wins; «Producto final» can also go to the developer's own agent through «mi Claude».
 */
export const TIER_MODEL: Readonly<Record<AiRenderTier, string>> = {
  mockup: "claude-haiku-5-5",
  presentable: "claude-sonnet-5-5",
  final: "claude-sonnet-5-5",
};

/** Output room of one page-mode screen: Haiku thinks long before a whole page; Sonnet writes it more tightly. */
export const pageScreenMaxTokens = (tier: AiRenderTier | undefined): number => ((tier ?? "mockup") === "mockup" ? 48_000 : Math.max(32_000, tierSettings(tier).screenMaxTokens));
