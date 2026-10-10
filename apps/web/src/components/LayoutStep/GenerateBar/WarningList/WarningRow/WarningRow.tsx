"use client";

import type { LayoutFix } from "@dialmade/layout";
import { Button } from "@/components/ui/Button";
import { useDictionary } from "@/i18n";
import { layout } from "@/i18n/layout";
import { WarningIcon } from "../../../icons";
import type { WarningItem } from "../../warnings";
import { ITEM_ATTR } from "../constants";

export type WarningRowProps = { item: WarningItem; onFix: (fix: LayoutFix, blockName: string) => void };

/** One warning and its fix buttons («Anidar», «Poner debajo»…). */
export function WarningRow({ item, onFix }: WarningRowProps) {
  const t = useDictionary(layout);
  return (
    <li {...{ [ITEM_ATTR]: "" }} className="flex flex-col gap-2 rounded-control border border-app bg-white/[0.02] p-2.5">
      <p className="m-0 flex gap-2 text-small text-fg">
        <WarningIcon className="mt-0.5 size-3.5 shrink-0 text-warning" />
        <span className="min-w-0">{t.warnings[item.code](item.names)}</span>
      </p>
      {item.fixes.length > 0 && (
        <div className="flex flex-wrap gap-1.5 ps-5.5">
          {item.fixes.map(({ key, fix, blockName }) => (
            <Button
              key={key}
              size="sm"
              variant="secondary"
              aria-label={t.generate.report.fixLabel(t.fixes[fix.kind], blockName)}
              onClick={() => onFix(fix, blockName)}
            >
              {t.fixes[fix.kind]}
            </Button>
          ))}
        </div>
      )}
    </li>
  );
}
