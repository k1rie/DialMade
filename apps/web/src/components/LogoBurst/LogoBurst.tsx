"use client";

import type { ExtractResult } from "@dialmade/palette";
import { motion, useReducedMotion } from "motion/react";
import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import { Button } from "@/components/ui/Button";
import { Kbd } from "@/components/ui/Kbd";
import { useDictionary } from "@/i18n";
import { home } from "@/i18n/home";
import type { CropRect, FlowLogo } from "@/lib/image";
import { logoLayoutId } from "@/lib/layout-ids";
import { ease, tween } from "@/lib/motion";
import { BurstPiece } from "./BurstPiece";
import { BURST_MS, HOLD_MS, LANDING_S, LOGO_BOX, REDUCED_MS, SWEEP_PASSES } from "./constants";
import { fitLogo, tilesFor } from "./geometry";
import { useLogoTone } from "./useLogoTone";

export type LogoBurstProps = {
  logo: FlowLogo;
  crop?: CropRect;
  /** undefined while the worker extracts; then the swatches to burst into (`swatchLayoutId(i)`). */
  extract?: ExtractResult;
  /** Call exactly once when the signature moment ends (≤900 ms) and `extract` exists, or on skip. */
  onComplete: () => void;
};

const BACKDROP = {
  light: "oklch(0.965 0.004 285)",
  dark: "oklch(0.2 0.015 285)",
  unknown: "oklch(1 0 0 / 0.04)",
} as const;

/**
 * Signature moment (logo → palette): the cropped logo lands from the cropper (`logoLayoutId`),
 * then breaks into its extracted swatches (`swatchLayoutId(i)`), which the Palette Lab grid picks
 * up. Click anywhere or Esc skips; with reduced motion it is a plain fade.
 */
export function LogoBurst({ logo, crop, extract, onComplete }: LogoBurstProps) {
  const t = useDictionary(home).burst;
  const reduce = useReducedMotion() ?? false;
  const tone = useLogoTone(logo, crop);
  const [held, setHeld] = useState(false);
  const [skipRequested, setSkipRequested] = useState(false);
  const doneRef = useRef(false);
  const onCompleteRef = useRef(onComplete);
  useEffect(() => {
    onCompleteRef.current = onComplete;
  });

  const complete = useCallback(() => {
    if (doneRef.current) return;
    doneRef.current = true;
    onCompleteRef.current();
  }, []);

  useEffect(() => {
    const timer = setTimeout(() => setHeld(true), reduce ? 0 : HOLD_MS);
    return () => clearTimeout(timer);
  }, [reduce]);

  const swatches = useMemo(() => extract?.swatches ?? [], [extract]);
  const bursting = held && !skipRequested && swatches.length > 0;

  useEffect(() => {
    if (!extract) return;
    if (skipRequested || extract.swatches.length === 0) {
      complete();
      return;
    }
    if (!held) return;
    const timer = setTimeout(complete, reduce ? REDUCED_MS : BURST_MS);
    return () => clearTimeout(timer);
  }, [extract, held, skipRequested, reduce, complete]);

  const skip = useCallback(() => {
    if (extract) complete();
    else setSkipRequested(true);
  }, [extract, complete]);

  useEffect(() => {
    const onKeyDown = (event: KeyboardEvent) => {
      if (event.key === "Escape") skip();
    };
    window.addEventListener("keydown", onKeyDown);
    return () => window.removeEventListener("keydown", onKeyDown);
  }, [skip]);

  const backdrop = BACKDROP[tone === "dark" ? "light" : tone === "light" ? "dark" : "unknown"];
  const { box, image } = useMemo(() => fitLogo(logo, crop, LOGO_BOX), [logo, crop]);
  const tiles = useMemo(() => tilesFor(swatches.length, box), [swatches.length, box]);

  return (
    <div
      className="relative mx-auto flex min-h-[clamp(380px,calc(100dvh-10rem),560px)] w-full max-w-2xl cursor-pointer flex-col items-center justify-center gap-12 py-10"
      onClick={skip}
    >
      <div className="relative grid size-[200px] place-items-center">
        <span
          aria-hidden
          className="pointer-events-none absolute -inset-24 bg-[radial-gradient(closest-side,oklch(1_0_0/0.08),transparent)]"
        />
        {bursting && !reduce && (
          <motion.span
            aria-hidden
            className="pointer-events-none absolute -inset-10 bg-[radial-gradient(closest-side,oklch(1_0_0/0.5),oklch(0.62_0.24_300/0.25)_45%,transparent)]"
            initial={{ opacity: 0, scale: 0.5 }}
            animate={{ opacity: [0, 0.9, 0], scale: 1.5 }}
            transition={{ duration: 0.5, ease }}
          />
        )}
        <motion.div
          layoutId={logoLayoutId}
          role="img"
          aria-label={t.logo(logo.name)}
          className="relative"
          style={{ width: box.w, height: box.h }}
          transition={tween(LANDING_S)}
        >
          <motion.div
            className="absolute inset-0 overflow-hidden rounded-[10px] shadow-lift transition-[background-color] duration-200"
            style={{ backgroundColor: backdrop }}
            initial={false}
            animate={{ opacity: bursting ? 0 : 1, scale: bursting ? 0.94 : 1 }}
            transition={{ duration: 0.18, ease, delay: bursting ? 0.05 : 0 }}
          >
            <motion.img
              src={logo.objectUrl}
              alt=""
              draggable={false}
              className="absolute max-w-none select-none"
              style={{ left: image.x, top: image.y, width: image.w, height: image.h }}
            />
            {!extract && !reduce && (
              <motion.span
                aria-hidden
                className="absolute inset-x-0 top-0 h-1/2 bg-linear-to-b from-transparent via-white/30 to-transparent"
                initial={{ y: "-100%" }}
                animate={{ y: "200%" }}
                transition={{ duration: 1.1, ease, repeat: SWEEP_PASSES - 1, repeatDelay: 0.1 }}
              />
            )}
          </motion.div>
        </motion.div>
        {bursting &&
          swatches.map((swatch, index) => {
            const tile = tiles[index];
            if (!tile) return null;
            return (
              <BurstPiece
                key={`${index}-${swatch.hex}`}
                index={index}
                count={swatches.length}
                hex={swatch.hex}
                tile={tile}
                box={box}
                image={image}
                src={logo.objectUrl}
                backdrop={backdrop}
                reduce={reduce}
              />
            );
          })}
      </div>

      <div className="flex flex-col items-center gap-2">
        <p aria-live="polite" className="text-small text-muted">
          {extract ? t.found(swatches.length) : t.extracting}
        </p>
        <Button
          variant="ghost"
          size="sm"
          trailingIcon={<Kbd className="ml-0.5">Esc</Kbd>}
          title={t.skipHint}
          onClick={(event) => {
            event.stopPropagation();
            skip();
          }}
        >
          {t.skip}
        </Button>
      </div>
    </div>
  );
}
