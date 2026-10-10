import { describe, expect, it } from "vitest";
import { LAYOUT_PAGE_ID } from "./constants";
import { createDesignDoc, createPage } from "./doc";
import { cloneJson } from "./json";
import { applyPatch, diffDesignDocs, lock, type PatchOperation, type PatchResult } from "./patch";
import type { DesignDoc, Page, ScreenInput } from "./schema";
import { acmeDoc, acmeInput, screensDoc } from "./testing/fixtures";

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

  it("never mutates the operations: the same ops replay identically", () => {
    const doc = acmeDoc();
    const ops = [
      { op: "add", path: "/pages/landing/elements/hero-1/props/items", value: ["a"] },
      { op: "add", path: "/pages/landing/elements/hero-1/props/items/-", value: "b" },
    ];
    const before = cloneJson(ops);
    const first = applyPatch(doc, ops);
    expect(first.ok && first.doc.pages.landing!.elements["hero-1"]!.props).toEqual({ items: ["a", "b"] });
    expect(ops).toEqual(before);
    expect(applyPatch(doc, ops)).toEqual(first);
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
      // applyPatch is v2-only: no migration, so going back to v1 is invalid.
      [{ op: "replace", path: "/version", value: 1 }],
      [{ op: "replace", path: "/version", value: 3 }],
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

/* ------------------------------------------------------------------------------------------------ */
/* Copy-on-write (review B #19)                                                                     */
/* ------------------------------------------------------------------------------------------------ */

/** Seeded PRNG (mulberry32), so a failure replays. */
function rng(seed: number) {
  let a = seed >>> 0;
  return () => {
    a = (a + 0x6d2b79f5) >>> 0;
    let t = a;
    t = Math.imul(t ^ (t >>> 15), t | 1);
    t ^= t + Math.imul(t ^ (t >>> 7), t | 61);
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
  };
}

const escape = (key: string) => key.replace(/~/g, "~0").replace(/\//g, "~1");

/** Every pointer of a JSON value with the value there. */
function pointersOf(value: unknown, at = "", out: { pointer: string; value: unknown }[] = []) {
  out.push({ pointer: at, value });
  if (Array.isArray(value)) value.forEach((item, i) => pointersOf(item, `${at}/${i}`, out));
  else if (value !== null && typeof value === "object") for (const [key, child] of Object.entries(value)) pointersOf(child, `${at}/${escape(key)}`, out);
  return out;
}

/** Random operations over real pointers, plus some that must fail (bad indexes, missing parents, escapes, banned keys). */
function randomOps(doc: DesignDoc, rand: () => number): PatchOperation[] {
  const pick = <T,>(list: readonly T[]): T => list[Math.floor(rand() * list.length)]!;
  const everything = pointersOf(doc).filter((entry) => entry.pointer !== "");
  // Half the patches stay inside element props (free JSON), so many of them are valid and get chained.
  const inProps = everything.filter((entry) => /\/props\/./.test(entry.pointer));
  const all = rand() < 0.5 && inProps.length > 0 ? inProps : everything;
  const containers = all.filter((entry) => entry.value !== null && typeof entry.value === "object");
  if (containers.length === 0) containers.push(...everything.filter((entry) => entry.value !== null && typeof entry.value === "object"));
  const value = (): unknown =>
    pick([() => "texto", () => 7, () => true, () => null, () => ({ title: "x" }), () => ["a"], () => cloneJson(pick(all).value), () => undefined])() ??
    "relleno";
  const target = (): string => {
    const parent = pick(containers);
    if (Array.isArray(parent.value)) return `${parent.pointer}/${pick(["-", "0", String(parent.value.length), "01", ""])}`;
    return `${parent.pointer}/${pick(["nuevo", "a~1b", "a~0b", "constructor", "title"])}`;
  };
  const ops: PatchOperation[] = [];
  const n = 1 + Math.floor(rand() * 4);
  for (let i = 0; i < n; i++) {
    const at = pick(all);
    const kind = rand();
    if (kind < 0.3) ops.push({ op: "replace", path: at.pointer, value: typeof at.value === "string" ? `${at.value}!` : value() });
    else if (kind < 0.5) ops.push({ op: "add", path: target(), value: value() });
    else if (kind < 0.62) ops.push({ op: "remove", path: at.pointer });
    else if (kind < 0.7) ops.push({ op: "copy", from: at.pointer, path: target() });
    else if (kind < 0.76) ops.push({ op: "move", from: at.pointer, path: target() });
    else if (kind < 0.84) ops.push({ op: "test", path: at.pointer, value: rand() < 0.7 ? cloneJson(at.value) : "otro" });
    else ops.push({ op: pick(["add", "replace"] as const), path: pick([`${at.pointer}/x/y`, `${at.pointer}/-/x`, "/__proto__/x", "/brand/constructor/prototype/x", `${at.pointer}/~1`]), value: 1 });
  }
  return ops;
}

/** Outcome without the issues' wording (both paths must agree on it). */
function outcome(result: PatchResult) {
  return result.ok ? { ok: true, json: JSON.stringify(result.doc) } : { ok: false, reason: result.error.reason, index: result.error.index, lock: result.error.lock };
}

function bigScreenInput(index: number, count: number): ScreenInput {
  const blocks: ScreenInput["layout"]["blocks"] = {};
  const elements: Page["elements"] = {
    root: { type: "app.page", props: {}, children: ["layout"] },
    layout: { type: "ui.region", props: { role: "scope" }, children: [] },
  };
  for (let i = 0; i < count; i++) {
    const id = `b-${index}-${i}`;
    blocks[id] = { type: "text", label: `Bloque ${i}`, rect: { col: (i % 2) * 6, row: Math.floor(i / 2) * 12, w: 6, h: 10 }, z: i + 1, pinned: ["/title"] };
    elements[id] = { type: "ui.text", props: { title: `Título ${i}`, body: "Texto ".repeat(40), items: [{ title: "a" }, { title: "b" }] }, children: [] };
    elements.layout!.children.push(id);
  }
  return {
    id: `s-${index}`,
    name: `Pantalla ${index}`,
    kind: "app",
    route: `/pantalla-${index}`,
    shell: { nav: "none", header: false },
    layout: { version: 1, columns: 12, rowUnit: 8, blocks },
    page: { kind: "app", layoutId: LAYOUT_PAGE_ID, root: "root", elements },
  };
}

describe("applyPatch copies on write", () => {
  it("random patches: same result as patching a fresh clone, and the input never changes", () => {
    const rand = rng(20261010);
    let base = expectOk(lock(expectOk(applyPatch(screensDoc(), [])), "/brand/name"));
    let applied = 0;
    let okCount = 0;
    for (let run = 0; run < 600; run++) {
      const ops = randomOps(base, rand);
      const before = JSON.stringify(base);
      const screens = base.screens;
      const cow = applyPatch(base, ops);
      // The reference is the whole-clone path: a document `applyPatch` did not return.
      const reference = applyPatch(cloneJson(base), ops);
      expect(outcome(cow), JSON.stringify(ops)).toEqual(outcome(reference));
      expect(JSON.stringify(base), `input changed by ${JSON.stringify(ops)}`).toBe(before);
      expect(base.screens).toBe(screens);
      if (cow.ok) okCount++;
      if (cow.ok && rand() < 0.5) {
        base = cow.doc;
        applied++;
      }
    }
    console.info(`[cow] random patches applied: ${applied}, ok: ${okCount}`);
    expect(applied).toBeGreaterThan(20);
  });

  it("chained edits never reach back into earlier versions (undo history)", () => {
    const versions: DesignDoc[] = [expectOk(applyPatch(screensDoc(), []))];
    const snapshots = [JSON.stringify(versions[0])];
    const edits: PatchOperation[][] = [
      [{ op: "replace", path: "/screens/s-home/page/elements/b-hero/props/title", value: "Uno" }],
      [{ op: "add", path: "/screens/s-home/page/elements/b-hero/props/items", value: [{ title: "a" }] }],
      [{ op: "add", path: "/screens/s-home/page/elements/b-hero/props/items/-", value: { title: "b" } }],
      [{ op: "replace", path: "/screens/s-home/page/elements/b-hero/props/items/0/title", value: "A" }],
      [{ op: "copy", from: "/screens/s-home/page/elements/b-hero/props/items/0", path: "/screens/s-home/page/elements/b-hero/props/items/-" }],
      [{ op: "move", from: "/screens/s-home/page/elements/b-hero/props/items/0", path: "/screens/s-home/page/elements/b-hero/props/items/-" }],
      [{ op: "remove", path: "/screens/s-home/page/elements/b-hero/props/items/1" }],
      [{ op: "replace", path: "/brand/name", value: "Otro" }],
    ];
    for (const ops of edits) {
      const next = expectOk(applyPatch(versions.at(-1)!, ops));
      versions.push(next);
      snapshots.push(JSON.stringify(next));
      versions.forEach((version, i) => expect(JSON.stringify(version), `version ${i}`).toBe(snapshots[i]));
    }
    // [a] → [a, b] → [A, b] → [A, b, A] → [b, A, A] → [b, A]
    expect(versions.at(-1)!.screens["s-home"]!.page.elements["b-hero"]!.props.items).toEqual([{ title: "b" }, { title: "A" }]);
  });

  it("untouched parts keep their identity: the history stores only what changed, the preview skips the rest", () => {
    const doc = expectOk(applyPatch(screensDoc(), []));
    const dial = expectOk(applyPatch(doc, [{ op: "replace", path: "/brief/dials/density", value: 6 }]));
    expect(dial).not.toBe(doc);
    expect(dial.screens).toBe(doc.screens);
    expect(dial.brand).toBe(doc.brand);
    expect(dial.brief).not.toBe(doc.brief);
    expect(dial.brief.locks).toBe(doc.brief.locks);
    expect(dial).toEqual({ ...doc, brief: { ...doc.brief, dials: { ...doc.brief.dials, density: 6 } } });

    const text = expectOk(applyPatch(dial, [{ op: "replace", path: "/screens/s-home/page/elements/b-hero/props/title", value: "Hola" }]));
    const before = dial.screens["s-home"]!;
    const after = text.screens["s-home"]!;
    expect(text.screens["s-dash"]).toBe(dial.screens["s-dash"]);
    expect(after.layout).toBe(before.layout);
    expect(after.page.elements["b-hero"]).not.toBe(before.page.elements["b-hero"]);
    for (const id of Object.keys(before.page.elements)) {
      if (id !== "b-hero") expect(after.page.elements[id], id).toBe(before.page.elements[id]);
    }
    expect(after.page.elements["b-hero"]!.props.title).toBe("Hola");
    // Equal to what a whole clone and parse gives, key order included.
    expect(JSON.stringify(text)).toBe(JSON.stringify(expectOk(applyPatch(cloneJson(dial), [{ op: "replace", path: "/screens/s-home/page/elements/b-hero/props/title", value: "Hola" }]))));
  });

  it("an empty patch still returns a new document", () => {
    const doc = expectOk(applyPatch(screensDoc(), []));
    const same = expectOk(applyPatch(doc, []));
    expect(same).not.toBe(doc);
    expect(same).toEqual(doc);
  });

  it("a document it did not return is cloned whole first (its undefined members are dropped, as before)", () => {
    const doc = acmeDoc() as DesignDoc & { brand: { tagline?: string } };
    doc.brand.tagline = undefined;
    const next = expectOk(applyPatch(doc, [{ op: "replace", path: "/brand/name", value: "Nimbus" }]));
    expect(Object.hasOwn(next.brand, "tagline")).toBe(false);
  });

  it("perf: one knob on 10 screens × 200 blocks (logged against the whole-clone path)", () => {
    const input = { ...acmeInput, screens: Array.from({ length: 10 }, (_, i) => bigScreenInput(i, 200)) };
    const doc = expectOk(applyPatch(createDesignDoc(input), []));
    const ops: PatchOperation[] = [{ op: "replace", path: "/brief/dials/density", value: 6 }];
    const time = (fn: () => void) => {
      const times: number[] = [];
      for (let run = 0; run < 7; run++) {
        const start = performance.now();
        fn();
        times.push(performance.now() - start);
      }
      return times.sort((a, b) => a - b)[3]!;
    };
    const cow = time(() => expectOk(applyPatch(doc, ops)));
    const whole = time(() => expectOk(applyPatch(cloneJson(doc), ops)));
    const clone = time(() => cloneJson(doc));
    console.info(`[perf] applyPatch knob 10×200: copy-on-write ${cow.toFixed(1)} ms; whole clone ${(whole - clone).toFixed(1)} ms (+${clone.toFixed(1)} ms clone)`);
    expect(cow).toBeLessThan(400);
  });
});

