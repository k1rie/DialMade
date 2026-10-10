import type { ComponentPropsWithRef, ReactNode } from "react";
import { cn } from "@/lib/cn";

export type PanelProps = Omit<ComponentPropsWithRef<"section">, "title"> & {
  /** Optional header: title (h2 by default), description and right-aligned actions. */
  title?: ReactNode;
  description?: ReactNode;
  actions?: ReactNode;
  headingLevel?: 2 | 3;
  /** "elevated" (solid, default) or "glass" (translucent + blur over the background). */
  tone?: "elevated" | "glass";
  padded?: boolean;
};

export function Panel({
  title,
  description,
  actions,
  headingLevel = 2,
  tone = "elevated",
  padded = true,
  className,
  children,
  ...props
}: PanelProps) {
  const Heading = headingLevel === 2 ? "h2" : "h3";
  const hasHeader = title !== undefined || description !== undefined || actions !== undefined;
  return (
    <section
      className={cn(
        "relative rounded-panel border border-app shadow-surface",
        tone === "glass" ? "glass" : "bg-app-elevated",
        padded && "p-5",
        className,
      )}
      {...props}
    >
      {hasHeader && (
        <header className={cn("flex items-start justify-between gap-4", padded ? "mb-4" : "px-5 pt-5 pb-4")}>
          <div className="min-w-0">
            {title !== undefined && <Heading className="text-[0.9375rem] leading-6 font-semibold tracking-[-0.01em] text-fg">{title}</Heading>}
            {description !== undefined && <p className="mt-0.5 text-small text-muted">{description}</p>}
          </div>
          {actions !== undefined && <div className="flex shrink-0 items-center gap-1.5">{actions}</div>}
        </header>
      )}
      {children}
    </section>
  );
}
