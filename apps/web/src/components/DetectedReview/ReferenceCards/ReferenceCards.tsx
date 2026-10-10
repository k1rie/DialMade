"use client";

import type { ImportedBrand, Ownership } from "@dialmade/import";
import { motion } from "motion/react";
import type { ReactNode } from "react";
import { Switch } from "@/components/ui/Switch";
import { useDictionary } from "@/i18n";
import { importText } from "@/i18n/import";
import { cn } from "@/lib/cn";
import { tween } from "@/lib/motion";
import { CHIP_ENTER, CHIP_STAGGER, CHIP_STAGGER_MAX } from "../constants";
import { hexLabel } from "../labels";

export type ReferenceCardsProps = {
  brand: ImportedBrand;
  /** Ownership of each screenshot's source (the batch statement already applied). */
  ownershipOf: (sourceId: string) => Ownership;
  kept: readonly string[];
  onKeep: (sourceId: string, keep: boolean) => void;
  /** Screenshots whose AI attributes (density, recipe) are applied. */
  aiAttributes: readonly string[];
  onAiAttributes: (sourceId: string, use: boolean) => void;
  /** «Analizar estilo con IA», above the cards. */
  aiToggle?: ReactNode;
};

/**
 * «Referencias» (ref. 6A Variant): one card per screenshot with its colors, mode and accent. The image
 * itself is never kept: only its hash, its swatches and its attributes go to the DesignDoc.
 */
export function ReferenceCards({ brand, ownershipOf, kept, onKeep, aiAttributes, onAiAttributes, aiToggle }: ReferenceCardsProps) {
  const t = useDictionary(importText).review.references;
  const shots = brand.screenshots ?? [];
  const names = new Map(brand.sources.map((source) => [source.id, source.fileName]));

  return (
    <div className="flex flex-col gap-2">
      {aiToggle}
      <ul className="grid grid-cols-1 gap-2 sm:grid-cols-2">
        {shots.map((shot, index) => {
          const own = ownershipOf(shot.sourceId) === "own";
          const name = names.get(shot.sourceId) ?? shot.sourceId;
          const keep = kept.includes(shot.sourceId);
          const fp = shot.fingerprint?.method === "ai" ? shot.fingerprint : undefined;
          const aiParts = fp ? [fp.density && (t.density[fp.density] ?? fp.density), fp.recipeId && t.recipe(fp.recipeId)].filter(Boolean).join(" · ") : "";
          return (
            <motion.li
              key={shot.sourceId}
              initial={{ opacity: 0, y: 8 }}
              animate={{ opacity: 1, y: 0, transition: { ...tween(CHIP_ENTER), delay: Math.min(index, CHIP_STAGGER_MAX) * CHIP_STAGGER } }}
              className={cn("flex flex-col overflow-hidden rounded-card border bg-white/[0.02]", keep ? "border-app-strong" : "border-dashed border-app")}
            >
              <div aria-label={t.swatches(name)} role="img" className={cn("flex h-14 transition-opacity duration-150", !keep && "opacity-60")}>
                {shot.swatches.slice(0, 8).map((hex, i) => (
                  <span key={`${hex}-${i}`} className="h-full flex-1" style={{ backgroundColor: hex }} />
                ))}
              </div>
              <div className="flex flex-col gap-1.5 p-2.5">
                <p className="truncate text-small font-medium text-fg" title={name}>
                  {name}
                </p>
                <p className="flex flex-wrap items-center gap-x-1.5 text-caption text-muted">
                  <span className={own ? "text-fg/80" : "text-warning"}>{own ? t.own : t.thirdParty}</span>
                  <span aria-hidden className="text-subtle">
                    ·
                  </span>
                  <span>{t.modes[shot.mode] ?? shot.mode}</span>
                  {shot.accentCandidate && (
                    <>
                      <span aria-hidden className="text-subtle">
                        ·
                      </span>
                      <span className="inline-flex items-center gap-1 font-mono">
                        <span aria-hidden className="size-2.5 rounded-[3px]" style={{ backgroundColor: shot.accentCandidate }} />
                        {t.accent(hexLabel(shot.accentCandidate))}
                      </span>
                    </>
                  )}
                </p>
                {!own && <p className="text-caption text-pretty text-muted">{t.attributes}</p>}
                {aiParts && <p className="text-caption text-accent">{t.ai(aiParts)}</p>}
                <Switch
                  size="sm"
                  checked={keep}
                  onCheckedChange={(value) => onKeep(shot.sourceId, value)}
                  label={
                    <>
                      {t.keep}
                      <span className="sr-only">{t.of(name)}</span>
                    </>
                  }
                  className="mt-0.5"
                />
                {aiParts && (
                  <Switch
                    size="sm"
                    checked={aiAttributes.includes(shot.sourceId)}
                    onCheckedChange={(value) => onAiAttributes(shot.sourceId, value)}
                    label={
                      <>
                        {t.useAi}
                        <span className="sr-only">{t.of(name)}</span>
                      </>
                    }
                  />
                )}
              </div>
            </motion.li>
          );
        })}
      </ul>
      {brand.notes.length > 0 && <p className="text-caption text-muted">{t.notes(brand.notes.length)}</p>}
    </div>
  );
}
