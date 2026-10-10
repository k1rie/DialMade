/*
 * Copy of Composer/PanelSection made in Fase A (Composer is outside the Fase A zone). Fase B moves one copy to
 * `src/components/ui/PanelSection` and deletes the other (see docs/design/modo-layout-fase-b.md).
 */
import { useId, type ReactNode } from "react";
import { cn } from "@/lib/cn";

export type PanelSectionProps = {
  title: string;
  hint?: ReactNode;
  actions?: ReactNode;
  className?: string;
  children: ReactNode;
};

/**
 * A titled group inside the Layout side panels (h3 + optional hint and actions). A `group`, not a
 * `<section>`: a labelled section is a region landmark, and the areas around it (LayoutStep's F6 regions)
 * are already landmarks. Differs from Composer/PanelSection only in that element.
 */
export function PanelSection({ title, hint, actions, className, children }: PanelSectionProps) {
  const id = useId();
  return (
    <div role="group" aria-labelledby={id} className={cn("flex flex-col gap-3", className)}>
      <div className="flex items-start justify-between gap-2">
        <div className="min-w-0">
          <h3 id={id} className="text-caption font-semibold tracking-[0.01em] text-fg">
            {title}
          </h3>
          {hint !== undefined && <p className="mt-0.5 text-caption text-muted">{hint}</p>}
        </div>
        {actions !== undefined && <div className="flex shrink-0 items-center gap-1">{actions}</div>}
      </div>
      {children}
    </div>
  );
}
