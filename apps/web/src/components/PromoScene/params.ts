import {
  PROMO_DEFAULT_LANG,
  isPromoLang,
  isPromoSceneId,
  promoScene,
  type PromoLang,
  type PromoSceneId,
  type PromoViewportId,
} from "../../../promo/scenes";

export type PromoParams = {
  scene: PromoSceneId;
  /** Part shown alone (the rest of the scene is laid out but hidden, so the part keeps its exact box). */
  only: string | null;
  /** `bg=transparent`: no AppBackground and a transparent page. */
  transparent: boolean;
  lang: PromoLang;
  viewport: PromoViewportId;
};

export type PromoParamsError =
  | { code: "unknown-scene"; value: string }
  | { code: "unknown-part"; scene: PromoSceneId; value: string }
  | { code: "unknown-lang"; value: string }
  | { code: "unknown-viewport"; value: string }
  | { code: "unknown-bg"; value: string }
  | { code: "unsupported-viewport"; scene: PromoSceneId };

/** `index`: no `scene` (the route lists the scenes). */
export type ParsedPromoParams = { kind: "index" } | { kind: "scene"; params: PromoParams } | { kind: "error"; error: PromoParamsError };

type SearchParamsLike = { get(name: string): string | null };

/** Reads /promo's query: `scene`, `only`, `bg=transparent`, `lang=es|en` (default es) and `viewport=mobile`. */
export function parsePromoParams(search: SearchParamsLike): ParsedPromoParams {
  const scene = search.get("scene");
  if (scene === null || scene === "") return { kind: "index" };
  if (!isPromoSceneId(scene)) return { kind: "error", error: { code: "unknown-scene", value: scene } };
  const spec = promoScene(scene);

  const lang = search.get("lang") ?? PROMO_DEFAULT_LANG;
  if (!isPromoLang(lang)) return { kind: "error", error: { code: "unknown-lang", value: lang } };

  const viewportParam = search.get("viewport");
  if (viewportParam !== null && viewportParam !== "mobile") return { kind: "error", error: { code: "unknown-viewport", value: viewportParam } };
  const viewport: PromoViewportId = viewportParam === "mobile" ? "mobile" : "desktop";
  if (!spec.viewports.includes(viewport)) return { kind: "error", error: { code: "unsupported-viewport", scene } };

  const bg = search.get("bg");
  if (bg !== null && bg !== "transparent") return { kind: "error", error: { code: "unknown-bg", value: bg } };

  const only = search.get("only") || null;
  if (only !== null && !spec.parts.some((part) => part.id === only)) return { kind: "error", error: { code: "unknown-part", scene, value: only } };

  return { kind: "scene", params: { scene, only, transparent: bg === "transparent", lang, viewport } };
}
