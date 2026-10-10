"use client";

import type { ScreenKind } from "@dialmade/layout";
import { useEffect, useId, useRef, type KeyboardEvent } from "react";
import { useDictionary } from "@/i18n";
import { layout } from "@/i18n/layout";
import { cn } from "@/lib/cn";

const KINDS: readonly ScreenKind[] = ["landing", "app"];

export type KindQuestionProps = {
  onChoose: (kind: ScreenKind) => void;
  /** Esc inside the question (a popover handles Esc itself and closes). */
  onCancel?: () => void;
  /** Moves focus to the first answer when it appears. */
  autoFocus?: boolean;
  id?: string;
  className?: string;
};

/**
 * «¿Web pública o pantalla de app?», asked inline by «En blanco» (a blank screen has no kind): two
 * answers with their hint. Click or Enter answers; the kind can be changed later in the screen panel.
 */
export function KindQuestion({ onChoose, onCancel, autoFocus = false, id, className }: KindQuestionProps) {
  const t = useDictionary(layout);
  const baseId = useId();
  const firstRef = useRef<HTMLButtonElement | null>(null);

  useEffect(() => {
    if (autoFocus) firstRef.current?.focus({ preventScroll: true });
  }, [autoFocus]);

  const onKeyDown = (event: KeyboardEvent<HTMLDivElement>) => {
    if (event.key !== "Escape" || !onCancel) return;
    event.preventDefault();
    event.stopPropagation();
    onCancel();
  };

  return (
    <div
      id={id}
      role="group"
      aria-labelledby={`${baseId}-q`}
      aria-describedby={`${baseId}-hint`}
      onKeyDown={onKeyDown}
      className={cn("flex flex-col gap-2", className)}
    >
      <div>
        <p id={`${baseId}-q`} className="text-small font-medium text-fg">
          {t.screens.kindQuestion}
        </p>
        <p id={`${baseId}-hint`} className="mt-0.5 text-caption text-muted">
          {t.screens.kindQuestionHint}
        </p>
      </div>
      <div className="grid gap-2">
        {KINDS.map((kind, index) => (
          <button
            key={kind}
            ref={index === 0 ? firstRef : undefined}
            type="button"
            aria-labelledby={`${baseId}-${kind}`}
            aria-describedby={`${baseId}-${kind}-hint`}
            onClick={() => onChoose(kind)}
            className="flex min-h-11 flex-col items-start gap-0.5 rounded-control border border-app-strong bg-surface px-3 py-2 text-start shadow-surface transition-colors duration-150 hover:bg-surface-hover"
          >
            <span id={`${baseId}-${kind}`} className="text-small font-medium text-fg">
              {t.kinds[kind]}
            </span>
            <span id={`${baseId}-${kind}-hint`} className="text-caption text-muted">
              {t.kindHints[kind]}
            </span>
          </button>
        ))}
      </div>
    </div>
  );
}
