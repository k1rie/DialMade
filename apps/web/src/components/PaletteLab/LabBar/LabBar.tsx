"use client";

import type { Theme } from "@dialmade/palette";
import { Button } from "@/components/ui/Button";
import { StatusBar } from "@/components/ui/StatusBar";
import { useDictionary } from "@/i18n";
import { palette } from "@/i18n/palette";
import { cn } from "@/lib/cn";
import { ArrowRightIcon, UploadIcon } from "../icons";
import { ExportBar } from "./ExportBar";

export type LabBarProps = {
  theme: Theme;
  hasLogo: boolean;
  /** Label of the selected preview tab («Landing page»…), for «Crear {pestaña} →». */
  kindLabel: string;
  /** Stem of exported file names. */
  fileBase: string;
  /** → «2 Crear» with the selected tab preselected. */
  onCreate: () => void;
  onChangeLogo: () => void;
  uploading?: boolean;
  className?: string;
};

/** Bottom bar: «Marca ✓ · Paleta ✓ · AA ✓ · Siguiente: elegir qué crear», logo change, compact export and the main CTA. */
export function LabBar({ theme, hasLogo, kindLabel, fileBase, onCreate, onChangeLogo, uploading, className }: LabBarProps) {
  const t = useDictionary(palette).bar;
  // A pair of the imported guide that fails is the guide's call (the contrast table offers «Ajustar a AA»), not the engine's.
  const aa = theme.contrast.every((check) => check.pass || check.source === "imported");

  return (
    <div className={cn("flex flex-col gap-2 lg:flex-row lg:items-stretch", className)}>
      <StatusBar
        aria-label={t.label}
        className="min-w-0 flex-1 flex-wrap max-md:[&>nav]:basis-full"
        items={[
          { id: "brand", label: t.brand, done: true },
          { id: "palette", label: t.palette, done: true },
          { id: "aa", label: t.aa, done: aa },
        ]}
        next={{ label: t.next, onClick: onCreate }}
        actions={
          <>
            <Button variant="ghost" size="sm" leadingIcon={<UploadIcon />} loading={uploading} onClick={onChangeLogo}>
              {hasLogo ? t.changeLogo : t.uploadLogo}
            </Button>
            <span aria-hidden className="h-5 w-px bg-white/10" />
            <ExportBar theme={theme} fileBase={fileBase} />
          </>
        }
      />
      <Button variant="primary" size="lg" className="w-full shrink-0 lg:w-auto" trailingIcon={<ArrowRightIcon />} onClick={onCreate}>
        {t.create(kindLabel)}
      </Button>
    </div>
  );
}
