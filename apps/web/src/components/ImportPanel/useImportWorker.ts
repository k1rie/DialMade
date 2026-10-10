"use client";

import type { ImportedBrand, ImportProgress } from "@dialmade/import";
import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import type {
  ImportDetectFile,
  ImportDetectResult,
  ImportJobFile,
  ImportJobOptions,
  ImportWorkerRequest,
  ImportWorkerResponse,
} from "@/workers/import.worker";

export type { ImportDetectFile, ImportDetectResult, ImportJobFile, ImportJobOptions } from "@/workers/import.worker";

/** A batch (or a detection) that sends nothing for this long is stopped: the worker is terminated. */
export const IMPORT_TIMEOUT_MS = 15_000;

export type ImportWorkerFailure = "aborted" | "timeout" | "failed" | "no-worker";

/**
 * Without a Worker (no support, or a CSP that blocks it) only small pasted text is read on the main
 * thread: parsers never run hostile files there, without a timeout or «Cancelar».
 */
export const MAIN_THREAD_MAX_BYTES = 64 * 1024;

export class ImportWorkerError extends Error {
  constructor(
    message: string,
    readonly reason: ImportWorkerFailure = "failed",
  ) {
    super(message);
    this.name = reason === "aborted" ? "AbortError" : "ImportWorkerError";
  }
}

export const isImportAbort = (error: unknown): boolean => error instanceof ImportWorkerError && error.reason === "aborted";

export type ImportWorkerStatus = "idle" | "busy";

type Pending = {
  resolve: (value: never) => void;
  reject: (error: ImportWorkerError) => void;
  onProgress?: (event: ImportProgress) => void;
  timer?: ReturnType<typeof setTimeout>;
};

export type UseImportWorker = {
  /** `detectFormat` per file (cheap). Send only the first bytes of each file. */
  detect: (files: ImportDetectFile[]) => Promise<ImportDetectResult[]>;
  /** `importBatch` in the worker. The byte buffers are transferred (detached). */
  run: (files: ImportJobFile[], options: ImportJobOptions, onProgress?: (event: ImportProgress) => void) => Promise<ImportedBrand>;
  /** «Cancelar»: terminates the worker; pending calls reject with an `aborted` ImportWorkerError. */
  cancel: () => void;
  status: ImportWorkerStatus;
};

const loadFallback = () => import("@/workers/import.worker");

/**
 * Client of `workers/import.worker.ts` (same pattern as usePaletteWorker): one worker per hook, created
 * on first use, with a 15 s watchdog that restarts on every progress message. Only ImportPanel uses it.
 * Without Worker support, detection (bounded: it sniffs the first bytes) runs on the main thread, and
 * so does a batch of small pasted text (≤ 64 KB); anything else fails with `no-worker`.
 */
export function useImportWorker(): UseImportWorker {
  const workerRef = useRef<Worker | null>(null);
  const pendingRef = useRef(new Map<number, Pending>());
  const nextId = useRef(1);
  const [busy, setBusy] = useState(0);

  const stopAll = useCallback((error: ImportWorkerError) => {
    workerRef.current?.terminate();
    workerRef.current = null;
    for (const pending of pendingRef.current.values()) {
      clearTimeout(pending.timer);
      pending.reject(error);
    }
    pendingRef.current.clear();
  }, []);

  const arm = useCallback(
    (id: number) => {
      const pending = pendingRef.current.get(id);
      if (!pending) return;
      clearTimeout(pending.timer);
      pending.timer = setTimeout(() => stopAll(new ImportWorkerError("Import worker timed out", "timeout")), IMPORT_TIMEOUT_MS);
    },
    [stopAll],
  );

  const getWorker = useCallback((): Worker | null => {
    if (workerRef.current) return workerRef.current;
    if (typeof Worker === "undefined") return null;
    try {
      const worker = new Worker(new URL("../../workers/import.worker.ts", import.meta.url), { type: "module" });
      worker.onmessage = ({ data }: MessageEvent<ImportWorkerResponse>) => {
        const pending = pendingRef.current.get(data.id);
        if (!pending) return;
        if (data.type === "progress") {
          arm(data.id);
          pending.onProgress?.(data.event);
          return;
        }
        pendingRef.current.delete(data.id);
        clearTimeout(pending.timer);
        if (data.type === "error") pending.reject(new ImportWorkerError(data.error));
        else (pending.resolve as (value: unknown) => void)(data.type === "detected" ? data.results : data.brand);
      };
      worker.onerror = (event) => {
        event.preventDefault();
        stopAll(new ImportWorkerError(event.message || "Import worker crashed"));
      };
      workerRef.current = worker;
      return worker;
    } catch {
      return null;
    }
  }, [arm, stopAll]);

  const send = useCallback(
    <T,>(request: ImportWorkerRequest, transfer: Transferable[], onProgress?: (event: ImportProgress) => void): Promise<T> | null => {
      const worker = getWorker();
      if (!worker) return null;
      setBusy((n) => n + 1);
      return new Promise<T>((resolve, reject) => {
        pendingRef.current.set(request.id, {
          resolve: resolve as (value: never) => void,
          reject,
          ...(onProgress && { onProgress }),
        });
        arm(request.id);
        worker.postMessage(request, transfer);
      }).finally(() => setBusy((n) => Math.max(0, n - 1)));
    },
    [arm, getWorker],
  );

  const detect = useCallback(
    async (files: ImportDetectFile[]): Promise<ImportDetectResult[]> => {
      const sent = send<ImportDetectResult[]>(
        { id: nextId.current++, type: "detect", files },
        files.map((file) => file.head.buffer as ArrayBuffer),
      );
      if (sent) return sent;
      return (await loadFallback()).detectFiles(files);
    },
    [send],
  );

  const run = useCallback(
    async (files: ImportJobFile[], options: ImportJobOptions, onProgress?: (event: ImportProgress) => void): Promise<ImportedBrand> => {
      const sent = send<ImportedBrand>(
        { id: nextId.current++, type: "import", files, options },
        files.map((file) => file.bytes.buffer as ArrayBuffer),
        onProgress,
      );
      if (sent) return sent;
      const small = files.every((file) => file.pasted) && files.reduce((sum, file) => sum + file.bytes.length, 0) <= MAIN_THREAD_MAX_BYTES;
      if (!small) throw new ImportWorkerError("Web Workers are unavailable", "no-worker");
      return (await loadFallback()).runImportJob(files, options, onProgress);
    },
    [send],
  );

  const cancel = useCallback(() => stopAll(new ImportWorkerError("Import canceled", "aborted")), [stopAll]);

  useEffect(() => () => stopAll(new ImportWorkerError("Unmounted", "aborted")), [stopAll]);

  const status: ImportWorkerStatus = busy > 0 ? "busy" : "idle";
  return useMemo(() => ({ detect, run, cancel, status }), [detect, run, cancel, status]);
}
