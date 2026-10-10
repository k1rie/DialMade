"use client";

// «3 de 5 usos gratis este mes» (importar-guia.md, «Política de acceso a la IA»), from GET
// /api/ai/status and kept in sync by every hosted answer (useAiStatus). With the user's own key it
// says that no free uses are spent.
import { useAiStatus } from "@/hooks/useAiStatus";
import { useDictionary } from "@/i18n";
import { ai } from "@/i18n/ai";
import { useByokKey } from "@/lib/ai/byokKey";
import { cn } from "@/lib/cn";

export type AiUsageMeterProps = {
  /** Also show a line when the free tier is off on this server (default: render nothing). */
  showWhenUnavailable?: boolean;
  className?: string;
};

/** Above this many uses the segments become one bar. */
const MAX_SEGMENTS = 10;

export function AiUsageMeter({ showWhenUnavailable = false, className }: AiUsageMeterProps) {
  const t = useDictionary(ai).meter;
  const { status } = useAiStatus();
  const byok = useByokKey();
  const base = cn("flex min-h-5 items-center gap-2 text-caption", className);

  if (byok.active) {
    return (
      <p className={cn(base, "m-0 text-muted")}>
        <span aria-hidden className="size-1.5 shrink-0 rounded-full bg-success" />
        {t.byok}
      </p>
    );
  }

  if (!status) {
    return (
      <p className={cn(base, "m-0 text-subtle")} aria-busy>
        <span className="sr-only">{t.loading}</span>
      </p>
    );
  }

  if (!status.configured) {
    return showWhenUnavailable ? <p className={cn(base, "m-0 text-muted")}>{t.unavailable}</p> : null;
  }

  const total = Math.max(0, status.freeUsesTotal);
  const left = Math.min(total, Math.max(0, status.freeUsesRemaining));
  const label = t.freeUses(left, total);
  const empty = left === 0;

  return (
    <div className={base} role="group" aria-label={t.label}>
      <span aria-hidden className="flex shrink-0 items-center gap-[3px]">
        {total <= MAX_SEGMENTS ? (
          Array.from({ length: total }, (_, i) => (
            <span
              key={i}
              className={cn("h-1.5 w-2.5 rounded-[2px] transition-colors duration-300 ease-out", i < left ? "bg-accent" : "bg-white/[0.12]")}
            />
          ))
        ) : (
          <span className="relative h-1.5 w-14 overflow-hidden rounded-[2px] bg-white/[0.12]">
            <span
              className="absolute inset-0 origin-left rounded-[2px] bg-accent transition-transform duration-300 ease-out"
              style={{ transform: `scaleX(${total > 0 ? left / total : 0})` }}
            />
          </span>
        )}
      </span>
      <span className={cn("tabular-nums", empty ? "text-muted" : "text-fg")} aria-live="polite">
        {label}
      </span>
      {empty && <span className="text-muted">· {t.exhausted}</span>}
    </div>
  );
}
