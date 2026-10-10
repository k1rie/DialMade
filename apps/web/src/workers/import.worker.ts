import {
  IMPORT_LIMITS,
  detectFormat,
  importBatch,
  type DecodeImageRequest,
  type DecodedImage,
  type DetectedFormat,
  type FileRole,
  type ImportedBrand,
  type ImportProgress,
  type Ownership,
} from "@dialmade/import";

// «Trae tu marca» off the main thread: format detection, then the whole batch (parsers load on demand).
// The host terminates this worker to cancel or on timeout, so nothing here has to be interruptible.

export type ImportDetectFile = {
  name: string;
  /** The first bytes of the file (the detector sniffs at most 256 KB). */
  head: Uint8Array;
  pasted?: boolean;
};

export type ImportDetectResult = {
  detected: DetectedFormat;
  /** Byte limit for this format (pasted text: the paste limit). */
  maxBytes: number;
};

export type ImportJobFile = {
  name: string;
  bytes: Uint8Array;
  role?: FileRole;
  ownership?: Ownership;
  pasted?: boolean;
};

export type ImportJobOptions = {
  ownership: Ownership;
  rightsConfirmedAt?: string;
  /** Seeds of the user's logo, to raise the logo-vs-guide conflict cards. */
  logo?: { primary: string; secondary?: string };
};

export type ImportWorkerRequest =
  | { id: number; type: "detect"; files: ImportDetectFile[] }
  | { id: number; type: "import"; files: ImportJobFile[]; options: ImportJobOptions };

export type ImportWorkerResponse =
  | { id: number; type: "detected"; results: ImportDetectResult[] }
  | { id: number; type: "progress"; event: ImportProgress }
  | { id: number; type: "result"; brand: ImportedBrand }
  | { id: number; type: "error"; error: string };

/**
 * Pixels for the screenshot parser: straight (non-premultiplied) RGBA, long side ≤ `maxSide`. The size
 * is checked from the header before anything is decoded: an image whose header gives no size, or more
 * than `maxPixels`, is refused without allocating its bitmap.
 */
export async function decodeImage({ bytes, mime, maxSide, maxPixels }: DecodeImageRequest): Promise<DecodedImage> {
  const header = detectFormat(bytes, "image").image;
  if (!header) throw new Error("image-too-large unknown size");
  if (header.width * header.height > maxPixels) throw new Error(`image-too-large ${header.width}x${header.height}`);
  const source = await createImageBitmap(new Blob([bytes as BlobPart], { type: mime }));
  try {
    if (source.width * source.height > maxPixels) throw new Error(`image-too-large ${source.width}x${source.height}`);
    const scale = Math.min(1, maxSide / Math.max(source.width, source.height));
    const width = Math.max(1, Math.round(source.width * scale));
    const height = Math.max(1, Math.round(source.height * scale));
    const canvas = new OffscreenCanvas(width, height);
    const context = canvas.getContext("2d", { willReadFrequently: true });
    if (!context) throw new Error("2d context unavailable");
    context.imageSmoothingQuality = "high";
    context.drawImage(source, 0, 0, width, height);
    return { data: context.getImageData(0, 0, width, height).data, width, height };
  } finally {
    source.close();
  }
}

export function detectFiles(files: readonly ImportDetectFile[]): ImportDetectResult[] {
  return files.map((file) => {
    const detected = detectFormat(file.head, file.name, { pasted: file.pasted === true });
    const limit = IMPORT_LIMITS.bytes[detected.limit];
    return { detected, maxBytes: file.pasted ? Math.min(limit, IMPORT_LIMITS.bytes.paste) : limit };
  });
}

export function runImportJob(files: readonly ImportJobFile[], options: ImportJobOptions, onProgress?: (event: ImportProgress) => void) {
  return importBatch(files, {
    ownership: options.ownership,
    ...(options.rightsConfirmedAt && { rightsConfirmedAt: options.rightsConfirmedAt }),
    ...(options.logo && { logo: options.logo }),
    decodeImage,
    ...(onProgress && { onProgress }),
  });
}

type WorkerScope = {
  onmessage: ((event: MessageEvent<ImportWorkerRequest>) => void) | null;
  postMessage(message: ImportWorkerResponse): void;
};

const errorText = (error: unknown) => (error instanceof Error ? `${error.name}: ${error.message}` : String(error));

// Only as a worker: without Worker support the hook imports this module on the main thread (detection
// and small pasted text only).
// (Not `typeof window`: the client bundle replaces it with a constant.)
const WorkerGlobal = (globalThis as { WorkerGlobalScope?: abstract new () => unknown }).WorkerGlobalScope;
if (WorkerGlobal && globalThis instanceof WorkerGlobal) {
  const scope = globalThis as unknown as WorkerScope;
  scope.onmessage = ({ data: request }) => {
    if (request.type === "detect") {
      try {
        scope.postMessage({ id: request.id, type: "detected", results: detectFiles(request.files) });
      } catch (error) {
        scope.postMessage({ id: request.id, type: "error", error: errorText(error) });
      }
      return;
    }
    runImportJob(request.files, request.options, (event) => scope.postMessage({ id: request.id, type: "progress", event }))
      .then((brand) => scope.postMessage({ id: request.id, type: "result", brand }))
      .catch((error: unknown) => scope.postMessage({ id: request.id, type: "error", error: errorText(error) }));
  };
}
