import { describe, expect, it } from "vitest";
import { createDesignDoc } from "./doc";
import { cloneJson } from "./json";
import { hardLocks, isLocked, lockPointer, lockedBy, locksWithin } from "./locks";
import { applyPatch, diffDesignDocs, lock, unlock, type PatchResult } from "./patch";
import { coversPointer, pointerSegments, pointersOverlap, toPointer, valueAtPointer } from "./pointer";
import { safeParseDesignDoc } from "./doc";
import type { DesignDoc } from "./schema";
import { acmeDoc, acmeInput, importedDoc } from "./testing/fixtures";

function expectOk(result: PatchResult): DesignDoc {
  if (!result.ok) throw new Error(`${result.error.reason}: ${result.error.message}`);
  return result.doc;
}

function expectLocked(result: PatchResult, lockPtr: string, index?: number) {
  if (result.ok) throw new Error("Expected the patch to be rejected by a lock");
  expect(result.error.reason).toBe("locked");
  expect(result.error.lock).toBe(lockPtr);
  if (index !== undefined) expect(result.error.index).toBe(index);
  return result.error;
}

const withLocks = (...locks: string[]): DesignDoc => {
  const doc = cloneJson(acmeDoc());
  doc.brief.locks = locks as DesignDoc["brief"]["locks"];
  const parsed = safeParseDesignDoc(doc);
  if (!parsed.success) throw new Error(JSON.stringify(parsed.issues));
  return parsed.data;
};

describe("JSON Pointer helpers", () => {
  it("splits and builds pointers with RFC 6901 escapes", () => {
    expect(pointerSegments("/tokens/color/light/primary")).toEqual(["tokens", "color", "light", "primary"]);
    expect(pointerSegments("/a~1b/c~0d")).toEqual(["a/b", "c~d"]);
    expect(pointerSegments("")).toEqual([]);
    expect(toPointer(["tokens", "space", 4])).toBe("/tokens/space/4");
    expect(toPointer(["a/b", "c~d"])).toBe("/a~1b/c~0d");
  });

  it("knows ancestors and overlaps without matching sibling prefixes", () => {
    expect(coversPointer("/tokens/color", "/tokens/color/light/primary")).toBe(true);
    expect(coversPointer("/tokens/color/light/primary", "/tokens/color/light/primary")).toBe(true);
    expect(coversPointer("/tokens/radius/m", "/tokens/radius/md")).toBe(false);
    expect(coversPointer("", "/brand")).toBe(true);
    expect(pointersOverlap("/tokens/color/light/primary", "/tokens")).toBe(true);
    expect(pointersOverlap("/tokens/color/light", "/tokens/color/dark")).toBe(false);
  });

  it("reads own members only", () => {
    const doc = importedDoc();
    expect(valueAtPointer(doc, "/tokens/color/dark/border")).toBe("#ffffff1a");
    expect(valueAtPointer(doc, "/brief/locks/0")).toBe("/tokens/color/light/primary");
    expect(valueAtPointer(doc, "/brief/locks/x")).toBeUndefined();
    expect(valueAtPointer(doc, "/tokens/radius/sm")).toBeUndefined();
    expect(valueAtPointer(doc, "/tokens/__proto__")).toBeUndefined();
    expect(valueAtPointer(doc, "/brand/name/length")).toBeUndefined();
  });
});

describe("brief.locks: schema", () => {
  it("accepts JSON Pointers and legacy keys together", () => {
    const doc = withLocks("/tokens/color/light/primary", "/tokens/radius/md", "/brief/recipeId", "/pages/landing", "pairingId");
    expect(doc.brief.locks).toHaveLength(5);
    expect(hardLocks(doc)).toEqual(["/tokens/color/light/primary", "/tokens/radius/md", "/brief/recipeId", "/pages/landing"]);
  });

  it.each([
    ["the brief itself", "/brief"],
    ["the lock list", "/brief/locks"],
    ["a lock entry", "/brief/locks/0"],
    ["the version", "/version"],
    ["an unknown root", "/nope/x"],
    ["the provenance", "/provenance/imports"],
    ["the whole document", ""],
    ["a relative path", "tokens/radius/md"],
    ["a bad escape", "/tokens/~2"],
    ["an unknown legacy key", "everything"],
  ])("rejects a lock on %s", (_label, value) => {
    const doc = cloneJson(acmeDoc()) as Record<string, any>;
    doc.brief.locks = [value];
    const result = safeParseDesignDoc(doc);
    expect(result.success).toBe(false);
    if (!result.success) expect(result.issues.some((i) => i.path.join("/").startsWith("brief/locks"))).toBe(true);
  });

  it("rejects duplicates and overly long lists", () => {
    const dup = cloneJson(acmeDoc()) as Record<string, any>;
    dup.brief.locks = ["/tokens/radius/md", "/tokens/radius/md"];
    expect(safeParseDesignDoc(dup).success).toBe(false);
    const many = cloneJson(acmeDoc()) as Record<string, any>;
    many.brief.locks = Array.from({ length: 501 }, (_, i) => `/pages/landing/elements/e${i}`);
    expect(safeParseDesignDoc(many).success).toBe(false);
  });

  it("accepts locks from createDesignDoc", () => {
    const doc = createDesignDoc({ ...acmeInput, brief: { ...acmeInput.brief, locks: ["/tokens/radius/md", "recipeId"] } });
    expect(doc.brief.locks).toEqual(["/tokens/radius/md", "recipeId"]);
  });
});

describe("isLocked / lockedBy / locksWithin", () => {
  const doc = withLocks("/tokens/color/light", "/tokens/radius/md", "pairingId");

  it("covers the pointer and its children, not its parents or siblings", () => {
    expect(isLocked(doc, "/tokens/color/light/primary")).toBe(true);
    expect(isLocked(doc, "/tokens/color/light")).toBe(true);
    expect(isLocked(doc, "/tokens/color")).toBe(false);
    expect(isLocked(doc, "/tokens/color/dark/primary")).toBe(false);
    expect(isLocked(doc, "/tokens/radius/md")).toBe(true);
    expect(isLocked(doc, "/tokens/radius/mdx")).toBe(false);
    expect(lockedBy(doc, "/tokens/color/light/primary")).toBe("/tokens/color/light");
  });

  it("honors legacy keys as soft locks (both spellings), unless hardOnly", () => {
    expect(lockPointer("pairingId")).toBe("/brief/pairingId");
    expect(lockPointer("dials.density")).toBe("/brief/dials/density");
    expect(isLocked(doc, "/brief/pairingId")).toBe(true);
    expect(isLocked(doc, "pairingId")).toBe(true);
    expect(lockedBy(doc, "/brief/pairingId")).toBe("pairingId");
    expect(isLocked(doc, "/brief/pairingId", { hardOnly: true })).toBe(false);
    expect(isLocked(doc, "recipeId")).toBe(false);
  });

  it("lists the locks inside a subtree as pointers", () => {
    expect(locksWithin(doc, "/tokens")).toEqual(["/tokens/color/light", "/tokens/radius/md"]);
    expect(locksWithin(doc, "/brief")).toEqual(["/brief/pairingId"]);
    expect(locksWithin(doc, "/brief", { hardOnly: true })).toEqual([]);
  });
});

describe("applyPatch: hard locks", () => {
  it("rejects a change at a locked pointer and reports the lock and the operation", () => {
    const doc = importedDoc();
    const error = expectLocked(
      applyPatch(doc, [
        { op: "replace", path: "/brand/name", value: "Acme 2" },
        { op: "replace", path: "/tokens/color/light/primary", value: "#ff0000" },
      ]),
      "/tokens/color/light/primary",
      1,
    );
    expect(error.message).toContain("/tokens/color/light/primary");
  });

  it("rejects changes below a locked pointer", () => {
    expectLocked(applyPatch(importedDoc(), [{ op: "replace", path: "/tokens/typography/heading/family", value: "Other" }]), "/tokens/typography/heading");
    expectLocked(applyPatch(importedDoc(), [{ op: "remove", path: "/tokens/typography/heading/substitute" }]), "/tokens/typography/heading");
  });

  it("rejects an ancestor rewrite that changes a locked value, and allows one that keeps it", () => {
    const doc = importedDoc();
    expectLocked(applyPatch(doc, [{ op: "replace", path: "/tokens/color/light", value: {} }]), "/tokens/color/light/primary");
    expectLocked(applyPatch(doc, [{ op: "remove", path: "/tokens/radius" }]), "/tokens/radius/md");
    const kept = expectOk(
      applyPatch(doc, [{ op: "replace", path: "/tokens/color/light", value: { ...doc.tokens.color.light, cta: "#123456" } }]),
    );
    expect(kept.tokens.color.light).toEqual({ ...doc.tokens.color.light, cta: "#123456" });
  });

  it("rejects remove and move from a locked pointer, but allows copy and test", () => {
    const doc = importedDoc();
    expectLocked(applyPatch(doc, [{ op: "remove", path: "/tokens/color/dark/border" }]), "/tokens/color/dark/border");
    expectLocked(
      applyPatch(doc, [{ op: "move", from: "/tokens/color/dark/border", path: "/tokens/color/dark/ring" }]),
      "/tokens/color/dark/border",
    );
    const copied = expectOk(
      applyPatch(doc, [
        { op: "test", path: "/tokens/color/dark/border", value: "#ffffff1a" },
        { op: "copy", from: "/tokens/color/dark/border", path: "/tokens/color/dark/ring" },
      ]),
    );
    expect(copied.tokens.color.dark.ring).toBe("#ffffff1a");
  });

  it("rejects writes into a locked value that is still derived (absent)", () => {
    const doc = withLocks("/tokens/radius/lg");
    expectLocked(applyPatch(doc, [{ op: "add", path: "/tokens/radius/lg", value: 20 }]), "/tokens/radius/lg");
  });

  it("allows rewriting a locked value with the same value", () => {
    const doc = importedDoc();
    expectOk(applyPatch(doc, [{ op: "replace", path: "/tokens/radius/md", value: 10 }]));
  });

  it("locks brief choices and pages too", () => {
    const doc = withLocks("/brief/recipeId", "/pages/landing/elements/hero-1/props");
    expectLocked(applyPatch(doc, [{ op: "replace", path: "/brief/recipeId", value: "editorial" }]), "/brief/recipeId");
    expectLocked(
      applyPatch(doc, [{ op: "add", path: "/pages/landing/elements/hero-1/props/title", value: "Hi" }]),
      "/pages/landing/elements/hero-1/props",
    );
    expectLocked(applyPatch(doc, [{ op: "remove", path: "/pages/landing" }]), "/pages/landing/elements/hero-1/props");
    expectOk(applyPatch(doc, [{ op: "add", path: "/pages/landing/elements/cta-1/props/title", value: "Hi" }]));
  });

  it("rejects removing a lock without allowLocked, in any form", () => {
    const doc = importedDoc();
    expectLocked(applyPatch(doc, [{ op: "remove", path: "/brief/locks/0" }]), "/tokens/color/light/primary");
    expectLocked(applyPatch(doc, [{ op: "replace", path: "/brief/locks", value: [] }]), "/tokens/color/light/primary");
    expectLocked(applyPatch(doc, [{ op: "replace", path: "/brief/locks/1", value: "/tokens/radius/lg" }]), "/tokens/color/dark/border");
    expectLocked(applyPatch(doc, [{ op: "replace", path: "/brief", value: { ...doc.brief, locks: [] } }]), "/tokens/color/light/primary");
  });

  it("lets a patch unlock and change a value in one step, but checks against the original locks", () => {
    const doc = importedDoc();
    const ops = [
      { op: "remove", path: "/brief/locks/0" },
      { op: "replace", path: "/tokens/color/light/primary", value: "#ff0000" },
    ];
    expectLocked(applyPatch(doc, ops), "/tokens/color/light/primary", 0);
    const next = expectOk(applyPatch(doc, ops, { allowLocked: true }));
    expect(next.tokens.color.light.primary).toBe("#ff0000");
    expect(isLocked(next, "/tokens/color/light/primary")).toBe(false);
  });

  it("adds locks freely and ignores unrelated edits", () => {
    const doc = importedDoc();
    const next = expectOk(
      applyPatch(doc, [
        { op: "add", path: "/brief/locks/-", value: "/tokens/space/4" },
        { op: "replace", path: "/brand/name", value: "Acme 2" },
        { op: "replace", path: "/brief/dials/density", value: 8 },
        { op: "add", path: "/tokens/radius/lg", value: 20 },
      ]),
    );
    expect(isLocked(next, "/tokens/space/4")).toBe(true);
    expect(next.tokens.radius.lg).toBe(20);
  });

  it("never blocks on legacy keys (the composer's pairing pin keeps working)", () => {
    const doc = importedDoc();
    expect(doc.brief.locks).toContain("pairingId");
    const repicked = expectOk(applyPatch(doc, [{ op: "replace", path: "/brief/pairingId", value: "editorial-serif" }]));
    expect(repicked.brief.pairingId).toBe("editorial-serif");
    const index = doc.brief.locks.indexOf("pairingId");
    const unpinned = expectOk(applyPatch(doc, [{ op: "remove", path: `/brief/locks/${index}` }]));
    expect(unpinned.brief.locks).not.toContain("pairingId");
  });

  it("checks a whole-document replace against every lock", () => {
    const doc = importedDoc();
    const other = cloneJson(doc);
    other.tokens.radius.md = 4;
    expectLocked(applyPatch(doc, [{ op: "replace", path: "", value: other }]), "/tokens/radius/md");
  });

  it("needs allowLocked to replay a diff that crosses an unlock", () => {
    const from = importedDoc();
    const to = expectOk(
      applyPatch(from, [{ op: "replace", path: "/tokens/radius/md", value: 4 }, { op: "remove", path: "/brief/locks/2" }], { allowLocked: true }),
    );
    const redo = diffDesignDocs(from, to);
    expect(applyPatch(from, redo).ok).toBe(false);
    expect(expectOk(applyPatch(from, redo, { allowLocked: true }))).toEqual(to);
    expect(expectOk(applyPatch(to, diffDesignDocs(to, from)))).toEqual(from);
  });

  it("sees index shifts: inserting or removing before a locked array item is a change", () => {
    const base = createDesignDoc({
      ...acmeInput,
      references: [
        { id: "ref-a", kind: "url", sourceUrl: "https://example.com/a" },
        { id: "ref-b", kind: "url", sourceUrl: "https://example.com/b" },
      ],
      brief: { ...acmeInput.brief, locks: ["/references/1"] },
    });
    const card = { id: "ref-c", kind: "url", sourceUrl: "https://example.com/c" };
    expectLocked(applyPatch(base, [{ op: "add", path: "/references/0", value: card }]), "/references/1");
    expectLocked(applyPatch(base, [{ op: "remove", path: "/references/0" }]), "/references/1");
    expectLocked(applyPatch(base, [{ op: "copy", from: "/references/0", path: "/references/1" }]), "/references/1");
    expectLocked(applyPatch(base, [{ op: "move", from: "/references/0", path: "/references/1" }]), "/references/1");
    expect(expectOk(applyPatch(base, [{ op: "add", path: "/references/-", value: card }])).references).toHaveLength(3);
    expectOk(applyPatch(base, [{ op: "replace", path: "/references/0/sourceUrl", value: "https://example.com/a2" }]));
    expectOk(applyPatch(base, [{ op: "add", path: "/references/0/label", value: "A" }]));
  });

  it("does not mutate the input when a lock rejects the patch", () => {
    const doc = importedDoc();
    const before = cloneJson(doc);
    applyPatch(doc, [{ op: "replace", path: "/tokens/radius/md", value: 2 }]);
    expect(doc).toEqual(before);
  });
});

describe("lock / unlock", () => {
  it("lock adds a hard lock once", () => {
    const doc = acmeDoc();
    const locked = expectOk(lock(doc, "/tokens/radius/md"));
    expect(locked.brief.locks).toEqual(["/tokens/radius/md"]);
    expect(expectOk(lock(locked, "/tokens/radius/md")).brief.locks).toEqual(["/tokens/radius/md"]);
    expect(expectLocked(applyPatch(locked, [{ op: "add", path: "/tokens/radius/md", value: 3 }]), "/tokens/radius/md").index).toBe(0);
  });

  it("does not add a lock already covered by an ancestor", () => {
    const doc = expectOk(lock(acmeDoc(), "/tokens/color/light"));
    expect(expectOk(lock(doc, "/tokens/color/light/primary")).brief.locks).toEqual(["/tokens/color/light"]);
  });

  it("lock with a value freezes it and locks it in one step", () => {
    const doc = expectOk(lock(acmeDoc(), "/tokens/radius/lg", { value: 14 }));
    expect(doc.tokens.radius.lg).toBe(14);
    expect(isLocked(doc, "/tokens/radius/lg")).toBe(true);
    const replaced = expectOk(lock(importedDoc(), "/tokens/space/4", { value: 20 }));
    expect(replaced.tokens.space["4"]).toBe(20);
  });

  it("lock with a value creates the missing parent objects", () => {
    const doc = acmeDoc();
    expect(doc.tokens.color.scales).toBeUndefined();
    const locked = expectOk(lock(doc, "/tokens/color/scales/brand", { value: { "500": "#2f4fd0" } }));
    expect(locked.tokens.color.scales).toEqual({ brand: { "500": "#2f4fd0" } });
    expect(isLocked(locked, "/tokens/color/scales/brand/500")).toBe(true);
    expectLocked(applyPatch(locked, [{ op: "add", path: "/tokens/color/scales/brand/600", value: "#2040b0" }]), "/tokens/color/scales/brand");
    expectOk(applyPatch(locked, [{ op: "add", path: "/tokens/color/scales/accent", value: { "500": "#f0a024" } }]));
  });

  it("setting a value under an existing lock needs allowLocked", () => {
    const doc = importedDoc();
    expectLocked(lock(doc, "/tokens/radius/md", { value: 6 }), "/tokens/radius/md");
    expect(expectOk(lock(doc, "/tokens/radius/md", { value: 6, allowLocked: true })).tokens.radius.md).toBe(6);
  });

  it("rejects pointers that cannot be locked", () => {
    const result = lock(acmeDoc(), "/brief/locks/0");
    expect(result.ok).toBe(false);
    if (!result.ok) expect(result.error.reason).toBe("invalid-document");
  });

  it("unlock («Desbloquear») removes the lock and lets the value change", () => {
    const doc = importedDoc();
    const unlocked = expectOk(unlock(doc, "/tokens/color/light/primary"));
    expect(isLocked(unlocked, "/tokens/color/light/primary")).toBe(false);
    expect(unlocked.tokens.color.light.primary).toBe(doc.tokens.color.light.primary);
    expect(expectOk(applyPatch(unlocked, [{ op: "replace", path: "/tokens/color/light/primary", value: "#ff0000" }])).tokens.color.light.primary).toBe(
      "#ff0000",
    );
  });

  it("unlock also drops the legacy alias", () => {
    const doc = withLocks("pairingId", "/brief/pairingId", "/tokens/radius/md");
    expect(expectOk(unlock(doc, "/brief/pairingId")).brief.locks).toEqual(["/tokens/radius/md"]);
    expect(expectOk(unlock(doc, "pairingId")).brief.locks).toEqual(["/tokens/radius/md"]);
  });

  it("unlock with subtree removes every lock below the pointer", () => {
    const doc = importedDoc();
    const next = expectOk(unlock(doc, "/tokens", { subtree: true }));
    expect(next.brief.locks).toEqual(["pairingId"]);
    expect(expectOk(unlock(doc, "/tokens/color")).brief.locks).toEqual(doc.brief.locks);
  });

  it("an ancestor lock still covers a pointer after unlocking it", () => {
    const doc = withLocks("/tokens/color/light", "/tokens/color/light/primary");
    const next = expectOk(unlock(doc, "/tokens/color/light/primary"));
    expect(lockedBy(next, "/tokens/color/light/primary")).toBe("/tokens/color/light");
  });
});
