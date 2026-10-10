// Fixtures for the tests of the render transports (no network: `fetch` is a stand-in that answers like the Anthropic
// API or like the Dialmade routes, and records every request).
import { defaultPick, directionCandidates, type RenderBrandInput, type RenderScreenInput } from "@dialmade/ai-render";
import type { RenderStreamEvent } from "./api";

export const BRAND: RenderBrandInput = {
  name: "Brisa",
  productType: "saas-general",
  palette: { hue: 186, chroma: "muted", preferredMode: "light" },
  recipe: { id: "soft-ui", surface: "layered", shape: "rounded", density: "roomy", mood: "Soft" },
};
export const DIRECTION = { ...defaultPick(directionCandidates(1, "soft-ui")), rationale: "r" };

export const screenFixture = (id: string, blockIds: readonly string[]): RenderScreenInput => ({
  id,
  name: id,
  kind: "landing",
  route: `/${id}`,
  locale: "es",
  screens: [],
  blocks: blockIds.map((blockId, i) => ({ id: blockId, type: i === 0 ? "hero" : "cta", label: blockId, cols: 12, heightPx: 400, ...(i === 0 && { h1: true as const }), draft: ["Hola"] })),
});

export type RecordedRequest = { url: string; method: string; headers: Headers; body: string; signal: AbortSignal | null };

type Usage = { input_tokens: number; output_tokens: number; cache_creation_input_tokens: number; cache_read_input_tokens: number };
const USAGE: Usage = { input_tokens: 900, output_tokens: 1, cache_creation_input_tokens: 0, cache_read_input_tokens: 2400 };

const frame = (data: Record<string, unknown>) => `event: ${String(data.type)}\ndata: ${JSON.stringify(data)}\n\n`;

/** The SSE frames of one streamed Messages answer whose text is `chunks`. */
export function anthropicFrames(chunks: readonly string[], options: { model?: string; stopReason?: string; usage?: Partial<Usage>; outputTokens?: number } = {}): string[] {
  const usage = { ...USAGE, ...options.usage };
  return [
    frame({ type: "message_start", message: { id: "msg_test", type: "message", role: "assistant", model: options.model ?? "claude-opus-5-5", content: [], stop_reason: null, stop_sequence: null, usage } }),
    frame({ type: "content_block_start", index: 0, content_block: { type: "text", text: "" } }),
    ...chunks.map((text) => frame({ type: "content_block_delta", index: 0, delta: { type: "text_delta", text } })),
    frame({ type: "content_block_stop", index: 0 }),
    frame({ type: "message_delta", delta: { stop_reason: options.stopReason ?? "end_turn", stop_sequence: null }, usage: { output_tokens: options.outputTokens ?? 1200 } }),
    frame({ type: "message_stop" }),
  ];
}

/** A non-streamed Messages answer (the direction call). */
export function anthropicMessage(text: string, model = "claude-opus-5-5") {
  return { id: "msg_test", type: "message", role: "assistant", model, content: [{ type: "text", text }], stop_reason: "end_turn", stop_sequence: null, usage: { ...USAGE, output_tokens: 300 } };
}

/**
 * A body that sends `frames` one per tick; with `holdAfter`, it stops after that many frames until the request's
 * signal aborts (then it errors like a real aborted fetch).
 */
export function streamBody(frames: readonly string[], options: { signal?: AbortSignal | null; holdAfter?: number; onFrame?: (index: number) => void } = {}): ReadableStream<Uint8Array> {
  const encoder = new TextEncoder();
  let index = 0;
  return new ReadableStream<Uint8Array>({
    async pull(controller) {
      if (options.holdAfter !== undefined && index >= options.holdAfter) {
        await new Promise<void>((_, reject) => {
          const fail = () => reject(Object.assign(new Error("The operation was aborted."), { name: "AbortError" }));
          if (options.signal?.aborted) fail();
          options.signal?.addEventListener("abort", fail, { once: true });
        }).catch((error: unknown) => controller.error(error));
        return;
      }
      await new Promise((resolve) => setTimeout(resolve, 1));
      if (index >= frames.length) {
        controller.close();
        return;
      }
      options.onFrame?.(index);
      controller.enqueue(encoder.encode(frames[index++]!));
    },
  });
}

/** `fetch` stand-in: `answer` decides each response; every request is recorded (URL, headers, body, signal). */
export function recordingFetch(answer: (request: RecordedRequest, index: number) => Response | Promise<Response>) {
  const requests: RecordedRequest[] = [];
  const fetch = async (input: RequestInfo | URL, init: RequestInit = {}): Promise<Response> => {
    const request = input instanceof Request ? input : null;
    const url = request ? request.url : String(input);
    const headers = new Headers(init.headers ?? request?.headers);
    const body = typeof init.body === "string" ? init.body : init.body ? await new Response(init.body).text() : "";
    const recorded: RecordedRequest = { url, method: init.method ?? request?.method ?? "GET", headers, body, signal: init.signal ?? request?.signal ?? null };
    requests.push(recorded);
    if (recorded.signal?.aborted) throw Object.assign(new Error("The operation was aborted."), { name: "AbortError" });
    return answer(recorded, requests.length - 1);
  };
  return { fetch, requests };
}

export const sseResponse = (body: ReadableStream<Uint8Array>) => new Response(body, { status: 200, headers: { "content-type": "text/event-stream" } });

export async function collect(events: AsyncIterable<RenderStreamEvent>, onEvent?: (event: RenderStreamEvent) => void): Promise<RenderStreamEvent[]> {
  const out: RenderStreamEvent[] = [];
  for await (const event of events) {
    out.push(event);
    onEvent?.(event);
  }
  return out;
}

export const blocksOf = (events: readonly RenderStreamEvent[]) => events.filter((event): event is Extract<RenderStreamEvent, { type: "block" }> => event.type === "block");

/** The screen part of a block action's body (no blocks). */
export function screenOnly(screen: RenderScreenInput): Omit<RenderScreenInput, "blocks"> {
  const { id, name, kind, route, locale, screens } = screen;
  return { id, name, kind, route, locale, screens };
}
