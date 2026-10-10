"use client";

import type { OutputKind } from "@dialmade/catalog";
import type { DesignDoc } from "@dialmade/doc";
import { MiniApp, MiniBrand, MiniLanding, contentContextFromDoc, initialsOf } from "@dialmade/sections";
import { useMemo, type CSSProperties } from "react";
import { ThemeScope } from "@/components/ThemeScope";
import type { PreviewMode } from "@/hooks/usePaletteFlow";

export type PreviewCardProps = {
  doc: DesignDoc;
  kind: OutputKind;
  mode: PreviewMode;
  logoUrl?: string;
  /** «Landing page», «Guía de estilo»… in the app's language. */
  kindLabel: string;
  /** Accessible name of the card. */
  label: string;
};

const MINIS = { brand: MiniBrand, landing: MiniLanding, app: MiniApp } as const;
/** Brand scale, light to deep, as the bands under the card (ref. 4B Mistral AI). */
const BANDS = [200, 300, 400, 500, 600, 700] as const;

const surface: CSSProperties = {
  background: "color-mix(in oklab, var(--primary) 12%, var(--background))",
  color: "var(--foreground)",
};

/** The direction at a glance, painted with the user's theme: logo, name, tagline and the page mini. */
export function PreviewCard({ doc, kind, mode, logoUrl, kindLabel, label }: PreviewCardProps) {
  const ctx = useMemo(
    () => contentContextFromDoc(doc, { locale: doc.brief.locale, ...(logoUrl && { logoUrl }) }),
    [doc, logoUrl],
  );
  const Mini = MINIS[kind];

  return (
    <ThemeScope
      kind={kind}
      mode={mode}
      role="img"
      aria-label={label}
      className="relative isolate block overflow-hidden rounded-card border border-app"
      style={surface}
    >
      <div className="grid items-center gap-5 p-5 sm:grid-cols-[minmax(0,1fr)_13rem] sm:p-6">
        <div className="flex min-w-0 flex-col items-start gap-1">
          {logoUrl ? (
            // eslint-disable-next-line @next/next/no-img-element -- blob URL of the cropped logo
            <img src={logoUrl} alt="" className="mb-5 block h-10 w-auto max-w-[9rem] object-contain" />
          ) : (
            <span
              className="mb-5 grid size-10 place-items-center text-[0.95rem] font-semibold"
              style={{
                background: "var(--primary)",
                color: "var(--primary-foreground)",
                borderRadius: "var(--dl-radius-md, 10px)",
                fontFamily: "var(--dl-font-heading, inherit)",
              }}
            >
              {initialsOf(doc.brand.name)}
            </span>
          )}
          <span className="m-0 text-caption" style={{ color: "var(--muted-foreground)" }}>
            {kindLabel} · Dialmade
          </span>
          <span
            className="m-0 line-clamp-2 text-h2 break-words"
            style={{ fontFamily: "var(--dl-font-heading, inherit)", fontWeight: "var(--dl-heading-weight, 600)" }}
          >
            {doc.brand.name}
          </span>
          {doc.brand.tagline && (
            <span className="m-0 line-clamp-2 text-small" style={{ color: "var(--muted-foreground)" }}>
              {doc.brand.tagline}
            </span>
          )}
        </div>
        <div className="pointer-events-none hidden overflow-hidden rounded-[10px] shadow-[0_18px_40px_-18px_oklch(0_0_0/0.45)] sm:block">
          <Mini ctx={ctx} />
        </div>
      </div>
      <div aria-hidden className="flex flex-col">
        {BANDS.map((step) => (
          <span key={step} className="block h-1.5" style={{ background: `var(--color-brand-${step})` }} />
        ))}
      </div>
    </ThemeScope>
  );
}
