"use client";

import { extractFromPixels, type ExtractOptions, type ExtractResult } from "@dialmade/palette";
import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import type { DecodedPixels } from "@/lib/image";
import type { PaletteWorkerRequest, PaletteWorkerResponse } from "@/workers/palette.worker";

export type PaletteWorkerStatus = "idle" | "busy" | "error";

export class PaletteWorkerError extends Error {
  constructor(
    message: string,
    readonly aborted = false,
  ) {
    super(message);
    this.name = aborted ? "AbortError" : "PaletteWorkerError";
  }
}

export const isAbortError = (error: unknown): boolean =>
  error instanceof PaletteWorkerError ? error.aborted : error instanceof DOMException && error.name === "AbortError";

type Pending = { resolve: (result: ExtractResult) => void; reject: (error: Error) => void; timer: ReturnType<typeof setTimeout> };

const TIMEOUT_MS = 20_000;

export type UsePaletteWorker = {
  /** Runs `extractFromPixels` off the main thread. The pixel buffer is transferred (detached) to the worker. */
  extract: (pixels: DecodedPixels, options?: ExtractOptions) => Promise<ExtractResult>;
  /** Terminates the worker and rejects pending calls with an AbortError (`isAbortError`). */
  cancel: () => void;
  status: PaletteWorkerStatus;
  error: Error | undefined;
};

export function usePaletteWorker(): UsePaletteWorker {
  const workerRef = useRef<Worker | null>(null);
  const pendingRef = useRef(new Map<number, Pending>());
  const nextId = useRef(1);
  const [status, setStatus] = useState<PaletteWorkerStatus>("idle");
  const [error, setError] = useState<Error>();

  const settle = useCallback(() => {
    if (pendingRef.current.size === 0) setStatus((s) => (s === "busy" ? "idle" : s));
  }, []);

  const rejectAll = useCallback((reason: PaletteWorkerError) => {
    for (const pending of pendingRef.current.values()) {
      clearTimeout(pending.timer);
      pending.reject(reason);
    }
    pendingRef.current.clear();
  }, []);

  const terminate = useCallback(
    (reason: PaletteWorkerError) => {
      workerRef.current?.terminate();
      workerRef.current = null;
      rejectAll(reason);
    },
    [rejectAll],
  );

  const getWorker = useCallback((): Worker | null => {
    if (workerRef.current) return workerRef.current;
    if (typeof Worker === "undefined") return null;
    try {
      const worker = new Worker(new URL("../workers/palette.worker.ts", import.meta.url), { type: "module" });
      worker.onmessage = ({ data }: MessageEvent<PaletteWorkerResponse>) => {
        const pending = pendingRef.current.get(data.id);
        if (!pending) return;
        pendingRef.current.delete(data.id);
        clearTimeout(pending.timer);
        if (data.ok) pending.resolve(data.result);
        else pending.reject(new PaletteWorkerError(data.error));
        settle();
      };
      worker.onerror = (event) => {
        event.preventDefault();
        const failure = new PaletteWorkerError(event.message || "Palette worker crashed");
        setError(failure);
        setStatus("error");
        terminate(failure);
      };
      workerRef.current = worker;
      return worker;
    } catch {
      return null;
    }
  }, [settle, terminate]);

  const extract = useCallback(
    (pixels: DecodedPixels, options?: ExtractOptions): Promise<ExtractResult> => {
      setError(undefined);
      setStatus("busy");
      const worker = getWorker();
      if (!worker) {
        try {
          const result = extractFromPixels(pixels.data, pixels.width, pixels.height, options);
          setStatus("idle");
          return Promise.resolve(result);
        } catch (cause) {
          const failure = new PaletteWorkerError(cause instanceof Error ? cause.message : String(cause));
          setError(failure);
          setStatus("error");
          return Promise.reject(failure);
        }
      }
      const id = nextId.current++;
      return new Promise<ExtractResult>((resolve, reject) => {
        const timer = setTimeout(() => {
          const failure = new PaletteWorkerError("Palette worker timed out");
          setError(failure);
          setStatus("error");
          terminate(failure);
        }, TIMEOUT_MS);
        pendingRef.current.set(id, {
          resolve,
          reject: (reason) => {
            if (!isAbortError(reason)) {
              setError(reason);
              setStatus("error");
            }
            reject(reason);
          },
          timer,
        });
        const request: PaletteWorkerRequest = { id, type: "extract", data: pixels.data, width: pixels.width, height: pixels.height, options };
        worker.postMessage(request, [pixels.data.buffer as ArrayBuffer]);
      });
    },
    [getWorker, terminate],
  );

  const cancel = useCallback(() => {
    terminate(new PaletteWorkerError("Extraction canceled", true));
    setStatus("idle");
  }, [terminate]);

  useEffect(() => () => terminate(new PaletteWorkerError("Unmounted", true)), [terminate]);

  return useMemo(() => ({ extract, cancel, status, error }), [extract, cancel, status, error]);
}
