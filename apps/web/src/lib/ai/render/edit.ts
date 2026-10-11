// «Diseño con IA» in «Ajustar» (spec §8): how the document's AI blocks change after they exist. Pure functions over
// the DesignDoc that return RFC 6902 operations (or a PatchResult), so every edit is ONE validated write and ONE
// undo step: an inline text edit, «Usar diseño base» / «Usar IA otra vez», a block action's new version, and the
// AI blocks carried across a «Generar» (a duplicated screen remaps its keys, a removed block's AI block waits in
// the screen's stash and comes back with it). «Desactualizado» (basis) and «El estilo cambió» (recipe) are read
// here too. Updates are immutable: `applyPatch` copies only the path it writes, so the undo history shares every
// other block's HTML [C13].
import {
  attr,
  blockBasis,
  draftTexts,
  elements,
  parseSanitized,
  screenInput,
  serialize,
  type AiElement,
  type AiNode,
  type RenderBlockInput,
} from "@dialmade/ai-render";
import {
  MAX_AI_BLOCK_BYTES,
  MAX_AI_RENDER_BYTES,
  MAX_AI_STASHED_BLOCKS,
  aiRenderBytes,
  applyPatch,
  type AiBlock,
  type AiScreenRender,
  type DesignDoc,
  type PatchOperation,
  type PatchResult,
  type Screen,
} from "@dialmade/doc";
import { visibleProps } from "@dialmade/sections";

/** Longest inline text the island sends (`textEdit.text` of the protocol). */
export const MAX_INLINE_TEXT = 2000;

const screenPointer = (screenId: string) => `/screens/${screenId}`;
const renderPointer = (screenId: string) => `${screenPointer(screenId)}/aiRender`;
export const aiBlockPointer = (screenId: string, blockId: string) => `${renderPointer(screenId)}/blocks/${blockId}`;

const utf8 = (value: string) => new TextEncoder().encode(value).length;

/** The stored AI block of a layout block (active or not), if any. */
export function aiBlockOf(doc: DesignDoc, screenId: string, blockId: string): AiBlock | undefined {
  const blocks = doc.screens[screenId]?.aiRender?.blocks;
  return blocks && Object.hasOwn(blocks, blockId) ? blocks[blockId] : undefined;
}

/** Whether a block paints with its AI design right now (stored and `active`). */
export const isAiBlockActive = (doc: DesignDoc, screenId: string, blockId: string): boolean => aiBlockOf(doc, screenId, blockId)?.active === true;

/**
 * The deterministic draft of a block (its visible copy): what the prompts send and what the basis hashes. The
 * generation store (track A) must use this same function, so a block it writes is not «Desactualizado» at once.
 */
export const aiDraftOf =
  (screen: Pick<Screen, "page">) =>
  (blockId: string): string[] => {
    const element = Object.hasOwn(screen.page.elements, blockId) ? screen.page.elements[blockId] : undefined;
    return element ? draftTexts(visibleProps(element)) : [];
  };

/**
 * How «Diseño con IA» designs a screen now: landing screens as ONE page from the brief (@dialmade/ai-render
 * pagePrompt: own CSS and SVG, measured better on 2026-10-11, docs/design/prueba-skills.md); app screens block by
 * block with token classes, as before.
 */
export const aiScreenMode = (screen: Pick<Screen, "kind">): "page" | undefined => (screen.kind === "landing" ? "page" : undefined);

/** The visible props of a block's element (page mode reads its plans as fixed data). */
export const aiPropsOf =
  (screen: Pick<Screen, "page">) =>
  (blockId: string): unknown => {
    const element = Object.hasOwn(screen.page.elements, blockId) ? screen.page.elements[blockId] : undefined;
    return element ? visibleProps(element) : undefined;
  };

/** The options of `screenInput` for a screen in `mode` (page mode: no template copy, the plans as data). */
export const aiScreenInputOptions = (screen: Pick<Screen, "page">, mode: "page" | undefined) => ({
  draftOf: aiDraftOf(screen),
  ...(mode === "page" && { mode: "page" as const, propsOf: aiPropsOf(screen) }),
});

/**
 * The prompt input of the screen's blocks (all of them, or `only`), by id, as `mode` builds it (default «blocks»:
 * token blocks with their draft; «page»: the outline of page mode). Empty for an unknown screen.
 */
export function aiBlockInputs(doc: DesignDoc, screenId: string, only?: ReadonlySet<string>, mode: "page" | "blocks" = "blocks"): Map<string, RenderBlockInput> {
  const screen = doc.screens[screenId];
  if (!screen) return new Map();
  const input = screenInput(doc, screenId, { ...aiScreenInputOptions(screen, mode === "page" ? "page" : undefined), ...(only && { only }) });
  return new Map(input.blocks.map((block) => [block.id, block]));
}

/** The mode an AI block was made in (its basis was hashed from that mode's input). */
const blockModeOf = (block: AiBlock): "page" | "blocks" => (block.mode === "page" ? "page" : "blocks");

/** The basis a block would get if it were designed now (spec §8.4): its layout, its copy, the language, the direction. */
export const currentBasis = (doc: DesignDoc, block: RenderBlockInput): string => blockBasis(block, doc.brief.locale, doc.aiRender?.direction?.id ?? "");

/**
 * «Desactualizado» (spec §8.4): the screen's AI blocks whose basis no longer matches (the layout block's type, label,
 * note, count or size changed, its base copy changed — also while it was in base [C12] —, the language or the art
 * direction). They stay visible; the UI offers to redo them.
 */
export function staleAiBlocks(doc: DesignDoc, screenId: string): Set<string> {
  const blocks = doc.screens[screenId]?.aiRender?.blocks;
  if (!blocks) return new Set();
  const inputs = { page: aiBlockInputs(doc, screenId, undefined, "page"), blocks: aiBlockInputs(doc, screenId, undefined, "blocks") };
  const out = new Set<string>();
  for (const [id, block] of Object.entries(blocks)) {
    const input = inputs[blockModeOf(block)].get(id);
    // A block that is no longer rendered (hidden) is not «stale»: it is not shown at all.
    if (input && currentBasis(doc, input) !== block.basis) out.add(id);
  }
  return out;
}

/** Whether ONE block is «Desactualizado» (cheaper than `staleAiBlocks` for a single block). */
export function isAiBlockStale(doc: DesignDoc, screenId: string, blockId: string): boolean {
  const block = aiBlockOf(doc, screenId, blockId);
  const input = block && aiBlockInputs(doc, screenId, new Set([blockId]), blockModeOf(block)).get(blockId);
  return !!block && !!input && currentBasis(doc, input) !== block.basis;
}

/** Whether ONE active block was designed with another style recipe (see `styleChangedAiBlocks`). */
export function isAiBlockStyleChanged(doc: DesignDoc, screenId: string, blockId: string): boolean {
  const block = aiBlockOf(doc, screenId, blockId);
  return !!block?.active && block.provenance.recipeId !== undefined && block.provenance.recipeId !== doc.brief.recipeId;
}

/**
 * «El estilo cambió · ¿Rehacer con IA?» (spec §8.1): active AI blocks designed with another style recipe. Their
 * tokens already follow the new recipe (radii, shadows, fonts, density); only the composition is the old one.
 */
export function styleChangedAiBlocks(doc: DesignDoc, screenId: string): Set<string> {
  const blocks = doc.screens[screenId]?.aiRender?.blocks ?? {};
  const out = new Set<string>();
  for (const [id, block] of Object.entries(blocks)) {
    if (block.active && block.provenance.recipeId !== undefined && block.provenance.recipeId !== doc.brief.recipeId) out.add(id);
  }
  return out;
}

/** Writes one AI block (a new one or a new version): ONE operation, so one undo step. */
export function setAiBlockOps(doc: DesignDoc, screenId: string, blockId: string, block: AiBlock): PatchOperation[] {
  const screen = doc.screens[screenId];
  if (!screen) return [];
  if (!screen.aiRender) return [{ op: "add", path: renderPointer(screenId), value: { version: 1, blocks: { [blockId]: block } } satisfies AiScreenRender }];
  return [{ op: Object.hasOwn(screen.aiRender.blocks, blockId) ? "replace" : "add", path: aiBlockPointer(screenId, blockId), value: block }];
}

/** «Usar diseño base» (`false`) / «Usar IA otra vez» (`true`): the HTML is kept either way. No-op when unchanged. */
export function setAiBlockActiveOps(doc: DesignDoc, screenId: string, blockId: string, active: boolean): PatchOperation[] {
  const block = aiBlockOf(doc, screenId, blockId);
  if (!block || block.active === active) return [];
  return [{ op: "replace", path: `${aiBlockPointer(screenId, blockId)}/active`, value: active }];
}

/* ------------------------------------------------------------------------------------------------ */
/* Inline text                                                                                      */
/* ------------------------------------------------------------------------------------------------ */

/** Like `Node.textContent`: the text of a subtree, without separators. */
const rawText = (nodes: readonly AiNode[]): string => nodes.map((node) => (node.type === "text" ? node.value : rawText(node.children))).join("");
/** What the island sends: whitespace collapsed and trimmed. */
const normalize = (value: string) => value.replace(/\s+/g, " ").trim();
/** The text the user typed, as text: no control characters, one line, capped. */
const cleanInline = (value: string) =>
  value
    .replace(/[\u0000-\u001f\u007f\u200b-\u200f\u202a-\u202e\u2066-\u2069\ufeff]/g, " ")
    .replace(/\s+/g, " ")
    .trim()
    .slice(0, MAX_INLINE_TEXT);

/** One run of own text between two text-ful children: the new text replaces its text nodes, at the first one. */
function rebuildGap(items: readonly AiNode[], text: string): AiNode[] {
  const anchor = items.findIndex((node) => node.type === "text" && node.value.trim() !== "");
  // Only spacing here before and after: keep it as it was.
  if (anchor < 0 && text.trim() === "") return [...items];
  const at = anchor >= 0 ? anchor : items.findIndex((node) => node.type === "text");
  const out: AiNode[] = [];
  items.forEach((node, index) => {
    if (index === at) {
      if (text) out.push({ type: "text", value: text });
    } else if (node.type !== "text") out.push(node);
  });
  if (at < 0 && text) out.push({ type: "text", value: text });
  return out;
}

/**
 * Puts `text` into an element that has its own text. Its child elements that carry text of their own (a `<strong>`,
 * a `<span>` with an accent) are kept when their text is still there, in order: only the element's own text
 * around them changes. Otherwise the element ends up with the new text and only its text-less children (icons).
 */
function writeText(target: AiElement, text: string) {
  const isTextful = (node: AiNode): node is AiElement => node.type === "element" && normalize(rawText(node.children)) !== "";
  const textful = target.children.filter(isTextful);
  const gaps: string[] = [];
  let at = 0;
  for (const child of textful) {
    const own = normalize(rawText(child.children));
    const found = text.indexOf(own, at);
    if (found < 0) {
      // The user rewrote the styled part too: plain text, keeping the text-less children (icons, line breaks).
      target.children = rebuildGap(target.children.filter((node) => !isTextful(node)), text);
      return;
    }
    gaps.push(text.slice(at, found));
    at = found + own.length;
  }
  gaps.push(text.slice(at));
  const out: AiNode[] = [];
  let run: AiNode[] = [];
  for (const child of target.children) {
    if (!isTextful(child)) {
      run.push(child);
      continue;
    }
    out.push(...rebuildGap(run, gaps[out.filter(isTextful).length] ?? ""), child);
    run = [];
  }
  out.push(...rebuildGap(run, gaps[textful.length] ?? ""));
  target.children = out;
}

/**
 * The inline text edit of an AI block (spec §8.1): the island sends `textEdit {t, text}`; the text of the element
 * marked `data-dl-t="t"` in the SANITIZED tree is replaced, and the tree is serialized again (the text is escaped,
 * never parsed as HTML). `null` when there is no such element or the block would pass its size cap.
 */
export function replaceBlockText(html: string, t: number, text: string): string | null {
  const nodes = parseSanitized(html);
  let target: AiElement | undefined;
  for (const element of elements(nodes)) {
    if (attr(element, "data-dl-t") === String(t)) {
      target = element;
      break;
    }
  }
  if (!target) return null;
  writeText(target, cleanInline(text));
  const next = serialize(nodes);
  return utf8(next) <= MAX_AI_BLOCK_BYTES ? next : null;
}

/** The text a `data-dl-t` element shows (normalized like the island's), or `null`. */
export function blockTextAt(html: string, t: number): string | null {
  for (const element of elements(parseSanitized(html))) if (attr(element, "data-dl-t") === String(t)) return normalize(rawText(element.children));
  return null;
}

/**
 * ONE `replace` of the block's HTML for an inline text edit: one undo step. `[]` when nothing changes, `null`
 * when it cannot apply (no AI block, unknown text, over the cap).
 */
export function textEditOps(doc: DesignDoc, screenId: string, blockId: string, t: number, text: string): PatchOperation[] | null {
  const block = aiBlockOf(doc, screenId, blockId);
  if (!block || !block.html) return null;
  const html = replaceBlockText(block.html, t, text);
  if (html === null) return null;
  return html === block.html ? [] : [{ op: "replace", path: `${aiBlockPointer(screenId, blockId)}/html`, value: html }];
}

/* ------------------------------------------------------------------------------------------------ */
/* Carrying AI blocks across «Generar» (duplicate a screen, remove a block)                           */
/* ------------------------------------------------------------------------------------------------ */

/** What `carryAiRender` needs of each generated screen (`GeneratedScreenInput` fits it). */
export type AiCarrySource = {
  screenId: string;
  /** A «Duplicar» copy: its source screen and the copied blocks (copy block id → source block id). */
  copyOf?: { screenId: string; blocks: Readonly<Record<string, string>> };
};

const ID_REF_ATTRS = new Set(["id", "for", "aria-labelledby", "aria-describedby", "aria-controls"]);

/**
 * An AI block under another block id (a duplicated screen's copy): the root's `data-block-id` and the ids the
 * sanitizer prefixed with the block id (`ai-<block>-…`, and the `for`/`aria-*` that point at them).
 */
export function remapAiBlock(block: AiBlock, from: string, to: string): AiBlock {
  if (from === to || !block.html) return block;
  const nodes = parseSanitized(block.html);
  const prefix = `ai-${from.replace(/[^\w-]/g, "").slice(0, 40)}-`;
  const next = `ai-${to.replace(/[^\w-]/g, "").slice(0, 40)}-`;
  for (const element of elements(nodes)) {
    element.attrs = element.attrs.map(([name, value]): [string, string] => {
      if (name === "data-block-id") return [name, value === from ? to : value];
      if (!ID_REF_ATTRS.has(name)) return [name, value];
      return [name, value.split(" ").map((ref) => (ref.startsWith(prefix) ? next + ref.slice(prefix.length) : ref)).join(" ")];
    });
  }
  const html = serialize(nodes);
  return utf8(html) <= MAX_AI_BLOCK_BYTES ? { ...block, html } : block;
}

const storedRender = (doc: DesignDoc, screenId: string): AiScreenRender | undefined =>
  (Object.hasOwn(doc.screens, screenId) ? doc.screens[screenId]?.aiRender : undefined) ??
  (doc.screenStash && Object.hasOwn(doc.screenStash, screenId) ? doc.screenStash[screenId]?.aiRender : undefined);

/** A copy's AI blocks: the source's blocks (and stashed ones) that were copied, under the copy's ids. */
function copiedRender(doc: DesignDoc, copyOf: NonNullable<AiCarrySource["copyOf"]>): AiScreenRender | undefined {
  const source = storedRender(doc, copyOf.screenId);
  if (!source) return undefined;
  const blocks: Record<string, AiBlock> = {};
  const stash: Record<string, AiBlock> = {};
  for (const [copyId, sourceId] of Object.entries(copyOf.blocks)) {
    if (Object.hasOwn(source.blocks, sourceId)) blocks[copyId] = remapAiBlock(source.blocks[sourceId]!, sourceId, copyId);
    else if (source.stash && Object.hasOwn(source.stash, sourceId)) stash[copyId] = remapAiBlock(source.stash[sourceId]!, sourceId, copyId);
  }
  if (Object.keys(blocks).length === 0 && Object.keys(stash).length === 0) return undefined;
  return { version: 1, blocks, ...(Object.keys(stash).length > 0 && { stash }) };
}

/**
 * A screen's AI blocks after a build: the blocks whose element is still on the page stay; the others move to the
 * stash (newest last, at most `MAX_AI_STASHED_BLOCKS`); stashed blocks whose element is back return.
 */
function settleRender(render: AiScreenRender, page: Screen["page"]): AiScreenRender | undefined {
  const present = (id: string) => Object.hasOwn(page.elements, id);
  const blocks: Record<string, AiBlock> = {};
  const stash: Record<string, AiBlock> = {};
  for (const [id, block] of Object.entries(render.stash ?? {})) {
    if (present(id)) blocks[id] = block;
    else stash[id] = block;
  }
  for (const [id, block] of Object.entries(render.blocks)) {
    if (present(id)) blocks[id] = block;
    else {
      delete stash[id];
      stash[id] = block;
    }
  }
  const stashIds = Object.keys(stash);
  for (const id of stashIds.slice(0, Math.max(0, stashIds.length - MAX_AI_STASHED_BLOCKS))) delete stash[id];
  if (Object.keys(blocks).length === 0 && Object.keys(stash).length === 0) return undefined;
  return { version: 1, blocks, ...(Object.keys(stash).length > 0 && { stash }) };
}

/**
 * The operations that carry the AI blocks of `before` into `after`, a document a build rewrote (`withGeneratedScreens`
 * and the locale/product rebuilds write every screen again, without `aiRender`). Each screen takes its own AI blocks
 * (same id, or its stashed copy that a Layout undo brought back) or, for a «Duplicar» copy, its source's under the
 * copied ids. Blocks the layout removed wait in the screen's stash. Stashed screens keep theirs; when the total
 * would pass the 1 MB cap, the stashes go first (stashed screens, oldest first, then blocks' stashes).
 */
export function carryAiRenderOps(before: DesignDoc, after: DesignDoc, sources?: readonly AiCarrySource[]): PatchOperation[] {
  const sourceOf = new Map((sources ?? []).map((source) => [source.screenId, source]));
  const renders = new Map<string, AiScreenRender>();
  for (const [id, screen] of Object.entries(after.screens)) {
    if (screen.aiRender) continue;
    const copyOf = sourceOf.get(id)?.copyOf;
    const prior = storedRender(before, id) ?? (copyOf && copyOf.screenId !== id ? copiedRender(before, copyOf) : undefined);
    const settled = prior && settleRender(prior, screen.page);
    if (settled) renders.set(id, settled);
  }
  if (renders.size === 0) return [];

  // The 1 MB cap holds for the result: drop what is not shown first.
  const dropStashed: string[] = [];
  const measure = () => {
    const screens: Record<string, { aiRender?: unknown }> = {};
    for (const [id, screen] of Object.entries(after.screens)) screens[id] = { aiRender: renders.get(id) ?? screen.aiRender };
    const stash: Record<string, { aiRender?: unknown }> = {};
    for (const [id, screen] of Object.entries(after.screenStash ?? {})) if (!dropStashed.includes(id)) stash[id] = { aiRender: screen.aiRender };
    return aiRenderBytes({ aiRender: after.aiRender, screens, screenStash: stash });
  };
  const stashedWithAi = Object.entries(after.screenStash ?? {})
    .filter(([, screen]) => screen.aiRender)
    .map(([id]) => id);
  while (measure() > MAX_AI_RENDER_BYTES && stashedWithAi.length > 0) dropStashed.push(stashedWithAi.shift()!);
  if (measure() > MAX_AI_RENDER_BYTES) {
    for (const [id, render] of renders) if (render.stash) renders.set(id, { version: 1, blocks: render.blocks });
  }

  const ops: PatchOperation[] = dropStashed.map((id) => ({ op: "remove", path: `/screenStash/${id}/aiRender` }));
  for (const [id, render] of renders) {
    if (Object.keys(render.blocks).length === 0 && !render.stash) continue;
    ops.push({ op: "add", path: renderPointer(id), value: render });
  }
  return ops;
}

/**
 * `result` (a build of `before`) with the AI blocks carried over (`carryAiRenderOps`) in the same write, so a
 * «Generar» stays one undo step and never deletes AI HTML. A failed result is returned as it is; if carrying
 * fails validation, the build goes through without it rather than failing the user's «Generar».
 */
export function withCarriedAiRender(before: DesignDoc, result: PatchResult, sources?: readonly AiCarrySource[]): PatchResult {
  if (!result.ok) return result;
  const ops = carryAiRenderOps(before, result.doc, sources);
  if (ops.length === 0) return result;
  const carried = applyPatch(result.doc, ops);
  return carried.ok ? carried : result;
}
