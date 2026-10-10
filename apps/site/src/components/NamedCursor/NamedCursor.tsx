import { cn } from "@/lib/cn";

/** Multiplayer-style cursor with a name tag (FLORA). Decorative. */
export function NamedCursor({ label, className }: { label: string; className?: string }) {
  return (
    <span aria-hidden className={cn("pointer-events-none flex items-start", className)}>
      <svg viewBox="0 0 16 16" className="size-4 drop-shadow-[0_2px_6px_oklch(0_0_0/0.5)]">
        <path d="M2 1.5 14 7l-5.2 1.6L6.6 14Z" fill="var(--app-accent)" stroke="oklch(1 0 0 / 0.9)" strokeWidth="1" strokeLinejoin="round" />
      </svg>
      <span className="mt-3 -ml-1 rounded-[6px] bg-accent-cta px-1.5 py-0.5 font-mono text-[10px] leading-3 font-medium text-white">
        {label}
      </span>
    </span>
  );
}
