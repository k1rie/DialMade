"use client";

import type { DesignDoc } from "@dialmade/doc";
import type { Theme } from "@dialmade/palette";
import { useDictionary } from "@/i18n";
import { composer } from "@/i18n/composer";
import { cn } from "@/lib/cn";
import { ButtonColor } from "./ButtonColor";
import { PaletteGrid } from "./PaletteGrid";
import { VariantGrid } from "./VariantGrid";

export type ThemePanelProps = {
  doc: DesignDoc;
  theme: Theme;
  className?: string;
};

/** Right column (Buffer): variants of the style, the palette style and the button color. */
export function ThemePanel({ doc, theme, className }: ThemePanelProps) {
  const t = useDictionary(composer);
  return (
    <aside
      aria-label={t.panel.label}
      className={cn("flex min-h-0 flex-col overflow-hidden rounded-panel border border-app bg-app-elevated/90 shadow-surface", className)}
    >
      <div className="flex min-h-0 flex-1 flex-col gap-6 overflow-y-auto overscroll-contain p-4">
        <VariantGrid doc={doc} />
        <PaletteGrid doc={doc} />
        <ButtonColor doc={doc} theme={theme} />
      </div>
    </aside>
  );
}
