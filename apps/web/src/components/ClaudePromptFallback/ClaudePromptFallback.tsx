"use client";

// «Copiar prompt para mi Claude»: the free way out when there are no free uses and no key. The user
// copies the prompt (rules, data and the JSON Schema) into Claude with their own account, attaches
// the listed files, and pastes the JSON back; `job.parse` validates it with the same Zod schema as
// the API paths. Nothing is sent anywhere from here.
import { AnimatePresence, motion } from "motion/react";
import { useEffect, useId, useRef, useState } from "react";
import { Button } from "@/components/ui/Button";
import { useDictionary } from "@/i18n";
import { ai } from "@/i18n/ai";
import { cn } from "@/lib/cn";
import type { ManualJob, ManualParseError } from "@/lib/ai/manual";
import { tween } from "@/lib/motion";

export type ClaudePromptFallbackProps<T> = {
  job: ManualJob<T>;
  /** The validated answer; `dropped` entries did not fit the request. */
  onResult: (value: T, info: { dropped: number }) => void;
  className?: string;
};

const COPIED_MS = 2000;

const CheckIcon = () => (
  <svg viewBox="0 0 16 16" fill="none" stroke="currentColor" strokeWidth={1.75} strokeLinecap="round" strokeLinejoin="round" aria-hidden focusable="false">
    <path d="m3.5 8.5 3 3 6-7" />
  </svg>
);

const CopyIcon = () => (
  <svg viewBox="0 0 16 16" fill="none" stroke="currentColor" strokeWidth={1.5} strokeLinecap="round" strokeLinejoin="round" aria-hidden focusable="false">
    <rect x="5.5" y="5.5" width="8" height="8" rx="2" />
    <path d="M10.5 5.5V4a1.5 1.5 0 0 0-1.5-1.5H4A1.5 1.5 0 0 0 2.5 4v5A1.5 1.5 0 0 0 4 10.5h1.5" />
  </svg>
);

export function ClaudePromptFallback<T>({ job, onResult, className }: ClaudePromptFallbackProps<T>) {
  const t = useDictionary(ai).manual;
  const promptId = useId();
  const answerId = useId();
  const statusId = useId();
  const promptRef = useRef<HTMLTextAreaElement>(null);
  const details = useRef<HTMLDetailsElement>(null);
  const timer = useRef<ReturnType<typeof setTimeout> | null>(null);
  const [copied, setCopied] = useState(false);
  const [copyFailed, setCopyFailed] = useState(false);
  const [answer, setAnswer] = useState("");
  const [problem, setProblem] = useState<{ error: ManualParseError; detail?: string } | null>(null);

  useEffect(
    () => () => {
      if (timer.current) clearTimeout(timer.current);
    },
    [],
  );

  const copy = async () => {
    try {
      await navigator.clipboard.writeText(job.prompt);
      setCopyFailed(false);
      setCopied(true);
      if (timer.current) clearTimeout(timer.current);
      timer.current = setTimeout(() => setCopied(false), COPIED_MS);
    } catch {
      setCopyFailed(true);
      if (details.current) details.current.open = true;
      requestAnimationFrame(() => promptRef.current?.select());
    }
  };

  const submit = () => {
    const parsed = job.parse(answer);
    if (!parsed.ok) {
      setProblem({ error: parsed.error, ...(parsed.detail && { detail: parsed.detail }) });
      return;
    }
    setProblem(null);
    onResult(parsed.value, { dropped: parsed.dropped });
  };

  const steps = [
    t.steps.copy,
    t.steps.paste,
    ...(job.attachments.length > 0 ? [t.steps.attach(job.attachments.join(", "))] : []),
    t.steps.answer,
  ];

  return (
    <div className={cn("flex flex-col gap-4", className)}>
      <p className="m-0 text-small text-muted">{t.intro}</p>

      <ol className="m-0 flex list-none flex-col gap-2 p-0">
        {steps.map((step, i) => (
          <li key={step} className="flex items-start gap-2.5 text-small text-fg">
            <span aria-hidden className="mt-px w-4 shrink-0 font-mono text-caption text-subtle tabular-nums">
              {i + 1}.
            </span>
            <span className="min-w-0">{step}</span>
          </li>
        ))}
      </ol>

      <div className="flex flex-col gap-2">
        <Button
          variant="secondary"
          className="w-fit"
          leadingIcon={copied ? <CheckIcon /> : <CopyIcon />}
          onClick={() => void copy()}
          aria-describedby={statusId}
        >
          {copied ? t.copied : t.copy}
        </Button>
        <p id={statusId} role="status" className={cn("m-0 text-caption", copyFailed ? "text-warning" : "sr-only")}>
          {copyFailed ? t.copyFailed : copied ? t.copied : ""}
        </p>
        <details ref={details} className="group rounded-control border border-app bg-white/[0.02]">
          <summary className="cursor-pointer select-none rounded-control px-3 py-2 text-caption font-medium text-muted hover:text-fg">
            {t.promptLabel}
          </summary>
          <textarea
            id={promptId}
            ref={promptRef}
            readOnly
            aria-label={t.promptLabel}
            value={job.prompt}
            rows={6}
            spellCheck={false}
            className="block w-full resize-y border-t border-app bg-transparent px-3 py-2 font-mono text-[12px] leading-5 text-muted"
          />
        </details>
      </div>

      <div className="flex flex-col gap-1.5">
        <label htmlFor={answerId} className="text-small font-medium text-fg">
          {t.answerLabel}
        </label>
        <textarea
          id={answerId}
          rows={5}
          value={answer}
          spellCheck={false}
          autoComplete="off"
          placeholder={t.answerPlaceholder}
          aria-invalid={problem ? true : undefined}
          aria-describedby={problem ? `${answerId}-error` : undefined}
          onChange={(event) => {
            setAnswer(event.target.value);
            if (problem) setProblem(null);
          }}
          className="resize-y rounded-control border border-app-strong bg-app px-3 py-2 font-mono text-[12px] leading-5 text-fg placeholder:text-subtle focus-visible:border-accent aria-[invalid=true]:border-danger"
        />
        <AnimatePresence initial={false}>
          {problem && (
            <motion.p
              key={problem.error}
              id={`${answerId}-error`}
              role="alert"
              initial={{ opacity: 0, y: -4 }}
              animate={{ opacity: 1, y: 0 }}
              exit={{ opacity: 0 }}
              transition={tween(0.18)}
              className="m-0 text-caption text-danger"
            >
              {t.errors[problem.error]}
              {problem.detail && <span className="mt-0.5 block font-mono text-muted">{t.detail(problem.detail)}</span>}
            </motion.p>
          )}
        </AnimatePresence>
      </div>

      <Button variant="primary" className="w-fit self-end" disabled={answer.trim() === ""} onClick={submit}>
        {t.use}
      </Button>
    </div>
  );
}
