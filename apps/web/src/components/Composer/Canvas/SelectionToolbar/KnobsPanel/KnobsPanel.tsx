"use client";

import { isBinding, type DesignDoc } from "@dialmade/doc";
import { VARIANT_PROP, contentContextFromDoc, resolveSectionProps, sectionRegistry, type KnobDef } from "@dialmade/sections";
import { useMemo } from "react";
import { useDesignDocActions, useDesignDocStore } from "@/hooks/useDesignDoc";
import { useDictionary, useI18n } from "@/i18n";
import { composer } from "@/i18n/composer";
import { pageTarget, setPropOps, type PageTarget } from "../../../pageOps";
import { KnobField } from "./KnobField";

export type KnobsPanelProps = {
  doc: DesignDoc;
  /**
   * The page shown: on a screen, an edited prop is pinned; an app frame's edit goes to the layout where it owns
   * it (navigation, page header, title = the screen's name) or is pinned on the frame (`setPropOps`).
   */
  target: PageTarget;
  id: string;
  logoUrl: string | undefined;
};

/** The selected section's knobs (declared by its catalog definition), each edit is an RFC 6902 patch. */
export function KnobsPanel({ doc, target, id, logoUrl }: KnobsPanelProps) {
  const { locale } = useI18n();
  const t = useDictionary(composer);
  const actions = useDesignDocActions();
  const store = useDesignDocStore();
  const element = target.page.elements[id];
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
      // From the live doc: a slider sends several edits before the next render, and the pin is added once.
      const live = store.getState().doc;
      const liveTarget = live ? pageTarget(live, target.key) : null;
      // Empty for a frame title that cleans to the screen's current name (typing a trailing space).
      const ops = live && liveTarget ? setPropOps(live, liveTarget, id, key, next) : [];
      if (ops.length > 0) actions.applyPatch(ops);
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
