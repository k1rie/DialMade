import { describe, expect, it } from "vitest";
import { nextLiveMessage } from "./liveMessage";

describe("nextLiveMessage", () => {
  it("shows a new message as is", () => {
    expect(nextLiveMessage("", "Calendario añadido")).toBe("Calendario añadido");
    expect(nextLiveMessage("Calendario añadido", "Deshecho")).toBe("Deshecho");
  });

  it("changes the region when the same message comes again, so it is spoken again", () => {
    const again = nextLiveMessage("Deshecho", "Deshecho");
    expect(again).not.toBe("Deshecho");
    expect(again.startsWith("Deshecho")).toBe(true);
    expect(nextLiveMessage(again, "Deshecho")).toBe("Deshecho");
  });
});
