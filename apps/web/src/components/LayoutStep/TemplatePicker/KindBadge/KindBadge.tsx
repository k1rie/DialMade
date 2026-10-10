"use client";

import type { ScreenKind } from "@dialmade/layout";
import { useDictionary } from "@/i18n";
import { layout } from "@/i18n/layout";
import { cn } from "@/lib/cn";

export type KindBadgeProps = {
  kind: ScreenKind;
  /** Lets a control point `aria-describedby` at the badge: it reads the full kind («Pantalla de app»). */
  id?: string;
  className?: string;
};

/** «Web» / «App» badge of a screen or a template. Shows the short name and reads the full one. */
export function KindBadge({ kind, id, className }: KindBadgeProps) {
  const t = useDictionary(layout);
  return (
    <span
      id={id}
      className={cn(
        "inline-flex h-4 shrink-0 items-center rounded-[5px] border border-app px-1 text-[0.6875rem] leading-none font-medium text-muted",
        className,
      )}
    >
      <span aria-hidden="true">{t.screens.kindBadge[kind]}</span>
      <span className="sr-only">{t.kinds[kind]}</span>
    </span>
  );
}
