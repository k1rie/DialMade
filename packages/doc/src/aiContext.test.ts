import { describe, expect, it } from "vitest";
import { AI_CONTEXT_MAX, AiContextSchema, normalizeAiContext, sameAiContext } from "./aiRender";

describe("normalizeAiContext", () => {
  it("collapses whitespace, drops control characters and empty fields", () => {
    expect(normalizeAiContext({ audience: "  Dueños \n de\t barberías ", goal: "   ", tone: "cercano\u0007, directo" })).toEqual({
      audience: "Dueños de barberías",
      tone: "cercano , directo",
    });
  });

  it("caps each field and returns undefined when nothing is left", () => {
    const long = normalizeAiContext({ facts: "x".repeat(1000) });
    expect(long?.facts).toHaveLength(AI_CONTEXT_MAX.facts);
    expect(normalizeAiContext({ audience: "  ", avoid: "" })).toBeUndefined();
    expect(normalizeAiContext(null)).toBeUndefined();
    expect(normalizeAiContext({})).toBeUndefined();
  });

  it("what it returns always parses", () => {
    const out = normalizeAiContext({ audience: "a", goal: "b", tone: "c", facts: "d", avoid: "e" });
    expect(AiContextSchema.safeParse(out).success).toBe(true);
  });
});

describe("sameAiContext", () => {
  it("ignores blanks, spacing and key order", () => {
    expect(sameAiContext({ audience: "a", goal: "b" }, { goal: " b ", audience: "a", tone: "" })).toBe(true);
    expect(sameAiContext(undefined, {})).toBe(true);
    expect(sameAiContext({ audience: "a" }, { audience: "b" })).toBe(false);
    expect(sameAiContext({ audience: "a" }, undefined)).toBe(false);
  });
});
