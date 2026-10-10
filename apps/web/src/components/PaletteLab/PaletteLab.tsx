"use client";

import { outputKindOptions } from "@dialmade/catalog";
import { PALETTE_STYLES, type ColorMode, type PaletteStyleId } from "@dialmade/palette";
import { useCallback, useId, useRef } from "react";
import { useDndAnnounce } from "@/components/dnd/DndAnnouncer";
import { useDesignDoc, useDesignDocActions } from "@/hooks/useDesignDoc";
import { usePaletteFlow } from "@/hooks/usePaletteFlow";
import { useDictionary, useI18n } from "@/i18n";
import { flow } from "@/i18n/flow";
import { palette } from "@/i18n/palette";
import { brandNameFromFile } from "@/lib/brand-name";
import { cn } from "@/lib/cn";
import type { FlowLogo } from "@/lib/image";
import { AchromaticNotice } from "./AchromaticNotice";
import { BrandHeader } from "./BrandHeader";
import type { SeedRole } from "./constants";
import { ContrastTable } from "./ContrastTable";
import { brandSlug, formatHex } from "./format";
import { LabBar } from "./LabBar";
import { LabSection } from "./LabSection";
import { LivePreview } from "./LivePreview";
import { LogoColors } from "./LogoColors";
import { PaletteStyles } from "./PaletteStyles";
import { ScaleStrip } from "./ScaleStrip";
import { SeedSlots } from "./SeedSlots";
import { useLogoUpload } from "./useLogoUpload";

export type PaletteLabProps = {
  className?: string;
};

/**
 * «1 Marca» — Palette Lab (ref. Recraft's palette popover + Klaviyo's live preview). Left: logo colors,
 * primary/secondary seeds with a picker, palette styles, the 50–950 scale and AA contrast. Right: the
 * three things to create as tabs with their minis in the live theme. Bottom: progress, logo change,
 * compact export and «Crear {pestaña} →». Everything reads and writes `usePaletteFlow()`.
 */
export function PaletteLab({ className }: PaletteLabProps) {
  const { state, actions } = usePaletteFlow();
  const designActions = useDesignDocActions();
  const docName = useDesignDoc((s) => s.doc?.brand.name);
  const croppedLogoUrl = useDesignDoc((s) => s.logoUrl);
  const { t, locale } = useI18n();
  const p = useDictionary(palette);
  const f = useDictionary(flow);
  const announce = useDndAnnounce();
  const panelRef = useRef<HTMLElement>(null);
  const colorsId = useId();
  const seedsId = useId();
  const stylesId = useId();
  const scaleId = useId();
  const contrastId = useId();

  // A new logo starts a new brand: the DesignDoc (pages, edits, history) is dropped before cropping it.
  const upload = useLogoUpload(
    useCallback(
      (logo: FlowLogo) => {
        designActions.reset();
        actions.setLogo(logo);
      },
      [designActions, actions],
    ),
  );

  const { theme, primary, secondary, styleId, previewMode, previewKind, extract, logo } = state;

  /** Placing a color that already fills the other role swaps them instead of duplicating it. */
  const placeSeed = useCallback(
    (role: SeedRole, hex: string): boolean => {
      if (role === "primary" && hex === primary) return false;
      if (role === "secondary" && hex === secondary) return false;
      if (role === "primary" && hex === secondary) actions.swapSeeds();
      else if (role === "secondary" && hex === primary) {
        if (!secondary) return false;
        actions.swapSeeds();
      } else actions.setSeeds({ [role]: hex });
      return true;
    },
    [actions, primary, secondary],
  );

  const selectStyle = useCallback(
    (id: PaletteStyleId, defaultMode: ColorMode) => {
      actions.setStyle(id);
      actions.setPreviewMode(defaultMode);
    },
    [actions],
  );

  if (!theme || !primary) return null;

  const brandName = docName ?? brandNameFromFile(logo?.name) ?? f.doc.defaultName;
  const logoUrl = croppedLogoUrl ?? logo?.objectUrl;
  const style = PALETTE_STYLES.find((item) => item.id === styleId) ?? PALETTE_STYLES[0]!;
  const kindOption = outputKindOptions.find((option) => option.id === previewKind) ?? outputKindOptions[0]!;
  const swatches = extract?.swatches ?? [];
  const seedLabels: Record<SeedRole, string> = { primary: p.seeds.primary, secondary: p.seeds.secondary };

  return (
    <div className={cn("mx-auto grid w-full max-w-[1280px] items-start gap-4 lg:grid-cols-[minmax(0,380px)_minmax(0,1fr)]", className)}>
      <section ref={panelRef} aria-label={p.lab.controls} className="glass flex min-w-0 flex-col rounded-panel border border-app p-4 shadow-surface sm:p-5">
        <BrandHeader
          name={brandName}
          logoUrl={logo ? logoUrl : undefined}
          seed={primary}
          primary={theme.light.primary}
          onPrimary={theme.light.primaryForeground}
          styleLabel={style.label[locale]}
          onRecrop={logo ? actions.editCrop : undefined}
        />

        <LabSection title={p.colors.title} headingId={colorsId} aside={swatches.length > 0 ? p.colors.count(swatches.length) : undefined}>
          <LogoColors
            swatches={swatches}
            primary={primary}
            secondary={secondary}
            headingId={colorsId}
            uploading={upload.reading}
            onUpload={upload.open}
            onUse={(role, hex) => {
              if (placeSeed(role, hex)) announce(t.dnd.placed(formatHex(hex), seedLabels[role]));
            }}
          />
          {swatches.length > 0 && <p className="mt-2.5 text-caption text-muted">{p.colors.hint}</p>}
        </LabSection>

        <LabSection title={p.seeds.title} headingId={seedsId}>
          <SeedSlots
            primary={primary}
            secondary={secondary}
            boundaryRef={panelRef}
            onChange={(role, hex) => {
              placeSeed(role, hex);
            }}
            onRemoveSecondary={() => actions.setSeeds({ secondary: null })}
            onSwap={actions.swapSeeds}
          />
          {theme.achromatic && (
            <div className="mt-3">
              <AchromaticNotice
                secondary={secondary}
                styleAccent={!!theme.scales.accent}
                onPick={(hex) => actions.setSeeds({ secondary: hex })}
              />
            </div>
          )}
        </LabSection>

        <LabSection title={p.styles.title} headingId={stylesId}>
          <PaletteStyles styleId={styleId} primary={primary} secondary={secondary} onSelect={selectStyle} />
        </LabSection>

        <LabSection title={p.scale.title} headingId={scaleId}>
          <ScaleStrip theme={theme} />
        </LabSection>

        <LabSection title={p.contrast.title} headingId={contrastId}>
          <ContrastTable theme={theme} mode={previewMode} />
        </LabSection>
      </section>

      <LivePreview
        className="lg:sticky lg:top-4"
        theme={theme}
        mode={previewMode}
        onModeChange={actions.setPreviewMode}
        kind={previewKind}
        onKindChange={actions.setPreviewKind}
        brandName={brandName}
        logoUrl={logo ? logoUrl : undefined}
      />

      <LabBar
        className="z-30 sm:sticky sm:bottom-3 lg:col-span-2"
        theme={theme}
        hasLogo={!!logo}
        kindLabel={kindOption.label[locale]}
        fileBase={brandSlug(brandName)}
        uploading={upload.reading}
        onChangeLogo={upload.open}
        onCreate={actions.goToCreate}
      />
      <input {...upload.inputProps} />
    </div>
  );
}
