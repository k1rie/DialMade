import { describe, expect, it } from "vitest";
import type { GenerationState, ScreenRun } from "@/lib/ai/render/generation";
import { ai } from "@/i18n/ai";
import { cancelDetail, failedScreens, runCounts, runProgress } from "./summary";

const screen = (screenId: string, phase: ScreenRun["phase"], blocks: Record<string, ScreenRun["blocks"][string]>, error?: ScreenRun["error"]): ScreenRun => ({
  screenId,
  phase,
  order: Object.keys(blocks),
  blocks,
  ...(error && { error }),
});

const state = (screens: ScreenRun[]): Pick<GenerationState, "screens" | "screenOrder"> => ({
  screens: Object.fromEntries(screens.map((s) => [s.screenId, s])),
  screenOrder: screens.map((s) => s.screenId),
});

describe("run bar summary", () => {
  it("counts blocks with AI, blocks left on the base design and gate warnings", () => {
    const value = state([
      screen("s-a", "done", { a: { phase: "done", warnings: 2 }, b: { phase: "failed", failure: "gates" }, c: { phase: "done" } }),
      screen("s-b", "cancelled", { d: { phase: "cancelled" }, e: { phase: "done", warnings: 1 } }),
    ]);
    expect(runCounts(value)).toEqual({ ai: 3, base: 1, warnings: 3 });
  });

  it("«Diseñando Inicio · bloque 2 de 6»: the first screen still streaming and how many run with it", () => {
    const value = state([
      screen("s-a", "done", { a: { phase: "done" } }),
      screen("s-b", "streaming", { b: { phase: "done" }, c: { phase: "processing" }, d: { phase: "waiting" } }),
      screen("s-c", "streaming", { e: { phase: "waiting" } }),
    ]);
    expect(runProgress(value)).toEqual({ screenId: "s-b", n: 2, total: 3, others: 1 });
    expect(runProgress(state([screen("s-a", "done", {})]))).toBeNull();
  });

  it("only screens whose call failed offer «Reintentar»", () => {
    const value = state([
      screen("s-a", "failed", { a: { phase: "failed" } }, "upstream-error"),
      screen("s-b", "done", { b: { phase: "failed" } }),
      screen("s-c", "cancelled", {}),
    ]);
    expect(failedScreens(value)).toEqual(["s-a"]);
  });
});

describe("cancelDetail", () => {
  it("says the screen was paid only on the free tier after screens were asked for", () => {
    const t = ai.es.aiRender.run;
    expect(cancelDetail("finishes", t)).toBe(t.cancelledPaid);
    expect(cancelDetail("stops", t)).toContain("tu key");
    expect(cancelDetail("none", t)).toBe(t.cancelledFree);
    expect(cancelDetail(null, t)).toBe(t.cancelledEarly);
  });
});
