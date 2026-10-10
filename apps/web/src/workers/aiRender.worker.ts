import { processBlock, type BlockContext, type ProcessedBlock } from "@dialmade/ai-render";
import { compileAiCss } from "@dialmade/ai-render/css";

// «Diseño con IA» off the main thread (spec §2.2 [C1], §6.2): each block the stream hands over is sanitized and
// passes the gates here, and the CSS of the document's AI blocks is compiled here with Tailwind's compile(). The
// iframe never runs Tailwind. The host (src/lib/ai/render/worker.ts) can terminate it at any time.

export type AiRenderWorkerRequest =
  | { id: number; type: "process"; raw: string; context: BlockContext }
  | { id: number; type: "css"; classes: string[]; scoped?: boolean };

export type AiRenderWorkerResponse =
  | { id: number; type: "processed"; result: ProcessedBlock }
  | { id: number; type: "css"; css: string }
  | { id: number; type: "error"; error: string };

type WorkerScope = {
  onmessage: ((event: MessageEvent<AiRenderWorkerRequest>) => void) | null;
  postMessage(message: AiRenderWorkerResponse): void;
};

const errorText = (error: unknown) => (error instanceof Error ? `${error.name}: ${error.message}` : String(error));

/** Shared by the worker and the main-thread fallback. */
export async function handleAiRenderRequest(request: AiRenderWorkerRequest): Promise<AiRenderWorkerResponse> {
  try {
    if (request.type === "process") return { id: request.id, type: "processed", result: processBlock(request.raw, request.context) };
    return { id: request.id, type: "css", css: await compileAiCss(request.classes, { scoped: request.scoped === true }) };
  } catch (error) {
    return { id: request.id, type: "error", error: errorText(error) };
  }
}

// (Not `typeof window`: the client bundle replaces it with a constant.)
const WorkerGlobal = (globalThis as { WorkerGlobalScope?: abstract new () => unknown }).WorkerGlobalScope;
if (WorkerGlobal && globalThis instanceof WorkerGlobal) {
  const scope = globalThis as unknown as WorkerScope;
  scope.onmessage = ({ data }) => {
    void handleAiRenderRequest(data).then((response) => scope.postMessage(response));
  };
}
