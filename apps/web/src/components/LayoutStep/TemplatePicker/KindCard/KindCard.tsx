"use client";

import { outputKindOptions } from "@dialmade/catalog";
import type { DesignDoc } from "@dialmade/doc";
import type { SetTemplateId } from "@dialmade/layout";
import type { ContentContext } from "@dialmade/sections";
import { AnimatePresence, motion } from "motion/react";
import { useId } from "react";
import { useDictionary, useI18n } from "@/i18n";
import { layout } from "@/i18n/layout";
import { popVariants } from "@/lib/motion";
import { SparkleIcon } from "../../icons";
import { CARD_FRAME, CARD_SURFACE } from "../constants";
import { MiniPreview } from "../MiniPreview";
import { SET_KINDS } from "../recommend";

export type KindCardProps = {
  /** Starting set the card applies («Landing», «SaaS app»); its kind picks the mini and «Para ti si…». */
  setId: SetTemplateId;
  /** Doc whose brand paints the mini. */
  doc: DesignDoc;
  /** Content of the mini (brand name, product type, locale). */
  ctx: ContentContext;
  /** Marked «Recomendada» (the Palette Lab tab or the «¿No sabes cuál?» answer). */
  recommended: boolean;
  onChoose: (setId: SetTemplateId) => void;
};

/**
 * A starting set as a large card (the old «¿Qué quieres crear?» card, ref. 7A Higgsfield): the live mini of
 * its kind with the user's theme, the set's name and screens, and «Para ti si…». A button: click, Enter or
 * Space applies the set (one undo step in the layout).
 */
export function KindCard({ setId, doc, ctx, recommended, onChoose }: KindCardProps) {
  const t = useDictionary(layout);
  const { locale } = useI18n();
  const id = useId();
  const kind = SET_KINDS[setId];
  const option = outputKindOptions.find((candidate) => candidate.id === kind);
  const text = t.sets[setId];
  const descriptionId = `${id}-description`;
  const forId = `${id}-for`;

  return (
    <button
      type="button"
      aria-label={t.templatePicker.option(text.name, recommended)}
      aria-describedby={option ? `${descriptionId} ${forId}` : descriptionId}
      onClick={() => onChoose(setId)}
      className={CARD_FRAME}
    >
      <span className={CARD_SURFACE}>
        <span className="relative block w-full">
          <MiniPreview kind={kind} doc={doc} ctx={ctx} className="rounded-card shadow-[0_0_0_1px_oklch(1_0_0/0.06)]" />
          <AnimatePresence initial={false}>
            {recommended && (
              <motion.span
                key="recommended"
                variants={popVariants}
                initial="initial"
                animate="animate"
                exit="exit"
                className="absolute top-2 left-2 inline-flex h-6 items-center gap-1 rounded-chip bg-accent-cta px-2 text-caption font-medium text-white shadow-glow-purple [&_svg]:size-3.5"
              >
                <SparkleIcon />
                {t.templatePicker.recommended}
              </motion.span>
            )}
          </AnimatePresence>
        </span>
        <span className="flex flex-col gap-1.5 px-1.5">
          <span className="text-h3 text-fg">{text.name}</span>
          <span id={descriptionId} className="text-small text-pretty text-fg/85">
            {text.description}
          </span>
          {option && (
            <span id={forId} className="text-small text-pretty text-muted">
              {t.templatePicker.forYouIf} {option.forYouIf[locale]}
            </span>
          )}
        </span>
      </span>
    </button>
  );
}
