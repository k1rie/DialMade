import { describe, expect, it } from "vitest";
import { maxRequestCostUsd, messageCostUsd, messageTokens, priceFor, usageCostUsd } from "./pricing";

describe("pricing", () => {
  it("prices Claude Opus 5.5 at $4 / $20 per MTok with $0.20 cache reads and $5 cache writes", () => {
    expect(usageCostUsd({ input_tokens: 1_000_000, output_tokens: 0 }, "claude-opus-5-5")).toBeCloseTo(4);
    expect(usageCostUsd({ input_tokens: 0, output_tokens: 1_000_000 }, "claude-opus-5-5")).toBeCloseTo(20);
    expect(
      usageCostUsd({ input_tokens: 0, output_tokens: 0, cache_read_input_tokens: 1_000_000, cache_creation_input_tokens: 1_000_000 }, "claude-opus-5-5"),
    ).toBeCloseTo(5.2);
  });

  it("knows Sonnet 5.5 and Haiku 5.5 (with Haiku's long-prompt card)", () => {
    expect(priceFor("claude-sonnet-5-5")).toMatchObject({ input: 2, output: 10, known: true });
    expect(priceFor("claude-haiku-5-5")).toMatchObject({ input: 0.1, output: 0.5 });
    expect(priceFor("claude-haiku-5-5", 150_000)).toMatchObject({ input: 0.5, output: 2.5 });
  });

  it("prices unknown models like the most expensive one", () => {
    expect(priceFor("claude-future-9")).toMatchObject({ input: 10, output: 50, known: false });
  });

  it("sums fallback attempts at each model's own price", () => {
    const cost = messageCostUsd(
      {
        model: "claude-opus-5",
        usage: {
          input_tokens: 100,
          output_tokens: 10,
          iterations: [
            { type: "message", model: null, input_tokens: 1000, output_tokens: 0 },
            { type: "fallback_message", model: "claude-opus-5", input_tokens: 1000, output_tokens: 500 },
          ],
        },
      },
      "claude-opus-5-5",
    );
    expect(cost).toBeCloseTo((1000 * 4 + 1000 * 5 + 500 * 25) / 1_000_000);
    expect(
      messageTokens({
        model: "claude-opus-5",
        usage: {
          input_tokens: 0,
          output_tokens: 0,
          iterations: [
            { type: "message", input_tokens: 10, output_tokens: 1, cache_read_input_tokens: 5 },
            { type: "fallback_message", input_tokens: 10, output_tokens: 2 },
          ],
        },
      }),
    ).toEqual({ inputTokens: 25, outputTokens: 3 });
  });

  it("bounds a request by its prompt as cache write plus max_tokens, plus a fallback hop that carries the partial answer", () => {
    const single = maxRequestCostUsd({ model: "claude-opus-5-5", inputTokens: 4000, maxOutputTokens: 8192, fallbacks: false });
    expect(single).toBeCloseTo((4000 * 5 + 8192 * 20) / 1_000_000);
    const withFallback = maxRequestCostUsd({ model: "claude-opus-5-5", inputTokens: 4000, maxOutputTokens: 8192, fallbacks: true });
    expect(withFallback).toBeCloseTo(single + ((4000 + 8192) * 6.25 + 8192 * 25) / 1_000_000);
  });

  it("prices Claude Sonnet 5, a target of the default fallback from Claude Sonnet 5.5", () => {
    expect(priceFor("claude-sonnet-5")).toMatchObject({ input: 2, output: 10, cacheRead: 0.2, cacheWrite: 2.5, known: true });
    expect(priceFor("claude-sonnet-5-5")).toMatchObject({ input: 2, output: 10, known: true });
  });
});
