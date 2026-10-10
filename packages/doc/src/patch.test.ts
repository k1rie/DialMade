import { describe, expect, it } from "vitest";
import { createDesignDoc, createPage } from "./doc";
import { cloneJson } from "./json";
import { applyPatch, diffDesignDocs, type PatchResult } from "./patch";
import { acmeDoc, acmeInput } from "./testing/fixtures";

function expectOk(result: PatchResult) {
  if (!result.ok) throw new Error(`${result.error.reason}: ${result.error.message} ${JSON.stringify(result.error.issues ?? [])}`);
  return result.doc;
}

function expectFail(result: PatchResult) {
  if (result.ok) throw new Error("Expected the patch to fail");
  return result.error;
}

describe("applyPatch", () => {
  it("edits one element prop (local scope) without mutating the input", () => {
    const doc = acmeDoc();
    const before = cloneJson(doc);
    const next = expectOk(applyPatch(doc, [{ op: "add", path: "/pages/landing/elements/hero-1/props/title", value: "Hello" }]));
    expect(next.pages.landing!.elements["hero-1"]!.props).toEqual({ title: "Hello" });
    expect(doc).toEqual(before);
    expect(next.pages.app).toEqual(doc.pages.app);
  });

  it("edits global tokens and system recipes", () => {
    const next = expectOk(
      applyPatch(acmeDoc(), [
        { op: "add", path: "/tokens/radius/md", value: 3 },
        { op: "add", path: "/system/button/shape", value: "pill" },
        { op: "replace", path: "/brief/dials/density", value: 8 },
        { op: "add", path: "/brief/locks/-", value: "pairingId" },
        { op: "add", path: "/tokens/color/dark/primary", value: "#123456" },
      ]),
    );
    expect(next.tokens.radius.md).toBe(3);
    expect(next.system.button.shape).toBe("pill");
    expect(next.brief.dials.density).toBe(8);
    expect(next.brief.locks).toEqual(["pairingId"]);
    expect(next.tokens.color.dark.primary).toBe("#123456");
  });

  it("supports structural edits: reorder, insert, hide and bind", () => {
    const doc = acmeDoc();
    const children = doc.pages.landing!.elements.root!.children;
    const next = expectOk(
      applyPatch(doc, [
        { op: "move", from: "/pages/landing/elements/root/children/1", path: "/pages/landing/elements/root/children/0" },
        { op: "add", path: "/pages/landing/elements/pricing-1", value: { type: "landing.pricing", props: {}, children: [] } },
        { op: "add", path: "/pages/landing/elements/root/children/2", value: "pricing-1" },
        { op: "add", path: "/pages/landing/hidden", value: ["features-1"] },
        { op: "add", path: "/pages/landing/elements/navbar-1/props/brand", value: { bind: "brand.name" } },
      ]),
    );
    const root = next.pages.landing!.elements.root!.children;
    expect(root.slice(0, 3)).toEqual([children[1], children[0], "pricing-1"]);
    expect(next.pages.landing!.hidden).toEqual(["features-1"]);
  });

  it("adds a page and enforces pages[k].kind === k", () => {
    const doc = createDesignDoc(acmeInput);
    const app = createPage("app");
    expect(expectOk(applyPatch(doc, [{ op: "add", path: "/pages/app", value: app }])).pages.app).toEqual(app);

    const error = expectFail(applyPatch(doc, [{ op: "add", path: "/pages/brand", value: app }]));
    expect(error.reason).toBe("invalid-document");
    expect(error.issues?.some((i) => i.path.join("/") === "pages/brand/kind")).toBe(true);

    const kindSwap = expectFail(applyPatch(acmeDoc(), [{ op: "replace", path: "/pages/app/kind", value: "landing" }]));
    expect(kindSwap.issues?.some((i) => i.message.includes('pages.app.kind must be "app"'))).toBe(true);
  });

  it("discards patches that leave the document invalid", () => {
    const doc = acmeDoc();
    const cases = [
      [{ op: "replace", path: "/brief/dials/density", value: 11 }],
      [{ op: "replace", path: "/brief/recipeId", value: "baroque" }],
      [{ op: "add", path: "/system/button/shape", value: "blob" }],
      [{ op: "add", path: "/pages/landing/elements/hero-1/props/title", value: { bind: "brand.logo" } }],
      [{ op: "remove", path: "/pages/landing/elements/cta-1" }],
      [{ op: "remove", path: "/pages/landing/elements/root/children/0" }],
      [{ op: "replace", path: "/version", value: 2 }],
      [{ op: "add", path: "/brand/admin", value: true }],
      [{ op: "remove", path: "/brand/name" }],
    ];
    for (const ops of cases) {
      const error = expectFail(applyPatch(doc, ops));
      expect(error.reason, JSON.stringify(ops)).toBe("invalid-document");
      expect(error.issues!.length).toBeGreaterThan(0);
    }
  });

  it("accepts a removal when the same patch keeps the tree consistent", () => {
    const next = expectOk(
      applyPatch(acmeDoc(), [
        { op: "test", path: "/pages/landing/elements/root/children/3", value: "cta-1" },
        { op: "remove", path: "/pages/landing/elements/root/children/3" },
        { op: "remove", path: "/pages/landing/elements/cta-1" },
      ]),
    );
    expect(next.pages.landing!.elements["cta-1"]).toBeUndefined();
  });

  it("reports operation errors with their index", () => {
    const doc = acmeDoc();
    const missing = expectFail(applyPatch(doc, [{ op: "replace", path: "/brief/focus", value: "app" }, { op: "replace", path: "/nope/deep", value: 1 }]));
    expect(missing.reason).toBe("operation-failed");
    expect(missing.index).toBe(1);

    const test = expectFail(applyPatch(doc, [{ op: "test", path: "/brand/name", value: "Other" }]));
    expect(test.reason).toBe("test-failed");
    expect(test.index).toBe(0);
  });

  it("rejects malformed operations before applying them", () => {
    const doc = acmeDoc();
    for (const ops of [
      "not an array",
      [{ op: "merge", path: "/brand" }],
      [{ op: "add", path: "brand/name", value: "x" }],
      [{ op: "add", path: "/brand/tagline" }],
      [{ op: "move", path: "/brand/name" }],
      [{ op: "replace", path: "/brand/name", value: "x", extra: 1 }],
      Array.from({ length: 501 }, () => ({ op: "test", path: "/version", value: 1 })),
    ]) {
      expect(expectFail(applyPatch(doc, ops)).reason, JSON.stringify(ops).slice(0, 80)).toBe("invalid-operation");
    }
  });

  it("blocks prototype pollution", () => {
    const result = applyPatch(acmeDoc(), [{ op: "add", path: "/__proto__/polluted", value: true }]);
    expect(result.ok).toBe(false);
    expect(({} as Record<string, unknown>).polluted).toBeUndefined();
  });

  it("returns an equal document for an empty patch", () => {
    const doc = acmeDoc();
    const next = expectOk(applyPatch(doc, []));
    expect(next).toEqual(doc);
    expect(next).not.toBe(doc);
  });
});

describe("diffDesignDocs", () => {
  it("produces a patch that replays from → to", () => {
    const from = acmeDoc();
    const to = expectOk(
      applyPatch(from, [
        { op: "replace", path: "/brand/name", value: "Acme 2" },
        { op: "add", path: "/system/card/elevation", value: 3 },
        { op: "remove", path: "/pages/app" },
      ]),
    );
    const ops = diffDesignDocs(from, to);
    expect(ops.length).toBeGreaterThan(0);
    expect(expectOk(applyPatch(from, ops))).toEqual(to);
    expect(expectOk(applyPatch(to, diffDesignDocs(to, from)))).toEqual(from);
  });
});
