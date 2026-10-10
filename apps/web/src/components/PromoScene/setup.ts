import type { OutputKind } from "@dialmade/catalog";
import type { DesignDoc } from "@dialmade/doc";
import type { SetTemplateId } from "@dialmade/layout";
import { extractFromPixels, generateTheme, parseSvgColors, type ExtractResult, type Theme } from "@dialmade/palette";
import type { ComponentType } from "react";
import type { ComposerProps } from "@/components/Composer";
import type { ExportDialogProps } from "@/components/ExportDialog";
import type { LayoutStepProps, LayoutStore, Screen } from "@/components/LayoutStep";
import { FEATURED_SAMPLE, loadSampleFile, type SampleLogo } from "@/components/SampleLogos";
import { loadDesignEngine } from "@/hooks/useDesignDoc";
import type { FlowStep } from "@/hooks/usePaletteFlow";
import { flow } from "@/i18n/flow";
import { layout as layoutText } from "@/i18n/layout";
import { brandNameFromFile } from "@/lib/brand-name";
import { decodeLogo, readLogoFile, type FlowLogo } from "@/lib/image";
import type { PromoLang, PromoSceneId } from "../../../promo/scenes";

/** Step of the real flow each scene stops at (PaletteFlow's `state.step`). */
export const SCENE_STEP: Record<PromoSceneId, FlowStep> = {
  home: "drop",
  "logo-empty": "drop",
  "logo-loaded": "crop",
  palette: "palette",
  style: "layout",
  preview: "compose",
  export: "compose",
};

/** The output the story follows: the Palette Lab's preview tab, the starting set «Recomendada» in «Layout» and the Composer's page. */
export const PROMO_KIND: OutputKind = "landing";

/** The starting set the user picks in «Layout» (TemplatePicker's «Landing»: Inicio + Precios), the one PROMO_KIND recommends. */
export const PROMO_SET: SetTemplateId = "landing";

/** `provenance.createdAt` of the promo doc (the engine stamps the current time). */
export const PROMO_CREATED_AT = "2026-01-01T00:00:00.000Z";

/** The design half (doc engine, LayoutStep, Composer, ExportDialog) loads through PaletteFlow's chunk boundary, as in the app. */
const loadDesignHalf = () => import("@/components/PaletteFlow/designHalf");
export const loadPromoEngine = () => loadDesignHalf().then((m) => m.designEngine);

/** The fictional sample logo, read and extracted exactly as a dropped file (full image, no crop). */
export type PromoBrand = {
  sample: SampleLogo;
  name: string;
  logo: FlowLogo;
  extract: ExtractResult;
  theme: Theme;
};

export type PromoViews = {
  LayoutStep?: ComponentType<LayoutStepProps>;
  Composer?: ComponentType<ComposerProps>;
  ExportDialog?: ComponentType<ExportDialogProps>;
};

export type PromoData = {
  brand?: PromoBrand;
  /**
   * The DesignDoc the flow would have at that step, with a fixed date: `initFromPalette` in «Layout», plus the
   * Landing set's «Generar» (`withGeneratedScreens`) in «Ajustar».
   */
  doc?: DesignDoc;
  /** «Layout»: the screens of the Landing set, as TemplatePicker leaves them in the draft (LayoutStep's `initialScreens`). */
  screens?: Screen[];
  views: PromoViews;
};

/** What every mounted scene shares: the sample file and what the flow extracts from it. */
type BrandSource = Omit<PromoBrand, "logo"> & { file: File };

let brandRequest: Promise<BrandSource> | null = null;

/** The sample read and extracted once per page load. */
function loadBrandSource(): Promise<BrandSource> {
  brandRequest ??= (async () => {
    const sample = FEATURED_SAMPLE;
    const file = await loadSampleFile(sample);
    const logo = await readLogoFile(file);
    try {
      // What useLogoExtraction runs in the palette worker, on the main thread here.
      const pixels = await decodeLogo(logo, { maxSize: 256 });
      const declaredColors = logo.svgText ? parseSvgColors(logo.svgText) : undefined;
      const extract = extractFromPixels(pixels.data, pixels.width, pixels.height, { declaredColors });
      const theme = generateTheme({
        primary: extract.seeds.primary.hex,
        ...(extract.seeds.secondary && { secondary: extract.seeds.secondary.hex }),
        style: "brand",
      });
      return { sample, file, name: brandNameFromFile(logo.name) ?? sample.name, extract, theme };
    } finally {
      URL.revokeObjectURL(logo.objectUrl);
    }
  })();
  brandRequest.catch(() => {
    brandRequest = null;
  });
  return brandRequest;
}

/**
 * The brand with a logo of its own: the flow takes ownership of the logo's blob URL and revokes it when it
 * unmounts (PaletteFlowProvider), so every scene that mounts reads the file into a fresh URL (going back to
 * a scene from the index never shows a revoked logo).
 */
async function loadBrand(source: BrandSource): Promise<PromoBrand> {
  const { file, ...brand } = source;
  return { ...brand, logo: await readLogoFile(file) };
}

type PromoDesign = Pick<PromoData, "doc" | "screens" | "views">;

/** Block and screen ids in creation order (`b-000001`, `s-000003`…): the same ids, and pixels, on every run. */
function sequentialIds(): (prefix: "b" | "s", taken: ReadonlySet<string>) => string {
  let n = 0;
  return (prefix, taken) => {
    let id: string;
    do id = `${prefix}-${(++n).toString(36).padStart(6, "0")}`;
    while (taken.has(id));
    return id;
  };
}

/**
 * A Layout draft with the Landing set applied by the store's own `applySet` (what TemplatePicker's «Landing» card
 * does), named in `lang` like LayoutStep names it, with sequential ids instead of random ones.
 */
async function landingDraft(doc: DesignDoc, lang: PromoLang): Promise<LayoutStore> {
  const { createLayoutStore } = await import("@/components/LayoutStep/useLayoutStore");
  const t = layoutText[lang];
  const store = createLayoutStore({
    style: doc.brief.recipeId,
    labelFor: (type) => t.blocks[type].name,
    screenNameFor: (templateId) => t.templates[templateId].name,
    copyName: t.screens.copyName,
    newId: sequentialIds(),
  });
  if (store.getState().actions.applySet(PROMO_SET).length === 0) throw new Error(`The "${PROMO_SET}" set created no screens`);
  return store;
}

async function loadDesign(brand: BrandSource, scene: PromoSceneId, lang: PromoLang): Promise<PromoDesign> {
  const half = await loadDesignHalf();
  await loadDesignEngine(loadPromoEngine);
  const engine = half.designEngine;
  const { primary, secondary } = brand.extract.seeds;
  const created = engine.createFromPalette(
    {
      primary: primary.hex,
      ...(secondary && { secondary: secondary.hex }),
      styleId: "brand",
      achromatic: brand.theme.achromatic,
      logoName: brand.file.name,
    },
    { defaultName: flow[lang].doc.defaultName, locale: lang, focus: PROMO_KIND },
  );
  if (!created.ok) throw new Error(created.error.message);
  const dated = engine.applyPatch(created.doc, [{ op: "replace", path: "/provenance/createdAt", value: PROMO_CREATED_AT }]);
  if (!dated.ok) throw new Error(dated.error.message);
  const draft = await landingDraft(dated.doc, lang);

  if (SCENE_STEP[scene] === "layout") {
    // «Layout» right after picking the set: the draft has the screens, the doc nothing generated yet.
    const { screens, screenOrder } = draft.getState();
    const ordered = screenOrder.flatMap((id) => (screens[id] ? [screens[id]] : []));
    return { doc: dated.doc, screens: ordered, views: { LayoutStep: await half.loadLayoutStep() } };
  }

  // «Ajustar»: the set's «Generar», written into the doc the way the flow's `applyGenerate` writes it.
  const generated = engine.withGeneratedScreens(dated.doc, draft.getState().actions.generate().screens);
  if (!generated.ok) throw new Error(generated.error.message);
  const [Composer, ExportDialog] = await Promise.all([half.loadComposer(), half.loadExportDialog()]);
  return { doc: generated.doc, views: { Composer, ExportDialog } };
}

const designs = new Map<string, Promise<PromoDesign>>();

/** The doc and the design-half views of a scene, loaded once per scene and language. */
function loadDesignOnce(brand: BrandSource, scene: PromoSceneId, lang: PromoLang): Promise<PromoDesign> {
  const key = `${scene}|${lang}`;
  let request = designs.get(key);
  if (!request) {
    request = loadDesign(brand, scene, lang);
    designs.set(key, request);
    request.catch(() => designs.delete(key));
  }
  return request;
}

/**
 * Everything a scene needs before it renders. The brand comes with a fresh logo blob URL on every call,
 * owned by the caller (then by the flow); the rest is loaded once per scene and language.
 */
export async function loadPromoData(scene: PromoSceneId, lang: PromoLang): Promise<PromoData> {
  const step = SCENE_STEP[scene];
  if (step === "drop") return { views: {} };
  const source = await loadBrandSource();
  const design = step === "layout" || step === "compose" ? await loadDesignOnce(source, scene, lang) : { views: {} };
  return { brand: await loadBrand(source), ...design };
}

/** What the capture script reads into tokens.json (`window.__DIALMADE_PROMO__`). */
export type PromoBrandSummary = {
  name: string;
  sample: { id: string; name: string; src: string };
  seeds: { primary: string; secondary?: string };
  swatches: { hex: string; coverage: number }[];
  theme: { styleId: string; achromatic: boolean; light: Record<string, string>; dark: Record<string, string> };
};

export function summarizeBrand(brand: PromoBrand): PromoBrandSummary {
  const { primary, secondary } = brand.extract.seeds;
  return {
    name: brand.name,
    sample: { id: brand.sample.id, name: brand.sample.name, src: brand.sample.src },
    seeds: { primary: primary.hex, ...(secondary && { secondary: secondary.hex }) },
    swatches: brand.extract.swatches.map((swatch) => ({ hex: swatch.hex, coverage: Math.round(swatch.coverage * 10000) / 10000 })),
    theme: { styleId: brand.theme.styleId, achromatic: brand.theme.achromatic, light: { ...brand.theme.light }, dark: { ...brand.theme.dark } },
  };
}
