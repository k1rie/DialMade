"use client";

import { AnimatePresence, motion } from "motion/react";
import { useCallback, useId, useRef, useState } from "react";
import { toast } from "sonner";
import { DropSlot } from "@/components/dnd/DropSlot";
import { SAMPLE_DRAG_TYPE, SampleLogos, findSample, loadSampleFile, type SampleLogo } from "@/components/SampleLogos";
import { Button } from "@/components/ui/Button";
import { Kbd } from "@/components/ui/Kbd";
import { DEFAULT_PRIMARY } from "@/hooks/usePaletteFlow";
import { useDictionary, useI18n } from "@/i18n";
import { home } from "@/i18n/home";
import { cn } from "@/lib/cn";
import { LOGO_ACCEPT, MAX_LOGO_BYTES, MAX_LOGO_MB, isAcceptedLogo } from "@/lib/image";
import { popVariants, smooth } from "@/lib/motion";
import { ColorPanel } from "./ColorPanel";
import { HeroPopover } from "./HeroPopover";
import { HeroSample, type HeroSampleState } from "./HeroSample";
import { DropletIcon, LinkIcon, UploadIcon } from "./icons";
import { UrlPanel } from "./UrlPanel";
import { useLogoPaste } from "./useLogoPaste";
import { usePlatformKeys } from "@/hooks/usePlatformKeys";
import { useWindowFileDrop } from "./useWindowFileDrop";

export type HomeHeroProps = {
  /** A file was picked, dropped, pasted or built from a sample logo. The flow validates it (readLogoFile) and moves to "crop". */
  onFile: (file: File) => void;
  /** «No tengo logo»: go straight to the palette, optionally with a starting color (any CSS color). */
  onSkip: (primary?: string) => void;
  /** True while the flow reads/validates the file. */
  busy?: boolean;
  /** Localized error from the last attempt (also shown as a toast by the flow). */
  error?: string;
};

type PanelId = "url" | "color";

/**
 * Home (DESIGN-BRIEF §6.1, ref. Higgsfield): a big dashed drop zone with a sample card, one CTA and
 * secondary ways in (URL, color without logo, sample logos). Files can be dropped anywhere on the
 * page or pasted with Cmd/Ctrl+V; sample tiles can be dragged into the zone or clicked.
 */
export function HomeHero({ onFile, onSkip, busy = false, error }: HomeHeroProps) {
  const t = useDictionary(home);
  const { t: common } = useI18n();
  const keys = usePlatformKeys();
  const urlPanelId = useId();
  const colorPanelId = useId();
  const inputRef = useRef<HTMLInputElement>(null);
  const urlTriggerRef = useRef<HTMLButtonElement>(null);
  const colorTriggerRef = useRef<HTMLButtonElement>(null);
  const [panel, setPanel] = useState<PanelId | null>(null);
  const [pastedUrl, setPastedUrl] = useState<string>();
  const [hovered, setHovered] = useState(false);
  const [loadingSample, setLoadingSample] = useState<string>();

  const submit = useCallback(
    (file: File) => {
      if (busy) return;
      if (!isAcceptedLogo(file)) {
        toast.error(common.errors.unsupportedType);
        return;
      }
      if (file.size > MAX_LOGO_BYTES) {
        toast.error(common.errors.tooLarge(MAX_LOGO_MB));
        return;
      }
      setPanel(null);
      onFile(file);
    },
    [busy, common, onFile],
  );

  const fileOver = useWindowFileDrop(submit);
  useLogoPaste({
    onFile: submit,
    onUrl: (url) => {
      setPastedUrl(url);
      setPanel("url");
    },
  });

  const pickSample = useCallback(
    async (sample: SampleLogo) => {
      if (busy || loadingSample) return;
      setLoadingSample(sample.id);
      try {
        submit(await loadSampleFile(sample));
      } catch {
        toast.error(t.samples.loadFailed);
      } finally {
        setLoadingSample(undefined);
      }
    },
    [busy, loadingSample, submit, t],
  );

  const toggle = (id: PanelId) => {
    setPastedUrl(undefined);
    setPanel((current) => (current === id ? null : id));
  };

  const closePanel = (restoreFocus: boolean) => {
    const trigger = panel === "url" ? urlTriggerRef : colorTriggerRef;
    setPanel(null);
    if (restoreFocus) trigger.current?.focus();
  };

  const working = busy || !!loadingSample;
  const live = busy ? t.hero.reading : fileOver ? t.hero.fileOver : "";

  return (
    <div className="mx-auto flex w-full max-w-[600px] flex-col items-center gap-6">
      <motion.div
        className="w-full"
        initial={false}
        animate={{ scale: fileOver ? 1.01 : 1 }}
        transition={smooth}
        onPointerEnter={(event) => event.pointerType === "mouse" && setHovered(true)}
        onPointerLeave={() => setHovered(false)}
      >
        <DropSlot
          id="home-dropzone"
          as="section"
          accept={SAMPLE_DRAG_TYPE}
          label={t.hero.zoneLabel}
          aria-label={t.hero.zoneLabel}
          className="rounded-panel"
          onDrop={(item) => {
            const sample = findSample(String(item.data.sampleId));
            if (sample) void pickSample(sample);
          }}
        >
          {(state) => {
            const over = fileOver || state === "over";
            const sampleState: HeroSampleState = working ? "busy" : over ? "drag" : hovered || state === "compatible" ? "hover" : "idle";
            return (
              <>
                <span
                  aria-hidden
                  className={cn(
                    "pointer-events-none absolute inset-0 rounded-[inherit] border border-dashed transition-[border-color,background-color] duration-200 ease-out",
                    fileOver
                      ? "glow-purple border-accent/80 bg-accent-soft"
                      : over
                        ? "border-accent/80"
                        : hovered
                          ? "border-white/[0.24] bg-white/[0.015]"
                          : "border-white/[0.14] bg-white/[0.01]",
                  )}
                />
                <span
                  aria-hidden
                  className="pointer-events-none absolute inset-x-10 top-0 h-48 bg-[radial-gradient(ellipse_at_top,oklch(1_0_0/0.07),transparent_70%)]"
                />
                <AnimatePresence>
                  {over && (
                    <motion.span
                      key="release"
                      aria-hidden
                      variants={popVariants}
                      initial="initial"
                      animate="animate"
                      exit="exit"
                      className="absolute top-5 left-1/2 z-10 -translate-x-1/2 rounded-chip border border-accent/50 bg-app-elevated/90 px-2.5 py-1 text-caption text-fg shadow-surface"
                    >
                      {t.hero.releaseToUpload}
                    </motion.span>
                  )}
                </AnimatePresence>
                <div className="relative flex min-h-[clamp(400px,calc(100dvh-19rem),540px)] flex-col items-center justify-center gap-7 px-5 py-12 text-center sm:px-10">
                  <HeroSample state={sampleState} />
                  <div className="flex max-w-md flex-col items-center gap-2.5">
                    <h1 className="text-h2 text-balance text-fg sm:text-h1">{t.hero.title}</h1>
                    <p className="text-body text-pretty text-muted">{t.hero.subtitle}</p>
                  </div>
                  <div className="flex flex-col items-center gap-3">
                    <Button
                      variant="primary"
                      size="lg"
                      loading={busy}
                      leadingIcon={<UploadIcon />}
                      onClick={() => inputRef.current?.click()}
                    >
                      {t.hero.upload}
                    </Button>
                    <p className="flex flex-wrap items-center justify-center gap-x-1.5 gap-y-1 text-small text-muted">
                      <span>{t.hero.formats(MAX_LOGO_MB)}</span>
                      <span aria-hidden className="hidden text-subtle sm:inline">
                        ·
                      </span>
                      <span className="hidden items-center gap-1 sm:inline-flex">
                        {t.hero.pasteHint}
                        <Kbd>{keys.mod}</Kbd>
                        <Kbd>V</Kbd>
                      </span>
                    </p>
                  </div>
                  {error && (
                    <p role="alert" className="text-small text-danger">
                      {error}
                    </p>
                  )}
                </div>
              </>
            );
          }}
        </DropSlot>
      </motion.div>

      <input
        ref={inputRef}
        type="file"
        accept={LOGO_ACCEPT}
        className="sr-only"
        tabIndex={-1}
        aria-hidden
        onChange={(event) => {
          const file = event.target.files?.[0];
          if (file) submit(file);
          event.target.value = "";
        }}
      />

      <div role="group" aria-label={t.hero.otherWays} className="relative flex items-center gap-1">
        <Button
          ref={urlTriggerRef}
          variant="ghost"
          size="sm"
          leadingIcon={<LinkIcon />}
          aria-haspopup="dialog"
          aria-expanded={panel === "url"}
          aria-controls={panel === "url" ? urlPanelId : undefined}
          onClick={() => toggle("url")}
        >
          {t.hero.pasteUrl}
        </Button>
        <span aria-hidden className="text-subtle">
          ·
        </span>
        <Button
          ref={colorTriggerRef}
          variant="ghost"
          size="sm"
          leadingIcon={<DropletIcon />}
          aria-haspopup="dialog"
          aria-expanded={panel === "color"}
          aria-controls={panel === "color" ? colorPanelId : undefined}
          onClick={() => toggle("color")}
        >
          {t.hero.noLogo}
        </Button>
        <HeroPopover id={urlPanelId} open={panel === "url"} label={t.url.title} triggerRef={urlTriggerRef} onClose={closePanel}>
          <UrlPanel key={pastedUrl ?? ""} initialUrl={pastedUrl} />
        </HeroPopover>
        <HeroPopover id={colorPanelId} open={panel === "color"} label={t.color.title} triggerRef={colorTriggerRef} onClose={closePanel}>
          <ColorPanel initialColor={DEFAULT_PRIMARY} onStart={(hex) => onSkip(hex)} />
        </HeroPopover>
      </div>

      <SampleLogos onPick={(sample) => void pickSample(sample)} loadingId={loadingSample} disabled={working} />

      <p aria-live="polite" className="sr-only">
        {live}
      </p>
    </div>
  );
}
