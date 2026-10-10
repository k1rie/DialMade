"use client";

import { Button } from "@/components/ui/Button";
import { useDictionary } from "@/i18n";
import { flow } from "@/i18n/flow";
import { cn } from "@/lib/cn";

export type PendingLayoutNoticeProps = {
  /** «Generar»: writes the Layout draft into the document right here (no reveal, no AI). */
  onGenerate: () => void;
  className?: string;
};

/**
 * «Tienes cambios en Layout sin generar…» with «Generar»: shown over «Ajustar» (and «Exportar») while the draft
 * has layout changes the document does not have, so what they show is an older generation. It never blocks:
 * the user can keep adjusting or export what is there.
 */
export function PendingLayoutNotice({ onGenerate, className }: PendingLayoutNoticeProps) {
  const f = useDictionary(flow);
  return (
    <div className={cn("flex flex-wrap items-center justify-between gap-x-3 gap-y-2 rounded-control border border-app bg-white/[0.02] px-3 py-2", className)}>
      <p role="status" className="min-w-0 flex-1 text-caption text-pretty text-muted">
        {f.pending.message}
      </p>
      <Button variant="secondary" size="sm" aria-label={f.pending.generateLabel} onClick={onGenerate}>
        {f.pending.generate}
      </Button>
    </div>
  );
}
