// Client of src/workers/aiRender.worker.ts: one shared worker, promise per request, and the same code on the main
// thread when Workers are missing (tests, old browsers). Not a hook: the generation store calls it outside React.
import type { BlockContext, ProcessedBlock } from "@dialmade/ai-render";
import type { AiRenderWorkerRequest, AiRenderWorkerResponse } from "@/workers/aiRender.worker";

const TIMEOUT_MS = 20_000;

type Pending = { resolve: (response: AiRenderWorkerResponse) => void; reject: (error: Error) => void; timer: ReturnType<typeof setTimeout> };
let worker: Worker | null = null;
let nextId = 1;
const pending = new Map<number, Pending>();

function failAll(error: Error) {
  for (const entry of pending.values()) {
    clearTimeout(entry.timer);
    entry.reject(error);
  }
  pending.clear();
}

function getWorker(): Worker | null {
  if (worker) return worker;
  if (typeof Worker === "undefined") return null;
  try {
    worker = new Worker(new URL("../../../workers/aiRender.worker.ts", import.meta.url), { type: "module" });
    worker.onmessage = ({ data }: MessageEvent<AiRenderWorkerResponse>) => {
      const entry = pending.get(data.id);
      if (!entry) return;
      pending.delete(data.id);
      clearTimeout(entry.timer);
      entry.resolve(data);
    };
    worker.onerror = (event) => {
      event.preventDefault();
      worker?.terminate();
      worker = null;
      failAll(new Error(event.message || "AI render worker crashed"));
    };
    return worker;
  } catch {
    return null;
  }
}

type RequestBody = AiRenderWorkerRequest extends infer R ? (R extends AiRenderWorkerRequest ? Omit<R, "id"> : never) : never;

async function call(body: RequestBody): Promise<AiRenderWorkerResponse> {
  const id = nextId++;
  const request = { ...body, id } as AiRenderWorkerRequest;
  const target = getWorker();
  if (!target) {
    const { handleAiRenderRequest } = await import("@/workers/aiRender.worker");
    return handleAiRenderRequest(request);
  }
  return new Promise((resolve, reject) => {
    const timer = setTimeout(() => {
      pending.delete(id);
      reject(new Error("AI render worker timed out"));
    }, TIMEOUT_MS);
    pending.set(id, { resolve, reject, timer });
    target.postMessage(request);
  });
}

/** Sanitizes one raw block and runs the gates (spec §7). */
export async function processBlockOffThread(raw: string, context: BlockContext): Promise<ProcessedBlock> {
  const response = await call({ type: "process", raw, context });
  if (response.type === "processed") return response.result;
  throw new Error(response.type === "error" ? response.error : "Unexpected worker answer");
}

/** CSS of the given class tokens (preflight + base + utilities; `scoped` for pages that mix base sections). */
export async function compileCssOffThread(classes: readonly string[], options: { scoped?: boolean } = {}): Promise<string> {
  const response = await call({ type: "css", classes: [...classes], ...(options.scoped && { scoped: true }) });
  if (response.type === "css") return response.css;
  throw new Error(response.type === "error" ? response.error : "Unexpected worker answer");
}

/** Tests and hot reload. */
export function resetAiRenderWorker() {
  worker?.terminate();
  worker = null;
  failAll(new Error("AI render worker reset"));
}
