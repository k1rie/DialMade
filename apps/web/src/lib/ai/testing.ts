// Fixtures for the tests of src/lib/ai (no network: the SDK client is a mock).
import type Anthropic from "@anthropic-ai/sdk";
import type { OutputKind } from "@dialmade/catalog";
import { createDesignDoc, type DesignDoc } from "@dialmade/doc";
import { addDefaultPage } from "@dialmade/sections";
import { vi } from "vitest";

export function sampleDoc(kinds: readonly OutputKind[] = ["landing"], productType = "saas-general"): DesignDoc {
  let doc = createDesignDoc({
    brand: { name: "Brisa", tagline: "Pagos sin fricción", seeds: { primary: "#7c5cff" } },
    brief: { productType, locale: "es", focus: kinds[0] ?? "landing" },
  });
  for (const kind of kinds) doc = addDefaultPage(doc, kind);
  return doc;
}

export type MockMessage = {
  model: string;
  stop_reason: string | null;
  content: unknown[];
  usage: {
    input_tokens: number;
    output_tokens: number;
    cache_creation_input_tokens: number | null;
    cache_read_input_tokens: number | null;
    iterations?: unknown[] | null;
  };
};

/** A response whose text block is `output` as JSON (`null` = no text at all). */
export function message(partial: Partial<MockMessage> & { output?: unknown } = {}): MockMessage {
  const { output = { edits: [] }, ...rest } = partial;
  return {
    model: "claude-opus-5-5",
    stop_reason: "end_turn",
    content: output === null ? [] : [{ type: "text", text: typeof output === "string" ? output : JSON.stringify(output) }],
    usage: { input_tokens: 1200, output_tokens: 800, cache_creation_input_tokens: 0, cache_read_input_tokens: 2000, iterations: null },
    ...rest,
  };
}

/** A stand-in for `new Anthropic()` exposing only what lib/ai calls. */
export function mockClient(options: { inputTokens?: number; create?: () => Promise<unknown> } = {}) {
  type Call<R> = (params: unknown, requestOptions?: unknown) => Promise<R>;
  const countTokens = vi.fn<Call<{ input_tokens: number }>>(async () => ({ input_tokens: options.inputTokens ?? 3000 }));
  const create = vi.fn<Call<unknown>>(async () => (options.create ? options.create() : message()));
  const client = { beta: { messages: { countTokens, create } } } as unknown as Anthropic;
  return { client, countTokens, create };
}
