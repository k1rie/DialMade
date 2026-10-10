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
| `productChips`, `productGroups` | A mano | 12 chips de producto más `generic`, y los 17 grupos |
| `outputKindOptions`, `firstUseQuestion` | A mano | Las 3 salidas (Guía de estilo, Landing page, Dashboard y componentes) y la pregunta «¿Qué vas a hacer primero con este diseño?» |

Helpers: `getProductType`, `getStyleRecipe`, `getTypographyPairing`, `getLandingLayout`, `getMotionTier`, `recommendKind`, `defaultLandingLayout`, `defaultRecipe`, `defaultPairing`, `defaultMotionTier`, `defaultsFor` y `googleFontsCss2Url`. Todos son deterministas y tienen fallback para `"generic"` o ids desconocidos.

`@dialmade/catalog/sources` expone los índices de referencia (`styleSources`, `typographySources`, `fonts`) y `isWeightAvailable`. Van aparte para no engordar el bundle.

## ETL

Los JSON de `data/` se versionan. Para regenerarlos hace falta `vendor/` (no está en el repo):

```sh
bash scripts/fetch-vendor.sh             # desde la raíz
corepack pnpm --filter @dialmade/catalog etl
corepack pnpm --filter @dialmade/catalog etl:check   # falla si data/ está desactualizado
```

Lo curado a mano que usa el ETL está en `scripts/curation/`: etiquetas en español y grupos de los 192 tipos, los 6 layouts, los conceptos de audiencia para `doNotUseStyles` y los tiers de motion. Atribución MIT en `data/ATTRIBUTION.md`.
