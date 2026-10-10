"use client";

// BYOK (INFORME §5, «Seguridad de la key BYOK»): the user pastes their own Anthropic key. It is kept
// only in the tab's memory (@/lib/ai/byokKey), never in React state, storage or a request to Dialmade;
// useAiCopy then calls api.anthropic.com from the browser. The input is uncontrolled and cleared after use.
import { motion } from "motion/react";
import { useEffect, useId, useRef, useState, type FormEvent, type MouseEvent } from "react";
import { toast } from "sonner";
import { Button } from "@/components/ui/Button";
import { IconButton } from "@/components/ui/IconButton";
import { useDictionary, useI18n } from "@/i18n";
import { ai } from "@/i18n/ai";
import { clearByokKey, looksLikeAnthropicKey, setByokKey, useByokKey } from "@/lib/ai/byokKey";
import { smooth, tween } from "@/lib/motion";

export type AiKeyDialogProps = {
  open: boolean;
  /** Esc, backdrop click, close, save and forget call it with `false`. */
  onOpenChange: (open: boolean) => void;
};

const CONSOLE_KEYS_URL = "https://console.anthropic.com/settings/keys";

function isBackdropClick(event: MouseEvent<HTMLDialogElement>): boolean {
  if (event.target !== event.currentTarget) return false;
  const box = event.currentTarget.getBoundingClientRect();
  return event.clientX < box.left || event.clientX > box.right || event.clientY < box.top || event.clientY > box.bottom;
}

const CloseIcon = () => (
  <svg viewBox="0 0 16 16" fill="none" stroke="currentColor" strokeWidth={1.5} strokeLinecap="round" aria-hidden focusable="false">
    <path d="m4 4 8 8M12 4l-8 8" />
  </svg>
);

export function AiKeyDialog({ open, onOpenChange }: AiKeyDialogProps) {
  const t = useDictionary(ai).key;
  const { t: common } = useI18n();
  const byok = useByokKey();
  const ref = useRef<HTMLDialogElement>(null);
  const input = useRef<HTMLInputElement>(null);
  const titleId = useId();
  const descriptionId = useId();
  const inputId = useId();
  const hintId = useId();
  const [visible, setVisible] = useState(false);
  const [invalid, setInvalid] = useState(false);

  useEffect(() => {
    const dialog = ref.current;
    if (!dialog) return;
    if (open && !dialog.open) dialog.showModal();
    if (!open && dialog.open) dialog.close();
  }, [open]);

  const close = () => {
    if (input.current) input.current.value = "";
    setVisible(false);
    setInvalid(false);
    onOpenChange(false);
  };

  const submit = (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    const value = input.current?.value.trim() ?? "";
    if (!looksLikeAnthropicKey(value)) {
      setInvalid(true);
      input.current?.focus();
      return;
    }
    setByokKey(value);
    close();
    toast.success(t.saved);
  };

  const forget = () => {
    clearByokKey();
    close();
    toast(t.removed);
  };

  return (
    <dialog
      ref={ref}
      aria-labelledby={titleId}
      aria-describedby={descriptionId}
      onClose={close}
      onClick={(event) => {
        if (isBackdropClick(event)) close();
      }}
      className="m-auto max-h-[calc(100dvh-2rem)] w-[min(100vw-2rem,30rem)] overflow-y-auto rounded-panel border border-app-strong bg-app-elevated p-0 text-fg shadow-lift backdrop:bg-black/60 backdrop:backdrop-blur-sm"
    >
      {open && (
        <motion.form
          onSubmit={submit}
          initial={{ opacity: 0, y: 10, scale: 0.985 }}
          animate={{ opacity: 1, y: 0, scale: 1 }}
          transition={{ ...smooth, opacity: tween(0.2) }}
          className="flex flex-col gap-4 p-5 sm:p-6"
          noValidate
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
            <IconButton label={common.actions.close} icon={<CloseIcon />} tooltip={false} className="-mt-1 -mr-1" onClick={close} />
          </header>

          {byok.active && byok.hint && (
            <p className="m-0 rounded-control border border-app bg-accent-soft px-3 py-2 text-small text-fg" role="status">
              {t.active(byok.hint)}
            </p>
          )}

          <div className="flex flex-col gap-1.5">
            <label htmlFor={inputId} className="text-small font-medium text-fg">
              {t.label}
            </label>
            <div className="flex gap-2">
              <input
                ref={input}
                id={inputId}
                type={visible ? "text" : "password"}
                autoComplete="off"
                autoCapitalize="off"
                autoCorrect="off"
                spellCheck={false}
                data-1p-ignore
                data-lpignore="true"
                placeholder={t.placeholder}
                aria-invalid={invalid || undefined}
                aria-describedby={hintId}
                onInput={() => invalid && setInvalid(false)}
                className="h-10 min-w-0 flex-1 rounded-control border border-app-strong bg-app px-3 font-mono text-small text-fg placeholder:text-subtle focus-visible:border-accent aria-[invalid=true]:border-danger"
              />
              <Button type="button" aria-pressed={visible} onClick={() => setVisible((value) => !value)}>
                {visible ? t.hide : t.show}
              </Button>
            </div>
            <p id={hintId} className={invalid ? "m-0 text-caption text-danger" : "m-0 text-caption text-muted"}>
              {t.formatHint}
            </p>
          </div>

          <ul className="m-0 flex list-none flex-col gap-1.5 p-0 text-small text-muted">
            {t.privacy.map((line) => (
              <li key={line} className="flex gap-2">
                <span aria-hidden className="mt-2 size-1 shrink-0 rounded-full bg-accent" />
                {line}
              </li>
            ))}
          </ul>

          <a
            href={CONSOLE_KEYS_URL}
            target="_blank"
            rel="noreferrer noopener"
            className="w-fit text-small text-accent underline-offset-4 hover:underline focus-visible:underline"
          >
            {t.getKey}
          </a>

          <div className="flex flex-wrap items-center justify-end gap-2 pt-1">
            {byok.active && (
              <Button type="button" variant="ghost" onClick={forget}>
                {t.remove}
              </Button>
            )}
            <Button type="submit" variant="primary">
              {t.save}
            </Button>
          </div>
        </motion.form>
      )}
    </dialog>
  );
}
