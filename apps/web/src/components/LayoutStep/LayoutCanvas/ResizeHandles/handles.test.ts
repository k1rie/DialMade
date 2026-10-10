import { describe, expect, it } from "vitest";
import { EDGE_MIN_PX, visibleHandles } from "./handles";

describe("visibleHandles (findings 18 / 25)", () => {
  it("shows all eight handles on a roomy block, corners last", () => {
    expect(visibleHandles(200, 200)).toEqual(["n", "e", "s", "w", "nw", "ne", "se", "sw"]);
  });

  it("leaves the «ne» corner out under a warnings badge, so a click on the badge never starts a resize", () => {
    const handles = visibleHandles(200, 200, true);
    expect(handles).not.toContain("ne");
    expect(handles).toHaveLength(7);
  });

  it("drops edge handles that have no room", () => {
    expect(visibleHandles(EDGE_MIN_PX - 1, 200)).not.toContain("n");
    expect(visibleHandles(200, EDGE_MIN_PX - 1)).not.toContain("e");
    expect(visibleHandles(10, 10, true)).toEqual(["nw", "se", "sw"]);
  });
});
