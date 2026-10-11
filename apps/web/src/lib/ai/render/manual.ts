// «Copiar prompt para mi Claude» for «Diseño con IA» (spec §5.6): $0, the user's own Claude account. The prompt is the
// same contract and data the API paths send; the pasted answer goes through the same stream parser (`splitBlocks`)
// and is replayed as the same `RenderStreamEvent`s, so the caller sanitizes it in the same worker and runs the same
// gates. It is the most hostile path (anyone can paste anything), so it takes no shortcut: a size cap, the roots of
// the requested blocks only, the first copy of each, and everything else dropped. Client-safe.
import {
  attachedReferencesText,
  defaultPick,
  directionCandidates,
  manualBlockPrompt,
  manualPrompt,
  pageAgentPrompt,
  pageManualPrompt,
  pageStyleText,
  splitBlocks,
  type BlockActionInput,
  type RenderBrandInput,
  type RenderScreenInput,
  type StreamBlock,
} from "@dialmade/ai-render";
import type { AiDirectionChip, AiRenderTier } from "@dialmade/doc";
import type { ManualJob, ManualParseResult } from "../manual";
import { promptFileName } from "../vision/prompt";
import type { RenderStreamEvent } from "./api";
import type { RenderDirectionAnswer, RenderTransport, TransportBlock, TransportDirection } from "./transport";

/** Cap of a pasted answer (spec §5.6): 3 screens of ≈ 40 KB fit with room; anything bigger is not an answer. */
export const MAX_MANUAL_RENDER_CHARS = 400 * 1024;
/** Provenance model of «mi Claude». */
export const MANUAL_MODEL = "claude.ai";

/** The direction without a model: the code's first pick for this seed, recipe and chip (spec §4.2). */
export function manualDirection(seed: number, recipeId: string, chip: AiDirectionChip = "auto"): RenderDirectionAnswer {
  return { ...defaultPick(directionCandidates(seed, recipeId, chip)), rationale: "" };
}

/** A pasted screen answer: the roots of each requested screen, in the order they came. */
export type ManualRenderAnswer = { screens: Record<string, StreamBlock[]> };

type Prepared = { ok: true; text: string } | { ok: false; result: ManualParseResult<never> };

function prepare(text: string): Prepared {
  const body = text.trim();
  if (body === "") return { ok: false, result: { ok: false, error: "empty" } };
  if (body.length > MAX_MANUAL_RENDER_CHARS) return { ok: false, result: { ok: false, error: "invalid-schema", detail: `> ${MAX_MANUAL_RENDER_CHARS / 1024} KB` } };
  return { ok: true, text: body };
}

/**
 * The roots of `text` that belong to `screens`: each requested block id once (the first copy wins), assigned to its
 * screen. `dropped` counts roots without an id, of blocks that were not asked for, and repeated copies.
 */
export function parseManualRender(text: string, screens: readonly Pick<RenderScreenInput, "id" | "blocks" | "mode">[]): ManualParseResult<ManualRenderAnswer> {
  const prepared = prepare(text);
  if (!prepared.ok) return prepared.result;
  const owner = new Map<string, string>();
  for (const screen of screens) for (const block of screen.blocks) if (!owner.has(block.id)) owner.set(block.id, screen.id);
  const roots = splitBlocks(prepared.text, owner.keys());
  if (roots.length === 0) return { ok: false, error: "not-json" };
  const out: Record<string, StreamBlock[]> = Object.fromEntries(screens.map((screen) => [screen.id, [] as StreamBlock[]]));
  const seen = new Set<string>();
  const page = new Set(screens.filter((screen) => screen.mode === "page").map((screen) => screen.id));
  const styled = new Set<string>();
  // Page mode: each screen's `<style data-dl-page>` comes before its roots; it goes to the next page screen that has none.
  let pendingStyle: StreamBlock | null = null;
  let dropped = 0;
  for (const root of roots) {
    if (root.blockId === null && page.size > 0 && pageStyleText(root.html) !== null) {
      if (pendingStyle) dropped++;
      pendingStyle = root;
      continue;
    }
    const screenId = root.blockId === null ? undefined : owner.get(root.blockId);
    if (pendingStyle && screenId && page.has(screenId) && !styled.has(screenId)) {
      out[screenId]!.unshift(pendingStyle);
      styled.add(screenId);
      pendingStyle = null;
    }
    if (!screenId || seen.has(root.blockId!)) {
      dropped++;
      continue;
    }
    seen.add(root.blockId!);
    out[screenId]!.push(root);
  }
  if (seen.size === 0) return { ok: false, error: "no-result" };
  return { ok: true, value: { screens: out }, dropped };
}

/** «mi Claude» for a generate: the prompt of `screens` with `direction`, and the parser of the pasted HTML. */
export function manualRenderJob(input: {
  brand: RenderBrandInput;
  direction: RenderDirectionAnswer;
  screens: readonly RenderScreenInput[];
  tier?: AiRenderTier;
  /** The reference screenshots of «Estilo»: they cannot travel in the text, so the user attaches them in Claude. */
  references?: readonly { name: string }[];
}): ManualJob<ManualRenderAnswer> {
  const references = input.references ?? [];
  // Landings go as pages (their own contract), the other screens block by block: a mixed pick gets both parts.
  const pages = input.screens.filter((screen) => screen.mode === "page");
  const blocks = input.screens.filter((screen) => screen.mode !== "page");
  const attached = references.length > 0 ? attachedReferencesText(references.length) : undefined;
  const prompt = [
    ...(pages.length > 0
      ? [input.tier === "final" ? pageAgentPrompt(input.brand, input.direction, pages, attached) : pageManualPrompt(input.brand, input.direction, pages, input.tier, attached)]
      : []),
    ...(blocks.length > 0 ? [manualPrompt(input.brand, input.direction, blocks, input.tier, { references: pages.length > 0 ? 0 : references.length })] : []),
  ].join("\n\n---\n\nThen, for the next screens, follow this second contract:\n\n");
  return {
    prompt,
    attachments: references.map((reference, index) => promptFileName(reference.name || `reference-${index + 1}`)),
    format: "html",
    parse: (text) => parseManualRender(text, input.screens),
  };
}

/** «mi Claude» for «Otra versión» / «Pedir cambio» of one block: the pasted answer is that block's root (raw). */
export function manualBlockJob(input: { brand: RenderBrandInput; direction: RenderDirectionAnswer; action: BlockActionInput; tier?: AiRenderTier }): ManualJob<string> {
  const id = input.action.block.id;
  return {
    prompt: manualBlockPrompt(input.brand, input.direction, input.action, input.tier),
    attachments: [],
    format: "html",
    parse(text) {
      const parsed = parseManualRender(text, [{ id: "block", blocks: [input.action.block] }]);
      if (!parsed.ok) return parsed;
      const root = parsed.value.screens.block?.find((block) => block.blockId === id);
      return root ? { ok: true, value: root.html, dropped: parsed.dropped } : { ok: false, error: "no-result" };
    },
  };
}

const noAnswer = (what: string) => ({ code: "invalid-request" as const, message: `«mi Claude»: no pasted answer for ${what}` });

/**
 * The pasted answers as a transport: the session is local, the direction is the one the prompt carried, each screen
 * replays its roots as `block` events (then `done`) and a block action returns its pasted root.
 */
export function manualTransport(input: { direction: RenderDirectionAnswer; answer?: ManualRenderAnswer; block?: string; tier?: AiRenderTier }): RenderTransport {
  return {
    path: "manual",
    model: MANUAL_MODEL,
    tier: input.tier ?? "mockup",
    cancelStopsBilling: true,
    async openSession() {
      return { sessionId: crypto.randomUUID(), session: null };
    },
    async direction(): Promise<TransportDirection> {
      return { direction: input.direction, usage: null, session: null };
    },
    async *screen(body): AsyncGenerator<RenderStreamEvent> {
      const roots = input.answer?.screens[body.screen.id];
      if (!roots || roots.length === 0) {
        yield { type: "error", error: roots ? { code: "invalid-response", message: "The pasted answer had no block of this screen" } : noAnswer(body.screen.id) };
        yield { type: "done", session: null };
        return;
      }
      const wanted = new Set(body.screen.blocks.map((block) => block.id));
      yield { type: "progress", received: 0 };
      for (const root of roots) {
        if (root.blockId !== null ? wanted.has(root.blockId) : body.screen.mode === "page") yield { type: "block", ...root };
      }
      yield { type: "done", session: null };
    },
    async block(): Promise<TransportBlock> {
      if (input.block === undefined) {
        const { RenderTransportError } = await import("./transport");
        throw new RenderTransportError(noAnswer("this block"));
      }
      return { html: input.block, usage: null, session: null };
    },
  };
}
