import themeShapesData from "../data/themeShapes.json";
import { styleRecipes } from "./data/styleRecipes";
import { themeArchetypes } from "./data/themeArchetypes";
import type { LocalizedText, StyleRecipe, ThemeRecipe, ThemeShape } from "./types";

// La forma de los temas importados de daisyUI y tweakcn (sin colores, ~20 KB) y su conversión a `StyleRecipe`.
// Los colores completos viven en `@dialmade/catalog/themes`, aparte del bundle principal.
export const themeShapes: readonly ThemeShape[] = themeShapesData as readonly ThemeShape[];

const shapeById = new Map(themeShapes.map((shape) => [shape.id, shape]));

export function getThemeShape(id: string): ThemeShape | undefined {
  return shapeById.get(id);
}

type Shape = {
  radiusMd: number;
  radiusLg: number;
  /** `undefined` cuando la fuente no define el ancho del borde (tweakcn siempre usa 1 px de shadcn). */
  border: number | undefined;
  shadow: StyleRecipe["shadow"];
  surface: StyleRecipe["surface"];
  button: StyleRecipe["button"]["shape"];
};

/** Clase de sombra de un tema. tweakcn da sus parámetros; daisyUI solo `depth`. */
function shadowOf(theme: ThemeShape): StyleRecipe["shadow"] {
  if (theme.source === "daisyui") return theme.depth === 1 ? "soft" : "none";
  const shadow = theme.shadow;
  if (!shadow) return "none";
  const flat = shadow.x === 0 && shadow.y === 0 && shadow.blur === 0;
  if (shadow.opacity < 0.04 || flat) return "none";
  // Sombra dura desplazada: neubrutal, papel, arcade.
  if (shadow.blur <= 2 && (shadow.x !== 0 || shadow.y !== 0) && shadow.opacity >= 0.1) return "crisp";
  if (shadow.blur >= 16 && shadow.opacity >= 0.1) return "deep";
  return "soft";
}

function surfaceOf(theme: ThemeShape, shadow: StyleRecipe["shadow"]): StyleRecipe["surface"] {
  if (shadow === "crisp") return "outlined";
  if (theme.source === "daisyui" && shadow === "none" && theme.border >= 2) return "outlined";
  return shadow === "none" ? "flat" : "layered";
}

function buttonShapeOf(field: number): StyleRecipe["button"]["shape"] {
  if (field >= 20) return "pill";
  return field >= 5 ? "rounded" : "square";
}

function shapeOf(theme: ThemeShape): Shape {
  const shadow = shadowOf(theme);
  return {
    radiusMd: theme.radius.field,
    radiusLg: theme.radius.box,
    border: theme.source === "daisyui" ? theme.border : undefined,
    shadow,
    surface: surfaceOf(theme, shadow),
    button: buttonShapeOf(theme.radius.field),
  };
}

const SHADOW_RANK = { none: 0, soft: 1, deep: 2, glow: 2.5 } as const;

/** La sombra dura desplazada es identidad (neubrutal), no un grado más: cruzarla con otra clase cuesta mucho. */
function shadowDistance(a: StyleRecipe["shadow"], b: StyleRecipe["shadow"]): number {
  if (a === b) return 0;
  if (a === "crisp" || b === "crisp") return 3;
  return Math.abs(SHADOW_RANK[a] - SHADOW_RANK[b]) * 0.75;
}

function distance(shape: Shape, recipe: StyleRecipe): number {
  return (
    Math.abs(shape.radiusMd - recipe.radius.md) / 16 +
    Math.abs(shape.radiusLg - recipe.radius.lg) / 16 +
    (shape.border === undefined ? 0 : Math.abs(shape.border - recipe.borderWidth)) +
    shadowDistance(shape.shadow, recipe.shadow) +
    (shape.surface === recipe.surface ? 0 : 1) +
    (shape.button === recipe.button.shape ? 0 : 1)
  );
}

/** La receta hecha a mano más parecida en forma (radios, borde, sombra, superficie, botón). Empata por orden. */
export function nearestArchetype(theme: ThemeShape, archetypes: readonly StyleRecipe[] = styleRecipes): StyleRecipe {
  const shape = shapeOf(theme);
  let best = archetypes[0];
  let bestDistance = Number.POSITIVE_INFINITY;
  for (const archetype of archetypes) {
    const value = distance(shape, archetype);
    if (value < bestDistance) {
      best = archetype;
      bestDistance = value;
    }
  }
  if (!best) throw new Error("nearestArchetype necesita al menos un arquetipo.");
  return best;
}

/**
 * El arquetipo de un tema: el que se le asignó a mano en `themeArchetypes` y, si el tema es nuevo y aún no está
 * clasificado, el más cercano en forma.
 */
export function archetypeOf(theme: ThemeShape, archetypes: readonly StyleRecipe[] = styleRecipes): StyleRecipe {
  const assigned = themeArchetypes[theme.id];
  return archetypes.find((archetype) => archetype.id === assigned) ?? nearestArchetype(theme, archetypes);
}

const CORNERS: [number, LocalizedText][] = [
  [0, { es: "esquinas rectas", en: "square corners" }],
  [6, { es: "esquinas sutiles", en: "subtle corners" }],
  [14, { es: "esquinas redondeadas", en: "rounded corners" }],
  [Number.POSITIVE_INFINITY, { es: "esquinas muy redondeadas", en: "very rounded corners" }],
];

const SHADOWS: Record<StyleRecipe["shadow"], LocalizedText> = {
  none: { es: "sin sombras", en: "no shadows" },
  soft: { es: "sombras suaves", en: "soft shadows" },
  crisp: { es: "sombras sólidas desplazadas", en: "solid offset shadows" },
  deep: { es: "sombras profundas", en: "deep shadows" },
  glow: { es: "brillo de color", en: "colored glow" },
};

const SOURCE_NAME: Record<ThemeShape["source"], string> = { daisyui: "daisyUI", tweakcn: "tweakcn" };

function describe(theme: ThemeShape, shape: Shape): LocalizedText {
  const corner = (CORNERS.find(([max]) => theme.radius.field <= max) ?? CORNERS[CORNERS.length - 1])![1];
  const shadow = SHADOWS[shape.shadow];
  const strong = theme.border >= 2;
  return {
    es: `Variante de ${SOURCE_NAME[theme.source]}: ${corner.es}, ${shadow.es}${strong ? " y bordes marcados" : ""}.`,
    en: `${SOURCE_NAME[theme.source]} variant: ${corner.en}, ${shadow.en}${strong ? " and bold borders" : ""}.`,
  };
}

const ELEVATION: Record<StyleRecipe["shadow"], 0 | 1 | 2 | 3> = { none: 0, soft: 1, crisp: 2, glow: 2, deep: 3 };

function paddingOf(spacing: number | undefined): StyleRecipe["card"]["padding"] {
  if (spacing === undefined) return "normal";
  if (spacing < 0.24) return "compact";
  return spacing > 0.26 ? "roomy" : "normal";
}

/** xl = box más un paso, para modales y héroes; un tema recto sigue recto. */
function extraLarge(box: number): number {
  return box === 0 ? 0 : box + Math.max(4, Math.round(box / 2));
}

/**
 * Radios de la receta. Las recetas son monótonas (sm ≤ md ≤ lg ≤ xl) y el compilador de tokens lo da por hecho, pero
 * daisyUI puede pedir campos más redondos que las cards (botones píldora en cards de 16 px). Eso ya lo expresa
 * `button.shape = "pill"`, así que aquí el campo se recorta a la card.
 */
function radiusOf(theme: ThemeShape): StyleRecipe["radius"] {
  const lg = Math.round(theme.radius.box);
  const md = Math.min(Math.round(theme.radius.field), lg);
  const sm = Math.min(Math.round(theme.radius.selector), md);
  return { sm, md, lg, xl: extraLarge(lg) };
}

/**
 * Convierte un tema en una `StyleRecipe`. Lo que el tema define (radios, borde, sombra, superficie, forma del botón,
 * tracking, espaciado, modo) se respeta; lo que no (peso del botón y del titular, motion, pairing) se hereda del
 * arquetipo hecho a mano del tema (`archetypeOf`). Los colores no entran: la paleta es de la marca del usuario.
 */
export function themeToRecipe(theme: ThemeShape, archetypes: readonly StyleRecipe[] = styleRecipes): ThemeRecipe {
  const archetype = archetypeOf(theme, archetypes);
  const shape = shapeOf(theme);
  const [only] = theme.modes;
  return {
    id: theme.id,
    themeId: theme.id,
    archetypeId: archetype.id,
    // «Juguetón · Cupcake»: los exportadores (DESIGN.md, prompt packs) muestran la receta y la variante.
    label: { es: `${archetype.label.es} · ${theme.label}`, en: `${archetype.label.en} · ${theme.label}` },
    description: describe(theme, shape),
    radius: radiusOf(theme),
    borderWidth: theme.border,
    shadow: shape.shadow,
    surface: shape.surface,
    button: { shape: shape.button, weight: archetype.button.weight, shadow: shape.shadow !== "none" },
    card: {
      elevation: ELEVATION[shape.shadow],
      border: shape.surface === "outlined" || shape.shadow === "none",
      padding: paddingOf(theme.spacing),
    },
    headingWeight: archetype.headingWeight,
    headingTracking: theme.tracking ?? archetype.headingTracking,
    defaultMotion: archetype.defaultMotion,
    tags: ["theme", theme.source, ...theme.modes, ...(theme.noise === 1 ? ["texture"] : []), ...archetype.tags.slice(0, 2)],
    pairingId: archetype.pairingId,
    ...(theme.modes.length === 1 && only ? { preferredMode: only } : {}),
  };
}

const recipeCache = new Map<string, ThemeRecipe>();

/** La receta de un tema del catálogo (memoizada: se pide en cada compilación). */
export function getThemeRecipe(id: string): ThemeRecipe | undefined {
  const hit = recipeCache.get(id);
  if (hit) return hit;
  const shape = shapeById.get(id);
  if (!shape) return undefined;
  const recipe = themeToRecipe(shape);
  recipeCache.set(id, recipe);
  return recipe;
}

/**
 * La receta efectiva de un brief: la del tema si existe y es una variante de `recipeId`, y si no la receta misma.
 * Un tema de otro arquetipo (un `themeId` que quedó atrás tras cambiar de receta) no se aplica.
 */
export function resolveRecipe(recipeId: string, themeId?: string): StyleRecipe | undefined {
  const base = styleRecipes.find((recipe) => recipe.id === recipeId);
  if (!themeId) return base;
  const theme = getThemeRecipe(themeId);
  return theme && theme.archetypeId === recipeId ? theme : base;
}

/** Los temas agrupados por arquetipo: las variantes de cada receta del catálogo. */
export function themesByArchetype(
  themes: readonly ThemeShape[] = themeShapes,
  archetypes: readonly StyleRecipe[] = styleRecipes,
): Record<string, ThemeShape[]> {
  const groups: Record<string, ThemeShape[]> = Object.fromEntries(archetypes.map((archetype) => [archetype.id, []]));
  for (const theme of themes) groups[archetypeOf(theme, archetypes).id]?.push(theme);
  return groups;
}
