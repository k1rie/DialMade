"use client";

import { brandInput, themeColorsFromVars, type RenderScreenInput } from "@dialmade/ai-render";
import { compileThemeVars, createDesignDoc } from "@dialmade/doc";
import { fontsUrlForDoc } from "@dialmade/sections";
import { useMemo, useState } from "react";
import { AiIsland } from "@/components/AiIsland";
import { AiKeyDialog } from "@/components/AiKeyDialog";
import { useAiStatus } from "@/hooks/useAiStatus";
import { useDictionary, useI18n } from "@/i18n";
import { ai } from "@/i18n/ai";
import { useByokRenderModel } from "@/lib/ai/render/byokModel";
import { renderCostLines } from "@/lib/ai/render/costLine";
import { estimateRender } from "@/lib/ai/render/estimate";
import { manualDirection, manualRenderJob, manualTransport, type ManualRenderAnswer } from "@/lib/ai/render/manual";
import { compileCssOffThread, processBlockOffThread } from "@/lib/ai/render/worker";

const blocks = (prefix: string, types: string[]) => types.map((type, i) => ({ id: `${prefix}-${type}`, type, label: type, cols: 12, heightPx: 420, ...(i === 1 && { h1: true as const }), draft: ["Reserva tu corte en dos toques", "Agenda y cobros en un solo sitio", "Empieza gratis"] }));
const SCREENS: RenderScreenInput[] = [
  { id: "s-home", name: "Inicio", kind: "landing", route: "/", locale: "es", screens: [{ id: "s-precios", name: "Precios" }], blocks: blocks("home", ["navbar", "hero", "features", "cta", "footer"]) },
  { id: "s-precios", name: "Precios", kind: "landing", route: "/precios", locale: "es", screens: [{ id: "s-home", name: "Inicio" }], blocks: blocks("precios", ["navbar", "pricing", "faq", "footer"]) },
  { id: "s-app", name: "Agenda", kind: "app", route: "/app", locale: "es", screens: [], blocks: blocks("app", ["sidebar", "table", "chart"]) },
];

type Rendered = { id: string; html: string };

export function DevAiAccess() {
  const t = useDictionary(ai).aiAccess;
  const { locale } = useI18n();
  const { status } = useAiStatus();
  const model = useByokRenderModel();
  const doc = useMemo(() => createDesignDoc({ brand: { name: "Brisa", seeds: { primary: "#0f766e", secondary: "#f59e0b" } }, brief: { productType: "saas-general", locale: "es", recipeId: "soft-ui" } }), []);
  const brand = useMemo(() => brandInput(doc, { description: "Reservas y cobros para barberías de barrio" }), [doc]);
  const direction = useMemo(() => manualDirection(42, "soft-ui", "auto"), []);
  const job = useMemo(() => manualRenderJob({ brand, direction, screens: SCREENS.slice(0, 1) }), [brand, direction]);
  const [open, setOpen] = useState(false);
  const [rendered, setRendered] = useState<Rendered[]>([]);
  const [css, setCss] = useState("");
  const [log, setLog] = useState<string[]>([]);
  const vars = useMemo(() => compileThemeVars(doc, { mode: "light" }), [doc]);

  const base = { brand, screens: SCREENS, newDirection: true, recipeId: "soft-ui" } as const;
  const rows = [
    estimateRender({ ...base, path: "free", model: status?.freeModel ?? "claude-haiku-5-5" }),
    estimateRender({ ...base, screens: SCREENS.slice(0, 3), path: "byok", model }),
    estimateRender({ ...base, path: "manual", model: "claude.ai" }),
  ];
  const sonnet = estimateRender({ ...base, path: "byok", model: "claude-sonnet-5-5" });
  const opus = estimateRender({ ...base, path: "byok", model: "claude-opus-5-5" });

  const run = async (answer: ManualRenderAnswer) => {
    const transport = manualTransport({ direction, answer });
    const session = await transport.openSession({ screens: 1 });
    const theme = { light: themeColorsFromVars(compileThemeVars(doc, { mode: "light" })), dark: themeColorsFromVars(compileThemeVars(doc, { mode: "dark" })) };
    const out: Rendered[] = [];
    const screen = SCREENS[0]!;
    for await (const event of transport.screen({ sessionId: session.sessionId, brand, direction, screen })) {
      setLog((l) => [...l, event.type === "block" ? `block ${event.blockId}` : event.type]);
      if (event.type !== "block") continue;
      const block = screen.blocks.find((b) => b.id === event.blockId)!;
      const processed = await processBlockOffThread(event.html, { block, screenIds: SCREENS.map((s) => s.id), theme });
      setLog((l) => [...l, processed.ok ? `  gates ok · ${processed.gates.warnings.map((w) => w.code).join(", ") || "no warnings"}` : `  base design (${processed.failure})`]);
      if (processed.ok) out.push({ id: block.id, html: processed.html });
    }
    setCss(await compileCssOffThread(out.flatMap((b) => [...b.html.matchAll(/class="([^"]*)"/g)].flatMap((m) => m[1]!.split(" ")))));
    setRendered(out);
  };

  return (
    <main className="mx-auto flex w-full max-w-4xl flex-col gap-6 p-6 text-fg">
      <h1 className="text-xl font-semibold">Dev · «Diseño con IA» · caminos de acceso</h1>
      <section aria-label="cost lines" className="flex flex-col gap-3">
        {rows.map((estimate) => {
          const lines = renderCostLines(estimate, t, locale, status);
          return (
            <div key={estimate.path} data-testid={`cost-${estimate.path}`} className="rounded-control border border-app p-3">
              <p className="m-0 text-caption text-muted">{t.paths[estimate.path]}</p>
              <p className="m-0 font-mono text-small">{lines.line}</p>
              {lines.cheaper && <p className="m-0 text-small text-accent">{lines.cheaper}</p>}
              {lines.sessions && <p className="m-0 text-small text-muted">{lines.sessions}</p>}
              {lines.unmeasured && <p className="m-0 text-caption text-subtle">{lines.unmeasured}</p>}
            </div>
          );
        })}
        <p className="m-0 text-caption text-muted">{t.cost.session}</p>
      </section>
      <button type="button" data-testid="open-dialog" className="w-fit rounded border border-app px-3 py-1.5" onClick={() => setOpen(true)}>
        Usar mi key o mi Claude
      </button>
      <AiKeyDialog
        open={open}
        onOpenChange={setOpen}
        reason="free-tier-exhausted"
        manual={job}
        renderModels={{ estimates: { "claude-opus-5-5": opus, "claude-sonnet-5-5": sonnet } }}
        onManualResult={(answer) => void run(answer)}
      />
      <pre data-testid="access-log" className="text-caption whitespace-pre-wrap text-muted">{log.join("\n")}</pre>
      <div className="flex flex-col gap-2" style={{ background: vars["--background"] }}>
        {rendered.map((block) => (
          <AiIsland key={block.id} blockId={block.id} html={block.html} css={css} vars={vars} mode="light" fontsHref={fontsUrlForDoc(doc)} editable={false} lang="es" title={`Bloque ${block.id}`} />
        ))}
      </div>
    </main>
  );
}
