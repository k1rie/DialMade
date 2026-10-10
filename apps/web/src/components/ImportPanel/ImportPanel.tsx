"use client";

import { AnimatePresence, motion } from "motion/react";
import { useCallback, useEffect, useId, useMemo, useRef, useState } from "react";
import { AiAnalyzeToggle } from "@/components/AiAnalyzeToggle";
import { AiUsageMeter } from "@/components/AiUsageMeter";
import { Button } from "@/components/ui/Button";
import { useAiVision, type VisionScreenshotDraft } from "@/hooks/useAiVision";
import type { ImportDraft, ImportSession } from "@/hooks/usePaletteFlow";
import { useDictionary, useI18n } from "@/i18n";
import { importText, type ImportDictionary } from "@/i18n/import";
import { cn } from "@/lib/cn";
import { byData, focusSoon } from "@/lib/focus";
import { tween } from "@/lib/motion";
import { PASTE_DETECT_DELAY_MS, PASTE_MAX_BYTES, SNIFF_BYTES } from "./constants";
import { formatBytes, roleCounts, type EntryProblem } from "./entries";
import { FileRow } from "./FileRow";
import { AlertIcon, ArrowLeftIcon, ArrowRightIcon } from "./icons";
import { ImportDropzone } from "./ImportDropzone";
import { PasteBox } from "./PasteBox";
import { draftFilesOf, useImportEntries, type NewImportFile } from "./useImportEntries";
import { useImportDrop } from "./useImportDrop";
import { useImportRun, type RunFailure } from "./useImportRun";
import { useImportWorker } from "./useImportWorker";

export type ImportPanelProps = {
  /** Files dropped on the Home that opened the panel. */
  initialFiles?: readonly File[];
  /** The panel as it was before «Esto detectamos» (its files keep their types). */
  draft?: ImportDraft;
  /** Seeds of the logo already in the flow (Palette Lab), for the logo-vs-guide cards. */
  logoSeeds?: { primary: string; secondary?: string };
  onBack: () => void;
  /** The batch was read: «Esto detectamos». */
  onDetected: (session: ImportSession) => void;
  /** The batch is just one logo: the usual logo flow (crop) takes it. */
  onLogo: (file: File) => void;
};

function problemText(problem: EntryProblem, t: ImportDictionary, locale: string): string {
  switch (problem.code) {
    case "too-large":
      return t.panel.problems.tooLarge(formatBytes(problem.limit, locale));
    case "later":
      return t.panel.problems.later(t.formats[problem.format] ?? problem.format);
    case "never":
      return t.panel.problems.never(t.formats[problem.format] ?? problem.format);
    case "too-many-files":
      return t.panel.problems.tooManyFiles(problem.max);
    case "too-many-images":
      return t.panel.problems.tooManyImages(problem.max);
    case "logo-format":
      return t.panel.problems.logoFormat;
    case "not-logo":
      return t.panel.problems.notLogo;
    case "svg-logo":
      return t.panel.problems.svgLogo;
    case "one-logo":
      return t.panel.problems.oneLogo;
    case "empty":
      return t.panel.problems.empty;
    case "detect-failed":
      return t.panel.problems.detectFailed;
  }
}

const FAILURES: Record<RunFailure, keyof ImportDictionary["panel"]> = {
  canceled: "canceled",
  timeout: "timeout",
  nothing: "nothing",
  failed: "failed",
  "no-worker": "noWorker",
};
const failureText = (failure: RunFailure, t: ImportDictionary["panel"]) => t[FAILURES[failure]] as string;

/**
 * «Trae tu marca» (ref. 1B Higgsfield): drop several files anywhere on the page, choose them or paste
 * colors/code; each file gets an editable type and its own error without blocking the rest; one rights
 * statement covers the batch. The heavy work runs in the import worker (15 s watchdog, «Cancelar»).
 */
export function ImportPanel({ initialFiles, draft, logoSeeds, onBack, onDetected, onLogo }: ImportPanelProps) {
  const t = useDictionary(importText);
  const { locale } = useI18n();
  const worker = useImportWorker();
  const runner = useImportRun(worker);
  const titleId = useId();
  const listHeadingId = `${titleId}-list`;
  const rightsId = useId();
  const rightsHelpId = useId();
  const textareaRef = useRef<HTMLTextAreaElement>(null);
  const runRef = useRef<HTMLButtonElement>(null);
  // Consent and estimate only: the analysis runs in «Esto detectamos», which gets the parsed screenshots.
  const vision = useAiVision();
  const [analyzeStyle, setAnalyzeStyle] = useState(draft?.analyzeStyle ?? false);

  const [initial] = useState<NewImportFile[]>(() =>
    draft ? draft.files.map(({ file, role, pasted }) => ({ file, role, pasted })) : (initialFiles ?? []).map((file) => ({ file })),
  );
  const { entries, problems, add, remove, setRole, detecting } = useImportEntries(worker.detect, initial);

  const [rights, setRights] = useState(draft?.rights ?? false);

  // A new step starts at the top (the previous one may have been scrolled).
  useEffect(() => {
    window.scrollTo({ top: 0 });
  }, []);
  const [pasteOpen, setPasteOpen] = useState(!!draft?.pasteText);
  const [pasteText, setPasteText] = useState(draft?.pasteText ?? "");
  const [pasteDetection, setPasteDetection] = useState<{ text: string; format?: string }>({ text: "" });
  const [pasteCount, setPasteCount] = useState(0);
  const [reports, setReports] = useState<Record<string, { code: string; detail?: string }>>({});
  const [message, setMessage] = useState<string>();
  const [live, setLive] = useState("");
  // Per-file problems arrive after the asynchronous detection: each one is announced once.
  const announcedProblems = useRef(new Set<string>());
  useEffect(() => {
    const fresh = entries.filter((entry) => problems.has(entry.id) && !announcedProblems.current.has(entry.id));
    if (fresh.length === 0) return;
    for (const entry of fresh) announcedProblems.current.add(entry.id);
    setLive(fresh.map((entry) => t.review.warnings.file(entry.name, problemText(problems.get(entry.id)!, t, locale))).join(" "));
  }, [entries, problems, t, locale]);

  const pasteBytes = useMemo(() => new TextEncoder().encode(pasteText).length, [pasteText]);
  const pasteTooLong = pasteBytes > PASTE_MAX_BYTES ? t.panel.paste.tooLong(PASTE_MAX_BYTES / 1024 / 1024) : undefined;

  useEffect(() => {
    const text = pasteText.trim() ? pasteText : "";
    if (!text || pasteBytes > PASTE_MAX_BYTES) return;
    let active = true;
    const timer = setTimeout(() => {
      const head = new TextEncoder().encode(text.slice(0, SNIFF_BYTES));
      worker
        .detect([{ name: "paste", head, pasted: true }])
        .then(([result]) => {
          if (active && result) setPasteDetection({ text: pasteText, format: t.formats[result.detected.format] ?? result.detected.format });
        })
        .catch(() => {
          if (active) setPasteDetection({ text: pasteText });
        });
    }, PASTE_DETECT_DELAY_MS);
    return () => {
      active = false;
      clearTimeout(timer);
    };
  }, [pasteText, pasteBytes, worker, t]);

  const addFiles = useCallback(
    (files: File[]) => {
      if (runner.running) return;
      const added = add(files.map((file) => ({ file })));
      if (added > 0) {
        setMessage(undefined);
        setLive(t.panel.list.added(added));
      }
    },
    [add, runner.running, t],
  );

  const over = useImportDrop({
    onFiles: addFiles,
    onText: (text) => {
      setPasteOpen(true);
      setPasteText((current) => (current.trim() ? `${current}\n${text}` : text));
      requestAnimationFrame(() => textareaRef.current?.focus());
    },
  });

  const addPaste = () => {
    if (!pasteText.trim() || pasteTooLong) return;
    const n = pasteCount + 1;
    add([{ file: new File([pasteText], t.panel.paste.name(n), { type: "text/plain" }), pasted: true }]);
    setPasteCount(n);
    setPasteText("");
    setLive(t.panel.list.added(1));
  };

  const usable = entries.filter((entry) => entry.status === "ready" && !problems.has(entry.id));
  const counts = roleCounts(entries, problems);
  const parts = (Object.keys(counts) as (keyof typeof counts)[]).map((role) => t.roleCounts[role](counts[role] ?? 0));
  const pasteIncluded = !!pasteText.trim() && !pasteTooLong;
  const total = usable.length + (pasteIncluded ? 1 : 0);
  const ownTypes = usable.some((entry) => entry.role !== "reference") || pasteIncluded;
  const canRun = !runner.running && !detecting && total > 0;
  // «Analizar estilo con IA» only for the user's own screenshots, once the rights are declared.
  const visionDrafts: VisionScreenshotDraft[] = rights
    ? usable
        .filter((entry) => entry.role === "screenshot" && entry.detected?.image)
        .map((entry) => ({ width: entry.detected!.image!.width, height: entry.detected!.image!.height, fileName: entry.name }))
    : [];

  const start = async () => {
    if (!canRun) return;
    if (usable.length === 1 && usable[0]!.role === "logo" && !pasteIncluded && rights) {
      onLogo(usable[0]!.file);
      return;
    }
    setMessage(undefined);
    setReports({});
    const result = await runner.run({
      entries: usable,
      pasteText: pasteIncluded ? pasteText : "",
      pasteName: t.panel.paste.name(pasteCount + 1),
      rights,
      ...(logoSeeds && { logoSeeds }),
      draft: { files: draftFilesOf(entries), rights, pasteText, analyzeStyle },
    });
    if (result.ok) {
      onDetected({ ...result.session, ...(analyzeStyle && visionDrafts.length > 0 && { analyzeStyle: true }) });
      return;
    }
    setReports(result.reports);
    const text = [failureText(result.failure, t.panel), result.logoFailed ? t.panel.logoFailed : ""].filter(Boolean).join(" ");
    setMessage(text);
    setLive(text);
  };

  const cancelRun = () => {
    runner.cancel();
    // «Cancelar» goes away with the run: focus returns to the main button.
    focusSoon(() => runRef.current);
  };

  const removeEntry = (id: string, name: string) => {
    const index = entries.findIndex((entry) => entry.id === id);
    const next = entries[index + 1] ?? entries[index - 1];
    remove(id);
    setLive(t.panel.list.removed(name));
    focusSoon(...(next ? [byData("import-remove", next.id)] : []), `#${CSS.escape(listHeadingId)}`, `#${CSS.escape(titleId)}`);
  };

  const phase = runner.phase;
  const progress =
    phase.kind === "logo" ? t.panel.readingLogo : phase.kind === "batch" ? t.panel.running(phase.index + 1, phase.total, phase.name) : undefined;

  return (
    <div className="mx-auto flex w-full max-w-[680px] flex-col gap-5">
      <div className="flex flex-col gap-4">
        <Button variant="ghost" size="sm" leadingIcon={<ArrowLeftIcon />} className="self-start" disabled={runner.running} onClick={onBack}>
          {t.panel.back}
        </Button>
        <div className="flex flex-col items-center gap-2 text-center">
          <h1 id={titleId} tabIndex={-1} className="text-h2 text-balance text-fg outline-none">
            {t.panel.title}
          </h1>
          <p className="max-w-lg text-body text-pretty text-muted">{t.panel.subtitle}</p>
        </div>
      </div>

      <ImportDropzone over={over} disabled={runner.running} onFiles={addFiles} />

      <PasteBox
        open={pasteOpen}
        onOpenChange={setPasteOpen}
        value={pasteText}
        onChange={setPasteText}
        format={pasteDetection.text === pasteText ? pasteDetection.format : undefined}
        detecting={pasteDetection.text !== pasteText}
        tooLong={pasteTooLong}
        disabled={runner.running}
        onAdd={addPaste}
        textareaRef={textareaRef}
      />

      {entries.length > 0 && (
        <section aria-labelledby={listHeadingId} className="flex flex-col gap-2.5">
          <div className="flex items-baseline justify-between gap-2">
            <h2 id={listHeadingId} tabIndex={-1} className="text-small font-semibold text-fg outline-none">
              {t.panel.list.label}
            </h2>
            <p role="status" className="text-caption text-muted">
              {t.panel.list.summary(total, parts)}
            </p>
          </div>
          <ul className="flex flex-col gap-2">
            <AnimatePresence initial={false}>
              {entries.map((entry) => {
                const problem = problems.get(entry.id);
                const report = reports[entry.id];
                return (
                  <FileRow
                    key={entry.id}
                    entry={entry}
                    problem={problem ? problemText(problem, t, locale) : undefined}
                    report={report ? (t.review.warnings.codes[report.code] ?? t.review.warnings.generic(report.code)) : undefined}
                    disabled={runner.running}
                    onRole={(role) => {
                      setRole(entry.id, role);
                      setReports((current) => {
                        const next = { ...current };
                        delete next[entry.id];
                        return next;
                      });
                    }}
                    onRemove={() => removeEntry(entry.id, entry.name)}
                  />
                );
              })}
            </AnimatePresence>
          </ul>
        </section>
      )}

      <AnimatePresence initial={false}>
        {ownTypes && (
          <motion.div
            key="rights"
            initial={{ opacity: 0, y: 4 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0 }}
            transition={tween(0.2)}
            className={cn(
              "flex items-start gap-3 rounded-card border px-3.5 py-3 transition-colors duration-150",
              rights ? "border-accent/40 bg-accent-soft" : "border-app bg-white/[0.02]",
            )}
          >
            <input
              id={rightsId}
              type="checkbox"
              checked={rights}
              disabled={runner.running}
              aria-describedby={rightsHelpId}
              onChange={(event) => setRights(event.target.checked)}
              className="mt-0.5 size-4 shrink-0 cursor-pointer rounded-[5px] accent-[var(--app-accent-cta)]"
            />
            <div className="flex min-w-0 flex-col gap-1">
              <label htmlFor={rightsId} className="cursor-pointer text-small font-medium text-fg">
                {t.panel.rights.label}
              </label>
              <p id={rightsHelpId} className="text-caption text-pretty text-muted">
                {t.panel.rights.help}
              </p>
            </div>
          </motion.div>
        )}
      </AnimatePresence>

      {visionDrafts.length > 0 && (
        <div className="flex flex-col gap-1.5">
          <AiAnalyzeToggle
            vision={vision}
            screenshots={visionDrafts}
            checked={analyzeStyle}
            onCheckedChange={setAnalyzeStyle}
            runOnEnable={false}
            disabled={runner.running}
          />
          <AiUsageMeter />
        </div>
      )}

      <div className="flex flex-col gap-3">
        <AnimatePresence initial={false}>
          {(message || progress) && (
            // Visual only: the persistent live region below says it (a region born with its text is often skipped).
            <motion.p
              key={progress ? "progress" : "message"}
              aria-hidden
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              exit={{ opacity: 0 }}
              transition={tween(0.15)}
              className={cn("flex items-center justify-center gap-1.5 text-center text-small", progress ? "text-muted" : "text-warning")}
            >
              {!progress && <AlertIcon className="size-4 shrink-0" />}
              {progress ?? message}
            </motion.p>
          )}
        </AnimatePresence>
        <div className="flex flex-col-reverse items-stretch justify-end gap-2 sm:flex-row sm:items-center">
          {runner.running && (
            <Button variant="ghost" onClick={cancelRun}>
              {t.panel.cancel}
            </Button>
          )}
          <Button
            ref={runRef}
            variant="primary"
            size="lg"
            loading={runner.running}
            disabled={!runner.running && !canRun}
            trailingIcon={<ArrowRightIcon />}
            onClick={() => void start()}
          >
            {t.panel.run}
          </Button>
        </div>
      </div>

      <p aria-live="polite" className="sr-only">
        {progress ?? live}
      </p>
    </div>
  );
}
