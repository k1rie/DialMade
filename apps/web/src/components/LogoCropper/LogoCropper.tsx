"use client";

import { motion, useTransform } from "motion/react";
import { Fragment, useEffect, useId, useMemo, useState } from "react";
import { Button } from "@/components/ui/Button";
import { Chip } from "@/components/ui/Chip";
import { IconButton } from "@/components/ui/IconButton";
import { Kbd } from "@/components/ui/Kbd";
import { Panel } from "@/components/ui/Panel";
import { Slider } from "@/components/ui/Slider";
import { Switch } from "@/components/ui/Switch";
import { useDictionary } from "@/i18n";
import { home } from "@/i18n/home";
import { cn } from "@/lib/cn";
import { isFullCrop, normalizeCrop, type CropRect, type FlowLogo } from "@/lib/image";
import { logoLayoutId } from "@/lib/layout-ids";
import { analyzeLogo, type LogoAnalysis } from "./analyzeLogo";
import { ADJUST_ROWS, BACKDROPS, type Backdrop } from "./constants";
import { CropFrame } from "./CropFrame";
import { CropPreview } from "./CropPreview";
import { constrain, fullRect, sameRect, toNatural, toNormalized } from "./geometry";
import { ArrowLeftIcon, CropIcon, FitIcon, FreeIcon, MinusIcon, PlusIcon, SquareIcon } from "./icons";
import { useCropColors } from "./useCropColors";
import { ZOOM_MAX, ZOOM_MIN, useCropper } from "./useCropper";
import { usePlatformKeys } from "@/hooks/usePlatformKeys";

export type LogoCropperProps = {
  logo: FlowLogo;
  /** Previous crop (normalized 0–1) when coming back to edit it. */
  initialCrop?: CropRect;
  /** «Usar recorte» → normalized crop; «Usar imagen completa» → null. Starts extraction. */
  onConfirm: (crop: CropRect | null) => void;
  /** Back to the drop step (discards the logo). */
  onCancel: () => void;
  /** Localized error from a failed extraction, if any. */
  error?: string;
};

const ZOOM_STEP = 25;
const FALLBACK_SIZE = 512;


/**
 * Crop step (DESIGN-BRIEF §6.1.3): a draggable/resizable crop over the logo (8 handles, arrows,
 * Alt+arrows), free or square, zoom, a live preview and the colors the crop would yield.
 * Starts fitted to the mark when the logo has a transparent or flat background.
 */
export function LogoCropper({ logo, initialCrop, onConfirm, onCancel, error }: LogoCropperProps) {
  const t = useDictionary(home).crop;
  const keys = usePlatformKeys();
  const hintsId = useId();
  const image = useMemo(
    () => ({ w: logo.width > 0 ? logo.width : FALLBACK_SIZE, h: logo.height > 0 ? logo.height : FALLBACK_SIZE }),
    [logo.width, logo.height],
  );
  const [initial] = useState(() => (initialCrop ? constrain(toNatural(initialCrop, image), image, 1) : fullRect(image)));
  const {
    stageRef,
    frameRef,
    screen,
    imageBox,
    rect,
    crop,
    zoom,
    setZoom,
    square,
    setSquare,
    dragging,
    fitTo,
    hasInteracted,
    getCrop,
    onKeyDown,
    nudge,
    stageHandlers,
  } = useCropper(image, initial);

  const [analysis, setAnalysis] = useState<LogoAnalysis>();
  const [backdropChoice, setBackdropChoice] = useState<Backdrop>();
  const [announcement, setAnnouncement] = useState("");

  useEffect(() => {
    let active = true;
    analyzeLogo(logo)
      .then((result) => {
        if (!active) return;
        setAnalysis(result);
        if (!result.box || initialCrop || hasInteracted()) return;
        const target = toNatural(result.box, image);
        if (!sameRect(target, fullRect(image), Math.max(image.w, image.h) * 0.02)) fitTo(target);
      })
      .catch(() => {});
    return () => {
      active = false;
    };
  }, [logo, image, initialCrop, fitTo, hasInteracted]);

  useEffect(() => {
    if (crop === initial) return;
    const timer = setTimeout(
      () => setAnnouncement(t.status(Math.round(crop.w), Math.round(crop.h), Math.round(crop.x), Math.round(crop.y))),
      450,
    );
    return () => clearTimeout(timer);
  }, [crop, initial, t]);

  const normalized = useMemo(() => normalizeCrop(toNormalized(crop, image)), [crop, image]);
  const colors = useCropColors(logo, normalized);
  const backdrop = backdropChoice ?? (analysis?.tone === "dark" ? "light" : "dark");
  const sizeLabel = useTransform(() => t.size(Math.round(rect.w.get()), Math.round(rect.h.get())));

  const confirm = () => {
    const next = normalizeCrop(toNormalized(getCrop(), image));
    onConfirm(isFullCrop(next) ? null : next);
  };

  const fitBox = analysis?.box;
  const zoomPercent = Math.round(zoom * 100);

  return (
    <Panel
      tone="glass"
      className="mx-auto w-full max-w-5xl"
      title={t.title}
      description={t.description}
      actions={<span className="hidden font-mono text-mono text-muted sm:inline">{t.original(Math.round(image.w), Math.round(image.h))}</span>}
    >
      <div className="grid gap-5 lg:grid-cols-[minmax(0,1fr)_15.5rem]">
        <div
          ref={stageRef}
          className="relative h-[clamp(300px,54vh,500px)] cursor-crosshair touch-none overflow-hidden rounded-card border border-app select-none"
          style={BACKDROPS[backdrop]}
          {...stageHandlers}
        >
          <motion.img
            src={logo.objectUrl}
            alt={logo.name}
            draggable={false}
            className="pointer-events-none absolute max-w-none select-none"
            style={imageBox}
          />
          <motion.div layoutId={logoLayoutId} aria-hidden className="pointer-events-none absolute" style={screen} />
          <CropFrame
            box={screen}
            frameRef={frameRef}
            dragging={dragging}
            label={t.areaLabel}
            roleDescription={t.areaRole}
            describedBy={hintsId}
            onKeyDown={onKeyDown}
          />
        </div>

        <aside className="flex flex-col gap-5">
          <section className="flex gap-3">
            <CropPreview src={logo.objectUrl} image={image} rect={rect} backdrop={BACKDROPS[backdrop]} size={88} />
            <div className="flex min-w-0 flex-col gap-2 pt-0.5">
              <h3 className="text-caption text-muted">{t.preview}</h3>
              <motion.p className="font-mono text-mono text-fg tabular-nums">{sizeLabel}</motion.p>
              <h3 className="mt-1 text-caption text-muted">{t.colors}</h3>
              <ul className={cn("flex min-h-5 flex-wrap gap-1 transition-opacity duration-200", colors.pending && "opacity-50")}>
                {colors.swatches?.map((swatch) => (
                  <li
                    key={swatch.hex}
                    title={swatch.hex.toUpperCase()}
                    className="size-5 rounded-[6px] shadow-[inset_0_0_0_1px_oklch(1_0_0/0.12)]"
                    style={{ backgroundColor: swatch.hex }}
                  >
                    <span className="sr-only">{swatch.hex.toUpperCase()}</span>
                  </li>
                ))}
                {!colors.swatches && <li className="text-caption text-subtle">{t.colorsPending}</li>}
              </ul>
            </div>
          </section>

          <section>
            <h3 className="mb-2 text-caption text-muted">{t.aspect}</h3>
            <div role="group" aria-label={t.aspect} className="flex gap-1.5">
              <Chip selected={!square} onSelectedChange={() => setSquare(false)} leading={<FreeIcon className="size-3.5" />}>
                {t.free}
              </Chip>
              <Chip selected={square} onSelectedChange={() => setSquare(true)} leading={<SquareIcon className="size-3.5" />}>
                {t.square}
              </Chip>
            </div>
          </section>

          <section>
            <div className="mb-1 flex items-baseline justify-between">
              <h3 className="text-caption text-muted">{t.zoom}</h3>
              <span className="font-mono text-[11px] leading-4 text-muted tabular-nums">{zoomPercent} %</span>
            </div>
            <div className="flex items-center gap-1">
              <IconButton
                size="sm"
                label={t.zoomOut}
                icon={<MinusIcon />}
                disabled={zoom <= ZOOM_MIN}
                onClick={() => setZoom(zoom - ZOOM_STEP / 100)}
              />
              <Slider
                className="flex-1"
                label={t.zoom}
                min={ZOOM_MIN * 100}
                max={ZOOM_MAX * 100}
                step={5}
                largeStep={ZOOM_STEP}
                value={zoomPercent}
                onValueChange={(value) => setZoom(value / 100)}
                formatValue={(value) => `${value} %`}
              />
              <IconButton
                size="sm"
                label={t.zoomIn}
                icon={<PlusIcon />}
                disabled={zoom >= ZOOM_MAX}
                onClick={() => setZoom(zoom + ZOOM_STEP / 100)}
              />
            </div>
          </section>

          {/* Single-pointer alternative to dragging the crop (WCAG 2.5.7): steps of 10 px. */}
          <section>
            <h3 className="mb-1.5 text-caption text-muted">{t.adjust.title}</h3>
            <div className="grid grid-cols-[auto_1fr] items-center gap-x-2 gap-y-1">
              {ADJUST_ROWS.map(({ row, resize, buttons }) => (
                <Fragment key={row}>
                  <span className="text-caption text-muted">{t.adjust[row]}</span>
                  <div className="flex gap-0.5">
                    {buttons.map(({ key, label, glyph }) => (
                      <IconButton
                        key={key}
                        size="sm"
                        label={t.adjust[label]}
                        icon={<span aria-hidden className="text-small leading-none">{glyph}</span>}
                        onClick={() => nudge(key, resize, true)}
                      />
                    ))}
                  </div>
                </Fragment>
              ))}
            </div>
          </section>

          <section className="flex flex-col items-start gap-3">
            <Switch size="sm" checked={backdrop === "light"} onCheckedChange={(on) => setBackdropChoice(on ? "light" : "dark")} label={t.lightBackdrop} />
            <Button
              variant="ghost"
              size="sm"
              className="-ml-3"
              leadingIcon={<FitIcon />}
              disabled={!fitBox}
              onClick={() => {
                if (!fitBox) return;
                fitTo(toNatural(fitBox, image));
                setAnnouncement(t.fitted);
              }}
            >
              {t.fit}
            </Button>
          </section>

          <section className="hidden sm:block">
            <h3 className="mb-2 text-caption text-muted">{t.keyboard}</h3>
            <dl id={hintsId} className="grid grid-cols-[auto_1fr] items-center gap-x-3 gap-y-2 text-small text-muted">
              <dt className="flex gap-0.5">
                <Kbd>←</Kbd>
                <Kbd>↑</Kbd>
                <Kbd>→</Kbd>
                <Kbd>↓</Kbd>
              </dt>
              <dd>{t.keys.move}</dd>
              <dt className="flex items-center gap-1">
                <Kbd>{keys.shift}</Kbd>
              </dt>
              <dd>{t.keys.faster}</dd>
              <dt className="flex items-center gap-1">
                <Kbd>{keys.alt}</Kbd>
              </dt>
              <dd>{t.keys.resize}</dd>
            </dl>
          </section>
        </aside>
      </div>

      {error && (
        <p role="alert" className="mt-4 text-small text-danger">
          {error}
        </p>
      )}

      <div className="mt-5 flex flex-col-reverse gap-3 border-t border-app pt-4 sm:flex-row sm:items-center sm:justify-between">
        <Button variant="ghost" leadingIcon={<ArrowLeftIcon />} onClick={onCancel}>
          {t.back}
        </Button>
        <div className="flex flex-col-reverse gap-2 sm:flex-row">
          <Button onClick={() => onConfirm(null)}>{t.useFull}</Button>
          <Button variant="primary" leadingIcon={<CropIcon />} onClick={confirm}>
            {t.useCrop}
          </Button>
        </div>
      </div>

      <p aria-live="polite" className="sr-only">
        {announcement}
      </p>
    </Panel>
  );
}
