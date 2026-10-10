import { describe, expect, it } from "vitest";
import { tabExit } from "./tabExit";

describe("tabExit", () => {
  const panel = "panel";
  const items = ["a", "b", "c"];

  it("leaves after the last control and before the first one", () => {
    expect(tabExit(items, "c", panel, false)).toBe("after");
    expect(tabExit(items, "a", panel, true)).toBe("before");
  });

  it("stays inside between controls", () => {
    expect(tabExit(items, "a", panel, false)).toBeNull();
    expect(tabExit(items, "b", panel, true)).toBeNull();
    expect(tabExit(items, "c", panel, true)).toBeNull();
  });

  it("a single control is both edges (the shortcuts switch)", () => {
    expect(tabExit(["switch"], "switch", panel, false)).toBe("after");
    expect(tabExit(["switch"], "switch", panel, true)).toBe("before");
  });

  it("from the panel itself: Tab enters its first control, or leaves when it has none", () => {
    expect(tabExit(items, panel, panel, false)).toBeNull();
    expect(tabExit(items, panel, panel, true)).toBe("before");
    expect(tabExit([], panel, panel, false)).toBe("after");
  });

  it("ignores focus that is not in the popover", () => {
    expect(tabExit(items, "elsewhere", panel, false)).toBeNull();
    expect(tabExit(items, null, panel, true)).toBeNull();
  });
});
