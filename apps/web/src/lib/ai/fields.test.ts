// Review B #3 and #12: the AI never rewrites the app frame's copy the user edited in «Ajustar» (`shell.pinned`),
// nor the labels of navbar links to screens (they mirror the screens' names, which «Generar» writes).
import { applyPatch, screenPointer, type DesignDoc } from "@dialmade/doc";
import { SHELL_ELEMENT_ID } from "@dialmade/sections";
import { describe, expect, it } from "vitest";
import { screenCopyPlan } from "./fields";
import { sampleScreensDoc } from "./testing";

function patched(doc: DesignDoc, ops: unknown[]): DesignDoc {
  const result = applyPatch(doc, ops);
  if (!result.ok) throw new Error(JSON.stringify(result.error));
  return result.doc;
}

const ALL = [{ id: "s-home" }, { id: "s-detail" }];
const pointers = (doc: DesignDoc) => screenCopyPlan(doc, ALL).fields.map((field) => field.pointer);

describe("screenCopyPlan and edits the AI must not touch", () => {
  it("skips the frame props pinned on the screen's shell; the unpinned frame copy is still offered", () => {
    const doc = sampleScreensDoc();
    const shell = (key: string) => `/screens/s-detail/page/elements/${SHELL_ELEMENT_ID}/props/${key}`;
    expect(pointers(doc)).toEqual(expect.arrayContaining([shell("subtitle"), shell("primaryAction")]));
    const pinned = patched(doc, [{ op: "add", path: screenPointer("s-detail", "shell", "pinned"), value: ["/primaryAction"] }]);
    expect(pointers(pinned)).not.toContain(shell("primaryAction"));
    expect(pointers(pinned)).toContain(shell("subtitle"));
  });

  it("skips the labels of navbar links to screens, keeps the anchors' labels", () => {
    const doc = sampleScreensDoc();
    const navbar = Object.entries(doc.screens["s-home"]!.page.elements).find(([, element]) => element.type === "landing.navbar")![0];
    const links = doc.screens["s-home"]!.page.elements[navbar]!.props.links as { label: string; href: string }[];
    const linked = patched(doc, [
      {
        op: "replace",
        path: screenPointer("s-home", "page", "elements", navbar, "props", "links"),
        value: [{ label: "Detalle", href: "/app/detalle", linkTo: "s-detail" }, ...links.slice(1)],
      },
    ]);
    const label = (index: number) => `/screens/s-home/page/elements/${navbar}/props/links/${index}/label`;
    expect(pointers(doc)).toContain(label(0));
    expect(pointers(linked)).not.toContain(label(0));
    expect(pointers(linked)).toContain(label(1));
  });
});
