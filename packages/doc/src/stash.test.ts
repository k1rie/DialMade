// Edits never lost to a «Generar» (review B #0–#3): `page.stash` keeps removed and retyped blocks' props (and a
// removed block's pins), `screenStash` keeps removed screens, `AppShell.pinned` keeps the frame copy edited in
// «Ajustar», and `renameScreenOps` renames a screen from «Ajustar» with the Layout step's rules.
import { describe, expect, it } from "vitest";
import { MAX_REMOVED_STASH, MAX_STASHED_SCREENS } from "./constants";
import { safeParseDesignDoc } from "./doc";
import { cloneJson } from "./json";
import { applyPatch } from "./patch";
import { documentSizeIssues, type DesignDoc } from "./schema";
import { renameScreenOps, screenPointer } from "./screens";
import { screensDoc } from "./testing/fixtures";

type Mutable = Record<string, any>;

const pathsOf = (doc: unknown): string[] => {
  const result = safeParseDesignDoc(doc);
  return result.success ? [] : result.issues.map((issue) => issue.path.join("/"));
};

function mutate(fn: (doc: Mutable) => void): Mutable {
  const doc = cloneJson(screensDoc()) as Mutable;
  fn(doc);
  return doc;
}

function patched(doc: DesignDoc, ops: unknown[]): DesignDoc {
  const result = applyPatch(doc, ops);
  if (!result.ok) throw new Error(`${result.error.reason}: ${result.error.message} ${JSON.stringify(result.error.issues ?? [])}`);
  return result.doc;
}

describe("page.stash", () => {
  it("keeps a removed block's props with its pins, and a retyped block's old-type props next to its element", () => {
    const doc = mutate((d) => {
      d.screens["s-dash"].page.stash = {
        "b-gone": { type: "landing.hero", props: { title: "Mi titular" }, pinned: ["/title"] },
        // b-f is a ui.list now: its calendar props (before the type change) wait for an undo.
        "b-f": { type: "ui.calendar", props: { title: "Agenda" } },
      };
    });
    expect(pathsOf(doc)).toEqual([]);
  });

  it("rejects an entry of the same type as the block's element, and invalid pins", () => {
    const same = mutate((d) => {
      d.screens["s-dash"].page.stash = { "b-f": { type: "ui.list", props: {} } };
    });
    expect(pathsOf(same)).toContain("screens/s-dash/page/stash/b-f");
    const badPin = mutate((d) => {
      d.screens["s-dash"].page.stash = { "b-gone": { type: "ui.list", props: {}, pinned: ["title"] } };
    });
    expect(pathsOf(badPin).some((path) => path.startsWith("screens/s-dash/page/stash/b-gone/pinned"))).toBe(true);
    const twice = mutate((d) => {
      d.screens["s-dash"].page.stash = { "b-gone": { type: "ui.list", props: {}, pinned: ["/title", "/title"] } };
    });
    expect(pathsOf(twice).some((path) => path.startsWith("screens/s-dash/page/stash/b-gone/pinned"))).toBe(true);
  });

  it("admits the removed blocks' bound on top of one entry per block, plus the frame", () => {
    const entries = (n: number) =>
      Object.fromEntries(Array.from({ length: n }, (_, i) => [`b-x${i.toString(36).padStart(4, "0")}`, { type: "ui.list", props: {} }]));
    const fits = mutate((d) => {
      d.screens["s-dash"].page.stash = entries(200 + MAX_REMOVED_STASH + 1);
    });
    expect(pathsOf(fits)).toEqual([]);
    const over = mutate((d) => {
      d.screens["s-dash"].page.stash = entries(200 + MAX_REMOVED_STASH + 2);
    });
    expect(pathsOf(over)).toContain("screens/s-dash/page/stash");
  });
});

describe("AppShell.pinned", () => {
  it("keeps the frame props edited in «Ajustar» as pointers; anything else is rejected", () => {
    const doc = patched(screensDoc(), [{ op: "add", path: screenPointer("s-dash", "shell", "pinned"), value: ["/primaryAction", "/subtitle"] }]);
    expect(doc.screens["s-dash"]!.shell?.pinned).toEqual(["/primaryAction", "/subtitle"]);
    const bad = applyPatch(screensDoc(), [{ op: "add", path: screenPointer("s-dash", "shell", "pinned"), value: ["primaryAction"] }]);
    expect(bad.ok).toBe(false);
  });
});

describe("screenStash", () => {
  const stashed = (doc: Mutable, id: string) => {
    const screen = cloneJson(doc.screens[id]);
    delete doc.screens[id];
    doc.screenOrder = doc.screenOrder.filter((other: string) => other !== id);
    // Links to it go with it (as removeScreenOps does).
    for (const other of Object.values(doc.screens) as Mutable[]) {
      for (const block of Object.values(other.layout.blocks) as Mutable[]) if (block.linkTo === id) delete block.linkTo;
    }
    doc.screenStash = { ...(doc.screenStash ?? {}), [id]: screen };
  };

  it("keeps whole removed screens, validated like screens, outside the document's screen rules", () => {
    const doc = mutate((d) => stashed(d, "s-settings"));
    expect(pathsOf(doc)).toEqual([]);
    // Its blocks still link to screens that may be gone, its route may be taken: nothing renders it.
    const linked = mutate((d) => {
      stashed(d, "s-settings");
      d.screenStash["s-settings"].layout.blocks["b-form"].linkTo = "s-nowhere";
      d.screenStash["s-settings"].route = "/dashboard";
    });
    expect(pathsOf(linked)).toEqual([]);
  });

  it("rejects a key that is not the id, a screen the document still has, an invalid screen and too many", () => {
    const mismatch = mutate((d) => {
      stashed(d, "s-settings");
      d.screenStash["s-other"] = d.screenStash["s-settings"];
      delete d.screenStash["s-settings"];
    });
    expect(pathsOf(mismatch)).toContain("screenStash/s-other/id");
    const both = mutate((d) => {
      d.screenStash = { "s-dash": cloneJson(d.screens["s-dash"]) };
    });
    expect(pathsOf(both)).toContain("screenStash/s-dash");
    const invalid = mutate((d) => {
      stashed(d, "s-settings");
      d.screenStash["s-settings"].page.elements.root.type = "landing.page";
    });
    expect(pathsOf(invalid).some((path) => path.startsWith("screenStash/s-settings/page"))).toBe(true);

    const many = mutate((d) => {
      d.screenStash = {};
      for (let i = 0; i <= MAX_STASHED_SCREENS; i++) d.screenStash[`s-old${i}`] = { id: `s-old${i}` };
    });
    expect(documentSizeIssues(many).map((issue) => issue.path.join("/"))).toEqual(["screenStash"]);
  });
});

describe("renameScreenOps", () => {
  it("renames with a clean, unique name; an automatic route follows, «/» and hand-written routes stay", () => {
    const doc = screensDoc();
    const renamed = patched(doc, renameScreenOps(doc, "s-dash", "  Mi   panel "));
    expect(renamed.screens["s-dash"]).toMatchObject({ name: "Mi panel", route: "/mi-panel" });

    // «Ajustes» is taken: «Ajustes 2», and the route is unique too.
    const twin = patched(doc, renameScreenOps(doc, "s-dash", "Ajustes"));
    expect(twin.screens["s-dash"]).toMatchObject({ name: "Ajustes 2", route: "/ajustes-2" });

    expect(renameScreenOps(doc, "s-home", "Portada")).toEqual([{ op: "replace", path: "/screens/s-home/name", value: "Portada" }]);
    const manual = patched(doc, [{ op: "replace", path: screenPointer("s-dash", "route"), value: "/app" }]);
    expect(renameScreenOps(manual, "s-dash", "Métricas")).toEqual([{ op: "replace", path: "/screens/s-dash/name", value: "Métricas" }]);
  });

  it("is empty for a missing screen, a name that cleans to nothing or to the current name", () => {
    const doc = screensDoc();
    expect(renameScreenOps(doc, "s-missing", "Hola")).toEqual([]);
    expect(renameScreenOps(doc, "s-dash", "   ")).toEqual([]);
    expect(renameScreenOps(doc, "s-dash", "Dashboard ")).toEqual([]);
  });

  it("keeps the number whole when the name is at the label limit", () => {
    const doc = screensDoc();
    const long = "A".repeat(200);
    const first = patched(doc, renameScreenOps(doc, "s-dash", long));
    const name = first.screens["s-dash"]!.name;
    const second = patched(first, renameScreenOps(first, "s-settings", long));
    expect(second.screens["s-settings"]!.name).not.toBe(name);
    expect(second.screens["s-settings"]!.name.endsWith(" 2")).toBe(true);
    expect(safeParseDesignDoc(second).success).toBe(true);
  });
});
