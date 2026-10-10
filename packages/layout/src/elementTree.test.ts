import { describe, expect, test } from "vitest";
import { toElementTree } from "./elementTree";
import { inferStructure } from "./infer";
import { fixture } from "./testing/fixtures";

describe("toElementTree", () => {
  test("regions and blocks nested like the structure; overlays at the top level", () => {
    const structure = inferStructure(fixture("modal-overlay").layout);
    expect(toElementTree(structure)).toEqual([
      { id: "table", role: "block", layout: null, overlay: false, children: [] },
      {
        id: "dialog",
        role: "block",
        layout: "stack",
        overlay: true,
        children: [{ id: "invite-form", role: "block", layout: null, overlay: false, children: [] }],
      },
    ]);
  });

  test("a block with content has no extra region element", () => {
    const structure = inferStructure(fixture("nested-cards").layout);
    const [root] = toElementTree(structure);
    expect(root!.role).toBe("region");
    expect(root!.layout).toBe("stack");
    const plans = root!.children[1]!;
    expect(plans).toMatchObject({ id: "plans", role: "block", layout: "row" });
    expect(plans.children.map((c) => c.id)).toEqual(["card-a", "card-b", "card-c"]);
  });

  test("elements cover every block once, in reading order", () => {
    for (const name of ["holy-grail", "dashboard", "bento", "misaligned"]) {
      const structure = inferStructure(fixture(name).layout);
      const ids: string[] = [];
      const walk = (list: ReturnType<typeof toElementTree>) => {
        for (const el of list) {
          if (el.role === "block") ids.push(el.id);
          else expect(el.id).toMatch(/^r-/);
          walk(el.children);
        }
      };
      walk(toElementTree(structure));
      expect(ids).toEqual(structure.order);
    }
  });

  test("empty", () => {
    expect(toElementTree(inferStructure(fixture("empty").layout))).toEqual([]);
  });
});
