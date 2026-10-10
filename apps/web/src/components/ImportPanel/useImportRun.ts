"use client";

import type { ImportedBrand, WarningCode } from "@dialmade/import";
import { parseSvgColors } from "@dialmade/palette";
import { useCallback, useMemo, useState } from "react";
import { ImportWorkerError, type ImportJobFile, type UseImportWorker } from "./useImportWorker";
import type { ImportDraft, ImportLogo, ImportSession } from "@/hooks/usePaletteFlow";
import { usePaletteWorker } from "@/hooks/usePaletteWorker";
import { decodeLogo, readLogoFile } from "@/lib/image";
import type { ImportEntry } from "./entries";

export type RunPhase =
  | { kind: "idle" }
  | { kind: "logo" }
  | { kind: "batch"; index: number; total: number; name: string };

export type RunFailure = "canceled" | "timeout" | "failed" | "nothing" | "no-worker";

export type RunInput = {
  /** Usable entries, in list order. */
  entries: readonly ImportEntry[];
  /** Unsaved text of «Pegar colores o código» (read as one more pasted file). */
  pasteText: string;
  pasteName: string;
  rights: boolean;
  /** Seeds of a logo already in the flow, used when the batch brings none. */
  logoSeeds?: { primary: string; secondary?: string };
  draft: ImportDraft;
};

export type RunResult =
  | { ok: true; session: ImportSession }
  | { ok: false; failure: RunFailure; reports: Record<string, { code: WarningCode; detail?: string }>; logoFailed: boolean };

const LOGO_EXTRACT_SIZE = 256;

async function readLogo(entry: ImportEntry, extract: ReturnType<typeof usePaletteWorker>["extract"]): Promise<ImportLogo> {
  const logo = await readLogoFile(entry.file);
  try {
    const pixels = await decodeLogo(logo, { maxSize: LOGO_EXTRACT_SIZE });
    const declaredColors = logo.svgText ? parseSvgColors(logo.svgText) : undefined;
    return { logo, extract: await extract(pixels, { declaredColors }) };
  } catch (error) {
    URL.revokeObjectURL(logo.objectUrl);
    throw error;
  }
}

function failureOf(error: unknown): RunFailure {
  if (error instanceof ImportWorkerError) {
    return error.reason === "aborted" ? "canceled" : error.reason === "timeout" ? "timeout" : error.reason === "no-worker" ? "no-worker" : "failed";
  }
  return error instanceof Error && error.name === "AbortError" ? "canceled" : "failed";
}

/**
 * «Ver lo que detectamos»: reads «Mi logo» like a dropped logo (crop-free extraction in the palette
 * worker), then the rest of the batch in the import worker with one rights statement for all of it.
 */
export function useImportRun(worker: UseImportWorker) {
  const palette = usePaletteWorker();
  const [phase, setPhase] = useState<RunPhase>({ kind: "idle" });

  const run = useCallback(
    async (input: RunInput): Promise<RunResult> => {
      const ownership = input.rights ? "own" : "third-party";
      const rightsConfirmedAt = input.rights ? new Date().toISOString() : undefined;
      const logoEntry = input.rights ? input.entries.find((entry) => entry.role === "logo") : undefined;
      const jobEntries = input.entries.filter((entry) => entry.role !== "logo");
      let logo: ImportLogo | undefined;
      let logoFailed = false;
      try {
        if (logoEntry) {
          setPhase({ kind: "logo" });
          try {
            logo = await readLogo(logoEntry, palette.extract);
          } catch (error) {
            if (failureOf(error) === "canceled") throw error;
            logoFailed = true;
          }
        }
        const seeds = logo
          ? { primary: logo.extract.seeds.primary.hex, ...(logo.extract.seeds.secondary && { secondary: logo.extract.seeds.secondary.hex }) }
          : input.logoSeeds;
        const files: ImportJobFile[] = await Promise.all(
          jobEntries.map(async (entry) => ({
            name: entry.name,
            bytes: new Uint8Array(await entry.file.arrayBuffer()),
            role: entry.role,
            ...(entry.pasted && { pasted: true }),
          })),
        );
        if (input.pasteText.trim()) {
          files.push({ name: input.pasteName, bytes: new TextEncoder().encode(input.pasteText), role: "guide", pasted: true });
        }
        let brand: ImportedBrand | undefined;
        if (files.length > 0) {
          const total = files.length;
          setPhase({ kind: "batch", index: 0, total, name: files[0]!.name });
          brand = await worker.run(files, { ownership, ...(rightsConfirmedAt && { rightsConfirmedAt }), ...(seeds && { logo: seeds }) }, (event) => {
            if (event.phase === "parsing") setPhase({ kind: "batch", index: event.index, total: event.total, name: event.name });
          });
        }
        const reports: Record<string, { code: WarningCode; detail?: string }> = {};
        const sourceFiles: Record<string, File> = {};
        for (const report of brand?.files ?? []) {
          const entry = jobEntries[report.index];
          if (entry && report.status === "parsed") sourceFiles[report.sourceId] = entry.file;
          if (entry && report.status !== "parsed" && report.code) reports[entry.id] = { code: report.code, ...(report.detail && { detail: report.detail }) };
        }
        if (!brand || brand.sources.length === 0) {
          if (logo) URL.revokeObjectURL(logo.logo.objectUrl);
          return { ok: false, failure: "nothing", reports, logoFailed };
        }
        return {
          ok: true,
          session: { brand, ownership, ...(rightsConfirmedAt && { rightsConfirmedAt }), ...(logo && { logo }), draft: input.draft, sourceFiles },
        };
      } catch (error) {
        if (logo) URL.revokeObjectURL(logo.logo.objectUrl);
        return { ok: false, failure: failureOf(error), reports: {}, logoFailed };
      } finally {
        setPhase({ kind: "idle" });
      }
    },
    [palette.extract, worker],
  );

  const cancel = useCallback(() => {
    worker.cancel();
    palette.cancel();
  }, [palette, worker]);

  return useMemo(() => ({ run, cancel, phase, running: phase.kind !== "idle" }), [run, cancel, phase]);
}
