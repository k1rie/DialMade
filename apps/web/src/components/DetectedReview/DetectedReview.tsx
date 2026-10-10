"use client";

import type { OutputKind } from "@dialmade/catalog";
import { createDesignDoc } from "@dialmade/doc";
import { attachFingerprint, defaultSelection, detachFingerprint, type DetectionEdit, type ImportedBrand, type LogoChoice, type Mode } from "@dialmade/import";
import { generateTheme, type RoleKey } from "@dialmade/palette";
import { useCallback, useEffect, useId, useMemo, useRef, useState } from "react";
import { toast } from "sonner";
import { AiAnalyzeToggle } from "@/components/AiAnalyzeToggle";
import { AiUsageMeter } from "@/components/AiUsageMeter";
import { Button } from "@/components/ui/Button";
import { useAiVision, type AiVisionResult, type VisionScreenshot, type VisionScreenshotDraft } from "@/hooks/useAiVision";
import { isCompleteScreenshot } from "@/lib/ai/vision/client";
import { useDesignDoc } from "@/hooks/useDesignDoc";
import { DEFAULT_PRIMARY, usePaletteFlow, type ImportSession, type PreviewMode } from "@/hooks/usePaletteFlow";
import { useDictionary, useI18n } from "@/i18n";
import { flow } from "@/i18n/flow";
import { importText } from "@/i18n/import";
import { brandNameFromFile } from "@/lib/brand-name";
import { byData, focusSoon } from "@/lib/focus";
import { aaFixEdits, aaTargets } from "./aa";
import { AaNotice } from "./AaNotice";
import { ConflictCard } from "./ConflictCard";
import { MAX_CONFLICTS, slotDomId } from "./constants";
import { DetectedChip } from "./DetectedChip";
import { AlertIcon, ArrowLeftIcon } from "./icons";
import { chipValue, roleLabel } from "./labels";
import {
  SLOT_ROLES,
  acceptChip,
  assignRole,
  chipItems,
  chipState,
  counts,
  dismissChip,
  editChip,
  effectiveColor,
  exitOf,
  initialReview,
  isLockedChip,
  isReadOnly,
  lockChip,
  ownershipOf,
  restoreChip,
  roleKey,
  roleWinners,
  selectionOf,
  setAiAttributes,
  setReference,
  slotMode,
  type ChipGroup,
  type ChipItem,
  type ReviewState,
  type SlotRole,
} from "./model";
import { ModeSummary } from "./ModeSummary";
import { ReferenceCards } from "./ReferenceCards";
import { ReviewBar } from "./ReviewBar";
import { ReviewGroup } from "./ReviewGroup";
import { ReviewPreview } from "./ReviewPreview";
import { RoleSlots, type SlotFill } from "./RoleSlots";
import { useCommitImport } from "./useCommitImport";
import { useReviewPreview } from "./useReviewPreview";
import { WarningsList } from "./WarningsList";

export type DetectedReviewProps = {
  session: ImportSession;
  /** «Volver a los archivos». */
  onBack: () => void;
};

const GROUPS: ChipGroup[] = ["colors", "type", "shape"];

/**
 * «Esto detectamos» (ref. 2D Recraft + 2A Klaviyo): what the batch brought, grouped (Colores ·
 * Tipografía · Formas · Modo · Referencias), with the role slots, the logo-vs-guide cards, the AA
 * warning and a live preview of the guide as it would be applied. Nothing touches the DesignDoc until
 * the one main button, which applies everything as a single undo step.
 */
export function DetectedReview({ session, onBack }: DetectedReviewProps) {
  const { ownership, rightsConfirmedAt } = session;
  // The batch, plus the vision AI's fingerprints once the user runs it (they come in as unlocked suggestions).
  const [brand, setBrand] = useState<ImportedBrand>(session.brand);
  const t = useDictionary(importText).review;
  const f = useDictionary(flow);
  const { locale } = useI18n();
  const { state } = usePaletteFlow();
  const storeDoc = useDesignDoc((s) => s.doc);
  const storeLogoUrl = useDesignDoc((s) => s.logoUrl);
  const titleId = useId();
  const barId = useId();
  const { commit, busy } = useCommitImport(session);

  // Routine confirmations go to a polite region of their own (the assertive one is for drag and drop).
  const [polite, setPolite] = useState("");
  const flip = useRef(false);
  const announce = useCallback((message: string) => {
    flip.current = !flip.current;
    // A trailing zero-width space lets screen readers repeat an identical message.
    setPolite(flip.current ? message : `${message}\u200b`);
  }, []);

  const [review, setReview] = useState<ReviewState>(() => initialReview(defaultSelection(session.brand)));
  // On when the panel's «Analizar estilo con IA» was switched on (that was the consent).
  const [aiOn, setAiOn] = useState(session.analyzeStyle === true);

  const attachVision = useCallback((result: AiVisionResult) => {
    setBrand((current) =>
      result.fingerprints.reduce((next, item) => attachFingerprint(next, item.sourceId, item.fingerprint, result.model), current),
    );
  }, []);
  const vision = useAiVision({ onResult: attachVision });

  /** Switching the analysis off takes its suggestions back out (chips, fingerprint and their choices). */
  const toggleAi = useCallback(
    (next: boolean) => {
      setAiOn(next);
      if (next) return;
      const sources = new Set(brand.colors.filter((color) => color.method === "ai").map((color) => color.sourceId));
      for (const shot of brand.screenshots ?? []) if (shot.fingerprint?.method === "ai") sources.add(shot.sourceId);
      if (sources.size === 0) return;
      const aiIds = new Set(brand.colors.filter((color) => color.method === "ai").map((color) => color.id));
      setBrand((current) => [...sources].reduce((acc, sourceId) => detachFingerprint(acc, sourceId, session.brand), current));
      setReview((current) => ({
        ...current,
        accept: current.accept.filter((id) => !aiIds.has(id)),
        dismissed: current.dismissed.filter((id) => !aiIds.has(id)),
        aiAttributes: current.aiAttributes.filter((id) => !sources.has(id)),
      }));
    },
    [brand, session.brand],
  );

  // A new step starts at the top (the previous one may have been scrolled).
  useEffect(() => {
    window.scrollTo({ top: 0 });
  }, []);

  // The sticky bar must never hide the focused chip (WCAG 2.4.11): focus scrolling keeps its height free.
  useEffect(() => {
    const bar = document.getElementById(barId);
    const root = document.documentElement;
    if (!bar) return;
    const previous = root.style.scrollPaddingBottom;
    const sync = () => {
      const sticky = getComputedStyle(bar).position === "sticky";
      root.style.scrollPaddingBottom = sticky ? `${Math.ceil(bar.getBoundingClientRect().height) + 28}px` : previous;
    };
    sync();
    const observer = new ResizeObserver(sync);
    observer.observe(bar);
    window.addEventListener("resize", sync);
    return () => {
      observer.disconnect();
      window.removeEventListener("resize", sync);
      root.style.scrollPaddingBottom = previous;
    };
  }, [barId]);
  const [previewMode, setPreviewMode] = useState<PreviewMode>(state.previewMode);
  const [previewKind, setPreviewKind] = useState<OutputKind>(state.previewKind);

  const items = useMemo(() => chipItems(brand), [brand]);
  const byId = useMemo(() => new Map(items.map((item) => [item.id, item])), [items]);
  const { selection, extraOps } = useMemo(() => selectionOf(brand, review), [brand, review]);
  const winners = useMemo(() => roleWinners(brand, { ...review, edits: { ...selection.edits } }, ownership), [brand, review, selection, ownership]);
  const mode = slotMode(winners);

  const logo = session.logo;
  const baseDoc = useMemo(() => {
    if (storeDoc) return storeDoc;
    const primary = logo?.extract.seeds.primary.hex ?? state.primary ?? DEFAULT_PRIMARY;
    return createDesignDoc({
      brand: {
        name: brandNameFromFile(logo?.logo.name ?? state.logo?.name) ?? f.doc.defaultName,
        seeds: { primary },
        achromatic: generateTheme({ primary }).achromatic,
      },
      brief: { locale, paletteStyleId: state.styleId },
    });
  }, [storeDoc, logo, state.primary, state.logo, state.styleId, locale, f.doc.defaultName]);

  const preview = useReviewPreview({ baseDoc, brand, selection, extraOps, ownership, ...(rightsConfirmedAt && { rightsConfirmedAt }) });
  const targets = useMemo(() => aaTargets(preview.doc, preview.failures, winners), [preview, winners]);
  const exit = exitOf(brand, review, ownership);
  const totals = counts(brand, review, ownership);

  const valueOf = useCallback((id: string) => {
    const item = byId.get(id);
    return item ? chipValue(item, review.edits[id], t, locale) : id;
  }, [byId, review.edits, t, locale]);

  const update = useCallback((next: (current: ReviewState) => ReviewState, message?: string) => {
    setReview(next);
    if (message) announce(message);
  }, [announce]);

  const assign = useCallback(
    (id: string, role: RoleKey | null, slot: Mode = mode) => {
      update((current) => assignRole(current, brand, id, role, slot), role ? t.slots.filled(roleLabel(role, t), valueOf(id)) : t.chip.roleClearedLive(valueOf(id)));
    },
    [update, brand, mode, t, valueOf],
  );

  const fills: Partial<Record<SlotRole, SlotFill>> = {};
  for (const role of SLOT_ROLES) {
    const color = winners.get(roleKey(mode, role));
    if (!color) continue;
    const eff = effectiveColor(color, selection.edits?.[color.id]);
    fills[role] = { id: color.id, hex: eff.hex, ...(eff.alpha !== undefined && { alpha: eff.alpha }) };
  }

  const grouped = (group: ChipGroup) => {
    const list = items.filter((item) => item.group === group);
    return {
      active: list.filter((item) => chipState(item.id, review) !== "dismissed").map((item) => item.id),
      dismissed: list.filter((item) => chipState(item.id, review) === "dismissed").map((item) => item.id),
    };
  };
  const toggleIdOf = (group: ChipGroup) => `${titleId}-dismissed-${group}`;

  // Focus never falls to <body> when the control that was used goes away (WCAG 2.4.3).
  const chipTarget = (id: string, ...actions: string[]) => [
    ...actions.map((action) => `${byData("chip-id", id)} ${byData("chip-action", action)}`),
    `${byData("chip-id", id)} [role='button'], ${byData("chip-id", id)} [role='group']`,
  ];
  const focusAfterDismiss = (id: string) => {
    const item = byId.get(id);
    if (!item) return;
    const { active } = grouped(item.group);
    const index = active.indexOf(id);
    const next = active[index + 1] ?? active[index - 1];
    focusSoon(...(next ? chipTarget(next, "use", "edit", "lock") : []), `#${CSS.escape(toggleIdOf(item.group))}`);
  };

  const copy = (value: string) => {
    void navigator.clipboard?.writeText(value).then(
      () => toast(t.chip.copied(value)),
      () => {},
    );
  };

  const renderChip = (id: string, index: number) => {
    const item = byId.get(id) as ChipItem;
    const status = chipState(id, review);
    const edit = selection.edits?.[id];
    const eff = item.kind === "color" ? effectiveColor(item.color, edit) : undefined;
    const alternative = !!eff?.role && winners.get(roleKey(eff.mode, eff.role))?.id !== id;
    const value = valueOf(id);
    return (
      <DetectedChip
        key={id}
        item={item}
        state={status}
        locked={isLockedChip(item, brand, ownership, { ...review, edits: { ...selection.edits } })}
        readOnly={isReadOnly(item, brand, ownership)}
        edit={edit}
        alternative={alternative}
        slotMode={mode}
        index={index}
        onAccept={() => {
          update((current) => acceptChip(current, id), t.chip.accepted(value));
          focusSoon(...chipTarget(id, "edit", "lock"));
        }}
        onDismiss={() => {
          focusAfterDismiss(id);
          update((current) => dismissChip(current, id), t.chip.dismissedLive(value));
        }}
        onRestore={() => {
          update((current) => restoreChip(current, id), t.chip.restoredLive(value));
          focusSoon(...chipTarget(id, "edit", "lock", "dismiss"));
        }}
        onLock={(locked) => update((current) => lockChip(current, id, locked), locked ? t.chip.lockedLive(value) : t.chip.unlockedLive(value))}
        onEdit={(next: DetectionEdit) => update((current) => editChip(current, id, next), t.chip.editedLive(next.color ?? next.family ?? String(next.px ?? "")))}
        onAssign={(role) => assign(id, role)}
        onCopy={copy}
      />
    );
  };

  const colorGroups = grouped("colors");
  const typeGroups = grouped("type");
  const shapeGroups = grouped("shape");
  const ownColors = brand.colors.some((color) => ownershipOf(brand, ownership, color.sourceId) === "own");
  const conflicts = brand.conflicts.slice(0, MAX_CONFLICTS);
  const modeColors = { light: 0, dark: 0 };
  for (const key of winners.keys()) modeColors[key.startsWith("dark:") ? "dark" : "light"] += 1;
  const shots = { light: 0, dark: 0 };
  for (const shot of brand.screenshots ?? []) if (shot.mode !== "ambiguous") shots[shot.mode] += 1;
  const sha = new Map(brand.sources.map((source) => [source.id, source]));
  const visionShots: VisionScreenshotDraft[] = (brand.screenshots ?? [])
    .filter((shot) => ownershipOf(brand, ownership, shot.sourceId) === "own")
    .map((shot) => ({
      sourceId: shot.sourceId,
      swatches: shot.swatches,
      width: shot.width,
      height: shot.height,
      ...(session.sourceFiles?.[shot.sourceId] && { file: session.sourceFiles[shot.sourceId] }),
      ...(sha.get(shot.sourceId) && { contentHash: sha.get(shot.sourceId)!.sha256, fileName: sha.get(shot.sourceId)!.fileName }),
    }));

  // The panel's switch was the consent: run the analysis once, as soon as the screenshots are here.
  const autoRun = useRef(session.analyzeStyle === true);
  const ready = visionShots.length > 0 && visionShots.every(isCompleteScreenshot) ? (visionShots as VisionScreenshot[]) : null;
  useEffect(() => {
    if (!autoRun.current || !ready) return;
    autoRun.current = false;
    vision.analyze({ screenshots: ready }).catch(() => {
      // Shown by AiAnalyzeToggle (vision.error), with its ways out.
    });
  }, [ready, vision]);

  const fixAa = () => {
    const fixed = aaFixEdits(preview.doc, targets, selection.edits ?? {});
    const ids = Object.keys(fixed);
    if (ids.length === 0) return;
    update(
      (current) => ({
        ...current,
        aaBackup: current.aaBackup ?? Object.fromEntries(ids.map((id) => [id, current.edits[id] ?? {}])),
        edits: { ...current.edits, ...fixed },
        accept: [...new Set([...current.accept, ...ids])],
      }),
      t.aa.fixed(ids.length),
    );
  };
  const undoAa = () =>
    update((current) => {
      if (!current.aaBackup) return current;
      const edits = { ...current.edits };
      for (const [id, edit] of Object.entries(current.aaBackup)) {
        if (Object.keys(edit).length === 0) delete edits[id];
        else edits[id] = edit;
      }
      return { ...current, edits, aaBackup: undefined };
    }, t.aa.undone);

  return (
    <div className="mx-auto grid w-full max-w-[1280px] items-start gap-4 lg:grid-cols-[minmax(0,480px)_minmax(0,1fr)]">
      <section aria-labelledby={titleId} className="glass flex min-w-0 flex-col rounded-panel border border-app p-4 shadow-surface sm:p-5">
        <div className="flex flex-col gap-3">
          <Button variant="ghost" size="sm" leadingIcon={<ArrowLeftIcon />} className="self-start" disabled={busy} onClick={onBack}>
            {t.back}
          </Button>
          <div className="flex flex-col gap-1">
            <h1 id={titleId} className="text-h3 text-fg">
              {t.title}
            </h1>
            <p className="text-small text-pretty text-muted">{t.subtitle}</p>
          </div>
          {ownership !== "own" && (
            <p className="flex items-start gap-2 rounded-card border border-warning/30 bg-warning/[0.06] p-3 text-caption text-pretty text-fg/85">
              <AlertIcon className="mt-px size-4 shrink-0 text-warning" />
              {t.thirdParty}
            </p>
          )}
          {conflicts.map((conflict) => (
            <ConflictCard
              key={`${conflict.role}-${conflict.guideId}`}
              conflict={conflict}
              choice={review.conflicts[conflict.role] ?? "guide"}
              onChoose={(choice: LogoChoice) =>
                update((current) => ({ ...current, conflicts: { ...current.conflicts, [conflict.role]: choice } }), t.conflicts.choices[choice])
              }
            />
          ))}
          <AaNotice
            failures={preview.failures}
            fixable={targets.length}
            onFix={fixAa}
            {...(review.aaBackup && { onUndo: undoAa, fixed: Object.keys(review.aaBackup).length })}
          />
        </div>

        {ownColors && (
          <ReviewGroup title={t.slots.title}>
            <RoleSlots
              mode={mode}
              fills={fills}
              onDrop={(role, detectedId) => assign(detectedId, role)}
              onClear={(role) => {
                const occupant = winners.get(roleKey(mode, role));
                if (!occupant) return;
                update((current) => assignRole(current, brand, occupant.id, null, mode), t.slots.clearedLive(t.slots.names[role] ?? role));
                focusSoon(`#${CSS.escape(slotDomId(role))}`);
              }}
            />
          </ReviewGroup>
        )}

        {GROUPS.map((group) => {
          const lists = group === "colors" ? colorGroups : group === "type" ? typeGroups : shapeGroups;
          const included = lists.active.filter((id) => chipState(id, review) === "accepted").length;
          return (
            <ReviewGroup
              key={group}
              title={t.groups[group]}
              aside={lists.active.length > 0 ? `${included}/${lists.active.length}` : undefined}
              empty={t.empty[group]}
              active={lists.active}
              dismissed={lists.dismissed}
              renderChip={renderChip}
              dismissedToggleId={toggleIdOf(group)}
            />
          );
        })}

        <ReviewGroup title={t.groups.mode}>
          <ModeSummary colors={modeColors} shots={shots} />
        </ReviewGroup>

        <ReviewGroup title={t.groups.references}>
          {(brand.screenshots?.length ?? 0) > 0 || brand.notes.length > 0 ? (
            <ReferenceCards
              brand={brand}
              ownershipOf={(sourceId) => ownershipOf(brand, ownership, sourceId)}
              kept={review.references}
              onKeep={(sourceId, keep) => update((current) => setReference(current, sourceId, keep))}
              aiAttributes={review.aiAttributes}
              onAiAttributes={(sourceId, use) => update((current) => setAiAttributes(current, sourceId, use))}
              aiToggle={
                visionShots.length > 0 ? (
                  <div className="flex flex-col gap-1.5">
                    <AiAnalyzeToggle vision={vision} screenshots={visionShots} checked={aiOn} onCheckedChange={toggleAi} />
                    <AiUsageMeter />
                  </div>
                ) : undefined
              }
            />
          ) : (
            <p className="text-small text-muted">{t.empty.references}</p>
          )}
        </ReviewGroup>

        <WarningsList brand={brand} skipped={preview.skipped} labelOf={valueOf} />
      </section>

      <ReviewPreview
        className="lg:sticky lg:top-4"
        doc={preview.doc}
        theme={preview.theme}
        mode={previewMode}
        onModeChange={setPreviewMode}
        kind={previewKind}
        onKindChange={setPreviewKind}
        logoUrl={logo?.logo.objectUrl ?? storeLogoUrl ?? state.logo?.objectUrl}
      />

      <ReviewBar
        id={barId}
        className="z-30 sm:sticky sm:bottom-3 lg:col-span-2"
        colors={totals.colors}
        fonts={totals.fonts}
        aaWarnings={preview.failures.length}
        exit={exit}
        toLogo={!state.primary && !storeDoc}
        busy={busy}
        onCommit={() => void commit(exit, brand, selection, extraOps)}
      />
      <p aria-live="polite" aria-atomic="true" className="sr-only">
        {polite}
      </p>
    </div>
  );
}
