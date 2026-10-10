"use client";

import { MotionConfig } from "motion/react";
import { useSearchParams } from "next/navigation";
import { useEffect, useMemo, useState } from "react";
import { useDictionary } from "@/i18n";
import { promo, type PromoDictionary } from "@/i18n/promo";
import { PROMO_VIEWPORTS, promoScene } from "../../../promo/scenes";
import { captureCss } from "./captureCss";
import { installFetchGuard } from "./fetchGuard";
import { FlowScene } from "./FlowScene";
import { parsePromoParams, type PromoParams, type PromoParamsError } from "./params";
import { partLocators } from "./parts";
import { PromoError } from "./PromoError";
import { SceneIndex } from "./SceneIndex";
import { loadPromoData, summarizeBrand, type PromoBrandSummary, type PromoData } from "./setup";
import { usePromoLocale } from "./usePromoLocale";
import { usePromoReady } from "./usePromoReady";

declare global {
  interface Window {
    /** The fictional brand of the captures (read by the capture script into tokens.json). */
    __DIALMADE_PROMO__?: { brand: PromoBrandSummary };
  }
}

function paramsMessage(error: PromoParamsError, t: PromoDictionary["errors"]): string {
  switch (error.code) {
    case "unknown-scene":
      return t.unknownScene(error.value);
    case "unknown-part":
      return t.unknownPart(error.scene, error.value);
    case "unknown-lang":
      return t.unknownLang(error.value);
    case "unknown-viewport":
      return t.unknownViewport(error.value);
    case "unknown-bg":
      return t.unknownBg(error.value);
    case "unsupported-viewport":
      return t.unsupportedViewport(error.scene);
  }
}

type Loaded = { key: string; data?: PromoData; error?: string };

/** One scene: offline, in `lang`, with motion skipped, and `data-promo-ready` once painted. */
function PromoStage({ params }: { params: PromoParams }) {
  const { scene, only, transparent, lang, viewport } = params;
  const t = useDictionary(promo);
  const localeReady = usePromoLocale(lang);
  const key = `${scene}|${lang}`;
  const [loaded, setLoaded] = useState<Loaded | null>(null);

  // The guard is in place before the scene (and anything that could fetch) renders.
  useEffect(() => {
    const restore = installFetchGuard();
    let active = true;
    loadPromoData(scene, lang).then(
      (data) => {
        if (active) setLoaded({ key, data });
        // Nobody will take this load's logo (a newer load replaced it): free its blob URL.
        else if (data.brand) URL.revokeObjectURL(data.brand.logo.objectUrl);
      },
      (error: unknown) => {
        if (active) setLoaded({ key, error: error instanceof Error ? error.message : String(error) });
      },
    );
    return () => {
      active = false;
      restore();
    };
  }, [scene, lang, key]);

  useEffect(() => {
    const html = document.documentElement;
    const attributes: Record<string, string | null> = {
      "data-promo-scene": scene,
      "data-promo-only": only,
      "data-promo-bg": transparent ? "transparent" : null,
      "data-promo-viewport": viewport,
    };
    const expected = PROMO_VIEWPORTS[viewport];
    if (viewport === "mobile" && window.innerWidth !== expected.width) {
      attributes["data-promo-warning"] = `viewport=mobile expects ${expected.width}×${expected.height} CSS px`;
    }
    for (const [name, value] of Object.entries(attributes)) if (value !== null) html.setAttribute(name, value);
    return () => {
      for (const name of Object.keys(attributes)) html.removeAttribute(name);
    };
  }, [scene, only, transparent, viewport]);

  const data = loaded?.key === key ? loaded.data : undefined;
  const brand = data?.brand;
  useEffect(() => {
    if (!brand) return;
    window.__DIALMADE_PROMO__ = { brand: summarizeBrand(brand) };
    return () => {
      delete window.__DIALMADE_PROMO__;
    };
  }, [brand]);

  const locators = useMemo(() => partLocators(scene, lang), [scene, lang]);
  const showScene = localeReady && !!data;
  usePromoReady(showScene, locators, t.errors);

  const unclip = !!only && !!promoScene(scene).parts.find((part) => part.id === only)?.unclip;
  const css = useMemo(() => captureCss({ only, transparent, unclip }), [only, transparent, unclip]);
  const error = loaded?.key === key ? loaded.error : undefined;

  return (
    <MotionConfig reducedMotion="always" skipAnimations>
      <style>{css}</style>
      {error ? (
        <PromoError message={t.errors.setup(error)} />
      ) : showScene ? (
        <FlowScene key={key} scene={scene} transparent={transparent} data={data} />
      ) : null}
    </MotionConfig>
  );
}

/**
 * Dev-only capture stage of the promo video (/promo, docs/design/encargo-promo-capturas.md): rebuilds
 * one state of the real flow with the fictional Brisa logo, every part marked with `data-promo-part`.
 * Query: `scene`, `only`, `bg=transparent`, `lang=es|en`, `viewport=mobile`; without `scene` it lists
 * the manifest (apps/web/promo/scenes.ts).
 */
export function PromoScene() {
  const search = useSearchParams();
  const parsed = useMemo(() => parsePromoParams(search), [search]);
  const t = useDictionary(promo);
  if (parsed.kind === "index") return <SceneIndex />;
  if (parsed.kind === "error") return <PromoError message={paramsMessage(parsed.error, t.errors)} />;
  return <PromoStage key={JSON.stringify(parsed.params)} params={parsed.params} />;
}
