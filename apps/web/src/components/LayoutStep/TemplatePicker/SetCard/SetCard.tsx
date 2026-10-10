"use client";

import { getSetTemplate, type SetTemplateId } from "@dialmade/layout";
import { useId } from "react";
import { useDictionary } from "@/i18n";
import { layout } from "@/i18n/layout";
import { cn } from "@/lib/cn";
import { SparkleIcon } from "../../icons";
import { LayoutThumbnail, templatePreview } from "../../LayoutThumbnail";
import { CARD_FRAME, CARD_PREVIEW, CARD_SURFACE } from "../constants";

export type SetCardProps = {
  setId: SetTemplateId;
  /** Marked «Recomendada» (the focus of the brief). */
  recommended: boolean;
  onChoose: (setId: SetTemplateId) => void;
};

/** A starting set («SaaS app», «Landing») as a large card: the thumbnails of its screens, name and description. */
export function SetCard({ setId, recommended, onChoose }: SetCardProps) {
  const t = useDictionary(layout);
  const id = useId();
  const { screens } = getSetTemplate(setId);
  const text = t.sets[setId];

  return (
    <button
      type="button"
      aria-label={t.templatePicker.option(text.name, recommended)}
      aria-describedby={`${id}-desc`}
      onClick={() => onChoose(setId)}
      className={CARD_FRAME}
    >
      <span className={CARD_SURFACE}>
        <span className={CARD_PREVIEW}>
          <span className={cn("grid w-full items-start gap-2", screens.length > 2 ? "grid-cols-3" : "grid-cols-2")}>
            {screens.map((templateId) => {
              const preview = templatePreview(templateId);
              return (
                <span key={templateId} className="flex min-w-0 flex-col gap-1">
                  <span className="block overflow-hidden rounded-[8px] border border-app">
                    <LayoutThumbnail layout={preview.layout} shell={preview.shell} className="aspect-[16/10] w-full" />
                  </span>
                  <span className="truncate text-caption text-muted">{t.templates[templateId].name}</span>
                </span>
              );
            })}
          </span>
          {recommended && (
            <span className="absolute top-2 left-2 inline-flex h-6 items-center gap-1 rounded-chip bg-accent-cta px-2 text-caption font-medium text-white shadow-glow-purple [&_svg]:size-3.5">
              <SparkleIcon />
              {t.templatePicker.recommended}
            </span>
          )}
        </span>
        <span className="flex flex-col gap-1 px-1.5">
          <span className="text-h3 text-fg">{text.name}</span>
          <span id={`${id}-desc`} className="text-small text-pretty text-muted">
            {text.description}
          </span>
        </span>
      </span>
    </button>
  );
}
