// Fixtures for the tests of src/lib/ai (no network: the SDK client is a mock).
import type Anthropic from "@anthropic-ai/sdk";
import type { OutputKind } from "@dialmade/catalog";
import { createDesignDoc, formatIssues, safeParseDesignDoc, type DesignDoc, type ScreenInput } from "@dialmade/doc";
import { getScreenTemplate, instantiateTemplate, type LayoutDoc, type ScreenTemplateId } from "@dialmade/layout";
import { addDefaultPage, buildPageFromLayout, contentContextFromDoc } from "@dialmade/sections";
import { vi } from "vitest";

export function sampleDoc(kinds: readonly OutputKind[] = ["landing"], productType = "saas-general"): DesignDoc {
  let doc = createDesignDoc({
    brand: { name: "Brisa", tagline: "Pagos sin fricción", seeds: { primary: "#7c5cff" } },
    brief: { productType, locale: "es", focus: kinds[0] ?? "landing" },
  });
  for (const kind of kinds) doc = addDefaultPage(doc, kind);
  return doc;
}

/** Screens of `sampleScreensDoc`: a web home (landing template) and an app detail screen with a sidebar. */
export const SAMPLE_SCREENS: readonly { id: string; name: string; route: string; template: ScreenTemplateId }[] = [
  { id: "s-home", name: "Inicio", route: "/", template: "home" },
  { id: "s-detail", name: "Detalle", route: "/app/detalle", template: "detail" },
];

/**
 * A DesignDoc v2 as the layout step writes it after «Generar»: `screens` + `screenOrder` built from the
 * templates by `buildPageFromLayout`, the style guide in `pages.brand`. Block ids are `b-000000`, `b-000001`…
 * across the whole document, labels are the type names. `layout` edits a screen's boxes before the build.
 */
export function sampleScreensDoc(
  screens = SAMPLE_SCREENS,
  options: { layout?: (screenId: string, layout: LayoutDoc) => LayoutDoc } = {},
): DesignDoc {
  const base = sampleDoc(["brand"]);
  const ctx = contentContextFromDoc(base);
  let n = 0;
  const newId = () => `b-${(n++).toString(36).padStart(6, "0")}`;
  const built = screens.map((spec) => {
    const made = instantiateTemplate(getScreenTemplate(spec.template), { label: (type) => type, newId });
    return { spec, ...made, layout: options.layout ? options.layout(spec.id, made.layout) : made.layout };
  });
  const navScreens = built.filter(({ kind, shell }) => kind === "app" && shell && shell.nav !== "none").map(({ spec }) => ({ id: spec.id, name: spec.name }));
  const inputs: ScreenInput[] = built.map(({ spec, layout, shell, kind }) => {
    const screenKind = kind ?? "landing";
    const result = buildPageFromLayout(layout, screenKind, shell, ctx, { screenId: spec.id, screenTitle: spec.name, navScreens });
    const blocks = Object.fromEntries(
      Object.entries(layout.blocks).map(([id, block]) => [id, result.fingerprints[id] ? { ...block, generated: result.fingerprints[id] } : block]),
    );
    return { id: spec.id, name: spec.name, kind: screenKind, route: spec.route, layout: { ...layout, blocks }, page: result.page, shell };
  });
  const parsed = safeParseDesignDoc({
    ...base,
    brief: { ...base.brief, focus: inputs[0]?.kind ?? "landing" },
    screens: Object.fromEntries(inputs.map((screen) => [screen.id, screen])),
    screenOrder: inputs.map((screen) => screen.id),
  });
  if (!parsed.success) throw new Error(formatIssues(parsed.issues));
  return parsed.data;
}

export type MockMessage = {
  model: string;
  stop_reason: string | null;
  content: unknown[];
  usage: {
    input_tokens: number;
    output_tokens: number;
    cache_creation_input_tokens: number | null;
    cache_read_input_tokens: number | null;
    iterations?: unknown[] | null;
  };
};

/** A response whose text block is `output` as JSON (`null` = no text at all). */
export function message(partial: Partial<MockMessage> & { output?: unknown } = {}): MockMessage {
  const { output = { edits: [] }, ...rest } = partial;
  return {
    model: "claude-opus-5-5",
    stop_reason: "end_turn",
    content: output === null ? [] : [{ type: "text", text: typeof output === "string" ? output : JSON.stringify(output) }],
    usage: { input_tokens: 1200, output_tokens: 800, cache_creation_input_tokens: 0, cache_read_input_tokens: 2000, iterations: null },
    ...rest,
  };
}

/** A stand-in for `new Anthropic()` exposing only what lib/ai calls. */
export function mockClient(options: { inputTokens?: number; create?: () => Promise<unknown> } = {}) {
  type Call<R> = (params: unknown, requestOptions?: unknown) => Promise<R>;
  const countTokens = vi.fn<Call<{ input_tokens: number }>>(async () => ({ input_tokens: options.inputTokens ?? 3000 }));
  const create = vi.fn<Call<unknown>>(async () => (options.create ? options.create() : message()));
  const client = { beta: { messages: { countTokens, create } } } as unknown as Anthropic;
  return { client, countTokens, create };
}
