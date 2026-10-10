import type { AnchorHTMLAttributes, ReactNode } from "react";
import { cn } from "@/lib/cn";

type Variant = "primary" | "accent" | "secondary" | "ghost";
type Size = "md" | "lg";

export type ButtonLinkProps = AnchorHTMLAttributes<HTMLAnchorElement> & {
  variant?: Variant;
  size?: Size;
  children: ReactNode;
};

const variants: Record<Variant, string> = {
  // The purple glow is reserved for the primary CTA (DESIGN-BRIEF §2).
  primary: "bg-accent-cta text-white glow-purple hover:bg-[var(--app-accent-cta-hover)]",
  // Same color without the halo, for a repeat of the CTA that is always on screen (the sticky nav).
  accent: "bg-accent-cta text-white hover:bg-[var(--app-accent-cta-hover)]",
  secondary: "border border-app-strong bg-surface/70 text-fg shadow-surface hover:bg-surface-hover",
  ghost: "text-muted hover:text-fg",
};

const sizes: Record<Size, string> = {
  md: "h-9 px-3.5 text-small",
  lg: "h-11 px-5 text-body",
};

/** A link styled as a button. Server-safe. */
export function ButtonLink({ variant = "primary", size = "md", className, children, ...props }: ButtonLinkProps) {
  return (
    <a
      {...props}
      className={cn(
        "inline-flex items-center justify-center gap-2 rounded-control font-medium whitespace-nowrap",
        "transition-[background-color,color,transform] duration-150 active:scale-[0.98]",
        variants[variant],
        sizes[size],
        className,
      )}
    >
      {children}
    </a>
  );
}
