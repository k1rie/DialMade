"use client";

import type { Mode } from "@dialmade/import";
import type { ReactNode } from "react";
import { useDictionary } from "@/i18n";
import { importText } from "@/i18n/import";
import { cn } from "@/lib/cn";
import { MoonIcon, SunIcon } from "../icons";

export type ModeSummaryProps = {
  /** Included role colors per mode. */
  colors: Record<Mode, number>;
  /** Screenshot modes (own and references). */
  shots: { light: number; dark: number };
};

function Pill({ icon, children, muted = false }: { icon: ReactNode; children: ReactNode; muted?: boolean }) {
  return (
    <li
      className={cn(
        "inline-flex h-7 items-center gap-1.5 rounded-chip border px-2.5 text-small",
        muted ? "border-dashed border-app-strong text-muted" : "border-app bg-white/[0.03] text-fg",
      )}
    >
      {icon}
      {children}
    </li>
  );
}

/** «Modo»: which modes the guide brings and which one the engine generates (marked «revísalo»). */
export function ModeSummary({ colors, shots }: ModeSummaryProps) {
  const t = useDictionary(importText).review.mode;
  const none = colors.light === 0 && colors.dark === 0;

  return (
    <div className="flex flex-col gap-2">
      <ul className="flex flex-wrap gap-1.5">
        {none ? (
          <Pill icon={<SunIcon className="size-3.5" />} muted>
            {t.none}
          </Pill>
        ) : (
          (["light", "dark"] as const).map((mode) => {
            const Icon = mode === "light" ? SunIcon : MoonIcon;
            return colors[mode] > 0 ? (
              <Pill key={mode} icon={<Icon className="size-3.5" />}>
                {t[mode](colors[mode])}
              </Pill>
            ) : (
              <Pill key={mode} icon={<Icon className="size-3.5" />} muted>
                {t.generated(t.names[mode] ?? mode)}
              </Pill>
            );
          })
        )}
      </ul>
      {shots.light + shots.dark > 0 && <p className="text-caption text-muted">{t.shots(shots.light, shots.dark)}</p>}
    </div>
  );
}
