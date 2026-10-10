"use client";

// BYOK (INFORME §5, «Seguridad de la key BYOK»): the user pastes their own Anthropic key. It is kept
// only in the tab's memory (@/lib/ai/byokKey), never in React state, storage or a request to Dialmade;
// useAiCopy and useAiVision then call api.anthropic.com from the browser. The input is uncontrolled and
// cleared after use.
//
// With `manual` it is the way out of the free tier (importar-guia.md, «Política de acceso a la IA»):
// two tabs, «Usar mi propia key» and «Copiar prompt para mi Claude» (ClaudePromptFallback), and with
// `reason` a line that says why it opened («Usaste tus 5 usos gratis…»).
import { AnimatePresence, motion } from "motion/react";
import { useEffect, useId, useRef, useState, type FormEvent, type KeyboardEvent, type MouseEvent } from "react";
import { toast } from "sonner";
import { ClaudePromptFallback } from "@/components/ClaudePromptFallback";
import { Button } from "@/components/ui/Button";
import { IconButton } from "@/components/ui/IconButton";
import { useAiStatus } from "@/hooks/useAiStatus";
import { useDictionary, useI18n } from "@/i18n";
import { ai } from "@/i18n/ai";
import { clearByokKey, looksLikeAnthropicKey, setByokKey, useByokKey } from "@/lib/ai/byokKey";
import { DEFAULT_FREE_USES_PER_MONTH } from "@/lib/ai/config";
import type { ManualJob } from "@/lib/ai/manual";
import type { AiFallbackReason } from "@/lib/ai/policy";
import { cn } from "@/lib/cn";
import { smooth, tween } from "@/lib/motion";
import { ByokModelPicker, type ByokModelPickerProps } from "./ByokModelPicker";

export type AiKeyDialogView = "key" | "manual";

export type AiKeyDialogProps<T = unknown> = {
  open: boolean;
  /** Esc, backdrop click, close, save, forget and a valid «mi Claude» answer call it with `false`. */
  onOpenChange: (open: boolean) => void;
  /** Why it opened (no free uses, budget, daily limit, AI off): shown on top. */
  reason?: AiFallbackReason | null;
  /** «Copiar prompt para mi Claude» for the pending request; without it only the key form shows. */
  manual?: ManualJob<T> | null;
  /** The pasted answer, already validated by `manual.parse`. */
  onManualResult?: (value: T, info: { dropped: number }) => void;
  /** After a key is saved (e.g. to run the pending request again). */
  onKeySaved?: () => void;
  /** Tab shown when it opens. Default: the key. */
  initialView?: AiKeyDialogView;
  /**
   * «Diseño con IA»: also pick the model the key runs (Opus 5.5 by default, «Más barato: Sonnet 5.5»), with the cost
   * of the pending generate per model when known.
   */
  renderModels?: { estimates?: ByokModelPickerProps["estimates"] };
};

const CONSOLE_KEYS_URL = "https://console.anthropic.com/settings/keys";
const VIEWS: readonly AiKeyDialogView[] = ["key", "manual"];

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

export function AiKeyDialog<T = unknown>({ open, onOpenChange, reason, manual, onManualResult, onKeySaved, initialView = "key", renderModels }: AiKeyDialogProps<T>) {
  const dictionary = useDictionary(ai);
  const t = dictionary.key;
  const { t: common } = useI18n();
  const byok = useByokKey();
  const { status } = useAiStatus();
  const ref = useRef<HTMLDialogElement>(null);
  const input = useRef<HTMLInputElement>(null);
  const tabRefs = useRef<Record<AiKeyDialogView, HTMLButtonElement | null>>({ key: null, manual: null });
  const titleId = useId();
  const descriptionId = useId();
  const inputId = useId();
  const hintId = useId();
  const tabsId = useId();
  const [visible, setVisible] = useState(false);
  const [invalid, setInvalid] = useState(false);
  const [view, setView] = useState<AiKeyDialogView>(initialView);
  const [wasOpen, setWasOpen] = useState(open);
  if (open !== wasOpen) {
    setWasOpen(open);
    if (open) setView(initialView);
  }
  const withManual = !!manual;
  const current: AiKeyDialogView = withManual ? view : "key";

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
    onKeySaved?.();
  };

  const forget = () => {
    clearByokKey();
    close();
    toast(t.removed);
  };

  const onTabKey = (event: KeyboardEvent<HTMLDivElement>) => {
    if (event.key !== "ArrowLeft" && event.key !== "ArrowRight" && event.key !== "Home" && event.key !== "End") return;
    event.preventDefault();
    const index = VIEWS.indexOf(current);
    const next =
      event.key === "Home" ? VIEWS[0]! : event.key === "End" ? VIEWS[VIEWS.length - 1]! : VIEWS[(index + (event.key === "ArrowRight" ? 1 : -1) + VIEWS.length) % VIEWS.length]!;
    setView(next);
    tabRefs.current[next]?.focus();
  };

  const title = reason || withManual ? t.fallbackTitle : t.title;
  const description = reason
    ? t.reasons[reason](status?.freeUsesTotal ?? DEFAULT_FREE_USES_PER_MONTH)
    : withManual
      ? t.fallbackDescription
      : t.description;

  const keyForm = (
    <form onSubmit={submit} className="flex flex-col gap-4" noValidate>
      {withManual && <p className="m-0 text-small text-muted">{t.description}</p>}
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

      {renderModels && <ByokModelPicker {...(renderModels.estimates && { estimates: renderModels.estimates })} />}

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
    </form>
  );

  return (
    <dialog
      ref={ref}
      aria-labelledby={titleId}
      aria-describedby={descriptionId}
      onClose={close}
      onClick={(event) => {
        if (isBackdropClick(event)) close();
      }}
      className="app-chrome m-auto max-h-[calc(100dvh-2rem)] w-[min(100vw-2rem,32rem)] overflow-y-auto rounded-panel border border-app-strong bg-app-elevated p-0 text-fg shadow-lift backdrop:bg-black/60 backdrop:backdrop-blur-sm"
    >
      {open && (
        <motion.div
          initial={{ opacity: 0, y: 10, scale: 0.985 }}
          animate={{ opacity: 1, y: 0, scale: 1 }}
          transition={{ ...smooth, opacity: tween(0.2) }}
          className="flex flex-col gap-4 p-5 sm:p-6"
        >
          <header className="flex items-start justify-between gap-4">
            <div className="min-w-0">
              <h2 id={titleId} className="m-0 text-h3">
                {title}
              </h2>
              <p id={descriptionId} className="m-0 mt-1 text-small text-muted">
                {description}
              </p>
            </div>
            <IconButton label={common.actions.close} icon={<CloseIcon />} tooltip={false} className="-mt-1 -mr-1" onClick={close} />
          </header>

          {withManual && (
            <div
              role="tablist"
              aria-label={t.tabsLabel}
              onKeyDown={onTabKey}
              className="grid grid-cols-2 gap-1 rounded-control border border-app bg-white/[0.03] p-1"
            >
              {VIEWS.map((id) => {
                const selected = current === id;
                return (
                  <button
                    key={id}
                    ref={(node) => {
                      tabRefs.current[id] = node;
                    }}
                    type="button"
                    role="tab"
                    id={`${tabsId}-${id}`}
                    aria-selected={selected}
                    aria-controls={`${tabsId}-${id}-panel`}
                    tabIndex={selected ? 0 : -1}
                    onClick={() => setView(id)}
                    className={cn(
                      "relative h-8 rounded-[7px] px-2 text-small font-medium transition-colors duration-150",
                      selected ? "text-fg" : "text-muted hover:text-fg",
                    )}
                  >
                    {selected && (
                      <motion.span
                        layoutId={`${tabsId}-indicator`}
                        aria-hidden
                        className="absolute inset-0 rounded-[7px] border border-app-strong bg-surface shadow-surface"
                        transition={smooth}
                      />
                    )}
                    <span className="relative">{t.tabs[id]}</span>
                  </button>
                );
              })}
            </div>
          )}

          <AnimatePresence mode="wait" initial={false}>
            <motion.div
              key={current}
              id={withManual ? `${tabsId}-${current}-panel` : undefined}
              role={withManual ? "tabpanel" : undefined}
              aria-labelledby={withManual ? `${tabsId}-${current}` : undefined}
              initial={{ opacity: 0, y: 4 }}
              animate={{ opacity: 1, y: 0 }}
              exit={{ opacity: 0, y: -4 }}
              transition={tween(0.18)}
            >
              {current === "manual" && manual ? (
                <ClaudePromptFallback
                  job={manual}
                  onResult={(value, info) => {
                    onManualResult?.(value, info);
                    close();
                    toast.success(dictionary.manual.done);
                  }}
                />
              ) : (
                keyForm
              )}
            </motion.div>
          </AnimatePresence>
        </motion.div>
      )}
    </dialog>
  );
}
