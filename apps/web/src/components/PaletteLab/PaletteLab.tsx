"use client";

import { outputKindOptions } from "@dialmade/catalog";
import { PALETTE_STYLES, cssVarName, generateTheme, type ColorMode, type PaletteStyleId, type RoleKey, type ThemePins } from "@dialmade/palette";
import { useCallback, useEffect, useId, useRef } from "react";
import { toast } from "sonner";
import { useDndAnnounce } from "@/components/dnd/DndAnnouncer";
import { Button } from "@/components/ui/Button";
import { useDesignDoc, useDesignDocActions, useDesignDocStore } from "@/hooks/useDesignDoc";
import { usePaletteFlow } from "@/hooks/usePaletteFlow";
import { useDictionary, useI18n } from "@/i18n";
import { flow } from "@/i18n/flow";
import { importText } from "@/i18n/import";
import { palette } from "@/i18n/palette";
import { brandNameFromFile } from "@/lib/brand-name";
import { cn } from "@/lib/cn";
import type { FlowLogo } from "@/lib/image";
import { AchromaticNotice } from "./AchromaticNotice";
import { BrandHeader } from "./BrandHeader";
import type { SeedRole } from "./constants";
import { ContrastTable } from "./ContrastTable";
import { LayersIcon } from "./icons";
import { ImportedLocks } from "./ImportedLocks";
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

/** `pointer` or an ancestor is in `locks` (the doc's hard locks are JSON Pointers). */
const lockedIn = (locks: readonly string[], pointer: string) => locks.some((lock) => lock === pointer || pointer.startsWith(`${lock}/`));

/**
 * «1 Marca» — Palette Lab (ref. Recraft's palette popover + Klaviyo's live preview). Left: logo colors,
 * primary/secondary seeds with a picker, palette styles, the 50–950 scale and AA contrast. Right: the
 * three things to create as tabs with their minis in the live theme. Bottom: progress, logo change,
 * compact export and «Crear {pestaña} →». Everything reads and writes `usePaletteFlow()`.
 */
export function PaletteLab({ className }: PaletteLabProps) {
  const { state, actions } = usePaletteFlow();
  const designActions = useDesignDocActions();
  const docStore = useDesignDocStore();
  const docName = useDesignDoc((s) => s.doc?.brand.name);
  const croppedLogoUrl = useDesignDoc((s) => s.logoUrl);
  const { t, locale } = useI18n();
  const p = useDictionary(palette);
  const f = useDictionary(flow);
  const imp = useDictionary(importText);
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

  const unlockImportedRef = useRef<() => void>(() => {});

  /** Placing a color that already fills the other role swaps them instead of duplicating it. */
  const placeSeed = useCallback(
    (role: SeedRole, hex: string): boolean => {
      if (role === "primary" && hex === primary) return false;
      if (role === "secondary" && hex === secondary) return false;
      const locks = docStore.getState().doc?.brief.locks ?? [];
      const touched: SeedRole[] = hex === primary || hex === secondary ? ["primary", "secondary"] : [role];
      const blocked = touched.find((seed) => lockedIn(locks, `/brand/seeds/${seed}`));
      if (blocked) {
        // An import locked it («tu guía manda»): the doc would ignore the change, so say why.
        const label = blocked === "primary" ? p.seeds.primary : p.seeds.secondary;
        toast(imp.lab.seedLocked(label), { id: "seed-locked", action: { label: imp.lab.unlock, onClick: () => unlockImportedRef.current() } });
        return false;
      }
      if (role === "primary" && hex === secondary) actions.swapSeeds();
      else if (role === "secondary" && hex === primary) {
        if (!secondary) return false;
        actions.swapSeeds();
      } else actions.setSeeds({ [role]: hex });
      return true;
    },
    [actions, primary, secondary, docStore, p, imp],
  );

  /** «Desbloquear» the imported colors: the doc drops their locks and palette styles move them again. */
  const unlockImported = useCallback(() => {
    const doc = docStore.getState().doc;
    if (doc) {
      const locks = doc.brief.locks.filter((lock) => !(lock.startsWith("/tokens/color") || lock.startsWith("/brand/seeds")));
      if (locks.length !== doc.brief.locks.length) {
        const result = designActions.applyPatch([{ op: "replace", path: "/brief/locks", value: locks }], { allowLocked: true });
        if (!result.ok) {
          toast.error(t.errors.generic);
          return;
        }
      }
    }
    actions.setPinned(undefined);
    announce(imp.lab.unlocked);
    // The note with the button unmounts: focus goes to its section instead of the page top.
    requestAnimationFrame(() => document.getElementById(seedsId)?.focus({ preventScroll: true }));
  }, [docStore, designActions, actions, announce, imp, t, seedsId]);
  useEffect(() => {
    unlockImportedRef.current = unlockImported;
  }, [unlockImported]);

  /**
   * «Ajustar a AA» for the guide's own pairs: the engine generates those text colors again without
   * their pin (so contrast enforcement moves them), and they stay locked with the new value. A user
   * action, so it may change locked tokens.
   */
  const fixImportedAa = useCallback(() => {
    const pins = state.pinned;
    if (!theme || !primary || !pins) return;
    const targets = new Map<string, { mode: ColorMode; role: RoleKey }>();
    for (const check of theme.contrast) {
      if (check.pass || check.source !== "imported") continue;
      const role = check.pair.split("/")[0] as RoleKey;
      if (pins[check.mode]?.[role] !== undefined) targets.set(`${check.mode}:${role}`, { mode: check.mode, role });
    }
    if (targets.size === 0) return;
    const unpinned: ThemePins = { ...pins, light: { ...pins.light }, dark: { ...pins.dark } };
    for (const { mode, role } of targets.values()) delete unpinned[mode]![role];
    const fixed = generateTheme({ primary, ...(secondary && { secondary }), style: styleId, pinned: unpinned });
    const next: ThemePins = { ...pins, light: { ...pins.light }, dark: { ...pins.dark } };
    const ops = [...targets.values()].map(({ mode, role }) => {
      next[mode]![role] = fixed[mode][role];
      return { op: "add" as const, path: `/tokens/color/${mode}/${cssVarName(role)}`, value: fixed[mode][role] };
    });
    if (docStore.getState().doc) {
      const result = designActions.applyPatch(ops, { allowLocked: true });
      if (!result.ok) {
        toast.error(t.errors.generic);
        return;
      }
    }
    actions.setPinned(next);
    announce(p.contrast.fixedImported(targets.size));
  }, [state.pinned, theme, primary, secondary, styleId, docStore, designActions, actions, announce, p, t]);

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
  const pinnedCount = Object.keys(state.pinned?.light ?? {}).length + Object.keys(state.pinned?.dark ?? {}).length;

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

        <LabSection
          title={p.colors.title}
          headingId={colorsId}
          aside={
            <span className="inline-flex items-center gap-2">
              {swatches.length > 0 && p.colors.count(swatches.length)}
              <Button variant="ghost" size="sm" leadingIcon={<LayersIcon />} title={imp.entry.labHint} className="-my-1.5" onClick={() => actions.openImport()}>
                {imp.entry.lab}
              </Button>
            </span>
          }
        >
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
          {pinnedCount > 0 && (
            <div className="mt-3">
              <ImportedLocks count={pinnedCount} onUnlock={unlockImported} />
            </div>
          )}
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
          <ContrastTable theme={theme} mode={previewMode} {...(state.pinned && { onFixImported: fixImportedAa })} />
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
