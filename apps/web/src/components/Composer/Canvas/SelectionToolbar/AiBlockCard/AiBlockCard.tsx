"use client";

import type { DesignDoc } from "@dialmade/doc";
import { AnimatePresence, motion } from "motion/react";
import { Button } from "@/components/ui/Button";
import { Chip } from "@/components/ui/Chip";
import type { UseAiBlockActions } from "@/hooks/useAiBlockEdit";
import { useDictionary, useI18n } from "@/i18n";
import { composer } from "@/i18n/composer";
import { aiBlockOf, isAiBlockStale, isAiBlockStyleChanged } from "@/lib/ai/render/edit";
import { useLiveSession } from "@/lib/ai/render/liveSession";
import { setAiTarget, useAiView } from "@/lib/ai/render/view";
import { durations, tween } from "@/lib/motion";
import { SparklesIcon } from "../../../icons";
import { AskChange } from "./AskChange";
import { BlockNotes } from "./BlockNotes";
import { QUICK_CHIPS, recipeLabel, sessionLine } from "./cardModel";

export type AiBlockCardProps = {
  doc: DesignDoc;
  screenId: string;
  blockId: string;
  /** The block's name (its layout label). */
  label: string;
  /** Shared with the toolbar (one action at a time, its progress, «Usar diseño base»). */
  blockActions: UseAiBlockActions;
  /** «Usar diseño base» closes the card: the knobs come back. */
  onUseBase?: () => void;
};

/**
 * The «Bloque de IA» card (spec §8.2): it replaces the section knobs when the block paints with its AI design. Quick
 * chips and «Pedir cambio…» (≤ 500, about the text selected in the island, if any) and «Otra versión» each spend 1
 * action of the design session and land as ONE undo step; «Usar diseño base» keeps the HTML for «Usar IA otra vez».
 * It also says when the block is «Desactualizado» or its style changed (never redone on its own), the quality notes
 * of the gates and where it came from. Everything works with the keyboard; the progress is announced.
 */
export function AiBlockCard({ doc, screenId, blockId, label, blockActions, onUseBase }: AiBlockCardProps) {
  const { locale } = useI18n();
  const t = useDictionary(composer).aiBlock;
  const session = useLiveSession();
  const target = useAiView((state) => (state.target?.screenId === screenId && state.target.blockId === blockId ? state.target : null));
  const block = aiBlockOf(doc, screenId, blockId);
  if (!block) return null;

  const { running, opening, run, openSession, stop, setActive } = blockActions;
  const busy = running?.screenId === screenId && running.blockId === blockId ? running : null;
  const line = sessionLine(session);
  const blocked = running !== null || opening || line.state !== "ok";
  const stale = isAiBlockStale(doc, screenId, blockId);
  const styleChanged = isAiBlockStyleChanged(doc, screenId, blockId);
  const targetText = target?.text?.trim() || null;

  const reroll = () => void run(screenId, blockId, label, { kind: "reroll" });
  const change = (request: string) => run(screenId, blockId, label, { kind: "change", request, ...(targetText && { target: { text: targetText } }) });

  return (
    <div className="flex flex-col gap-3" aria-busy={busy ? true : undefined}>
      <header className="flex flex-col gap-1">
        <p className="flex items-center gap-1.5 text-small font-semibold text-fg">
          <SparklesIcon aria-hidden className="size-3.5 text-accent" />
          {t.open} · <span className="truncate">{label}</span>
        </p>
        <p className="text-caption text-muted">{t.subtitle}</p>
      </header>

      {(stale || styleChanged) && (
        <div className="flex flex-col gap-1.5 rounded-control border border-app bg-white/[0.03] px-2.5 py-2 text-caption">
          {styleChanged && (
            <p>
              <strong className="font-semibold text-fg">{t.styleChanged}.</strong>{" "}
              <span className="text-muted">{t.styleChangedHint(recipeLabel(block.provenance.recipeId ?? "", locale))}</span>
            </p>
          )}
          {stale && (
            <p>
              <strong className="font-semibold text-fg">{t.stale}.</strong> <span className="text-muted">{t.staleHint}</span>
            </p>
          )}
          <Button size="sm" variant="secondary" className="self-start" disabled={blocked} onClick={reroll}>
            {t.redo}
          </Button>
        </div>
      )}

      {line.state !== "ok" && (
        <div className="flex flex-col gap-1.5 rounded-control border border-app bg-white/[0.02] px-2.5 py-2 text-caption">
          <p className="text-fg">{line.state === "none" ? t.cost.none : t.cost.exhausted}</p>
          <p className="text-muted">{t.cost.openHint}</p>
          <Button size="sm" variant="secondary" className="self-start" loading={opening} disabled={running !== null} onClick={() => void openSession()}>
            {t.cost.open}
          </Button>
        </div>
      )}

      <section aria-label={t.quick} className="flex flex-col gap-1.5">
        <p className="text-caption font-medium text-muted">{t.quick}</p>
        <div className="flex flex-wrap gap-1">
          {QUICK_CHIPS.map((chip) => (
            <Chip key={chip} size="sm" disabled={blocked} onClick={() => void change(t.chips[chip].request)}>
              {t.chips[chip].label}
            </Chip>
          ))}
        </div>
      </section>

      <AskChange target={targetText} onClearTarget={() => setAiTarget(null)} disabled={blocked} busy={busy?.kind === "change"} onSubmit={change} />

      <div className="flex flex-wrap items-center justify-between gap-x-2 gap-y-1">
        <Button size="sm" variant="secondary" leadingIcon={<SparklesIcon />} disabled={blocked} loading={busy?.kind === "reroll"} onClick={reroll} title={t.rerollHint}>
          {t.reroll}
        </Button>
        {line.state === "ok" && (
          <span className="text-caption whitespace-nowrap text-subtle">
            {t.cost.action} · {t.cost.left(line.left, line.max)}
          </span>
        )}
      </div>

      <p role="status" aria-live="polite" className="sr-only">
        {busy ? (busy.kind === "reroll" ? t.busy.reroll(label) : t.busy.change(label)) : opening ? t.busy.opening : ""}
      </p>
      <AnimatePresence initial={false}>
        {busy && (
          <motion.div
            key="busy"
            initial={{ opacity: 0, y: -4 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0 }}
            transition={tween(durations.feedback)}
            className="flex items-center justify-between gap-2 rounded-control border border-app bg-accent-soft px-2.5 py-1.5 text-caption text-fg"
          >
            <span aria-hidden>{busy.kind === "reroll" ? t.busy.reroll(label) : t.busy.change(label)}</span>
            <Button size="sm" variant="ghost" className="h-6 px-2" onClick={stop}>
              {t.stopWaiting}
            </Button>
          </motion.div>
        )}
      </AnimatePresence>

      <div className="flex flex-col gap-0.5 border-t border-app pt-2.5">
        <Button
          size="sm"
          variant="ghost"
          className="self-start px-2"
          disabled={running !== null}
          onClick={() => {
            setActive(screenId, blockId, label, false);
            onUseBase?.();
          }}
        >
          {t.useBase}
        </Button>
        <p className="px-2 text-caption text-subtle">{t.useBaseHint}</p>
      </div>

      <BlockNotes block={block} />
    </div>
  );
}
