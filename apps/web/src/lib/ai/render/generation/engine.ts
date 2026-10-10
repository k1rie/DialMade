// The orchestration of «Generar con IA» (spec §5.1–§5.3, tracks doc · Track A), outside React so it survives the
// move from Layout to Ajustar:
//   1. one design session (one free use);
//   2. the art direction (reused when the document has one for this chip; the code's pick if the call fails);
//   3. up to 3 screens in parallel, each streamed (raw roots as they close);
//   4. every root through the worker (sanitizer + gates) — gate 1 (structure) on the stream itself;
//   5. one DesignDoc patch per block (one undo step each), never a layout change.
// The kit (navbar, footer) is asked for once and cloned. Cancel keeps what is done (free tier: the server still
// finishes and bills the screen); a failed screen is retried for free (the server gave its slot back); a block that
// failed its gates is retried as one block action of the session.
import {
  AI_RENDER_PROMPT_VERSION,
  KIT_TYPES,
  StructureTracker,
  blockBasis,
  defaultPick,
  directionCandidates,
  hash32,
  newSeed,
  retargetBlock,
  themeColorsFromVars,
  type BlockContext,
  type DirectionForPrompt,
  type ProcessedBlock,
  type RenderBlockInput,
  type RenderBrandInput,
  type RenderScreenInput,
  type ThemeColors,
} from "@dialmade/ai-render";
import type { AiBlock, AiDirection, AiDirectionChip, DesignDoc } from "@dialmade/doc";
import type { StoreApi } from "zustand/vanilla";
import { deriveDesign } from "@/lib/design-derived";
import type { RenderApiError, RenderErrorCode, RenderSessionCounters } from "../api";
import { aiBlockOps, directionOps, type PatchOp } from "./patches";
import { pickedScreens, planKit, requestBrand, requestScreen, screenBlocks, type KitClone, type KitPlan } from "./plan";
import type { BlockFailure, BlockRun, GenerateRequest, GenerationState, RenderTransport, ScreenRun } from "./types";

export type GenerationDeps = {
  transport: () => RenderTransport;
  /** Sanitizer + gates (the worker: `processBlockOffThread`). */
  process: (raw: string, context: BlockContext) => Promise<ProcessedBlock>;
  getDoc: () => DesignDoc | null;
  /** One validated patch = one undo step. `false` when the doc refused it (the block or screen is gone). */
  applyPatch: (ops: PatchOp[]) => boolean;
  /** Model named in the provenance of the blocks (the free tier's). */
  model: () => Promise<string> | string;
  /** Counters of a hosted answer (success or error): «3 de 5 usos» stays in sync. */
  onCounters?: (body: unknown) => void;
  now?: () => Date;
  seed?: () => number;
};

/** What the engine writes into (the store's state; the store adds prefs and actions). */
export type EngineStore = StoreApi<GenerationState>;

export const IDLE_GENERATION: GenerationState = {
  runId: 0,
  phase: "idle",
  screenOrder: [],
  screens: {},
  session: null,
  direction: null,
  error: null,
  announcement: null,
  costUsd: 0,
};

/** Everything a run needs after its start (screen retries and block actions reuse it). */
type Run = {
  id: number;
  controller: AbortController;
  transport: RenderTransport;
  sessionId: string;
  brand: RenderBrandInput;
  direction: AiDirection;
  locale: "es" | "en";
  model: string;
  inputs: Map<string, RenderScreenInput>;
  kit: KitPlan;
  themes: Map<string, ThemeColors>;
  /** Screens being streamed right now (a retry waits for nothing else). */
  active: Set<string>;
};

const forPrompt = (direction: AiDirection): DirectionForPrompt => ({ axes: direction.axes, moves: direction.moves, rationale: direction.rationale });

export type GenerationEngine = {
  start: (request: GenerateRequest) => Promise<void>;
  cancel: () => void;
  retryScreen: (screenId: string) => Promise<void>;
  retryBlock: (screenId: string, blockId: string) => Promise<void>;
  dismiss: () => void;
};

export function createGenerationEngine(store: EngineStore, deps: GenerationDeps): GenerationEngine {
  const now = () => (deps.now ? deps.now() : new Date());
  const seed = () => (deps.seed ? deps.seed() : newSeed());
  let run: Run | null = null;
  /** The run while its session and direction are being asked for (before `run` exists). */
  let starting: { id: number; controller: AbortController } | null = null;
  let announcements = 0;

  const current = (id: number) => store.getState().runId === id;
  const update = (id: number, fn: (state: GenerationState) => Partial<GenerationState>) => {
    if (current(id)) store.setState(fn(store.getState()));
  };
  const setScreen = (id: number, screenId: string, fn: (screen: ScreenRun) => Partial<ScreenRun>) =>
    update(id, (state) => {
      const screen = state.screens[screenId];
      return screen ? { screens: { ...state.screens, [screenId]: { ...screen, ...fn(screen) } } } : {};
    });
  const setBlock = (id: number, screenId: string, blockId: string, patch: Partial<BlockRun>) =>
    setScreen(id, screenId, (screen) => ({ blocks: { ...screen.blocks, [blockId]: { ...(screen.blocks[blockId] ?? { phase: "waiting" }), ...patch } } }));
  const failBlock = (id: number, screenId: string, blockId: string, failure: BlockFailure) => setBlock(id, screenId, blockId, { phase: "failed", failure, retrying: false });
  const addCost = (id: number, screenId: string | null, costUsd: number) =>
    update(id, (state) => ({
      costUsd: state.costUsd + costUsd,
      ...(screenId && state.screens[screenId] && { screens: { ...state.screens, [screenId]: { ...state.screens[screenId]!, costUsd: (state.screens[screenId]!.costUsd ?? 0) + costUsd } } }),
    }));
  const setCounters = (id: number, counters: RenderSessionCounters | null | undefined) => {
    if (!counters) return;
    update(id, (state) => (state.session ? { session: { ...state.session, counters } } : {}));
  };

  const themeOf = (target: Run, doc: DesignDoc, screenId: string): ThemeColors => {
    let theme = target.themes.get(screenId);
    if (!theme) {
      const { vars } = deriveDesign(doc, doc.screens[screenId] ? screenId : null);
      theme = { light: themeColorsFromVars(vars.light), dark: themeColorsFromVars(vars.dark) };
      target.themes.set(screenId, theme);
    }
    return theme;
  };

  const inputOf = (target: Run, screenId: string, blockId: string): RenderBlockInput | undefined => target.inputs.get(screenId)?.blocks.find((block) => block.id === blockId);

  /** Writes one processed block as an active AI block. */
  function write(target: Run, screenId: string, blockId: string, processed: Extract<ProcessedBlock, { ok: true }>, kind: "generate" | "reroll"): boolean {
    const doc = deps.getDoc();
    const input = inputOf(target, screenId, blockId);
    if (!doc || !input) return false;
    const block: AiBlock = {
      html: processed.html,
      ...(processed.surfaceClasses && { surfaceClasses: processed.surfaceClasses }),
      active: true,
      basis: blockBasis(input, target.locale, target.direction.id),
      gates: processed.gates,
      provenance: {
        kind,
        path: target.transport.path,
        model: target.model,
        createdAt: now().toISOString(),
        promptVersion: AI_RENDER_PROMPT_VERSION,
        directionId: target.direction.id,
        seed: hash32(`${target.direction.seed}:${screenId}:${blockId}`),
      },
    };
    const ops = aiBlockOps(doc, screenId, blockId, block);
    return ops !== null && deps.applyPatch(ops);
  }

  /** Sanitizer + gates for `raw` as the block `blockId` of `screenId` (kit pieces also get their current link). */
  async function processFor(target: Run, screenId: string, blockId: string, raw: string): Promise<ProcessedBlock | null> {
    const doc = deps.getDoc();
    const input = inputOf(target, screenId, blockId);
    if (!doc || !input) return null;
    const context: BlockContext = { block: input, screenIds: doc.screenOrder, theme: themeOf(target, doc, screenId) };
    const first = await deps.process(raw, context).catch(() => null);
    if (!first?.ok || !KIT_TYPES.has(input.type) || !first.html) return first;
    return deps.process(retargetBlock(first.html, blockId, blockId, screenId), context).catch(() => null);
  }

  /** A clone of a kit piece (spec §4.3): the source's sanitized HTML, retargeted and gated again for its cell. */
  async function writeClone(target: Run, clone: KitClone, sourceHtml: string): Promise<void> {
    const { screenId, blockId } = clone.to;
    setBlock(target.id, screenId, blockId, { phase: "processing", cloneOf: clone.from });
    const processed = await processFor(target, screenId, blockId, retargetBlock(sourceHtml, clone.from.blockId, blockId, screenId));
    if (!processed?.ok) return failBlock(target.id, screenId, blockId, "gates");
    if (!write(target, screenId, blockId, processed, "generate")) return failBlock(target.id, screenId, blockId, "gone");
    setBlock(target.id, screenId, blockId, { phase: "done", warnings: processed.gates.warnings.length, retrying: false });
  }

  const clonesOf = (target: Run, screenId: string, blockId: string) =>
    target.kit.clones.filter((clone) => clone.from.screenId === screenId && clone.from.blockId === blockId);

  /** One root of the stream (or of a block action): gates, the doc, then the clones that wait for it. */
  async function handleRoot(target: Run, screenId: string, blockId: string, raw: string, kind: "generate" | "reroll"): Promise<void> {
    setBlock(target.id, screenId, blockId, { phase: "processing" });
    const processed = await processFor(target, screenId, blockId, raw);
    const clones = clonesOf(target, screenId, blockId);
    if (!processed?.ok) {
      failBlock(target.id, screenId, blockId, "gates");
      for (const clone of clones) failBlock(target.id, clone.to.screenId, clone.to.blockId, "source-failed");
      return;
    }
    if (!write(target, screenId, blockId, processed, kind)) {
      failBlock(target.id, screenId, blockId, "gone");
    } else {
      setBlock(target.id, screenId, blockId, { phase: "done", warnings: processed.gates.warnings.length, retrying: false });
    }
    if (processed.html) await Promise.all(clones.map((clone) => writeClone(target, clone, processed.html)));
  }

  function announce(target: Run, screenId: string) {
    const screen = store.getState().screens[screenId];
    if (!screen) return;
    const blocks = Object.values(screen.blocks);
    update(target.id, () => ({
      announcement: { n: ++announcements, screenId, ai: blocks.filter((block) => block.phase === "done").length, base: blocks.filter((block) => block.phase === "failed").length },
    }));
  }

  async function runScreen(target: Run, screenId: string, only?: ReadonlySet<string>): Promise<void> {
    const full = target.inputs.get(screenId);
    if (!full) return;
    const skip = target.kit.skip.get(screenId);
    const request = requestScreen(full, { ...(skip && { skip }), ...(only && { only }) });
    const expected = request.blocks.map((block) => block.id);
    target.active.add(screenId);
    setScreen(target.id, screenId, (screen) => {
      const blocks = { ...screen.blocks };
      for (const id of expected) blocks[id] = { phase: "waiting" };
      return { phase: "streaming", blocks, error: undefined };
    });

    const pending: Promise<void>[] = [];
    // Kit pieces the document already has (same direction): cloned right away. Not on a retry of other blocks.
    for (const clone of target.kit.existing) {
      if (clone.to.screenId !== screenId || (only && !only.has(clone.to.blockId))) continue;
      const source = deps.getDoc()?.screens[clone.from.screenId]?.aiRender?.blocks[clone.from.blockId];
      if (source?.html) pending.push(writeClone(target, clone, source.html));
      else failBlock(target.id, screenId, clone.to.blockId, "source-failed");
    }

    let error: RenderApiError | null = null;
    if (expected.length > 0) {
      const tracker = new StructureTracker(expected);
      const body = { task: "screen" as const, sessionId: target.sessionId, brand: target.brand, direction: forPrompt(target.direction), screen: request };
      for await (const event of target.transport.screen(body, target.controller.signal)) {
        if (event.type === "block") {
          // Gate 1 on the stream: an expected id, once; anything else is ignored (the layout is the user's).
          if (tracker.accept(event.blockId) === "accept") pending.push(handleRoot(target, screenId, event.blockId!, event.html, "generate"));
        } else if (event.type === "usage") addCost(target.id, screenId, event.usage.costUsd);
        else if (event.type === "error") {
          error = event.error;
          setCounters(target.id, event.error.session);
          deps.onCounters?.(event.error);
        } else if (event.type === "done") setCounters(target.id, event.session);
      }
      await Promise.all(pending);
      const cancelled = target.controller.signal.aborted;
      for (const id of tracker.missing()) {
        if (cancelled) setBlock(target.id, screenId, id, { phase: "cancelled" });
        else failBlock(target.id, screenId, id, "missing");
        for (const clone of clonesOf(target, screenId, id)) {
          if (cancelled) setBlock(target.id, clone.to.screenId, clone.to.blockId, { phase: "cancelled" });
          else failBlock(target.id, clone.to.screenId, clone.to.blockId, "source-failed");
        }
      }
    } else {
      await Promise.all(pending);
    }
    target.active.delete(screenId);
    const cancelled = target.controller.signal.aborted;
    const failedError: RenderErrorCode | null = error && (error as RenderApiError).code !== "aborted" ? (error as RenderApiError).code : null;
    setScreen(target.id, screenId, () => ({ phase: cancelled ? "cancelled" : failedError ? "failed" : "done", ...(failedError && { error: failedError }) }));
    if (!cancelled) announce(target, screenId);
  }

  function finish(target: Run) {
    if (target.active.size > 0) return;
    update(target.id, (state) => (state.phase === "screens" ? { phase: target.controller.signal.aborted ? "cancelled" : "done" } : {}));
  }

  async function direction(target: Omit<Run, "direction">, doc: DesignDoc, screenIds: readonly string[], chip: AiDirectionChip): Promise<AiDirection | "cancelled"> {
    const existing = doc.aiRender?.direction;
    if (existing && (chip === "auto" || chip === existing.chip)) {
      update(target.id, () => ({ direction: { rationale: existing.rationale, fromModel: true } }));
      return existing;
    }
    const drawn = seed();
    const recipeId = doc.brief.recipeId;
    const answer = await target.transport.direction(
      {
        task: "direction",
        sessionId: target.sessionId,
        brand: target.brand,
        locale: target.locale,
        seed: drawn,
        recipeId: recipeId.slice(0, 48),
        chip,
        screens: screenIds.map((id) => {
          const input = target.inputs.get(id)!;
          return { name: input.name, kind: input.kind, blocks: input.blocks.slice(0, 40).map((block) => block.type.slice(0, 32)) };
        }),
      },
      target.controller.signal,
    );
    if (!answer.ok && answer.error.code === "aborted") return "cancelled";
    const provenance = {
      kind: "direction" as const,
      path: target.transport.path,
      createdAt: now().toISOString(),
      promptVersion: AI_RENDER_PROMPT_VERSION,
      seed: drawn,
    };
    let made: AiDirection;
    if (answer.ok) {
      setCounters(target.id, answer.value.session);
      addCost(target.id, null, answer.value.usage.costUsd);
      made = {
        id: `d-${drawn.toString(36)}`,
        version: 1,
        seed: drawn,
        chip,
        ...answer.value.direction,
        provenance: {
          ...provenance,
          model: answer.value.usage.model.slice(0, 80),
          costUsd: answer.value.usage.costUsd,
          inputTokens: answer.value.usage.inputTokens,
          outputTokens: answer.value.usage.outputTokens,
        },
      };
    } else {
      // Without a model the code's first pick is the direction (spec §4.2); the screens still get one.
      deps.onCounters?.(answer.error);
      setCounters(target.id, answer.error.session);
      made = { id: `d-${drawn.toString(36)}`, version: 1, seed: drawn, chip, ...defaultPick(directionCandidates(drawn, recipeId, chip)), rationale: "", provenance };
    }
    const latest = deps.getDoc();
    if (latest) deps.applyPatch(directionOps(latest, made));
    update(target.id, () => ({ direction: { rationale: made.rationale, fromModel: answer.ok } }));
    return made;
  }

  async function start(request: GenerateRequest): Promise<void> {
    const state = store.getState();
    if (state.phase === "session" || state.phase === "direction" || state.phase === "screens") return;
    const doc = deps.getDoc();
    if (!doc) return;
    run?.controller.abort();
    run = null;
    const id = state.runId + 1;
    const controller = new AbortController();
    starting = { id, controller };
    const screenIds = pickedScreens(doc, request.screenIds);
    const inputs = new Map(screenIds.map((screenId) => [screenId, screenBlocks(doc, screenId)]));
    const screens: Record<string, ScreenRun> = {};
    for (const screenId of screenIds) {
      const order = inputs.get(screenId)!.blocks.map((block) => block.id);
      screens[screenId] = { screenId, phase: "queued", order, blocks: Object.fromEntries(order.map((block) => [block, { phase: "waiting" } satisfies BlockRun])) };
    }
    store.setState({ ...IDLE_GENERATION, runId: id, phase: screenIds.length > 0 ? "session" : "failed", screenOrder: screenIds, screens, ...(screenIds.length === 0 && { error: "invalid-request" }) });
    if (screenIds.length === 0) return;

    const transport = deps.transport();
    const opened = await transport.openSession({ screens: screenIds.length }, controller.signal);
    deps.onCounters?.(opened.ok ? opened.value : opened.error);
    if (!current(id) || controller.signal.aborted) return;
    if (!opened.ok) {
      update(id, () => ({ phase: opened.error.code === "aborted" ? "cancelled" : "failed", error: opened.error.code }));
      return;
    }
    const model = await deps.model();
    const base = {
      id,
      controller,
      transport,
      sessionId: opened.value.sessionId,
      brand: requestBrand(doc),
      locale: doc.brief.locale,
      model: model.slice(0, 80),
      inputs,
      kit: { skip: new Map(), clones: [], existing: [] } satisfies KitPlan,
      themes: new Map<string, ThemeColors>(),
      active: new Set<string>(),
    };
    update(id, () => ({ phase: "direction", session: { id: opened.value.sessionId, counters: opened.value.session } }));

    const made = await direction(base, doc, screenIds, request.chip);
    if (!current(id)) return;
    starting = null;
    if (made === "cancelled" || controller.signal.aborted) {
      update(id, (now) => ({ phase: "cancelled", screens: Object.fromEntries(Object.entries(now.screens).map(([key, screen]) => [key, { ...screen, phase: "cancelled" }])) }));
      return;
    }
    const target: Run = { ...base, direction: made, kit: planKit(deps.getDoc() ?? doc, screenIds, inputs, made.id) };
    run = target;
    for (const [screenId, skip] of target.kit.skip) {
      for (const blockId of skip) {
        const clone = [...target.kit.clones, ...target.kit.existing].find((entry) => entry.to.screenId === screenId && entry.to.blockId === blockId);
        if (clone) setBlock(id, screenId, blockId, { cloneOf: clone.from });
      }
    }
    update(id, () => ({ phase: "screens" }));
    await Promise.all(screenIds.map((screenId) => runScreen(target, screenId)));
    finish(target);
  }

  function cancel() {
    const target = run;
    if (!target) {
      // Still opening the session or asking for the direction: no screen was asked for yet.
      if (!starting || !current(starting.id)) return;
      starting.controller.abort();
      const { id } = starting;
      update(id, (now) => ({ phase: "cancelled", screens: Object.fromEntries(Object.entries(now.screens).map(([key, screen]) => [key, { ...screen, phase: "cancelled" }])) }));
      return;
    }
    target.controller.abort();
    update(target.id, (now) => ({
      phase: now.phase === "done" ? "done" : "cancelled",
      screens: Object.fromEntries(
        Object.entries(now.screens).map(([key, screen]) => [
          key,
          screen.phase === "queued" || screen.phase === "streaming"
            ? {
                ...screen,
                phase: "cancelled",
                blocks: Object.fromEntries(Object.entries(screen.blocks).map(([blockId, block]) => [blockId, block.phase === "waiting" ? { ...block, phase: "cancelled" } : block])),
              }
            : screen,
        ]),
      ),
    }));
  }

  async function retryScreen(screenId: string): Promise<void> {
    const target = run;
    const screen = store.getState().screens[screenId];
    if (!target || !screen || screen.phase !== "failed" || target.active.has(screenId) || target.controller.signal.aborted) return;
    // Only what is not designed yet; the server gave the failed screen's slot back, so this spends no other.
    const only = new Set(screen.order.filter((blockId) => screen.blocks[blockId]?.phase !== "done"));
    update(target.id, () => ({ phase: "screens", error: null }));
    await runScreen(target, screenId, only);
    finish(target);
  }

  async function retryBlock(screenId: string, blockId: string): Promise<void> {
    const target = run;
    const block = store.getState().screens[screenId]?.blocks[blockId];
    const full = target?.inputs.get(screenId);
    const input = target ? inputOf(target, screenId, blockId) : undefined;
    if (!target || !full || !input || !block || block.phase !== "failed" || block.retrying) return;
    setBlock(target.id, screenId, blockId, { retrying: true });
    const { id, name, kind, route, locale, screens } = requestScreen(full);
    const screen = { id, name, kind, route, locale, screens };
    const html = deps.getDoc()?.screens[screenId]?.aiRender?.blocks[blockId]?.html ?? "";
    const answer = await target.transport.block({
      sessionId: target.sessionId,
      brand: target.brand,
      direction: forPrompt(target.direction),
      screen,
      block: input,
      html: html.slice(0, 16 * 1024),
      action: { kind: "reroll", seed: seed() },
    });
    deps.onCounters?.(answer.ok ? answer.value : answer.error);
    if (!answer.ok) {
      setCounters(target.id, answer.error.session);
      update(target.id, () => ({ error: answer.error.code }));
      return failBlock(target.id, screenId, blockId, "request");
    }
    setCounters(target.id, answer.value.session);
    addCost(target.id, screenId, answer.value.usage.costUsd);
    if (!answer.value.html) return failBlock(target.id, screenId, blockId, "missing");
    await handleRoot(target, screenId, blockId, answer.value.html, "reroll");
  }

  function dismiss() {
    const state = store.getState();
    if (state.phase === "session" || state.phase === "direction" || state.phase === "screens") return;
    run = null;
    store.setState({ ...IDLE_GENERATION, runId: state.runId + 1 });
  }

  return { start, cancel, retryScreen, retryBlock, dismiss };
}
