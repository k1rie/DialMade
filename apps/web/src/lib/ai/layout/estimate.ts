// Cost shown before calling the layout AI. Approximate on purpose: the server reserves the exact worst case with
// count_tokens and settles the real usage.
import { priceFor } from "../pricing";
import type { LayoutRequestBody } from "./api";
import { LAYOUT_SYSTEM_PROMPT } from "./prompt";
import { MAP_JSON_SCHEMA, PROPOSAL_JSON_SCHEMA } from "./schema";

const CHARS_PER_TOKEN = 3.6;
/** Tags, settings and JSON punctuation of the user message. */
const MESSAGE_OVERHEAD_TOKENS = 120;
/** Thinking at effort `low` plus the JSON: per variant for «propose», per box for «map». */
const OUTPUT_TOKENS = { proposeBase: 400, perVariant: 1100, mapBase: 150, perBlock: 30 } as const;
/** Characters of one free block in the request (rect, screen, label, note, neighbors). */
const MAP_BLOCK_CHARS = 220;

const tokens = (chars: number) => Math.ceil(chars / CHARS_PER_TOKEN);
const FIXED = {
  propose: tokens(LAYOUT_SYSTEM_PROMPT.length + JSON.stringify(PROPOSAL_JSON_SCHEMA).length),
  map: tokens(LAYOUT_SYSTEM_PROMPT.length + JSON.stringify(MAP_JSON_SCHEMA).length),
};

/** Rough USD of one request with `model`, before calling the AI. */
export function estimateLayoutCostUsd(model: string, body: LayoutRequestBody): number {
  let input: number;
  let output: number;
  if (body.task === "propose") {
    const existing = (body.existing ?? []).reduce((sum, screen) => sum + screen.name.length + 24, 0);
    input = FIXED.propose + MESSAGE_OVERHEAD_TOKENS + tokens(body.description.length + existing);
    output = OUTPUT_TOKENS.proposeBase + OUTPUT_TOKENS.perVariant * (body.variants ?? 3);
  } else {
    input = FIXED.map + MESSAGE_OVERHEAD_TOKENS + tokens(body.blocks.length * MAP_BLOCK_CHARS);
    output = OUTPUT_TOKENS.mapBase + OUTPUT_TOKENS.perBlock * body.blocks.length;
  }
  const price = priceFor(model, input);
  return (input * price.input + output * price.output) / 1_000_000;
}
