"use client";

import { Button } from "@/components/ui/Button";
import { useDictionary } from "@/i18n";
import { importText } from "@/i18n/import";
import { LockIcon } from "../icons";

export type ImportedLocksProps = {
  /** Colors of the imported guide that the theme keeps as they are. */
  count: number;
  onUnlock: () => void;
};

/** After «Completar en Palette Lab»: the guide's colors are locked and palette styles only move the rest. */
export function ImportedLocks({ count, onUnlock }: ImportedLocksProps) {
  const t = useDictionary(importText).lab;
  return (
    <div role="note" className="flex items-start gap-2.5 rounded-card border border-accent/30 bg-accent-soft p-3">
      <LockIcon className="mt-0.5 size-4 shrink-0 text-accent" />
      <p className="min-w-0 flex-1 text-small text-pretty text-fg/90">{t.locked(count)}</p>
      <Button size="sm" variant="ghost" className="-my-1 shrink-0" onClick={onUnlock}>
        {t.unlock}
      </Button>
    </div>
  );
}
