"use client";

import { Button } from "@/components/ui/Button";
import { StatusBar } from "@/components/ui/StatusBar";
import { useDictionary } from "@/i18n";
import { importText } from "@/i18n/import";
import { cn } from "@/lib/cn";
import { ArrowRightIcon } from "../icons";
import type { ReviewExit } from "../model";

export type ReviewBarProps = {
  colors: number;
  fonts: number;
  /** Imported pairs that fail AA. */
  aaWarnings: number;
  exit: ReviewExit;
  /** References only and no brand yet: the next step is «Subir logo». */
  toLogo: boolean;
  busy?: boolean;
  onCommit: () => void;
  id?: string;
  className?: string;
};

/** «Colores 8 ✓ · Tipos 2 ✓ · AA 3 avisos · Siguiente: Crear» and the one main button, which depends on what was imported. */
export function ReviewBar({ colors, fonts, aaWarnings, exit, toLogo, busy = false, onCommit, id, className }: ReviewBarProps) {
  const t = useDictionary(importText).review;
  const next = exit === "create" ? t.bar.next.create : exit === "palette" ? t.bar.next.palette : toLogo ? t.bar.next.logo : t.bar.next.lab;
  const label = exit === "create" ? t.exit.create : exit === "palette" ? t.exit.palette : toLogo ? t.exit.referencesLogo : t.exit.references;

  return (
    <div id={id} className={cn("flex flex-col gap-2 lg:flex-row lg:items-stretch", className)}>
      <StatusBar
        aria-label={t.bar.label}
        className="min-w-0 flex-1"
        items={[
          { id: "colors", label: t.bar.colors(colors), done: colors > 0 },
          { id: "type", label: t.bar.type(fonts), done: fonts > 0 },
          { id: "aa", label: t.bar.aa(aaWarnings), done: aaWarnings === 0 },
        ]}
        next={{ label: next }}
      />
      <Button
        variant="primary"
        size="lg"
        className="w-full shrink-0 lg:w-auto"
        loading={busy}
        trailingIcon={exit === "create" ? undefined : <ArrowRightIcon />}
        onClick={onCommit}
      >
        {label}
      </Button>
    </div>
  );
}
