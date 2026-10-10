"use client";

import { themeColorsFromVars, type RenderBlockInput } from "@dialmade/ai-render";
import { compileThemeVars, createDesignDoc, type AiBlock } from "@dialmade/doc";
import { fontsUrlForDoc } from "@dialmade/sections";
import { useEffect, useMemo, useRef, useState } from "react";
import { AiIsland, useResponsiveGate } from "@/components/AiIsland";
import { AiBlocksCard } from "@/components/ExportDialog/AiBlocksCard";
import { useDictionary } from "@/i18n";
import { exportDialog } from "@/i18n/export";
import { Toaster } from "sonner";
import { EXPORT_TOASTER_ID } from "@/lib/toasters";
import { devExportDoc } from "./devExportDoc";
import { compileCssOffThread, processBlockOffThread } from "@/lib/ai/render/worker";

const RAW = `<section data-block-id="b-hero" class="@container bg-linear-to-r from-primary to-accent py-section" onclick="alert(1)">
<div class="mx-auto grid max-w-container gap-8 px-6 @3xl:grid-cols-12">
<div class="flex flex-col gap-5 @3xl:col-span-7">
<span class="inline-flex w-fit items-center gap-2 rounded-badge bg-primary-foreground/15 px-3 py-1 text-caption text-primary-foreground"><i data-icon="sparkle" aria-hidden="true" class="size-4"></i>Nuevo</span>
<h1 class="font-heading text-display font-bold leading-tight text-primary-foreground">Reserva tu corte en dos toques</h1>
<p class="text-body text-primary-foreground style-x">Agenda, clientes y cobros de tu barbería en un solo sitio.</p>
<div class="flex gap-3"><a href="#screen:s-precios" class="rounded-button bg-cta px-5 py-3 text-cta-foreground hover:bg-cta-600">Empieza gratis</a><a href="javascript:alert(1)" class="rounded-button border border-primary-foreground/40 px-5 py-3 text-primary-foreground">Ver demo</a></div>
</div>
<div class="@3xl:col-span-5"><img data-placeholder="screenshot" src="https://evil.example/x.png" alt="Agenda semanal" class="w-full rounded-card shadow-lg"></div>
</div></section>`;

const block: RenderBlockInput = { id: "b-hero", type: "hero", label: "Hero", cols: 12, heightPx: 480, h1: true, draft: [] };

export function DevAiRender() {
  const doc = useMemo(() => createDesignDoc({ brand: { name: "Brisa", seeds: { primary: "#0f766e", secondary: "#f59e0b" } }, brief: { productType: "saas-general", locale: "es", recipeId: "soft-ui" } }), []);
  const [mode, setMode] = useState<"light" | "dark">("light");
  const vars = useMemo(() => compileThemeVars(doc, { mode }), [doc, mode]);
  const [state, setState] = useState<{ html: string; css: string; ms: number; note: string; gates?: AiBlock["gates"] } | null>(null);
  const [log, setLog] = useState<string[]>([]);
  const exportTexts = useDictionary(exportDialog);
  const dialog = useRef<HTMLDialogElement>(null);
  const exportDoc = useMemo(() => (state?.html && state.gates ? devExportDoc(state.html, state.gates) : null), [state]);
  // Gate 5 at the 3 device widths of a full-width cell.
  const onMeasure = useResponsiveGate({ desktop: 1440, tablet: 768, mobile: 390 }, undefined, (verdict) => setLog((l) => [...l, `gate5 ${JSON.stringify(verdict)}`]));

  useEffect(() => {
    const t0 = performance.now();
    const theme = { light: themeColorsFromVars(compileThemeVars(doc, { mode: "light" })), dark: themeColorsFromVars(compileThemeVars(doc, { mode: "dark" })) };
    (async () => {
      const processed = await processBlockOffThread(RAW, { block, screenIds: ["s-precios"], theme });
      if (!processed.ok) {
        setState({ html: "", css: "", ms: performance.now() - t0, note: `failed: ${processed.failure}` });
        return;
      }
      const css = await compileCssOffThread([...processed.html.matchAll(/class="([^"]*)"/g)].flatMap((m) => m[1]!.split(" ")));
      setState({ html: processed.html, css, ms: performance.now() - t0, note: JSON.stringify(processed.gates), gates: processed.gates });
    })().catch((error: unknown) => setState({ html: "", css: "", ms: 0, note: `error: ${String(error)}` }));
  }, [doc]);

  return (
    <main className="mx-auto flex w-full max-w-5xl flex-col gap-4 p-6 text-fg">
      <h1 className="text-xl font-semibold">Dev · «Diseño con IA»</h1>
      <p data-testid="worker-status" className="text-small text-muted">
        {state ? `worker ok in ${Math.round(state.ms)} ms · css ${state.css.length} B · ${state.note}` : "worker…"}
      </p>
      <button type="button" className="w-fit rounded border border-app px-3 py-1" onClick={() => setMode((m) => (m === "light" ? "dark" : "light"))}>
        Modo: {mode}
      </button>
      <div className="rounded-lg border border-app" style={{ background: vars["--background"] }}>
        {state?.html ? (
          <AiIsland
            blockId="b-hero"
            html={state.html}
            css={state.css}
            vars={vars}
            mode={mode}
            fontsHref={fontsUrlForDoc(doc)}
            editable
            lang="es"
            title="Bloque Hero, diseñado con IA"
            onSelect={(t, text) => setLog((l) => [...l, `select ${t} ${text ?? ""}`])}
            onTextEdit={(t, text) => setLog((l) => [...l, `textEdit ${t} ${text}`])}
            measureWidths={[1440, 768, 390]}
            onMeasure={(m) => {
              setLog((l) => [...l, `measure ${JSON.stringify(m)}`]);
              onMeasure(m);
            }}
          />
        ) : null}
      </div>
      {exportDoc ? (
        <ul data-testid="export-card" className="m-0 grid max-w-md list-none p-0">
          <AiBlocksCard doc={exportDoc!} texts={exportTexts.aiExport} recommendedLabel={exportTexts.destinations.recommended} dialog={dialog} />
        </ul>
      ) : null}
      <Toaster id={EXPORT_TOASTER_ID} />
      <pre data-testid="island-log" className="text-caption whitespace-pre-wrap text-muted">{log.join("\n")}</pre>
    </main>
  );
}
