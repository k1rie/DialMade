"use client";

import { renderableBlocks } from "@dialmade/ai-render";
import { applyPatch } from "@dialmade/doc";
import { fontsUrlForDoc } from "@dialmade/sections";
import { useEffect, useMemo, useState } from "react";
import { useStore } from "zustand";
import { AiIsland } from "@/components/AiIsland";
import { Composer } from "@/components/Composer";
import { useAiIslandHandlers } from "@/hooks/useAiBlockEdit";
import { DesignDocProvider, useActiveKey, useDesignDerived, useDesignDoc, useDesignDocActions, useDesignDocStore } from "@/hooks/useDesignDoc";
import { aiBlockOf, setAiBlockOps } from "@/lib/ai/render/edit";
import { designedDoc, unwrap } from "@/lib/ai/render/editFixtures";
import { showsAi, useAiView } from "@/lib/ai/render/view";
import { compileCssOffThread } from "@/lib/ai/render/worker";

// A hero as «Generar con IA» would leave it (sanitized and canonical), so the islands show something real.
const HERO = (id: string) =>
  `<section class="@container bg-linear-to-br from-background to-muted py-section" data-block-id="${id}"><div class="mx-auto grid max-w-container gap-8 px-6 @3xl:grid-cols-12 @3xl:items-center"><div class="flex flex-col gap-5 @3xl:col-span-7"><span class="inline-flex w-fit items-center gap-2 rounded-badge bg-primary/10 px-3 py-1 text-caption text-primary-text" data-dl-t="0"><i class="size-4" data-icon="sparkle" aria-hidden="true"></i>Nuevo</span><h1 class="font-heading text-display leading-tight font-bold tracking-tight text-foreground" data-dl-t="1">Tu agenda, <span class="text-primary-text" data-dl-t="2">sin huecos</span></h1><p class="max-w-prose text-body text-muted-foreground" data-dl-t="3">Reservas, recordatorios y cobros de tu estudio en un solo sitio.</p><div class="flex flex-wrap gap-3"><a class="rounded-button bg-primary px-5 py-3 font-medium text-primary-foreground shadow-button transition-colors hover:bg-primary-hover" href="#" data-dl-t="4">Empieza gratis</a><a class="rounded-button border border-border px-5 py-3 font-medium text-foreground" href="#" data-dl-t="5">Ver demo</a></div></div><figure class="@3xl:col-span-5"><img class="aspect-4/3 w-full rounded-card shadow-card" data-placeholder="screenshot" alt="Agenda semanal con citas"></figure></div></section>`;

function seed() {
  const designed = designedDoc({ direction: true });
  const block = aiBlockOf(designed.doc, "s-home", designed.hero)!;
  const doc = unwrap(applyPatch(designed.doc, setAiBlockOps(designed.doc, "s-home", designed.hero, { ...block, html: HERO(designed.hero) })));
  return doc;
}

export function DevAiBlock() {
  const [doc] = useState(seed);
  return (
    <DesignDocProvider initialState={{ doc, activeKey: "s-home" }}>
      <Inner />
    </DesignDocProvider>
  );
}

function Inner() {
  const actions = useDesignDocActions();
  const ready = useDesignDoc((state) => state.engineReady);
  useEffect(() => {
    void actions.loadEngine();
  }, [actions]);
  if (!ready) return <p className="p-6 text-muted">…</p>;
  return (
    <main className="flex flex-col gap-6 p-4">
      <Composer onExport={() => {}} onBack={() => {}} onEditBrand={() => {}} />
      <IslandStrip />
    </main>
  );
}

/** What track A's `AiBlocks` does inside the canvas, standalone: one island per active AI block of the screen. */
function IslandStrip() {
  const doc = useDesignDoc((state) => state.doc)!;
  const mode = useDesignDoc((state) => state.previewMode);
  const key = useActiveKey();
  const derived = useDesignDerived(key);
  const steps = useStore(useDesignDocStore().temporal, (state) => state.pastStates.length);
  const view = useAiView((state) => state);
  const screenId = key && Object.hasOwn(doc.screens, key) ? key : "s-home";
  const screen = doc.screens[screenId]!;
  const handlers = useAiIslandHandlers(screenId);
  const blocks = useMemo(
    () => renderableBlocks(screen).flatMap((id) => (screen.aiRender?.blocks[id]?.active && screen.aiRender.blocks[id]!.html ? [[id, screen.aiRender.blocks[id]!.html] as const] : [])),
    [screen],
  );
  const classes = useMemo(() => [...new Set(blocks.flatMap(([, html]) => [...html.matchAll(/class="([^"]*)"/g)].flatMap((m) => m[1]!.split(" "))))], [blocks]);
  const [css, setCss] = useState("");
  useEffect(() => {
    void compileCssOffThread(classes).then(setCss);
  }, [classes]);
  const [log, setLog] = useState<string[]>([]);
  if (!derived) return null;
  return (
    <section aria-label="Islas" className="flex flex-col gap-3 rounded-lg border border-app p-3">
      <p data-testid="undo-state" className="text-caption text-muted">
        undo steps:{steps} · islands:{blocks.length}
      </p>
      {blocks.map(([id, html]) =>
        showsAi(view, screenId, id) ? (
          <div key={id} data-testid={`island-${id}`} className="overflow-hidden rounded-md" style={{ background: derived.vars[mode]["--background"] }}>
            {css && (
              <AiIsland
                blockId={id}
                html={html}
                css={css}
                vars={derived.vars[mode]}
                mode={mode}
                fontsHref={fontsUrlForDoc(doc)}
                editable
                lang="es"
                title={`Bloque ${id}, diseñado con IA`}
                onSelect={(t, text) => {
                  handlers.onSelect(id, t, text);
                  setLog((lines) => [...lines, `select ${id} ${t}`]);
                }}
                onTextEdit={(t, text) => {
                  handlers.onTextEdit(id, t, text);
                  setLog((lines) => [...lines, `textEdit ${id} ${t} ${text}`]);
                }}
              />
            )}
          </div>
        ) : (
          <p key={id} data-testid={`base-${id}`} className="text-caption text-muted">
            base: {id}
          </p>
        ),
      )}
      <pre data-testid="island-log" className="text-caption whitespace-pre-wrap text-muted">
        {log.join("\n")}
      </pre>
    </section>
  );
}
