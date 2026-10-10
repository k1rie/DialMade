import { extractFromPixels, type ExtractOptions, type ExtractResult } from "@dialmade/palette";

export type PaletteWorkerRequest = {
  id: number;
  type: "extract";
  data: Uint8ClampedArray;
  width: number;
  height: number;
  options?: ExtractOptions;
};

export type PaletteWorkerResponse =
  | { id: number; ok: true; result: ExtractResult }
  | { id: number; ok: false; error: string };

type WorkerScope = {
  onmessage: ((event: MessageEvent<PaletteWorkerRequest>) => void) | null;
  postMessage(message: PaletteWorkerResponse): void;
};

const scope = globalThis as unknown as WorkerScope;

scope.onmessage = ({ data: request }) => {
  try {
    const result = extractFromPixels(request.data, request.width, request.height, request.options);
    scope.postMessage({ id: request.id, ok: true, result });
  } catch (error) {
    scope.postMessage({ id: request.id, ok: false, error: error instanceof Error ? error.message : String(error) });
  }
};
