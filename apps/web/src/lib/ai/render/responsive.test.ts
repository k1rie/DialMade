import { describe, expect, it } from "vitest";
import { screensFixture } from "@/components/ExportDialog/testing";
import { ResponsiveCollector, cellWidths, measureWidths } from "./responsive";

describe("gate 5 widths", () => {
  const { doc } = screensFixture(["s-home", "s-dashboard"]);

  it("a full-width block measures at each device frame; a narrower one at its share of the columns", () => {
    const home = doc.screens["s-home"]!;
    const [navbar] = Object.keys(home.layout.blocks);
    const widths = cellWidths(home, navbar!);
    expect(widths).toEqual({ desktop: 1440, tablet: 768, mobile: 390 });
    expect(measureWidths(widths)).toEqual([1440, 768, 390]);
    // The absorbed media block measures in its host's cell (the hero).
    expect(cellWidths(home, "s-home-media")).toEqual(cellWidths(home, Object.keys(home.layout.blocks)[1]!));
    const dashboard = doc.screens["s-dashboard"]!;
    const narrow = Object.entries(dashboard.layout.blocks).find(([, block]) => block.rect.w < 12 && !block.parentId)!;
    expect(cellWidths(dashboard, narrow[0]).desktop).toBe(Math.round((1440 * narrow[1].rect.w) / 12));
  });

  it("collects one answer per device and gives the verdict once", () => {
    const collector = new ResponsiveCollector({ desktop: 1440, tablet: 768, mobile: 390 }, 600);
    const base = { overflowX: false, smallTargets: 0, clipped: 0 };
    expect(collector.add({ ...base, width: 952 })).toBeNull(); // the island's own width: ignored
    expect(collector.add({ ...base, width: 1440, height: 500 })).toBeNull();
    expect(collector.add({ ...base, width: 768 })).toBeNull();
    expect(collector.add({ ...base, width: 390, overflowX: true })).toEqual({ responsive: "warn", warnings: [{ code: "overflow", detail: "mobile · 390px" }] });
    // A new round starts empty.
    expect(collector.add({ ...base, width: 390 })).toBeNull();
  });
});
