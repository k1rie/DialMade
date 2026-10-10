import type { ReactNode } from "react";
import { cn } from "@/lib/cn";

export type StepCardProps = {
  n: string;
  word: string;
  title: string;
  body: string;
  /** Decorative piece of product: hidden from assistive tech, the body explains the step. */
  art: ReactNode;
  className?: string;
};

/** «01 Coloca» card: a two-tone numeral as the one title, a piece of product, then the explanation (FLORA). */
export function StepCard({ n, word, title, body, art, className }: StepCardProps) {
  return (
    <article className={cn("flex h-full flex-col overflow-hidden rounded-card border border-app bg-surface/40 shadow-surface", className)}>
      <h3 className="flex items-baseline gap-2 px-6 pt-6 text-h2">
        <span className="text-subtle">{n}</span>
        <span className="text-fg">{word}</span>
      </h3>
      <div aria-hidden className="relative mx-4 mt-5 h-60 overflow-hidden rounded-control border border-app bg-app/50 dot-grid">
        {art}
      </div>
      <p className="p-6 text-small text-muted">
        <span className="font-medium text-fg">{title}.</span> {body}
      </p>
    </article>
  );
}
