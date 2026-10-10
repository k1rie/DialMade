// @vitest-environment node
import { applyPatch } from "@dialmade/doc";
import { renderToStaticMarkup } from "react-dom/server";
import { describe, expect, it } from "vitest";
import type { UseAiBlockActions } from "@/hooks/useAiBlockEdit";
import { I18nProvider } from "@/i18n";
import { designedDoc, unwrap } from "@/lib/ai/render/editFixtures";
import { AiBlockCard } from "./AiBlockCard";

const idle: UseAiBlockActions = { running: null, opening: false, run: async () => true, openSession: async () => true, stop: () => {}, setActive: () => {} };

const render = (doc: ReturnType<typeof designedDoc>["doc"], blockId: string, actions = idle) =>
  renderToStaticMarkup(
    <I18nProvider>
      <AiBlockCard doc={doc} screenId="s-home" blockId={blockId} label="Hero" blockActions={actions} />
    </I18nProvider>,
  );

describe("«Bloque de IA» card", () => {
  it("offers the chips, «Pedir cambio», «Otra versión» and «Usar diseño base»; without a session, says so before any call", () => {
    const { doc, hero } = designedDoc({ direction: true });
    const html = render(doc, hero);
    for (const text of ["Más aire", "Más compacto", "Alinear a la izquierda", "Fondo de marca", "Más sobrio", "Pedir cambio", "Otra versión", "Usar diseño base", "Abrir sesión"]) {
      expect(html).toContain(text);
    }
    expect(html).toContain('maxLength="500"');
    // No session: the paid actions are disabled until the user opens one.
    expect(html.match(/<button[^>]*disabled=""[^>]*>[^<]*Más aire/)).not.toBeNull();
    expect(html).toContain("Generado · Haiku 5.5 · IA gratis");
    expect(html).not.toContain("Desactualizado");
  });

  it("says «El estilo cambió» after a recipe change, with «Rehacer con IA» (never automatic)", () => {
    const { doc, hero } = designedDoc({ direction: true });
    const restyled = unwrap(applyPatch(doc, [{ op: "replace", path: "/brief/recipeId", value: "editorial" }]));
    const html = render(restyled, hero);
    expect(html).toContain("El estilo cambió");
    expect(html).toContain("Rehacer con IA");
  });

  it("marks a busy block and announces it", () => {
    const { doc, hero } = designedDoc({ direction: true });
    const html = render(doc, hero, { ...idle, running: { screenId: "s-home", blockId: hero, kind: "reroll" } });
    expect(html).toContain('aria-busy="true"');
    expect(html).toContain("Diseñando otra versión de «Hero»…");
  });

  it("renders nothing for a block without AI design", () => {
    const { doc } = designedDoc();
    expect(render(doc, "b-nope")).toBe("");
  });
});
