"use client";

import type { OutputKind } from "@dialmade/catalog";
import type { DesignDoc, DialKey } from "@dialmade/doc";
import { useDesignDocActions } from "@/hooks/useDesignDoc";
import { useDictionary } from "@/i18n";
import { composer } from "@/i18n/composer";
import { PanelSection } from "../../PanelSection";
import { DialSlider } from "./DialSlider";

export type DialsControlProps = {
  doc: DesignDoc;
  /** Active page: a dial it overrides (the App page's density) is edited on that page only. */
  kind: OutputKind | null;
  pageLabel: string;
};

const DIALS: readonly DialKey[] = ["variance", "motion", "density"];

/** Variance, motion and density. Each dial writes where its effective value comes from. */
export function DialsControl({ doc, kind, pageLabel }: DialsControlProps) {
  const t = useDictionary(composer);
  const actions = useDesignDocActions();
  const pageDials = kind ? doc.pages[kind]?.dials : undefined;

  return (
    <PanelSection title={t.dials.title}>
      <div className="flex flex-col gap-3.5">
        {DIALS.map((key) => {
          const pageValue = pageDials?.[key];
          const scope = pageValue !== undefined && kind ? kind : "global";
          const copy = t.dials[key];
          return (
            <DialSlider
              key={key}
              label={copy.label}
              zones={copy.zones}
              value={pageValue ?? doc.brief.dials[key]}
              onChange={(value) => actions.setDials({ [key]: value }, scope)}
              onBegin={actions.beginBatch}
              onCommit={actions.commitBatch}
              valueText={t.dials.valueText}
              footer={
                scope !== "global" ? (
                  <p className="flex flex-wrap items-center gap-x-2 text-caption text-muted">
                    <span>{t.dials.pageOnly(pageLabel)}</span>
                    <button
                      type="button"
                      className="rounded-[6px] text-muted underline decoration-white/20 underline-offset-2 hover:text-fg"
                      onClick={() => actions.applyPatch([{ op: "remove", path: `/pages/${scope}/dials/${key}` }])}
                    >
                      {t.dials.useGlobal}
                    </button>
                  </p>
                ) : undefined
              }
            />
          );
        })}
      </div>
    </PanelSection>
  );
}
