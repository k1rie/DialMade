"use client";

import { AnimatePresence, motion } from "motion/react";
import { useEffect, useRef, useState } from "react";
import { Button } from "@/components/ui/Button";
import { useDictionary } from "@/i18n";
import { layout } from "@/i18n/layout";
import { feedback } from "@/lib/motion";
import { CheckIcon, CopyIcon } from "../../../icons";
import { COPIED_MS } from "../constants";

export type CodePanelProps = {
  /** Text shown and copied. */
  code: string;
  /** What it is, for the copy button and the toast: «CSS», «JSON», «Wireframe». */
  what: string;
  /** Accessible name of the scrollable block: «CSS de Dashboard». */
  label: string;
  /** Copies and confirms with a toast; resolves whether it worked. */
  onCopy: (text: string, what: string) => Promise<boolean>;
};

/** A read-only code block (mono, scrollable, keyboard-focusable) with «Copiar». */
export function CodePanel({ code, what, label, onCopy }: CodePanelProps) {
  const t = useDictionary(layout).generate.report;
  const [copied, setCopied] = useState(false);
  const timer = useRef<ReturnType<typeof setTimeout> | undefined>(undefined);

  useEffect(() => () => clearTimeout(timer.current), []);

  const copy = async () => {
    const ok = await onCopy(code, what);
    if (!ok) return;
    clearTimeout(timer.current);
    setCopied(true);
    timer.current = setTimeout(() => setCopied(false), COPIED_MS);
  };

  return (
    <div className="flex min-h-0 flex-col gap-2">
      <div className="flex justify-end">
        <Button
          size="sm"
          variant="ghost"
          aria-label={t.copyLabel(what)}
          onClick={() => void copy()}
          leadingIcon={
            <AnimatePresence mode="popLayout" initial={false}>
              <motion.span
                key={copied ? "check" : "copy"}
                className="inline-flex [&_svg]:size-3.5"
                initial={{ opacity: 0, scale: 0.8 }}
                animate={{ opacity: 1, scale: 1 }}
                exit={{ opacity: 0, scale: 0.8 }}
                transition={feedback}
              >
                {copied ? <CheckIcon className="text-success" /> : <CopyIcon />}
              </motion.span>
            </AnimatePresence>
          }
        >
          {t.copy}
        </Button>
      </div>
      <pre
        tabIndex={0}
        aria-label={label}
        className="m-0 max-h-[min(52vh,30rem)] min-h-24 overflow-auto overscroll-contain rounded-control border border-app bg-app p-3 font-mono text-mono whitespace-pre text-fg"
      >
        {code}
      </pre>
    </div>
  );
}
