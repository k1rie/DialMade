// The free-tier transport: `fetch` on the render routes (session, direction, one screen as SSE, one block action).
// Track C's `src/lib/ai/render/transport.ts` (free tier, BYOK, «mi Claude») takes its place behind the same
// `RenderTransport` shape. Never throws.
import { isAiApiErrorCode } from "../../api";
import {
  RENDER_BLOCK_ENDPOINT,
  RENDER_ENDPOINT,
  RENDER_SESSION_ENDPOINT,
  RENDER_SESSION_ERROR_CODES,
  readRenderStream,
  type RenderApiError,
  type RenderErrorCode,
  type RenderStreamEvent,
} from "../api";
import type { RenderTransport, TransportResult } from "./types";

const isRenderErrorCode = (value: unknown): value is RenderErrorCode =>
  isAiApiErrorCode(value) || (typeof value === "string" && (RENDER_SESSION_ERROR_CODES as readonly string[]).includes(value));

const aborted = (error: unknown) => error instanceof DOMException && error.name === "AbortError";

/** The error body of a render route, whatever came back. */
export function renderErrorFrom(body: unknown, status: number): RenderApiError {
  if (body && typeof body === "object" && isRenderErrorCode((body as { code?: unknown }).code)) return body as RenderApiError;
  return { code: status === 413 ? "payload-too-large" : status >= 500 ? "upstream-error" : "invalid-response", message: `HTTP ${status}` };
}

const failure = (error: unknown): RenderApiError =>
  aborted(error) ? { code: "aborted", message: "Request aborted" } : { code: "network", message: "Could not reach the server" };

async function postJson<T>(fetchImpl: typeof fetch, url: string, body: unknown, signal?: AbortSignal): Promise<TransportResult<T>> {
  try {
    const response = await fetchImpl(url, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      credentials: "same-origin",
      body: JSON.stringify(body),
      ...(signal && { signal }),
    });
    const json: unknown = await response.json().catch(() => null);
    if (!response.ok) return { ok: false, error: renderErrorFrom(json, response.status) };
    if (json === null) return { ok: false, error: { code: "invalid-response", message: "Empty answer" } };
    return { ok: true, value: json as T };
  } catch (error) {
    return { ok: false, error: failure(error) };
  }
}

/** `fetchImpl`: swappable for tests. */
export function createFreeTierTransport(fetchImpl: typeof fetch = (...args) => fetch(...args)): RenderTransport {
  const post = <T>(url: string, body: unknown, signal?: AbortSignal) => postJson<T>(fetchImpl, url, body, signal);
  return {
    path: "free",
    openSession: (body, signal) => post(RENDER_SESSION_ENDPOINT, body, signal),
    direction: (body, signal) => post(RENDER_ENDPOINT, body, signal),
    block: (body, signal) => post(RENDER_BLOCK_ENDPOINT, body, signal),
    async *screen(body, signal): AsyncGenerator<RenderStreamEvent> {
      let response: Response;
      try {
        response = await fetchImpl(RENDER_ENDPOINT, {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          credentials: "same-origin",
          body: JSON.stringify(body),
          signal,
        });
      } catch (error) {
        yield { type: "error", error: failure(error) };
        return;
      }
      const type = response.headers.get("content-type") ?? "";
      if (!response.ok || !response.body || !type.includes("text/event-stream")) {
        const json: unknown = await response.json().catch(() => null);
        yield { type: "error", error: response.ok ? { code: "invalid-response", message: "Expected a stream" } : renderErrorFrom(json, response.status) };
        return;
      }
      try {
        for await (const event of readRenderStream(response.body)) yield event;
      } catch (error) {
        yield { type: "error", error: failure(error) };
      }
    },
  };
}
