"use client";

import { outputKindOptions, type Locale, type OutputKind } from "@dialmade/catalog";
import { EXPORT_FILES, hasAiDesign, toPromptPack, type DesignDoc, type PageElement, type PromptTarget } from "@dialmade/doc";
import { visibleProps } from "@dialmade/sections";
import { useCallback, useState, type RefObject } from "react";
import { toast } from "sonner";
import type { DesignDerived } from "@/hooks/useDesignDoc";
import type { PreviewMode } from "@/hooks/usePaletteFlow";
import type { ExportDictionary } from "@/i18n/export";
import { EXPORT_TOASTER_ID } from "./constants";
import { copyText, downloadFile, readLogo } from "./files";
import { figmaTokensJson } from "./tokens";

export type PackId = "code" | "claudeDesign";
export type BusyAction = PackId | null;

type Options = {
  doc: DesignDoc | null;
  derived: DesignDerived | null;
  mode: PreviewMode;
  logoUrl: string | undefined;
  locale: Locale;
  texts: ExportDictionary;
  dialog: RefObject<HTMLDialogElement | null>;
};

const toastOptions = { toasterId: EXPORT_TOASTER_ID };

/**
 * «Diseño con IA»: the CSS of the document's AI blocks, compiled by Tailwind in the AI render worker (scoped, so the
 * base sections keep the kit's styles). `null` without AI blocks.
 */
async function aiBlocksCss(doc: DesignDoc): Promise<string | null> {
  if (!hasAiDesign(doc)) return null;
  const [{ aiClassTokens, aiExportBlocks }, { compileCssOffThread }] = await Promise.all([import("./aiBlocks"), import("@/lib/ai/render/worker")]);
  const blocks = aiExportBlocks(doc);
  return blocks.length > 0 ? compileCssOffThread(aiClassTokens(blocks), { scoped: true }) : null;
}

/** Heavy packs (react-dom/server, fflate, kit CSS) load on first use. */
export const preloadPacks = () => Promise.all([import("./exportPack"), import("./kitCss")]).catch(() => {});

/** Copy and download actions of the Export dialog, with their toasts. */
export function useExportActions({ doc, derived, mode, logoUrl, locale, texts, dialog }: Options) {
  const [busy, setBusy] = useState<BusyAction>(null);

  const copyPrompt = useCallback(
    async (target: PromptTarget, targetLabel: string) => {
      if (!doc || !derived) return;
      // Built synchronously: the clipboard write must stay within the click's user activation.
      // Same options as the packs (exportPack's `exportOptions`, not imported here to keep that chunk lazy).
      const text = toPromptPack(doc, target, locale, {
        ...derived.inputs,
        visibleProps: (element: PageElement) => visibleProps(element),
      });
      const copied = await copyText(text, dialog.current);
      if (copied) toast.success(texts.toasts.copied(targetLabel), toastOptions);
      else toast.error(texts.toasts.copyFailed, toastOptions);
    },
    [doc, derived, locale, texts, dialog],
  );

  const downloadFigmaTokens = useCallback(
    (tokenMode: "light" | "dark") => {
      if (!doc || !derived) return;
      const filename = tokenMode === "light" ? EXPORT_FILES.figmaLight : EXPORT_FILES.figmaDark;
      downloadFile(figmaTokensJson(doc, derived.inputs, tokenMode), filename, "application/json", dialog.current);
      toast.success(texts.toasts.downloaded(filename), toastOptions);
    },
    [doc, derived, texts, dialog],
  );

  const downloadPack = useCallback(
    async (pack: PackId) => {
      if (!doc || !derived || busy) return;
      setBusy(pack);
      try {
        const [{ buildClaudeDesignPack, buildCodePack }, { kitCss }, logo, aiCss] = await Promise.all([
          import("./exportPack"),
          import("./kitCss"),
          readLogo(logoUrl),
          aiBlocksCss(doc),
        ]);
        const kindLabel = (kind: OutputKind) => outputKindOptions.find((option) => option.id === kind)?.label[locale] ?? kind;
        const input = {
          doc,
          inputs: derived.inputs,
          mode,
          locale,
          kindLabel,
          texts: texts.files,
          css: kitCss,
          ...(logo && { logo }),
          ...(aiCss !== null && { ai: { css: aiCss, texts: texts.aiExport.files } }),
        };
        const built = pack === "code" ? buildCodePack(input) : buildClaudeDesignPack(input);
        downloadFile(built.bytes.slice().buffer, built.filename, built.type, dialog.current);
        toast.success(texts.toasts.downloaded(built.filename), toastOptions);
        if (built.skippedSections > 0) toast.warning(texts.toasts.skippedSections(built.skippedSections), toastOptions);
      } catch (error) {
        console.error("[export]", error);
        toast.error(texts.toasts.failed, toastOptions);
      } finally {
        setBusy(null);
      }
    },
    [doc, derived, busy, logoUrl, locale, mode, texts, dialog],
  );

  return { busy, copyPrompt, downloadFigmaTokens, downloadPack };
}
