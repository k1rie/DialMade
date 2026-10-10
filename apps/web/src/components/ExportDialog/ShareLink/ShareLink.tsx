"use client";

import { useId } from "react";
import { Button } from "@/components/ui/Button";
import { Switch } from "@/components/ui/Switch";
import type { ExportDictionary } from "@/i18n/export";
import { GlobeIcon, LinkIcon, LockIcon } from "../icons";

export type ShareLinkProps = {
  slug: string;
  texts: ExportDictionary["share"];
};

/** The public link (Mistral-style toggle + read-only URL). Disabled until accounts exist. */
export function ShareLink({ slug, texts }: ShareLinkProps) {
  const inputId = useId();
  const noteId = useId();

  return (
    <div className="flex flex-col gap-3">
      <div className="flex flex-wrap items-center justify-between gap-x-3 gap-y-2">
        <Switch checked={false} onCheckedChange={() => {}} disabled size="sm" label={texts.toggle} aria-describedby={noteId} />
        <span className="inline-flex items-center gap-1.5 rounded-chip border border-app bg-white/[0.04] px-2 py-0.5 text-caption text-muted">
          <LockIcon className="size-3" />
          {texts.soon}
        </span>
      </div>
      <div className="flex gap-2">
        <label htmlFor={inputId} className="sr-only">
          {texts.urlLabel}
        </label>
        <div className="relative min-w-0 flex-1">
          <GlobeIcon className="pointer-events-none absolute top-1/2 left-3 size-4 -translate-y-1/2 text-subtle" />
          <input
            id={inputId}
            type="url"
            readOnly
            aria-readonly
            aria-describedby={noteId}
            placeholder={`https://app.dialmade.com/s/${slug}`}
            className="h-10 w-full rounded-control border border-app bg-app pr-3 pl-9 font-mono text-small text-muted placeholder:text-subtle focus-visible:border-accent"
          />
        </div>
        <Button disabled leadingIcon={<LinkIcon />} aria-describedby={noteId}>
          {texts.copyLink}
        </Button>
      </div>
      <p id={noteId} className="m-0 text-caption text-muted">
        {texts.urlHint}
      </p>
    </div>
  );
}
