import type { ComponentPropsWithRef } from "react";
import { cn } from "@/lib/cn";

export type CheckboxProps = Omit<ComponentPropsWithRef<"input">, "type" | "size"> & {
  size?: "sm" | "md";
};

const dims = {
  sm: "size-4 rounded-[5px]",
  md: "size-[18px] rounded-[6px]",
} as const;

/**
 * The app's checkbox: a native `<input type="checkbox">` (Tab, Space, its `<label>`, forms) drawn like the Switch
 * and the Chip — a dark square with the app border, the CTA purple with a white check when it is on. Wrap it in a
 * `<label>` or point a label at its `id`.
 */
export function Checkbox({ size = "sm", className, ...props }: CheckboxProps) {
  return (
    <span className={cn("relative inline-flex shrink-0", dims[size], className)}>
      <input
        type="checkbox"
        className={cn(
          "peer m-0 size-full cursor-pointer appearance-none border border-app-strong bg-white/[0.04]",
          "transition-[background-color,border-color,box-shadow] duration-150 hover:border-white/30 hover:bg-white/[0.08]",
          "checked:glow-purple checked:border-transparent checked:bg-accent-cta checked:hover:bg-[var(--app-accent-cta-hover)]",
          "disabled:cursor-not-allowed disabled:opacity-45",
          dims[size],
        )}
        {...props}
      />
      <svg
        aria-hidden
        viewBox="0 0 16 16"
        fill="none"
        className="pointer-events-none absolute inset-0 m-auto size-[75%] scale-75 text-white opacity-0 transition-[opacity,transform] duration-150 ease-out peer-checked:scale-100 peer-checked:opacity-100"
      >
        <path d="M3.5 8.5l3 3 6-7" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" />
      </svg>
    </span>
  );
}
