import { useId, type ReactNode } from "react";
import { cn } from "@/lib/cn";

export type PanelSectionProps = {
  title: string;
  hint?: ReactNode;
  actions?: ReactNode;
  /**
   * - `"section"` (default): a `<section>` named by its h3. A named section is a region landmark: right for
   *   panels whose surroundings are not landmarks (the Composer's side panels).
   * - `"group"`: a `div role="group"` named by its h3, for panels that already sit inside landmarks (the F6
   *   regions of Layout mode), so they do not add regions inside regions.
   */
  semantics?: "section" | "group";
  className?: string;
  children: ReactNode;
};

/** A titled group inside a side panel (h3 + optional hint and actions). */
export function PanelSection({ title, hint, actions, semantics = "section", className, children }: PanelSectionProps) {
  const id = useId();
  const group = semantics === "group";
  const Root = group ? "div" : "section";
  const Header = group ? "div" : "header";
  return (
    <Root role={group ? "group" : undefined} aria-labelledby={id} className={cn("flex flex-col gap-3", className)}>
      <Header className="flex items-start justify-between gap-2">
        <div className="min-w-0">
          <h3 id={id} className="text-caption font-semibold tracking-[0.01em] text-fg">
            {title}
          </h3>
          {hint !== undefined && <p className="mt-0.5 text-caption text-muted">{hint}</p>}
        </div>
        {actions !== undefined && <div className="flex shrink-0 items-center gap-1">{actions}</div>}
      </Header>
      {children}
    </Root>
  );
}
