"use client";

import type { ImportedBrand, SkippedDetection } from "@dialmade/import";
import { AnimatePresence, motion } from "motion/react";
import { useId, useState } from "react";
import { useDictionary } from "@/i18n";
import { importText } from "@/i18n/import";
import { cn } from "@/lib/cn";
import { tween } from "@/lib/motion";
import { AlertIcon, ChevronDownIcon } from "../icons";

export type WarningsListProps = {
  brand: ImportedBrand;
  /** What the import would skip with the current choices (`superseded` is left out: it is expected). */
  skipped: readonly SkippedDetection[];
  /** Label of a skipped id (its chip value). */
  labelOf: (id: string) => string;
};

/** «Avisos (N)»: per-file problems, parser warnings, unresolved values and what will not be applied, folded. */
export function WarningsList({ brand, skipped, labelOf }: WarningsListProps) {
  const t = useDictionary(importText).review;
  const listId = useId();
  const [open, setOpen] = useState(false);
  const names = new Map(brand.sources.map((source) => [source.id, source.fileName]));
  for (const file of brand.files) if (!names.has(file.sourceId)) names.set(file.sourceId, file.name);
  const message = (code: string) => t.warnings.codes[code] ?? t.warnings.generic(code);

  const lines: string[] = [];
  for (const file of brand.files) if (file.status !== "parsed" && file.code) lines.push(t.warnings.file(file.name, message(file.code)));
  const seen = new Set<string>();
  for (const warning of brand.warnings) {
    const key = `${warning.sourceId}:${warning.code}`;
    if (seen.has(key)) continue;
    seen.add(key);
    const name = warning.sourceId === "batch" ? undefined : names.get(warning.sourceId);
    lines.push(name ? t.warnings.file(name, message(warning.code)) : message(warning.code));
  }
  // The reason is translated from its code; the parser's English text stays as a tooltip detail.
  const unresolved = brand.unresolved.slice(0, 20).map((item) => ({
    text: t.warnings.unresolved(item.path, t.warnings.unresolvedReasons[item.code] ?? t.warnings.unresolvedReasons.other!),
    detail: item.reason,
  }));
  const notApplied = skipped
    .filter((item) => item.reason !== "superseded" && item.reason !== "unknown-id")
    .map((item) => `${labelOf(item.id)}: ${t.skipped.reasons[item.reason] ?? item.reason}`);
  const total = lines.length + brand.unresolved.length + notApplied.length;
  if (total === 0) return null;

  return (
    <section className="mt-4 border-t border-white/[0.06] pt-3">
      <button
        type="button"
        aria-expanded={open}
        aria-controls={listId}
        onClick={() => setOpen((value) => !value)}
        className="inline-flex h-8 items-center gap-1.5 rounded-control px-2 text-small text-muted transition-colors duration-150 hover:bg-white/[0.06] hover:text-fg"
      >
        <AlertIcon className="size-4 text-warning" />
        {t.warnings.title(total)}
        <ChevronDownIcon className={cn("size-3.5 transition-transform duration-200", open && "rotate-180")} />
      </button>
      <AnimatePresence initial={false}>
        {open && (
          <motion.div
            key="warnings"
            id={listId}
            initial={{ opacity: 0, y: -4 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0 }}
            transition={tween(0.18)}
            className="mt-1.5 flex flex-col gap-2 rounded-control border border-app bg-black/20 p-2.5 text-caption text-muted"
          >
            {lines.length > 0 && (
              <ul className="flex list-disc flex-col gap-1 pl-4">
                {lines.map((line, i) => (
                  <li key={`l-${i}`}>{line}</li>
                ))}
              </ul>
            )}
            {notApplied.length > 0 && (
              <div className="flex flex-col gap-1">
                <p className="font-medium text-fg/80">{t.skipped.title(notApplied.length)}</p>
                <ul className="flex list-disc flex-col gap-1 pl-4">
                  {notApplied.map((line, i) => (
                    <li key={`s-${i}`}>{line}</li>
                  ))}
                </ul>
              </div>
            )}
            {unresolved.length > 0 && (
              <div className="flex flex-col gap-1">
                <p className="font-medium text-fg/80">{t.warnings.unresolvedTitle(brand.unresolved.length)}</p>
                <ul className="flex list-disc flex-col gap-1 pl-4 font-mono text-[11px]">
                  {unresolved.map((line, i) => (
                    <li key={`u-${i}`} title={line.detail}>
                      {line.text}
                    </li>
                  ))}
                </ul>
              </div>
            )}
          </motion.div>
        )}
      </AnimatePresence>
    </section>
  );
}
