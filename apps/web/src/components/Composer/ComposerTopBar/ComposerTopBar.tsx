"use client";

import type { OutputKind } from "@dialmade/catalog";
import type { DesignDoc } from "@dialmade/doc";
import { Button } from "@/components/ui/Button";
import { IconButton } from "@/components/ui/IconButton";
import { Kbd } from "@/components/ui/Kbd";
import type { AiCopyResult, UseAiCopy } from "@/hooks/useAiCopy";
import { useDesignHistory } from "@/hooks/useDesignDoc";
import { useDictionary } from "@/i18n";
import { composer } from "@/i18n/composer";
import { cn } from "@/lib/cn";
import { ArrowLeftIcon, ExportIcon, PaletteIcon, RedoIcon, UndoIcon } from "../icons";
import { usePlatformKeys } from "@/hooks/usePlatformKeys";
import { AiCopyMenu } from "./AiCopyMenu";

export type ComposerTopBarProps = {
  doc: DesignDoc;
  kind: OutputKind;
  pageLabel: string;
  logoUrl: string | undefined;
  ai: UseAiCopy;
  aiMenuOpen: boolean;
  onAiMenuOpenChange: (open: boolean) => void;
  onGenerateCopy: (instructions: string) => void;
  onManualCopy: (result: AiCopyResult) => void;
  onBack: () => void;
  onEditBrand: () => void;
  onExport: () => void;
  className?: string;
};

/** Composer actions: back to «Crear», the brand (→ Palette Lab), undo/redo, AI copy and «Exportar». */
export function ComposerTopBar({
  doc,
  kind,
  pageLabel,
  logoUrl,
  ai,
  aiMenuOpen,
  onAiMenuOpenChange,
  onGenerateCopy,
  onManualCopy,
  onBack,
  onEditBrand,
  onExport,
  className,
}: ComposerTopBarProps) {
  const t = useDictionary(composer);
  const history = useDesignHistory();
  const keys = usePlatformKeys();

  return (
    <div className={cn("flex flex-wrap items-center gap-2", className)}>
      <Button size="sm" variant="ghost" leadingIcon={<ArrowLeftIcon />} onClick={onBack} aria-label={t.topBar.backLabel}>
        {t.topBar.back}
      </Button>
      <button
        type="button"
        onClick={onEditBrand}
        title={t.topBar.editBrand}
        className="group flex h-8 min-w-0 items-center gap-2 rounded-control border border-app bg-white/[0.03] ps-1 pe-2.5 transition-colors hover:border-app-strong"
      >
        <span
          aria-hidden
          className="grid size-6 shrink-0 place-items-center overflow-hidden rounded-[7px] border border-app"
          style={{ background: logoUrl ? "oklch(1 0 0 / 0.92)" : doc.brand.seeds.primary }}
        >
          {logoUrl && (
            // eslint-disable-next-line @next/next/no-img-element -- runtime blob URL of the cropped logo
            <img src={logoUrl} alt="" className="size-5 object-contain" />
          )}
        </span>
        <span className="max-w-40 truncate text-small font-medium text-fg">{doc.brand.name}</span>
        <span className="flex items-center gap-1 text-caption text-muted group-hover:text-fg max-sm:sr-only">
          <PaletteIcon className="size-3.5" />
          {t.topBar.editBrand}
        </span>
      </button>
      <div className="ms-auto flex items-center gap-1.5">
        <IconButton
          size="sm"
          label={t.topBar.undo}
          tooltip={
            <span className="flex items-center gap-1.5">
              {t.topBar.undo} <Kbd>{keys.combo(keys.mod, "Z")}</Kbd>
            </span>
          }
          tooltipSide="bottom"
          icon={<UndoIcon />}
          disabled={!history.canUndo}
          onClick={history.undo}
        />
        <IconButton
          size="sm"
          label={t.topBar.redo}
          tooltip={
            <span className="flex items-center gap-1.5">
              {t.topBar.redo} <Kbd>{keys.combo(keys.shift, keys.mod, "Z")}</Kbd>
            </span>
          }
          tooltipSide="bottom"
          icon={<RedoIcon />}
          disabled={!history.canRedo}
          onClick={history.redo}
        />
        <span aria-hidden className="mx-1 h-5 w-px bg-white/10" />
        <AiCopyMenu
          open={aiMenuOpen}
          onOpenChange={onAiMenuOpenChange}
          doc={doc}
          kind={kind}
          pageLabel={pageLabel}
          ai={ai}
          onGenerate={onGenerateCopy}
          onManualResult={onManualCopy}
        />
        <Button size="sm" variant="primary" leadingIcon={<ExportIcon />} onClick={onExport}>
          {t.topBar.export}
        </Button>
      </div>
    </div>
  );
}
