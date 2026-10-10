import type { ReactNode } from "react";
import type { RenderContext } from "../../types";

export interface EditInertProps {
  ctx: Pick<RenderContext, "interactive">;
  children: ReactNode;
}

/**
 * In edit mode, makes its content `inert` (not clickable, focusable or tabbable) without adding a box
 * (`display: contents`). Containers wrap their own chrome with it and leave the child elements out.
 */
export function EditInert({ ctx, children }: EditInertProps) {
  if (!ctx.interactive) return <>{children}</>;
  return (
    <div className="dl-inert" inert>
      {children}
    </div>
  );
}
