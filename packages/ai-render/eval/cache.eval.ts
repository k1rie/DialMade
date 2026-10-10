// Prompt cache on the real path (tracks C acceptance): two screens of one session, the 2nd started when the 1st one's
// response began (what the app's transports do), must READ the cached prefix: `cache_read_input_tokens > 0`.
// 2 Haiku 5.5 calls, ≈ $0.008. Not part of `pnpm test`:
// `corepack pnpm --filter @dialmade/ai-render exec vitest run --config eval/vitest.config.ts eval/cache.eval.ts`
import Anthropic from "@anthropic-ai/sdk";
import { expect, it } from "vitest";
import { screenParams, streamBlocks } from "../src/anthropic";
import { defaultPick, directionCandidates, hash32 } from "../src/direction";
import { brandInput, screenInput } from "../src/input";
import { BRANDS, evalDoc } from "./fixtures";
import { apiKey } from "./key";

it("the 2nd screen of a session reads the cached contract and art direction", async () => {
  const client = new Anthropic({ apiKey: await apiKey(), maxRetries: 0 });
  const brand = BRANDS[0]!;
  const { doc, screenId, draftOf } = evalDoc(brand);
  const brandData = brandInput(doc);
  const screen = screenInput(doc, screenId, { draftOf });
  const direction = { ...defaultPick(directionCandidates(hash32(brand.id), doc.brief.recipeId, "auto")), rationale: "" };
  const options = { model: "claude-haiku-5-5", effort: "low" as const };
  // Two screens of the same document: same prefix, different data (the 2nd keeps half of the blocks).
  const first = screenParams(options, brandData, direction, screen);
  const second = screenParams(options, brandData, direction, { ...screen, id: `${screen.id}-2`, blocks: screen.blocks.slice(0, Math.ceil(screen.blocks.length / 2)) });

  let began!: () => void;
  const primed = new Promise<void>((resolve) => {
    began = resolve;
  });
  const one = streamBlocks(client, first, screen.blocks.map((b) => b.id), { onStart: began });
  await primed;
  const two = streamBlocks(client, second, screen.blocks.map((b) => b.id));
  const [a, b] = await Promise.all([one, two]);
  const usage = (m: typeof a.message) => ({ read: m.usage.cache_read_input_tokens ?? 0, written: m.usage.cache_creation_input_tokens ?? 0, input: m.usage.input_tokens, output: m.usage.output_tokens });
  console.log("screen 1", usage(a.message), "screen 2", usage(b.message));
  expect(usage(a.message).read + usage(a.message).written).toBeGreaterThan(0);
  expect(usage(b.message).read).toBeGreaterThan(0);
});
