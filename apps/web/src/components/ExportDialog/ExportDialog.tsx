"use client";

// «4 Exportar» (DESIGN-BRIEF §6.4, ref. 4B Mistral AI): a modal with the direction's preview card
// tinted with the brand, the public link (disabled until accounts exist) and destination cards ordered
// by the page focus. Files come from @dialmade/doc (theme, DTCG, Figma numbers, DESIGN.md, prompt packs),
// @dialmade/palette (Figma color variables) and @dialmade/sections (renderStaticPage). Native <dialog>:
// focus stays inside, Esc and the backdrop close it, and focus returns to the opener.
import { outputKindOptions, type OutputKind } from "@dialmade/catalog";
import type { PageKey } from "@dialmade/doc";
import { motion, type Variants } from "motion/react";
import { useEffect, useId, useLayoutEffect, useRef, useState, type MouseEvent, type ReactNode } from "react";
import { Toaster } from "sonner";
import { Button } from "@/components/ui/Button";
import { IconButton } from "@/components/ui/IconButton";
import { useActiveKey, useDesignDerived, useDesignDoc } from "@/hooks/useDesignDoc";
import { useDictionary, useI18n } from "@/i18n";
import { exportDialog } from "@/i18n/export";
import { smooth, tween } from "@/lib/motion";
import { AiBlocksCard, hasAiBlocks } from "./AiBlocksCard";
import { AI_TARGETS, DESTINATION_ORDER, EXPORT_TOASTER_ID, TOASTER_STYLE, type AiTargetId, type DestinationId } from "./constants";
import { DestinationCard } from "./DestinationCard";
import { slugify } from "./files";
import { CloseIcon, CodeGlyph, CopyIcon, DownloadIcon, FolderUpGlyph, FrameGlyph, PromptGlyph, VariablesGlyph } from "./icons";
import { PreviewCard } from "./PreviewCard";
import { previewTarget } from "./previewTarget";
import { PromptTargetPicker } from "./PromptTargetPicker";
import { ShareLink } from "./ShareLink";
import { preloadPacks, useExportActions } from "./useExportActions";

export type ExportDialogProps = {
  open: boolean;
  /** Esc, backdrop click and the close button call it with `false`. */
  onOpenChange: (open: boolean) => void;
  /**
   * Page shown on the preview card: a screen id or a kind. Default: the Composer's active page, else the first
   * screen, else `doc.brief.focus`.
   */
  page?: PageKey;
  /**
   * Shown at the top, inside the modal (e.g. the flow's «cambios en Layout sin generar» notice, so what is exported
   * is never silently an older generation). When it goes away with focus inside it, focus stays in the dialog.
   */
  notice?: ReactNode;
};

const listVariants: Variants = {
  initial: {},
  animate: { transition: { staggerChildren: 0.04, delayChildren: 0.06 } },
};

/** A click on the ::backdrop targets the dialog itself, outside its box (not on its scrollbar). */
function isBackdropClick(event: MouseEvent<HTMLDialogElement>): boolean {
  if (event.target !== event.currentTarget) return false;
  const box = event.currentTarget.getBoundingClientRect();
  const { clientX: x, clientY: y } = event;
  return x < box.left || x > box.right || y < box.top || y > box.bottom;
}

export function ExportDialog({ open, onOpenChange, page, notice }: ExportDialogProps) {
  const { locale } = useI18n();
  const t = useDictionary(exportDialog);
  const titleId = useId();
  const descriptionId = useId();
  const destinationsId = useId();
  const ref = useRef<HTMLDialogElement>(null);
  const doc = useDesignDoc((state) => state.doc);
  const logoUrl = useDesignDoc((state) => state.logoUrl);
  const mode = useDesignDoc((state) => state.previewMode);
  // The Composer's tab: a screen id or "brand" in a document with screens, else a kind.
  const activePage = useActiveKey();
  const derived = useDesignDerived(null);
  const [aiTarget, setAiTarget] = useState<AiTargetId>("claude");
  const { busy, copyPrompt, downloadFigmaTokens, downloadPack } = useExportActions({
    doc,
    derived,
    mode,
    logoUrl,
    locale,
    texts: t,
    dialog: ref,
  });

  // The notice's own button goes with it (e.g. its «Generar» worked): focus would fall to <body>, outside the modal.
  const hasNotice = notice !== undefined && notice !== null && notice !== false;
  const hadNotice = useRef(hasNotice);
  useLayoutEffect(() => {
    const had = hadNotice.current;
    hadNotice.current = hasNotice;
    const dialog = ref.current;
    if (!had || hasNotice || !dialog?.open) return;
    const active = document.activeElement;
    if (active && active !== document.body && dialog.contains(active)) return;
    dialog.querySelector<HTMLElement>("button:not([disabled]), [href], input:not([disabled]), [tabindex]:not([tabindex='-1'])")?.focus();
  }, [hasNotice]);

  useEffect(() => {
    const dialog = ref.current;
    if (!dialog) return;
    if (open && !dialog.open) dialog.showModal();
    if (!open && dialog.open) dialog.close();
  }, [open]);

  useEffect(() => {
    if (open) void preloadPacks();
  }, [open]);

  const focus: OutputKind = doc?.brief.focus ?? "brand";
  const kindLabel = (id: OutputKind) => outputKindOptions.find((option) => option.id === id)?.label[locale] ?? id;
  const preview = doc ? previewTarget(doc, [page, activePage], kindLabel) : null;
  const d = t.destinations;

  const destination = (id: DestinationId, recommended: boolean) => {
    const common = { recommended, recommendedLabel: d.recommended };
    switch (id) {
      case "code":
        return (
          <DestinationCard key={id} {...common} icon={<CodeGlyph />} name={d.code.name} description={d.code.description}>
            <Button
              size="sm"
              variant={recommended ? "primary" : "secondary"}
              leadingIcon={<DownloadIcon />}
              loading={busy === "code"}
              disabled={busy !== null && busy !== "code"}
              onClick={() => void downloadPack("code")}
            >
              {d.code.download}
            </Button>
          </DestinationCard>
        );
      case "figma":
        return (
          <DestinationCard key={id} {...common} icon={<VariablesGlyph />} name={d.figma.name} description={d.figma.description}>
            <Button
              size="sm"
              variant={recommended ? "primary" : "secondary"}
              leadingIcon={<DownloadIcon />}
              onClick={() => downloadFigmaTokens("light")}
            >
              {d.figma.light}
            </Button>
            <Button
              size="sm"
              leadingIcon={<DownloadIcon />}
              onClick={() => downloadFigmaTokens("dark")}
            >
              {d.figma.dark}
            </Button>
            <Button size="sm" variant="ghost" leadingIcon={<CopyIcon />} onClick={() => void copyPrompt("figma", d.figma.name)}>
              {d.figma.prompt}
            </Button>
          </DestinationCard>
        );
      case "claudeDesign":
        return (
          <DestinationCard
            key={id}
            {...common}
            icon={<FolderUpGlyph />}
            name={d.claudeDesign.name}
            description={d.claudeDesign.description}
          >
            <Button
              size="sm"
              variant={recommended ? "primary" : "secondary"}
              leadingIcon={<DownloadIcon />}
              loading={busy === "claudeDesign"}
              disabled={busy !== null && busy !== "claudeDesign"}
              onClick={() => void downloadPack("claudeDesign")}
            >
              {d.claudeDesign.download}
            </Button>
            <Button
              size="sm"
              variant="ghost"
              leadingIcon={<CopyIcon />}
              onClick={() => void copyPrompt("claude-design", d.claudeDesign.name)}
            >
              {d.claudeDesign.prompt}
            </Button>
          </DestinationCard>
        );
      case "framer":
        return (
          <DestinationCard key={id} {...common} icon={<FrameGlyph />} name={d.framer.name} description={d.framer.description}>
            <Button
              size="sm"
              variant={recommended ? "primary" : "secondary"}
              leadingIcon={<CopyIcon />}
              onClick={() => void copyPrompt("framer", d.framer.name)}
            >
              {d.framer.prompt}
            </Button>
          </DestinationCard>
        );
      case "ai": {
        const target = AI_TARGETS.find((entry) => entry.id === aiTarget) ?? AI_TARGETS[0];
        return (
          <DestinationCard
            key={id}
            {...common}
            icon={<PromptGlyph />}
            name={d.ai.name}
            description={d.ai.description}
            extra={<PromptTargetPicker value={aiTarget} onChange={setAiTarget} label={d.ai.targetLabel} />}
          >
            <Button
              size="sm"
              variant={recommended ? "primary" : "secondary"}
              leadingIcon={<CopyIcon />}
              onClick={() => void copyPrompt(target.id, target.label)}
            >
              {d.ai.prompt}
            </Button>
          </DestinationCard>
        );
      }
    }
  };

  return (
    <dialog
      ref={ref}
      aria-labelledby={titleId}
      aria-describedby={descriptionId}
      onClose={() => onOpenChange(false)}
      onClick={(event) => {
        if (isBackdropClick(event)) onOpenChange(false);
      }}
      className="m-auto max-h-[calc(100dvh-2rem)] w-[min(100vw-2rem,46rem)] overflow-y-auto overscroll-contain rounded-panel border border-app-strong bg-app-elevated p-0 text-fg shadow-lift scrollbar-none backdrop:bg-black/60 backdrop:backdrop-blur-sm"
    >
      {open && doc && derived && (
        <motion.div
          initial={{ opacity: 0, y: 12, scale: 0.985 }}
          animate={{ opacity: 1, y: 0, scale: 1 }}
          transition={{ ...smooth, opacity: tween(0.2) }}
          className="flex flex-col gap-5 p-5 sm:p-6"
        >
          <header className="flex items-start justify-between gap-4">
            <div className="min-w-0">
              <h2 id={titleId} className="m-0 text-h3">
                {t.title}
              </h2>
              <p id={descriptionId} className="m-0 mt-1 text-small text-muted">
                {t.description}
              </p>
            </div>
            <IconButton label={t.close} icon={<CloseIcon />} tooltip={false} className="-mt-1 -mr-1" onClick={() => onOpenChange(false)} />
          </header>

          {hasNotice && notice}

          {preview && (
            <PreviewCard
              doc={doc}
              kind={preview.kind}
              mode={mode}
              logoUrl={logoUrl}
              kindLabel={preview.label}
              label={t.preview.label(doc.brand.name, preview.label)}
              pageKey={preview.key}
              {...(preview.screen && { screen: preview.screen })}
            />
          )}

          <ShareLink slug={slugify(doc.brand.name)} texts={t.share} />

          <section aria-labelledby={destinationsId} className="flex flex-col gap-3">
            <h3 id={destinationsId} className="m-0 text-caption font-medium text-muted">
              {d.title}
            </h3>
            <motion.ul
              variants={listVariants}
              initial="initial"
              animate="animate"
              className="m-0 grid list-none gap-3 p-0 sm:grid-cols-2"
            >
              {DESTINATION_ORDER[focus].map((id, index) => destination(id, index === 0))}
              {hasAiBlocks(doc) && <AiBlocksCard doc={doc} texts={t.aiExport} recommendedLabel={d.recommended} dialog={ref} />}
            </motion.ul>
          </section>
        </motion.div>
      )}
      <Toaster
        id={EXPORT_TOASTER_ID}
        theme="dark"
        position="bottom-center"
        gap={10}
        offset={24}
        style={TOASTER_STYLE}
        toastOptions={{
          className: "!shadow-surface !text-small",
          classNames: { description: "!text-muted" },
        }}
      />
    </dialog>
  );
}
