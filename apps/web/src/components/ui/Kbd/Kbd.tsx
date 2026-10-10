import type { ComponentPropsWithRef } from "react";
import { cn } from "@/lib/cn";

export type KbdProps = ComponentPropsWithRef<"kbd">;

export function Kbd({ className, ...props }: KbdProps) {
  return (
    <kbd
      className={cn(
        "inline-flex h-5 min-w-5 items-center justify-center rounded-[6px] border border-app-strong bg-white/[0.04] px-1.5",
        "font-mono text-[11px] leading-none font-medium text-muted shadow-[inset_0_-1px_0_0_oklch(1_0_0/0.08)]",
        className,
      )}
      {...props}
    />
  );
}
