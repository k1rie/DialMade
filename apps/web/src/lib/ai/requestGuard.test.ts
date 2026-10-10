import { describe, expect, it } from "vitest";
import { rejectForeignRequest } from "./requestGuard";

const post = (headers: Record<string, string>) => new Request("http://localhost/api/ai/copy", { method: "POST", headers, body: "{}" });

describe("rejectForeignRequest", () => {
  it("lets same-site JSON through", () => {
    expect(rejectForeignRequest(post({ "content-type": "application/json; charset=utf-8", "sec-fetch-site": "same-origin" }))).toBeNull();
    expect(rejectForeignRequest(post({ "content-type": "application/json" }))).toBeNull();
  });

  it("refuses simple cross-site posts (text/plain needs no preflight) and cross-site fetches", () => {
    expect(rejectForeignRequest(post({ "content-type": "text/plain" }))?.status).toBe(415);
    expect(rejectForeignRequest(post({}))?.status).toBe(415);
    expect(rejectForeignRequest(post({ "content-type": "application/json", "sec-fetch-site": "cross-site" }))?.status).toBe(403);
  });
});
