import { describe, expect, it } from "vitest";
import { DND_INSTRUCTIONS_ID } from "../../../../../lib/dnd";
import { tileDescription, tileKeyAction, type LibraryHints, type TileKeyInput } from "./tileKeyboard";

const key = (value: string, extra: Partial<TileKeyInput> = {}): TileKeyInput => ({
  key: value,
  repeat: false,
  altKey: false,
  ctrlKey: false,
  metaKey: false,
  shiftKey: false,
  defaultPrevented: false,
  ...extra,
});

const hints: LibraryHints = { keys: "h-keys", soon: "h-soon", frame: "h-frame", appOnly: "h-app" };

describe("tileKeyAction", () => {
  it("leaves Space and Enter to the drag sensor on a resting tile: both pick it up (CLAUDE.md)", () => {
    expect(tileKeyAction(key("Enter"), true)).toBe("pass");
    expect(tileKeyAction(key(" "), true)).toBe("pass");
  });

  it("leaves Space and Enter to the drag sensor during a drag: both drop", () => {
    expect(tileKeyAction(key("Enter"), false)).toBe("pass");
    expect(tileKeyAction(key(" ", { repeat: true }), false)).toBe("pass");
  });

  it("never lets a held or modified Space/Enter start a drag", () => {
    expect(tileKeyAction(key("Enter", { repeat: true }), true)).toBe("swallow");
    expect(tileKeyAction(key(" ", { repeat: true }), true)).toBe("swallow");
    expect(tileKeyAction(key("Enter", { shiftKey: true }), true)).toBe("swallow");
    expect(tileKeyAction(key(" ", { metaKey: true }), true)).toBe("swallow");
  });

  it("leaves the arrows and handled keys alone", () => {
    expect(tileKeyAction(key("ArrowRight"), true)).toBe("pass");
    expect(tileKeyAction(key("Enter", { defaultPrevented: true }), true)).toBe("pass");
  });
});

describe("tileDescription", () => {
  it("describes a tile with its own instructions only, never the generic drag ones", () => {
    expect(tileDescription(hints, "block", false)).toBe("h-keys");
    expect(tileDescription(hints, "block", false).split(" ")).not.toContain(DND_INSTRUCTIONS_ID);
  });

  it("adds what the tile does on this screen after how it works", () => {
    expect(tileDescription(hints, "frame", true)).toBe("h-keys h-frame h-soon");
    expect(tileDescription(hints, "block", true)).toBe("h-keys h-soon");
  });

  it("only explains why a tile is disabled", () => {
    expect(tileDescription(hints, "appOnly", true)).toBe("h-app");
  });
});
