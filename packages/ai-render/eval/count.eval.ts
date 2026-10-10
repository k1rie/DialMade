// Free check before spending: count_tokens of the direction and screen requests of every eval brand (validates
// the request shape too). `corepack pnpm --filter @dialmade/ai-render exec vitest run --config eval/vitest.config.ts eval/count.eval.ts`
import Anthropic from "@anthropic-ai/sdk";
import { it } from "vitest";
import { directionParams, screenParams } from "../src/anthropic";
import { defaultPick, directionCandidates, hash32 } from "../src/direction";
import { brandInput, screenInput } from "../src/input";
import { BRANDS, evalDoc } from "./fixtures";
import { apiKey } from "./key";

it("counts tokens", async () => {
  const client = new Anthropic({ apiKey: await apiKey(), maxRetries: 0 });
  for (const brand of BRANDS) {
    const { doc, screenId, draftOf } = evalDoc(brand);
    const brandData = brandInput(doc);
    const screen = screenInput(doc, screenId, { draftOf });
    const candidates = directionCandidates(hash32(brand.id), doc.brief.recipeId, "auto");
    const options = { model: "claude-haiku-5-5", effort: "low" as const };
    const d = directionParams(options, brandData, candidates, doc.brief.locale, [{ name: screen.name, kind: screen.kind, blocks: screen.blocks.map((b) => b.type) }]);
    const pick = defaultPick(candidates);
    const s = screenParams(options, brandData, { ...pick, rationale: "" }, screen);
    const strip = ({ max_tokens: _m, ...rest }: typeof d) => rest;
    const [cd, cs] = await Promise.all([client.beta.messages.countTokens(strip(d)), client.beta.messages.countTokens(strip(s))]);
    console.log(brand.id, "direction", cd.input_tokens, "screen", cs.input_tokens, "blocks", screen.blocks.map((b) => `${b.type}:${b.draft.length}`).join(" "));
  }
});
