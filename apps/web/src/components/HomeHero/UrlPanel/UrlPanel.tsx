"use client";

import { useId, useState } from "react";
import { Button } from "@/components/ui/Button";
import { useDictionary } from "@/i18n";
import { home } from "@/i18n/home";

export type UrlPanelProps = {
  /** Prefilled when the URL arrived through Cmd/Ctrl+V. */
  initialUrl?: string;
};

/** «Pegar URL» placeholder: explains the feature is coming. It never fetches anything. */
export function UrlPanel({ initialUrl = "" }: UrlPanelProps) {
  const t = useDictionary(home).url;
  const inputId = useId();
  const helpId = useId();
  const [value, setValue] = useState(initialUrl);
  const [message, setMessage] = useState(initialUrl ? t.pasted : "");

  return (
    <form
      noValidate
      onSubmit={(event) => {
        event.preventDefault();
        setMessage(t.notYet);
      }}
    >
      <div className="mb-3 flex items-center justify-between gap-3">
        <h2 className="text-[0.9375rem] leading-6 font-semibold tracking-[-0.01em] text-fg">{t.title}</h2>
        <span className="rounded-chip border border-accent/40 bg-accent-soft px-1.5 py-0.5 text-caption text-fg">{t.soon}</span>
      </div>
      <label htmlFor={inputId} className="mb-1.5 block text-caption text-muted">
        {t.label}
      </label>
      <div className="flex gap-2">
        <input
          id={inputId}
          type="url"
          inputMode="url"
          autoComplete="url"
          spellCheck={false}
          placeholder={t.placeholder}
          value={value}
          onChange={(event) => setValue(event.target.value)}
          aria-describedby={helpId}
          className="h-9 min-w-0 flex-1 rounded-control border border-app-strong bg-white/[0.04] px-3 text-small text-fg transition-[border-color] duration-150 placeholder:text-subtle focus-visible:border-accent"
        />
        <Button type="submit" size="sm" className="h-9">
          {t.submit}
        </Button>
      </div>
      <p id={helpId} className="mt-2.5 text-small text-muted">
        {t.explain}
      </p>
      <p aria-live="polite" className="mt-2 text-small text-fg empty:hidden">
        {message}
      </p>
    </form>
  );
}
