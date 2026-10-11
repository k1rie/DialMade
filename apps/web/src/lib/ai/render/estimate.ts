// What «Generar con IA» and a block action will cost, per path, BEFORE calling (spec §5.5 and §10.1): the cost line
// «≈ $0,013 · 1 uso de 5 · 3 pantallas · ≈ 30 s», or with BYOK «≈ $0,55–0,75 con tu key (Opus 5.5)» plus «Más barato:
// Sonnet 5.5». Approximate on purpose and built from the real prompt texts: the free tier's server reserves the exact
// worst case with count_tokens and settles the real usage; BYOK and «mi Claude» are never billed by Dialmade.
//
// Model of one screen: the cached prefix (contract + art direction) is WRITTEN by the first screen of a session and
// READ by the others (./transport primes it), the screen data is plain input, and the output is ≈ 1100 tokens per
// block plus ≈ 10 % of thinking (probe, spec §11). Opus/Sonnet 5.5 use another tokenizer than Haiku 5.5, not measured
// against it: their range runs from 1.0 to 1.35 × (spec §5.5).
import {
  AI_RENDER_SYSTEM_PROMPT,
  artDirectionText,
  blockMessage,
  directionMessage,
  directionCandidates,
  screenMessage,
  tierSettings,
  type BlockActionInput,
  type RenderBrandInput,
  type RenderScreenInput,
} from "@dialmade/ai-render";
import type { AiRenderPath, AiRenderTier } from "@dialmade/doc";
import { AI_SESSION_SCREENS } from "../config";
import { priceFor } from "../pricing";
import { CHEAPER_BYOK_RENDER_MODEL } from "./byokModel";
import type { RenderDirectionAnswer } from "./transport";

/** Characters per token of the prompts (English rules + JSON data; the probe's system prompt: 2279 tokens). */
export const CHARS_PER_TOKEN = 3.6;
/** Output of one block (2.5 KB of HTML ≈ 1034 tokens in the probe) and of a container's surface. */
export const OUTPUT_TOKENS_PER_BLOCK = 1100;
export const OUTPUT_TOKENS_PER_SURFACE = 80;
export const THINKING_SHARE = 0.1;
/** Structured direction: the JSON answer plus thinking. */
export const DIRECTION_OUTPUT_TOKENS = 500;

/** Tokens per second and time to the first token (s). Haiku 5.5 measured (spec §15.1); the others are guesses. */
const SPEED: Readonly<Record<string, { tokensPerSecond: number; firstTokenSeconds: number; measured: boolean }>> = {
  "claude-haiku-5-5": { tokensPerSecond: 330, firstTokenSeconds: 2, measured: true },
  "claude-sonnet-5-5": { tokensPerSecond: 160, firstTokenSeconds: 4, measured: false },
  "claude-opus-5-5": { tokensPerSecond: 90, firstTokenSeconds: 6, measured: false },
};
const SLOWEST = SPEED["claude-opus-5-5"]!;
const speedOf = (model: string) => SPEED[Object.keys(SPEED).find((id) => model === id || model.startsWith(`${id}-`)) ?? ""] ?? SLOWEST;

/** Upper factor of the tokenizer range (Haiku 5.5 is the reference). */
const tokenizerFactor = (model: string) => (model.startsWith("claude-haiku") ? 1 : 1.35);

const tokens = (chars: number) => Math.ceil(chars / CHARS_PER_TOKEN);

/** A direction with the longest strings it can have: the cost line is computed before the direction exists. */
function sizingDirection(brand: RenderBrandInput, recipeId: string): RenderDirectionAnswer {
  const candidates = directionCandidates(1, recipeId, "auto");
  const axes = Object.fromEntries(Object.entries(candidates.axes).map(([axis, values]) => [axis, values[0]])) as RenderDirectionAnswer["axes"];
  return { axes, moves: candidates.moves.slice(0, 3), rationale: `${brand.name} `.repeat(40).slice(0, 280) };
}

type Tokens = { input: number; cacheWrite: number; cacheRead: number; output: number };

const costOf = (model: string, t: Tokens) => {
  const price = priceFor(model, t.input + t.cacheWrite + t.cacheRead);
  return (t.input * price.input + t.cacheWrite * price.cacheWrite + t.cacheRead * price.cacheRead + t.output * price.output) / 1_000_000;
};

const outputOf = (screen: Pick<RenderScreenInput, "blocks">) =>
  Math.round(screen.blocks.reduce((sum, block) => sum + (block.container ? OUTPUT_TOKENS_PER_SURFACE : OUTPUT_TOKENS_PER_BLOCK), 0) * (1 + THINKING_SHARE));

export type RenderEstimateInput = {
  path: AiRenderPath;
  model: string;
  brand: RenderBrandInput;
  /** The screens that will be designed, as the prompts will carry them (`screenInput`). */
  screens: readonly RenderScreenInput[];
  /** A new art direction is drawn first (the document has none yet, or «Otra versión» of it). */
  newDirection: boolean;
  /** Recipe of the direction candidates (sizes the direction prompt). */
  recipeId: string;
  /** «Maqueta · Presentable · Producto final»: more thinking and finer details cost more output (default `mockup`). */
  tier?: AiRenderTier;
};

export type CostRange = { minUsd: number; maxUsd: number };

export type RenderEstimate = CostRange & {
  path: AiRenderPath;
  model: string;
  screens: number;
  /** Free tier: free uses this generate takes, one per design session of ≤ 3 screens («6 pantallas = 2 usos»). */
  uses: number;
  /** Wall time with up to 3 screens in parallel, rounded to 5 s. */
  seconds: number;
  /** `false` when the speed of the model was never measured (Opus/Sonnet 5.5): say «≈» louder. */
  measured: boolean;
  /** BYOK on Opus 5.5: the same generate with Sonnet 5.5 («Más barato»). */
  cheaper?: CostRange & { model: string };
};

function generateCost(input: RenderEstimateInput, model: string): CostRange & { seconds: number } {
  const system = tokens(AI_RENDER_SYSTEM_PROMPT.length);
  const direction = sizingDirection(input.brand, input.recipeId);
  const prefix = system + tokens(artDirectionText(input.brand, direction).length);
  const speed = speedOf(model);
  let usd = 0;
  let seconds = 0;
  if (input.newDirection) {
    const message = directionMessage(
      input.brand,
      directionCandidates(1, input.recipeId, "auto"),
      input.screens[0]?.locale ?? "en",
      input.screens.map((screen) => ({ name: screen.name, kind: screen.kind, blocks: screen.blocks.map((block) => block.type) })),
    );
    usd += costOf(model, { input: system + tokens(message[0]!.text.length), cacheWrite: 0, cacheRead: 0, output: DIRECTION_OUTPUT_TOKENS });
    seconds += speed.firstTokenSeconds + DIRECTION_OUTPUT_TOKENS / speed.tokensPerSecond;
  }
  let batch = 0;
  input.screens.forEach((screen, index) => {
    const data = tokens(screenMessage(input.brand, direction, screen, { ...(input.tier && { tier: input.tier }) })[1]!.text.length);
    const output = Math.round(outputOf(screen) * tierSettings(input.tier).outputFactor);
    const first = index === 0;
    usd += costOf(model, { input: data, cacheWrite: first ? prefix : 0, cacheRead: first ? 0 : prefix, output });
    // Up to 3 in parallel: each batch takes as long as its longest screen (+ ≈ 1 s while the first one primes the cache).
    batch = Math.max(batch, speed.firstTokenSeconds + output / speed.tokensPerSecond);
    if (index % AI_SESSION_SCREENS === AI_SESSION_SCREENS - 1 || index === input.screens.length - 1) {
      seconds += batch + (index < AI_SESSION_SCREENS ? 1 : 0);
      batch = 0;
    }
  });
  return { minUsd: usd, maxUsd: usd * tokenizerFactor(model), seconds };
}

const roundSeconds = (seconds: number) => Math.max(5, Math.round(seconds / 5) * 5);

export function estimateRender(input: RenderEstimateInput): RenderEstimate {
  const screens = input.screens.length;
  const uses = input.path === "free" ? Math.ceil(screens / AI_SESSION_SCREENS) : 0;
  const cost = generateCost(input, input.model);
  const speed = speedOf(input.model);
  const base = {
    path: input.path,
    model: input.model,
    screens,
    uses,
    seconds: input.path === "manual" ? 0 : roundSeconds(cost.seconds),
    measured: input.path !== "manual" && speed.measured,
  };
  if (input.path === "manual") return { ...base, minUsd: 0, maxUsd: 0 };
  const estimate: RenderEstimate = { ...base, minUsd: cost.minUsd, maxUsd: cost.maxUsd };
  if (input.path === "byok" && input.model !== CHEAPER_BYOK_RENDER_MODEL && !input.model.startsWith("claude-haiku")) {
    const cheaper = generateCost(input, CHEAPER_BYOK_RENDER_MODEL);
    estimate.cheaper = { model: CHEAPER_BYOK_RENDER_MODEL, minUsd: cheaper.minUsd, maxUsd: cheaper.maxUsd };
  }
  return estimate;
}

/** «Otra versión» / «Pedir cambio» of one block: one call whose prefix is usually cached already. */
export function estimateBlockAction(input: { path: AiRenderPath; model: string; brand: RenderBrandInput; direction: RenderDirectionAnswer; action: BlockActionInput }): CostRange & { seconds: number } {
  if (input.path === "manual") return { minUsd: 0, maxUsd: 0, seconds: 0 };
  const [prefix, data] = blockMessage(input.brand, input.direction, input.action);
  const output = Math.round((input.action.block.container ? OUTPUT_TOKENS_PER_SURFACE : OUTPUT_TOKENS_PER_BLOCK) * (1 + THINKING_SHARE));
  const usd = costOf(input.model, {
    input: tokens(data!.text.length),
    cacheWrite: 0,
    cacheRead: tokens(AI_RENDER_SYSTEM_PROMPT.length + prefix!.text.length),
    output,
  });
  const speed = speedOf(input.model);
  return { minUsd: usd, maxUsd: usd * tokenizerFactor(input.model), seconds: roundSeconds(speed.firstTokenSeconds + output / speed.tokensPerSecond) };
}
