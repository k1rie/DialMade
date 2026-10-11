import { cn } from "@/lib/cn";

/** Dialmade mark: a D made of three layout cells and one continuous bowl. Uses currentColor; the selected (middle) cell picks up the accent. */
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
      <g fill="currentColor">
        <rect x="3" y="3" width="12" height="12" rx="2" />
        <rect x="3" y="33" width="12" height="12" rx="2" />
        <path d="M18 5a2 2 0 0 1 2-2h4a21 21 0 0 1 0 42h-4a2 2 0 0 1-2-2v-8a2 2 0 0 1 2-2h4a9 9 0 0 0 0-18h-4a2 2 0 0 1-2-2Z" />
      </g>
      <rect x="3" y="18" width="12" height="12" rx="2" fill="var(--app-accent)" />
    </svg>
  );
}
