"use client";

import { MAX_AI_REQUEST_LENGTH } from "@dialmade/doc";
import { useId, useState, type KeyboardEvent } from "react";
import { Button } from "@/components/ui/Button";
import { IconButton } from "@/components/ui/IconButton";
import { Kbd } from "@/components/ui/Kbd";
import { usePlatformKeys } from "@/hooks/usePlatformKeys";
import { useDictionary } from "@/i18n";
import { composer } from "@/i18n/composer";
import { CloseIcon } from "../../../../icons";

export type AskChangeProps = {
  /** The text the user clicked in the island («Ver demo»): travels as a hint of what «this» is. */
  target: string | null;
  onClearTarget: () => void;
  disabled: boolean;
  busy: boolean;
  /** Resolves `true` when the change was applied (the field then clears). */
  onSubmit: (request: string) => Promise<boolean>;
};

/**
 * «Pedir cambio…» (spec §8.2): free text of up to 500 characters for this block, sent as data. ⌘/Ctrl+Enter or the
 * button sends it; Enter alone writes a new line. The selected text in the island narrows what «esto» means.
 */
export function AskChange({ target, onClearTarget, disabled, busy, onSubmit }: AskChangeProps) {
  const t = useDictionary(composer).aiBlock;
  const keys = usePlatformKeys();
  const id = useId();
  const [request, setRequest] = useState("");
  const trimmed = request.trim();

  const submit = async () => {
    if (!trimmed || disabled) return;
    if (await onSubmit(trimmed)) setRequest("");
  };

  const onKeyDown = (event: KeyboardEvent<HTMLTextAreaElement>) => {
    if (event.key === "Enter" && (event.metaKey || event.ctrlKey)) {
      event.preventDefault();
      void submit();
    }
  };

  return (
    <div className="flex flex-col gap-1.5">
      <label htmlFor={`${id}-ask`} className="text-caption font-medium text-muted">
        {t.ask}
      </label>
      {target && (
        <span className="flex max-w-full items-center gap-1 self-start rounded-chip border border-app bg-white/[0.04] ps-2 text-caption text-fg">
          <span className="truncate">{t.target(target)}</span>
          <IconButton size="sm" label={t.targetClear} icon={<CloseIcon />} className="size-6" onClick={onClearTarget} />
        </span>
      )}
      <textarea
        id={`${id}-ask`}
        value={request}
        maxLength={MAX_AI_REQUEST_LENGTH}
        rows={3}
        disabled={disabled}
        placeholder={t.askPlaceholder}
        aria-describedby={`${id}-hint ${id}-count`}
        onChange={(event) => setRequest(event.target.value)}
        onKeyDown={onKeyDown}
        className="resize-none rounded-control border border-app-strong bg-white/[0.03] px-2.5 py-1.5 text-small text-fg placeholder:text-subtle disabled:opacity-60"
      />
      <div className="flex items-start justify-between gap-2">
        <p id={`${id}-hint`} className="text-caption text-subtle">
          {target ? t.askHint : `${t.targetHint} ${t.askHint}`}
        </p>
        <span id={`${id}-count`} className="shrink-0 font-mono text-caption text-subtle tabular-nums">
          <span aria-hidden>
            {request.length}/{MAX_AI_REQUEST_LENGTH}
          </span>
          <span className="sr-only">{t.counter(request.length, MAX_AI_REQUEST_LENGTH)}</span>
        </span>
      </div>
      <Button size="sm" variant="secondary" className="self-end" disabled={disabled || !trimmed} loading={busy} onClick={() => void submit()}>
        {t.ask}
        <Kbd aria-hidden>{keys.combo(keys.mod, "↵")}</Kbd>
      </Button>
    </div>
  );
}
