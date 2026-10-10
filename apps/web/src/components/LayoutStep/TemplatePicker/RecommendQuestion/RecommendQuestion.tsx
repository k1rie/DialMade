"use client";

import { firstUseQuestion, type FirstUseAnswer } from "@dialmade/catalog";
import { AnimatePresence, motion } from "motion/react";
import { useId, useState } from "react";
import { Button } from "@/components/ui/Button";
import { Chip } from "@/components/ui/Chip";
import { useDictionary, useI18n } from "@/i18n";
import { layout } from "@/i18n/layout";
import { popVariants } from "@/lib/motion";
import { SparkleIcon } from "../../icons";

export type RecommendQuestionProps = {
  answer: FirstUseAnswer | null;
  onAnswer: (answer: FirstUseAnswer) => void;
  /** What the answer recommends, as a sentence («Te recomendamos Landing.»); `null` before answering. */
  result: string | null;
};

/** «¿No sabes cuál?»: one deterministic question (`firstUseQuestion`), never AI. The parent turns the answer into a set. */
export function RecommendQuestion({ answer, onAnswer, result }: RecommendQuestionProps) {
  const t = useDictionary(layout);
  const { locale } = useI18n();
  const [open, setOpen] = useState(answer !== null);
  const panelId = useId();
  const promptId = useId();

  return (
    <div className="flex flex-col items-center gap-2">
      <Button
        variant="ghost"
        size="sm"
        leadingIcon={<SparkleIcon />}
        aria-expanded={open}
        aria-controls={open ? panelId : undefined}
        onClick={() => setOpen((value) => !value)}
      >
        {t.templatePicker.notSure}
      </Button>
      <AnimatePresence initial={false}>
        {open && (
          <motion.div
            id={panelId}
            variants={popVariants}
            initial="initial"
            animate="animate"
            exit="exit"
            className="flex w-full max-w-3xl flex-col items-center gap-3 rounded-card border border-app bg-app-elevated/70 p-3 text-center shadow-surface sm:p-4"
          >
            <p id={promptId} className="text-body font-medium text-fg">
              {firstUseQuestion.prompt[locale]}
            </p>
            <div role="group" aria-labelledby={promptId} className="flex flex-wrap justify-center gap-2">
              {firstUseQuestion.options.map((option) => (
                <Chip key={option.answer} selected={answer === option.answer} onSelectedChange={() => onAnswer(option.answer)}>
                  {option.label[locale]}
                </Chip>
              ))}
            </div>
            {result && (
              <motion.p key={result} initial={{ opacity: 0 }} animate={{ opacity: 1 }} className="text-small text-muted">
                {result}
              </motion.p>
            )}
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
}
