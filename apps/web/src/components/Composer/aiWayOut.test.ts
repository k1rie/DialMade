import { describe, expect, it } from "vitest";
import { AiCopyError } from "@/hooks/useAiCopy";
import { opensAiMenu } from "./aiWayOut";

describe("opensAiMenu", () => {
  it("a design too large for the hosted route opens the menu with the user's key and «mi Claude» (review B #21)", () => {
    expect(opensAiMenu(new AiCopyError("unavailable", "El diseño es demasiado grande…", "payload-too-large"))).toBe(true);
  });

  it("keeps the other ways out, and errors a retry may fix only toast", () => {
    expect(opensAiMenu(new AiCopyError("budget-exceeded", "…", "free-tier-exhausted", "free-tier-exhausted"))).toBe(true);
    expect(opensAiMenu(new AiCopyError("budget-exceeded"))).toBe(true);
    expect(opensAiMenu(new AiCopyError("unavailable", "…", "invalid-key"))).toBe(true);
    expect(opensAiMenu(new AiCopyError("unavailable", "…", "rate-limited"))).toBe(false);
    expect(opensAiMenu(new AiCopyError("network"))).toBe(false);
    expect(opensAiMenu(new Error("boom"))).toBe(false);
  });
});
