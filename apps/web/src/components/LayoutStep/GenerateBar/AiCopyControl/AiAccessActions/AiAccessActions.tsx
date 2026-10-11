"use client";

import { Button } from "@/components/ui/Button";
import { Tooltip } from "@/components/ui/Tooltip";
import { useDictionary } from "@/i18n";
import { ai as aiText } from "@/i18n/ai";

export type AiAccessActionsProps = {
  /** The user's key is saved: «Gestionar mi key». */
  hasKey: boolean;
  /** The free tier cannot answer: the key is the way out (the primary action). */
  keyFirst: boolean;
  onUseKey: () => void;
  onUseClaude: () => void;
  /** Nothing to prepare a prompt for (no screen, no text). */
  claudeDisabled?: boolean;
};

/**
 * The two ways to Claude besides the free tier, at the foot of the «IA» popover in both modes: «Usar mi key» and «Usar
 * mi Claude». Quiet buttons on one row; how «mi Claude» works is its tooltip, not a paragraph.
 */
export function AiAccessActions({ hasKey, keyFirst, onUseKey, onUseClaude, claudeDisabled = false }: AiAccessActionsProps) {
  const t = useDictionary(aiText).aiRender.access;
  return (
    <div className="-mx-1 flex flex-wrap items-center gap-1 border-t border-app pt-2.5">
      <Button size="sm" variant={keyFirst ? "primary" : "ghost"} onClick={onUseKey}>
        {hasKey ? t.manageKey : t.useKey}
      </Button>
      <Tooltip content={t.useClaudeHint} className="max-w-64 whitespace-normal">
        <Button size="sm" variant="ghost" disabled={claudeDisabled} onClick={onUseClaude}>
          {t.useClaude}
        </Button>
      </Tooltip>
    </div>
  );
}
