"use client";

import type { FileRole } from "@dialmade/import";
import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import type { UseImportWorker } from "./useImportWorker";
import type { ImportDraftFile } from "@/hooks/usePaletteFlow";
import { SNIFF_BYTES } from "./constants";
import { defaultRole, entryProblems, rolesFor, type EntryProblem, type ImportEntry } from "./entries";

export type NewImportFile = { file: File; pasted?: boolean; role?: FileRole };

export type ImportEntries = {
  entries: ImportEntry[];
  problems: ReadonlyMap<string, EntryProblem>;
  /** Adds files (their detection runs in the worker). Returns how many were added. */
  add: (files: readonly NewImportFile[]) => number;
  remove: (id: string) => void;
  setRole: (id: string, role: FileRole) => void;
  detecting: boolean;
};

let nextEntry = 0;

function entryOf({ file, pasted = false, role }: NewImportFile): ImportEntry {
  return {
    id: `import-entry-${++nextEntry}`,
    file,
    name: file.name,
    size: file.size,
    pasted,
    role: role ?? "guide",
    roleTouched: role !== undefined,
    status: "detecting",
  };
}

const headOf = async (file: File) => new Uint8Array(await file.slice(0, SNIFF_BYTES).arrayBuffer());

/** The panel's file list: each file is detected once in the worker (format, byte limit, default type). */
export function useImportEntries(detect: UseImportWorker["detect"], initial: readonly NewImportFile[]): ImportEntries {
  const [entries, setEntries] = useState<ImportEntry[]>(() => initial.map(entryOf));
  const requested = useRef(new Set<string>());

  useEffect(() => {
    const pending = entries.filter((entry) => entry.status === "detecting" && !requested.current.has(entry.id));
    if (pending.length === 0) return;
    for (const entry of pending) requested.current.add(entry.id);
    void (async () => {
      let results: Awaited<ReturnType<typeof detect>> | null = null;
      try {
        const heads = await Promise.all(pending.map((entry) => headOf(entry.file)));
        results = await detect(pending.map((entry, i) => ({ name: entry.name, head: heads[i]!, pasted: entry.pasted })));
      } catch {
        results = null;
      }
      const byId = new Map(pending.map((entry, i) => [entry.id, results?.[i]]));
      setEntries((current) =>
        current.map((entry) => {
          if (!byId.has(entry.id)) return entry;
          const result = byId.get(entry.id);
          if (!result) return { ...entry, status: "ready" };
          const keep = entry.roleTouched && rolesFor({ status: "ready", detected: result.detected }).includes(entry.role);
          return {
            ...entry,
            status: "ready",
            detected: result.detected,
            maxBytes: result.maxBytes,
            role: keep ? entry.role : defaultRole(result.detected, entry.name),
          };
        }),
      );
    })();
  }, [entries, detect]);

  const add = useCallback((files: readonly NewImportFile[]): number => {
    if (files.length === 0) return 0;
    setEntries((current) => [...current, ...files.map(entryOf)]);
    return files.length;
  }, []);
  const remove = useCallback((id: string) => setEntries((current) => current.filter((entry) => entry.id !== id)), []);
  const setRole = useCallback(
    (id: string, role: FileRole) => setEntries((current) => current.map((entry) => (entry.id === id ? { ...entry, role, roleTouched: true } : entry))),
    [],
  );

  const problems = useMemo(() => entryProblems(entries), [entries]);
  const detecting = entries.some((entry) => entry.status === "detecting");
  return { entries, problems, add, remove, setRole, detecting };
}

/** The list as the flow keeps it while «Esto detectamos» is open. */
export const draftFilesOf = (entries: readonly ImportEntry[]): ImportDraftFile[] =>
  entries.map((entry) => ({ file: entry.file, role: entry.role, pasted: entry.pasted }));
