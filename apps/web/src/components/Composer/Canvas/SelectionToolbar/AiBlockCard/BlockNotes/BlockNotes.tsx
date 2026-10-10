"use client";

import type { AiBlock } from "@dialmade/doc";
import { useDictionary, useI18n } from "@/i18n";
import { composer } from "@/i18n/composer";
import { provenanceLine, warningLines } from "../cardModel";

export type BlockNotesProps = { block: AiBlock };

/** The block's quality notes (gates, spec §7) and where it came from (model, date, cost, the request). */
export function BlockNotes({ block }: BlockNotesProps) {
  const { locale } = useI18n();
  const t = useDictionary(composer).aiBlock;
  const warnings = warningLines(block.gates.warnings, t);
  const request = block.provenance.request;
  return (
    <div className="flex flex-col gap-2 border-t border-app pt-2.5 text-caption">
      {warnings.length > 0 && (
        <section aria-label={t.warnings.title} className="flex flex-col gap-1">
          <p className="font-medium text-muted">{t.warnings.title}</p>
          <ul className="flex flex-col gap-0.5 text-fg">
            {warnings.map((line, index) => (
              <li key={index} className="flex gap-1.5">
                <span aria-hidden className="mt-1.5 size-1 shrink-0 rounded-full bg-warning" />
                <span className="min-w-0 break-words">{line}</span>
              </li>
            ))}
          </ul>
        </section>
      )}
      <section aria-label={t.provenance.title} className="flex flex-col gap-0.5 text-subtle">
        <p>{provenanceLine(block, t, locale)}</p>
        {request && <p className="line-clamp-2 break-words">{t.provenance.request(request)}</p>}
      </section>
    </div>
  );
}
