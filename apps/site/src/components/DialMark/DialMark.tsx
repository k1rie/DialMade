import { cn } from "@/lib/cn";

/** Fictional Dialmade mark: a dial with a needle. Uses currentColor; the needle hub picks up the accent. */
export function DialMark({ className, title }: { className?: string; title?: string }) {
  return (
    <svg
      viewBox="0 0 48 48"
      fill="none"
      role={title ? "img" : undefined}
      aria-hidden={title ? undefined : true}
      aria-label={title}
      className={cn("size-6", className)}
    >
      <circle cx="24" cy="24" r="20" stroke="currentColor" strokeOpacity="0.16" strokeWidth="4" />
      <path d="M24 4a20 20 0 0 1 17.32 30" stroke="currentColor" strokeWidth="4" strokeLinecap="round" />
      <path d="M24 24 33 15" stroke="currentColor" strokeWidth="3" strokeLinecap="round" />
      <circle cx="24" cy="24" r="4.5" fill="var(--app-accent)" />
    </svg>
  );
}
