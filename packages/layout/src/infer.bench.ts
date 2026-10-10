import { test } from "vitest";
import { toAsciiWireframe } from "./ascii";
import { toCss } from "./css";
import { inferStructure } from "./infer";
import { deriveResponsive } from "./responsive";
import { mulberry32, randomLayout, realisticLayout } from "./testing/random";

// Run with `pnpm --filter @dialmade/layout bench` (`vitest bench --run`). Target: infer + derive < 10 ms.
const realistic = realisticLayout(mulberry32(2026), 200);
const messy = randomLayout(mulberry32(7), { count: 200 });
const structure = inferStructure(realistic);
const responsive = deriveResponsive(realistic, structure);

test("200 blocks", async ({ bench }) => {
  await bench.compare(
    bench("inferStructure (realistic)", () => {
      inferStructure(realistic);
    }),
    bench("inferStructure + deriveResponsive (realistic)", () => {
      deriveResponsive(realistic, inferStructure(realistic));
    }),
    bench("inferStructure (random, overlapping)", () => {
      inferStructure(messy);
    }),
    bench("toCss (precomputed)", () => {
      toCss(realistic, { kind: "app", structure, responsive });
    }),
    bench("toAsciiWireframe", () => {
      toAsciiWireframe(realistic, { structure });
    }),
  );
});
