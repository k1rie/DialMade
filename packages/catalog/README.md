# @dialmade/catalog

Catálogo de diseño de Dialmade en datos puros (TypeScript, sin React ni DOM): tipos de producto, recetas de estilo, pairings tipográficos, layouts de landing y tiers de motion, más los helpers que eligen un punto de partida determinista.

```ts
import { defaultsFor, productChips, recommendKind } from "@dialmade/catalog";

recommendKind("launch"); // "landing"
const { recipe, pairing, landingLayout, motion } = defaultsFor("saas-general"); // o "generic"
```

## Qué hay

| Export | Origen | Contenido |
|---|---|---|
| `productTypes` | ETL (`data/productTypes.json`) | Los 192 tipos de uupm con etiqueta es/en, grupo, `landingPatternId`, `dashboardStyle`, `styleIds` y `doNotUseStyles` |
| `landingLayouts` | ETL (`data/landingLayouts.json`) | 6 layouts con secciones `landing.navbar` … `landing.footer` |
| `motionTiers` | ETL (`data/motionTiers.json`) | `subtle`, `standard`, `expressive`: duraciones en ms y curva `cubic-bezier` |
| `styleRecipes` | A mano (`src/data/`) | 12 recetas: radios, borde, sombra, superficie, botón, card, tracking y motion |
| `typographyPairings` | A mano (`src/data/`) | 10 pairings de Google Fonts con URL css2 (`display=swap`) |
| `themePresets` (`@dialmade/catalog/themes`) | ETL (`data/themePresets.json`) | 71 temas de daisyUI (35) y tweakcn (36): colores por modo en hex, radios, borde, sombra, fuentes y tracking |
| `productChips`, `productGroups` | A mano | 12 chips de producto más `generic`, y los 17 grupos |
| `outputKindOptions`, `firstUseQuestion` | A mano | Las 3 salidas (Guía de estilo, Landing page, Dashboard y componentes) y la pregunta «¿Qué vas a hacer primero con este diseño?» |

Helpers: `getProductType`, `getStyleRecipe`, `getTypographyPairing`, `getLandingLayout`, `getMotionTier`, `recommendKind`, `defaultLandingLayout`, `defaultRecipe`, `defaultPairing`, `defaultMotionTier`, `defaultsFor` y `googleFontsCss2Url`. Todos son deterministas y tienen fallback para `"generic"` o ids desconocidos.

`@dialmade/catalog/sources` expone los índices de referencia (`styleSources`, `typographySources`, `fonts`) y `isWeightAvailable`. Van aparte para no engordar el bundle.

## Temas importados (`@dialmade/catalog/themes`)

Los 71 temas de daisyUI (MIT) y tweakcn (Apache-2.0) van aparte, por la misma razón (~100 KB). **Son variantes de forma de las 12 recetas, no recetas nuevas:** `styleRecipes` sigue teniendo 12 y los ids de receta no cambian.

```ts
import { themePresets, themeToRecipe, themesByArchetype, themeColors } from "@dialmade/catalog/themes";

const preset = themePresets.find((theme) => theme.id === "tweakcn-neo-brutalism")!;
const recipe = themeToRecipe(preset); // StyleRecipe + { themeId, archetypeId }
themeColors(preset, "dark");          // colores hex del tema
themesByArchetype()["soft-neubrutal"]; // las variantes de una receta
```

- `themeToRecipe` respeta lo que el tema define (radios, borde, sombra, superficie, forma del botón, tracking, espaciado, modo) y hereda del arquetipo lo que no (peso del botón y del titular, motion, pairing). Los radios salen monótonos: un campo más redondo que la card se expresa con `button.shape = "pill"`.
- **El arquetipo de cada tema es una asignación manual** (`src/data/themeArchetypes.ts`). La forma sola (radios y sombra) no distingue «cyberpunk» de «minimal»; `nearestArchetype` es solo el respaldo. El test falla si el upstream trae un tema sin clasificar.
- Los colores no se aplican solos: la paleta es de la marca del usuario. Sirven como paleta de partida cuando no hay logo.
- tweakcn: se descartan 6 presets con nombre de marca o producto (`twitter`, `t3-chat`, `supabase`, `claude`, `vercel`, `doom-64`); la lista y el motivo están en `scripts/curation/themes.mjs`.

## ETL

Los JSON de `data/` se versionan. Para regenerarlos hace falta `vendor/` (no está en el repo):

```sh
bash scripts/fetch-vendor.sh             # desde la raíz
corepack pnpm --filter @dialmade/catalog etl
corepack pnpm --filter @dialmade/catalog etl:check   # falla si data/ está desactualizado
```

`etl` corre dos scripts: `scripts/etl.mjs` (uupm) y `scripts/etl-themes.mjs` (daisyUI y tweakcn, que lee con el AST de TypeScript sin ejecutarlo). `fetch-vendor.sh` trae de esos dos solo los archivos de datos, fijados a commit.

Lo curado a mano que usa el ETL está en `scripts/curation/`: etiquetas en español y grupos de los 192 tipos, los 6 layouts, los conceptos de audiencia para `doNotUseStyles` y los tiers de motion. Atribución MIT en `data/ATTRIBUTION.md`; la de los temas, con el texto de ambas licencias, en `data/ATTRIBUTION-THEMES.md`.
