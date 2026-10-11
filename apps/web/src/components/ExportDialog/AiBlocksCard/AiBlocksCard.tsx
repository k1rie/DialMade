"use client";

// «Bloques de IA» in Exportar (spec §9, track D): pick one AI block of the document and copy its HTML (sanitized again,
// icons and placeholders inline, links to the screens' routes) or its TSX component (`blockToTsx`), plus the two files
// they need in a Tailwind v4 project: `ai-theme.css` (the vocabulary) and the `Icon`/`Placeholder` module. Native
// select and buttons: all by keyboard. The text is built synchronously in the click, so the clipboard write keeps the
// click's user activation.
import type { DesignDoc } from "@dialmade/doc";
import { useEffect, useId, useMemo, useState, type RefObject } from "react";
import { toast } from "sonner";
import { Button } from "@/components/ui/Button";
import type { ExportDictionary } from "@/i18n/export";
import { EXPORT_TOASTER_ID } from "../constants";
import { DestinationCard } from "../DestinationCard";
import { copyText } from "../files";
import { CodeGlyph, CopyIcon } from "../icons";
import { loadAiCopy, type AiCopy } from "./loadAiCopy";

export type AiBlocksCardProps = {
  doc: DesignDoc;
  texts: ExportDictionary["aiExport"];
  recommendedLabel: string;
  /** The open modal dialog: the clipboard fallback attaches its textarea there. */
  dialog: RefObject<HTMLDialogElement | null>;
};

const toastOptions = { toasterId: EXPORT_TOASTER_ID };

export function AiBlocksCard({ doc, texts, recommendedLabel, dialog }: AiBlocksCardProps) {
  const selectId = useId();
  const [ai, setAi] = useState<AiCopy | null>(null);
  const [selected, setSelected] = useState("");

  useEffect(() => {
    let alive = true;
    void loadAiCopy()
      .then((loaded) => alive && setAi(loaded))
      .catch((error: unknown) => console.error("[export] AI blocks", error));
    return () => {
      alive = false;
    };
  }, []);

  const blocks = useMemo(() => (ai ? ai.aiExportBlocks(doc).filter((block) => block.html) : []), [ai, doc]);
  const routes = useMemo(() => (ai ? ai.screenRoutes(doc) : {}), [ai, doc]);
  const keyOf = (block: (typeof blocks)[number]) => `${block.screenId}/${block.blockId}`;
  const current = blocks.find((block) => keyOf(block) === selected) ?? blocks[0];

  const copy = async (text: string, what: string) => {
    if (!text) return;
    if (await copyText(text, dialog.current)) toast.success(texts.toasts.copied(what), toastOptions);
    else toast.error(texts.toasts.copyFailed, toastOptions);
  };

  const ready = ai !== null && current !== undefined;
  return (
    <DestinationCard
      icon={<CodeGlyph />}
      name={texts.name}
      description={texts.description}
      recommendedLabel={recommendedLabel}
      extra={
        <div className="flex min-w-0 flex-col gap-1.5">
          <label htmlFor={selectId} className="text-caption font-medium text-muted">
            {texts.blockLabel}
          </label>
          <select
            id={selectId}
            value={current ? keyOf(current) : ""}
            disabled={!ready}
            onChange={(event) => setSelected(event.target.value)}
            className="min-w-0 rounded-control border border-app bg-app px-2.5 py-1.5 text-small text-fg focus-visible:outline-2 focus-visible:outline-offset-1 focus-visible:outline-accent disabled:opacity-60"
          >
            {!ai && <option value="">{texts.loading}</option>}
            {blocks.map((block) => (
              <option key={keyOf(block)} value={keyOf(block)}>
                {texts.option(block.screenName, block.label)}
              </option>
            ))}
          </select>
        </div>
      }
    >
      <Button size="sm" variant="secondary" leadingIcon={<CopyIcon />} disabled={!ready} onClick={() => current && ai && void copy(ai.blockHtmlText(current, routes, doc.brief.locale), "HTML")}>
        {texts.copyHtml}
      </Button>
      <Button size="sm" variant="secondary" leadingIcon={<CopyIcon />} disabled={!ready} onClick={() => current && ai && void copy(ai.blockTsxText(current, routes, doc.brief.locale), "TSX")}>
        {texts.copyTsx}
      </Button>
      <Button size="sm" variant="ghost" leadingIcon={<CopyIcon />} disabled={!ai} onClick={() => ai && void copy(ai.exportThemeCss(), "ai-theme.css")}>
        {texts.copyTheme}
      </Button>
      <Button size="sm" variant="ghost" leadingIcon={<CopyIcon />} disabled={!ai} onClick={() => ai && void copy(ai.tsxAssetsModule(), "dialmade-assets.tsx")}>
        {texts.copyAssets}
      </Button>
    </DestinationCard>
  );
}
