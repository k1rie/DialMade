import type { ReactNode } from "react";
import { cn } from "@/lib/cn";

export type LabSectionProps = {
  title: string;
  headingId: string;
  /** Right side of the heading row (a count, a status). */
  aside?: ReactNode;
  className?: string;
  children: ReactNode;
};

/** One block of the left panel, separated by a hairline, like the groups of Recraft's palette popover. */
export function LabSection({ title, headingId, aside, className, children }: LabSectionProps) {
  return (
    <section aria-labelledby={headingId} className={cn("mt-4 border-t border-white/[0.06] pt-4", className)}>
      <div className="mb-2.5 flex items-baseline justify-between gap-2">
        <h2 id={headingId} tabIndex={-1} className="text-small font-semibold text-fg outline-none">
          {title}
        </h2>
        {aside !== undefined && <span className="text-caption text-muted">{aside}</span>}
      </div>
      {children}
    </section>
  );
}
