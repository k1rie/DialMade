"use client";

import type { OutputKind } from "@dialmade/catalog";
import { isBinding, type DesignDoc } from "@dialmade/doc";
import { VARIANT_PROP, contentContextFromDoc, resolveSectionProps, sectionRegistry, type KnobDef } from "@dialmade/sections";
import { useMemo } from "react";
import { useDesignDocActions } from "@/hooks/useDesignDoc";
import { useDictionary, useI18n } from "@/i18n";
import { composer } from "@/i18n/composer";
import { setPropOps } from "../../../pageOps";
import { KnobField } from "./KnobField";

export type KnobsPanelProps = {
  doc: DesignDoc;
  kind: OutputKind;
  id: string;
  logoUrl: string | undefined;
};

/** The selected section's knobs (declared by its catalog definition), each edit is an RFC 6902 patch. */
export function KnobsPanel({ doc, kind, id, logoUrl }: KnobsPanelProps) {
  const { locale } = useI18n();
  const t = useDictionary(composer);
  const actions = useDesignDocActions();
  const element = doc.pages[kind]?.elements[id];
  const def = element ? sectionRegistry.get(element.type) : undefined;
  const ctx = useMemo(() => contentContextFromDoc(doc, logoUrl ? { logoUrl } : {}), [doc, logoUrl]);
  const resolved = useMemo(() => (def && element ? resolveSectionProps(def, element.props, ctx) : null), [def, element, ctx]);

  if (!element || !def || !resolved || def.knobs.length === 0) {
    return <p className="text-small text-muted">{t.selection.knobsEmpty}</p>;
  }

  const fieldFor = (knob: KnobDef) => {
    const key = knob.key;
    const stored = element.props[key];
    const bound = isBinding(stored) ? stored.bind : undefined;
    const value = key === VARIANT_PROP ? resolved.variant : resolved.props[key];
    const options = key === VARIANT_PROP && !knob.options ? def.variants.map((v) => ({ value: v.id, label: v.label })) : knob.options;
    const onChange = (next: unknown) => {
      if (bound && typeof next === "string") {
        if (bound === "brand.name") {
          if (next.trim()) actions.setBrandText({ name: next });
        } else actions.setBrandText({ tagline: next });
        return;
      }
      actions.applyPatch(setPropOps(kind, id, key, next));
    };
    return (
      <KnobField
        key={key}
        knob={options ? { ...knob, options } : knob}
        value={value}
        locale={locale}
        {...(bound && { linkedLabel: t.selection.linked })}
        onChange={onChange}
        onBegin={actions.beginBatch}
        onCommit={actions.commitBatch}
        onLabel={t.selection.on}
        offLabel={t.selection.off}
      />
    );
  };

  return <div className="flex flex-col gap-3.5">{(def.knobs as readonly KnobDef[]).map(fieldFor)}</div>;
}
