// What the run bar says, from the generation state (pure, so vitest checks it without React).
import type { GenerationState } from "@/lib/ai/render/generation";

export type RunCounts = { ai: number; base: number; warnings: number };

/** Blocks with AI, blocks left on the base design (failed) and gate warnings, over every screen of the run. */
export function runCounts(state: Pick<GenerationState, "screens">): RunCounts {
  let ai = 0;
  let base = 0;
  let warnings = 0;
  for (const screen of Object.values(state.screens)) {
    for (const block of Object.values(screen.blocks)) {
      if (block.phase === "done") {
        ai++;
        warnings += block.warnings ?? 0;
      } else if (block.phase === "failed") base++;
    }
  }
  return { ai, base, warnings };
}

/** The screen the progress line talks about: the first one still streaming, its block «n of N», and how many more run. */
export function runProgress(state: Pick<GenerationState, "screens" | "screenOrder">): { screenId: string; n: number; total: number; others: number } | null {
  const streaming = state.screenOrder.filter((id) => state.screens[id]?.phase === "streaming" || state.screens[id]?.phase === "queued");
  const first = streaming[0];
  if (!first) return null;
  const screen = state.screens[first]!;
  const total = screen.order.length;
  const finished = screen.order.filter((id) => {
    const phase = screen.blocks[id]?.phase;
    return phase === "done" || phase === "failed";
  }).length;
  return { screenId: first, n: Math.min(total, finished + 1), total, others: streaming.length - 1 };
}

/** Screens whose call failed (a retry of them is free). */
export const failedScreens = (state: Pick<GenerationState, "screens" | "screenOrder">): string[] =>
  state.screenOrder.filter((id) => state.screens[id]?.phase === "failed" && state.screens[id]?.error !== undefined);
