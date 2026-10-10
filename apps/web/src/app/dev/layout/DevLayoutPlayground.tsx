"use client";

import { createDesignDoc } from "@dialmade/doc";
import dynamic from "next/dynamic";
import { useState } from "react";
import { AppBackground } from "@/components/AppBackground";
import { DndProvider } from "@/components/dnd/DndProvider";
import type { GenerateResult, StyleChoice } from "@/components/LayoutStep";
import { Panel } from "@/components/ui/Panel";
import { useDictionary } from "@/i18n";
import { layout } from "@/i18n/layout";

// Client only: the layout store creates block and screen ids, and none may be created while prerendering.
const LayoutStep = dynamic(() => import("@/components/LayoutStep").then((module) => module.LayoutStep), { ssr: false });

/** Fictional brand for the playground (never a real one). Deterministic, so it is safe at module level. */
const SAMPLE_DOC = createDesignDoc({
  brand: { name: "Lumen", seeds: { primary: "#7c5cff" } },
  brief: { productType: "saas-general", locale: "es" },
});

/** What the log shows of a «Generar» result: enough to check it, small enough to read. */
function summarize(result: GenerateResult) {
  return {
    changed: result.changed,
    screens: result.screens.map((screen) => ({
      name: screen.name,
      kind: screen.kind,
      route: screen.route,
      nav: screen.shell?.nav ?? null,
      blocks: Object.keys(screen.layout.blocks).length,
      order: screen.structure.order.length,
      root: screen.structure.root?.kind ?? null,
      warnings: screen.warnings.map((warning) => warning.code),
      cssBytes: screen.css.length,
      asciiLines: screen.ascii.split("\n").length,
    })),
  };
}

/** `/dev/layout`: LayoutStep alone, with a sample doc, the DnD context and a log of `onGenerate`. */
export function DevLayoutPlayground() {
  const t = useDictionary(layout);
  const [style, setStyle] = useState<StyleChoice>(SAMPLE_DOC.brief.recipeId);
  const [runs, setRuns] = useState<GenerateResult[]>([]);
  const last = runs.at(-1);

  return (
    <DndProvider>
      <AppBackground tint="oklch(0.6 0.22 290)" />
      <main id="main" className="flex flex-1 flex-col gap-4 px-4 pt-4 pb-10 sm:px-6">
        <LayoutStep doc={SAMPLE_DOC} style={style} onStyleChange={setStyle} onGenerate={(result) => setRuns((list) => [...list, result])} />
        <Panel title={t.dev.log} description={t.dev.logHint} className="mx-auto w-full max-w-[1760px]">
          <p className="mb-3 text-caption text-muted">
            {t.dev.style(style)} · {t.dev.runs(runs.length)}
          </p>
          {last ? (
            <pre className="max-h-96 overflow-auto rounded-control border border-app bg-white/[0.02] p-3 font-mono text-caption text-muted">
              {JSON.stringify(summarize(last), null, 2)}
            </pre>
          ) : (
            <p className="text-small text-muted">{t.dev.empty}</p>
          )}
        </Panel>
      </main>
    </DndProvider>
  );
}
