import { describe, expect, it } from "vitest";
import type { StyleReference } from "@/lib/ai/render/generation";
import { appendReferences, referenceId, roomFor } from "./referenceList";

const shot = (n: number): StyleReference => ({ id: `r-${n}`, name: `shot-${n}.png`, mediaType: "image/jpeg", data: `data-${n}` });

describe("appendReferences", () => {
  it("adds after what is attached now and keeps the order", () => {
    expect(appendReferences([shot(1)], [shot(2), shot(3)], 3).map((reference) => reference.id)).toEqual(["r-1", "r-2", "r-3"]);
  });

  it("never goes over the maximum", () => {
    expect(appendReferences([shot(1), shot(2)], [shot(3), shot(4)], 3).map((reference) => reference.id)).toEqual(["r-1", "r-2", "r-3"]);
    expect(appendReferences([], [shot(1), shot(2), shot(3), shot(4)], 3)).toHaveLength(3);
  });

  it("does not undo a removal made while the files were being read", () => {
    const attachedWhenReadingStarted = [shot(1), shot(2)];
    const attachedNow = [shot(2)]; // the first thumbnail was removed meanwhile
    expect(attachedWhenReadingStarted).toHaveLength(2);
    expect(appendReferences(attachedNow, [shot(3)], 3).map((reference) => reference.id)).toEqual(["r-2", "r-3"]);
  });

  it("does not repeat an id it already has", () => {
    expect(appendReferences([shot(1)], [shot(1), shot(2)], 3).map((reference) => reference.id)).toEqual(["r-1", "r-2"]);
  });
});

describe("roomFor", () => {
  it("is what is left, never negative", () => {
    expect(roomFor([], 3)).toBe(3);
    expect(roomFor([shot(1), shot(2)], 3)).toBe(1);
    expect(roomFor([shot(1), shot(2), shot(3), shot(4)], 3)).toBe(0);
  });
});

describe("referenceId", () => {
  it("is unique even when called in the same millisecond", () => {
    expect(new Set(Array.from({ length: 50 }, referenceId)).size).toBe(50);
  });
});
