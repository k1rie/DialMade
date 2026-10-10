export type ButtonVariant = "primary" | "secondary" | "ghost";
export type ButtonSize = "sm" | "md" | "lg";

export const buttonBase =
  "relative inline-flex shrink-0 select-none items-center justify-center gap-2 whitespace-nowrap font-medium [&>svg]:relative " +
  "transition-[background-color,color,border-color,opacity] duration-150 ease-out " +
  "disabled:pointer-events-none disabled:opacity-45 aria-busy:pointer-events-none";

export const buttonVariants: Record<ButtonVariant, string> = {
  primary:
    "glow-purple bg-accent-cta text-white hover:bg-[var(--app-accent-cta-hover)] active:bg-[oklch(0.56_0.22_296)] " +
    "before:pointer-events-none before:absolute before:inset-0 before:rounded-[inherit] before:bg-linear-to-b before:from-white/14 before:to-transparent before:to-60%",
  secondary: "border border-app-strong bg-surface text-fg shadow-surface hover:bg-surface-hover",
  ghost: "text-muted hover:bg-white/[0.06] hover:text-fg active:bg-white/[0.08]",
};

export const buttonSizes: Record<ButtonSize, string> = {
  sm: "h-8 rounded-control px-3 text-small font-medium [&_svg]:size-3.5",
  md: "h-10 rounded-control px-4 text-[0.875rem] leading-5 [&_svg]:size-4",
  lg: "h-12 rounded-control px-5 text-body font-medium [&_svg]:size-[18px]",
};

export const iconButtonSizes: Record<ButtonSize, string> = {
  sm: "size-8 rounded-control [&_svg]:size-4",
  md: "size-9 rounded-control [&_svg]:size-[18px]",
  lg: "size-11 rounded-control [&_svg]:size-5",
};
