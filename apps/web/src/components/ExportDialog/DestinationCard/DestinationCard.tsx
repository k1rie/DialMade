"use client";

import { motion, type Variants } from "motion/react";
import type { ReactNode } from "react";
import { cn } from "@/lib/cn";
import { smooth, tween } from "@/lib/motion";

export type DestinationCardProps = {
  icon: ReactNode;
  name: string;
  description: string;
  /** Best fit for the page focus: first in the list, white glow and a badge. */
  recommended?: boolean;
  recommendedLabel: string;
  /** Controls between the description and the actions (e.g. the prompt target picker). */
  extra?: ReactNode;
  /** Action buttons. */
  children: ReactNode;
  /** Under the actions (e.g. the steps an action button discloses). */
  footer?: ReactNode;
};

export const destinationItem: Variants = {
  initial: { opacity: 0, y: 8 },
  animate: { opacity: 1, y: 0, transition: { ...smooth, opacity: tween(0.2) } },
};

export function DestinationCard({ icon, name, description, recommended = false, recommendedLabel, extra, children, footer }: DestinationCardProps) {
  return (
    <motion.li
      variants={destinationItem}
      className={cn(
        "flex min-w-0 flex-col gap-3 rounded-card border bg-surface p-4 shadow-surface",
        recommended ? "glow-white border-app-strong sm:col-span-2" : "border-app",
      )}
    >
      <div className="flex items-center gap-3">
        <span className="grid size-9 shrink-0 place-items-center rounded-control border border-app bg-white/[0.04] text-fg [&_svg]:size-[18px]">
          {icon}
        </span>
        <h4 className="m-0 min-w-0 flex-1 truncate text-body font-semibold">{name}</h4>
        {recommended && (
          <span className="shrink-0 rounded-chip bg-accent-soft px-2 py-0.5 text-caption text-fg">{recommendedLabel}</span>
        )}
      </div>
      <p className="m-0 text-small text-muted">{description}</p>
      {extra}
      <div className="mt-auto flex flex-wrap gap-2 pt-1">{children}</div>
      {footer}
    </motion.li>
  );
}
