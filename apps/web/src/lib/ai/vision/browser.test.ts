import Anthropic from "@anthropic-ai/sdk";
import { describe, expect, it } from "vitest";
import { toByokVisionError } from "./browser";
import { FingerprintGenerationError } from "./generate";

const headers = new Headers();

describe("toByokVisionError (BYOK: browser → Anthropic with the user's key)", () => {
  it("maps the SDK's typed errors from the most specific class", () => {
    expect(toByokVisionError(new Anthropic.APIUserAbortError()).code).toBe("aborted");
    expect(toByokVisionError(new Anthropic.APIConnectionTimeoutError()).code).toBe("network");
    expect(toByokVisionError(new Anthropic.AuthenticationError(401, undefined, "bad key", headers)).code).toBe("invalid-key");
    expect(toByokVisionError(new Anthropic.PermissionDeniedError(403, undefined, "no", headers)).code).toBe("invalid-key");
    expect(toByokVisionError(new Anthropic.RateLimitError(429, undefined, "slow down", headers)).code).toBe("rate-limited");
    expect(toByokVisionError(new Anthropic.InternalServerError(529, undefined, "overloaded", headers)).code).toBe("overloaded");
    expect(toByokVisionError(new Anthropic.BadRequestError(400, undefined, "bad", headers)).code).toBe("upstream-error");
  });

  it("keeps refusals and unusable answers apart", () => {
    expect(toByokVisionError(new FingerprintGenerationError("refused", "declined")).code).toBe("refused");
    expect(toByokVisionError(new FingerprintGenerationError("invalid-response", "cut")).code).toBe("invalid-response");
    expect(toByokVisionError(new Error("boom")).code).toBe("upstream-error");
  });
});
