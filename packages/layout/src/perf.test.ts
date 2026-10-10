import { expect, test } from "vitest";
import { inferStructure } from "./infer";
import { deriveResponsive } from "./responsive";
import { mulberry32, realisticLayout } from "./testing/random";

// The package compiles without DOM or Node types; vitest runs on Node, where `performance` exists.
declare const performance: { now(): number };

test("inferStructure + deriveResponsive with 200 blocks: median < 10 ms", () => {
  const layout = realisticLayout(mulberry32(2026), 200);
  expect(Object.keys(layout.blocks)).toHaveLength(200);
  const run = () => deriveResponsive(layout, inferStructure(layout));
  for (let i = 0; i < 10; i++) run();
  const times: number[] = [];
  for (let i = 0; i < 30; i++) {
    const start = performance.now();
    run();
    times.push(performance.now() - start);
  }
  times.sort((a, b) => a - b);
  const median = (times[14]! + times[15]!) / 2;
  expect(median).toBeLessThan(10);
});
