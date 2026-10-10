import type { DemoStrings } from "@/i18n";
import { cn } from "@/lib/cn";

export type Device = "desktop" | "mobile";

/** Desktop / Mobile segmented control (Klaviyo 11F), built on native radios. */
export function DeviceToggle({ t, value, onChange }: { t: DemoStrings; value: Device; onChange: (d: Device) => void }) {
  const options: { value: Device; label: string }[] = [
    { value: "desktop", label: t.desktop },
    { value: "mobile", label: t.mobile },
  ];
  return (
    <fieldset className="flex items-center rounded-chip border border-app p-0.5">
      <legend className="sr-only">{t.device}</legend>
      {options.map((o) => (
        <label
          key={o.value}
          className={cn(
            "relative cursor-pointer rounded-[6px] px-2 py-1 text-caption transition-colors duration-150",
            "has-[:focus-visible]:outline-2 has-[:focus-visible]:outline-offset-1 has-[:focus-visible]:outline-[var(--app-accent)]",
            value === o.value ? "bg-white/10 text-fg" : "text-muted hover:text-fg",
          )}
        >
          <input
            type="radio"
            name="demo-device"
            value={o.value}
            checked={value === o.value}
            onChange={() => onChange(o.value)}
            className="sr-only"
          />
          {o.label}
        </label>
      ))}
    </fieldset>
  );
}
