# @dialmade/doc

El **DesignDoc v1**: la única fuente de verdad de un diseño en Dialmade. Incluye el esquema (Zod 4), la edición con parches RFC 6902, la compilación a variables CSS del tema y los exportadores (CSS, DTCG, Figma, DESIGN.md y prompt packs). Es TypeScript puro, sin React.

```ts
import { createDesignDoc, addPage, applyPatch, resolveThemeInputs, compileThemeVars, toThemeCss } from "@dialmade/doc";

let doc = createDesignDoc({
  brand: { name: "Acme", tagline: "Ship faster", seeds: { primary: "#3a5bd9" } },
  brief: { productType: "saas-general", focus: "landing", locale: "es" },
});
doc = addPage(doc, "landing"); // esqueleto: root + secciones del layout por defecto del producto

const result = applyPatch(doc, [{ op: "add", path: "/system/button/shape", value: "pill" }]);
if (result.ok) doc = result.doc; // si no, se descarta (result.error.reason / issues)

const vars = compileThemeVars(doc, { ...resolveThemeInputs(doc), mode: "light" }); // { "--primary": …, "--dl-radius-md": … }
const css = toThemeCss(doc); // :root + .dark con todas las variables
```

## Modelo

```
DesignDoc v1 {
  version: 1,
  brand: { name, tagline?, logoRef?, seeds: { primary, secondary? }, achromatic },   // contenido compartido
  brief: { productType ("generic"), focus, locale, paletteStyleId, recipeId, pairingId, motionTier,
           dials: { variance, motion, density } (1–10), locks },
  tokens: overrides del usuario (color por modo, radius, fontSize, space, borderWidth, motion),
  system: overrides por componente sobre la receta (button, card, input, badge, nav, table, sidebar),
  references: [{ id, kind, sourceUrl?, label?, fingerprint? }],
  provenance: { engineVersion, catalogSha?, model?, createdAt? },
  pages: { brand?, landing?, app? },   // pages[k].kind === k (superRefine)
}
Page { kind, layoutId, dials?: Partial<Dials>, root, elements: { [id]: { type, props, children } }, hidden? }
```

- **Tokens derivados.** Solo se guardan las ediciones explícitas del usuario. Todo lo demás se recalcula con `resolveTokens` a partir de `brand`, `brief`, la receta, el pairing y los diales: colores (de @dialmade/palette), escala tipográfica, radios, espacios, sombras, duraciones y tokens de componente. Así nunca queda desfasado. Un override gana siempre a los diales.
- **Árbol de página.** El `root` existe y cada elemento tiene un solo padre. No hay ciclos ni huérfanos, y `hidden` solo apunta a ids existentes. Los tipos llevan namespace: una página `landing` solo admite `landing.*` y `ui.*`.
- **Props.** Tienen que ser JSON. Un texto compartido se guarda como `{ bind: "brand.name" | "brand.tagline" }` y se resuelve con `resolveBindings(doc, props)`.
- **Catálogo cerrado.** `productType`, `recipeId`, `pairingId` y el `layoutId` de la landing se validan contra @dialmade/catalog.
- **Página App.** Nace con `dials.density = 7`. `effectiveDials(doc, kind)` combina los diales globales con los de la página.

## Diales

Todos son lineales por tramos: el valor 5 es neutro (la receta tal cual), y 1 y 10 son los extremos.

| Dial | Efecto |
|---|---|
| `density` | Escala `--dl-space-*` (×1,25 → ×0,75), `--dl-section-py`, las alturas (`--dl-button-h-*`, `--dl-nav-h`, `--dl-table-row-h`), el interlineado del texto y el contenedor. Más densidad significa más compacto. |
| `variance` | Ratio de la escala tipográfica (1,125 → 1,25 → 1,333), contraste display/body, interlineado de títulos y radios (×0,5 → ×1,5). |
| `motion` | Duraciones del tier (×0,6 → ×1,4). |

## Contrato de variables

`compileThemeVars(doc, { mode, theme, recipe, pairing, motionTier, pageDials?, colorFormat? })` devuelve, en orden estable:

- **Color:** `toCssVarRecord` de @dialmade/palette, que trae roles, alias `--sidebar-*` y todas las escalas `--color-*-50…950`. Encima van los overrides de color. Si no hay acento, `--color-cta-*` apunta a `var(--color-brand-*)`.
- **No-color:** `--dl-font-*`, `--dl-fs-*` (rem; display y h1 son `clamp()` fluidos entre 375 y 1280 px), `--dl-lh-*`, `--dl-heading-weight`, `--dl-heading-tracking` (em), `--dl-radius-*` (px), `--dl-space-1…10`, `--dl-section-py`, `--dl-container`, `--dl-shadow-sm|md|lg` (`none` en recetas planas), `--dl-border-width`, `--dl-duration-*` (ms) y `--dl-ease`.
- **Componente:**
  - Son alias `var(--dl-…)` siempre que es posible: `--dl-button-radius` sale de `square` → `radius-sm`, `rounded` → `radius-md` y `pill` → `radius-full`.
  - `--dl-button-shadow` y `--dl-card-shadow` valen `none` o `var(--dl-shadow-*)`.
  - `--dl-card-border` es un shorthand completo (`var(--dl-border-width) solid var(--border)` o `none`): se usa como `border: var(--dl-card-border)`.

## Exportadores

| Función | Salida |
|---|---|
| `toThemeCss(doc, opts?)` | `:root` y `.dark` con todas las variables. Opcionales: `selector`, `darkSelector`, `includeFontImport` y `colorFormat`. |
| `toDTCGFull(doc, opts?)` | DTCG 2025.10 con `primitives`, `semantic` (modos en `$extensions`), `font`, `font-weight`, `typography`, `dimension`, `shadow`, `duration`, `cubic-bezier` y `component.*` con alias (`{dimension.radius.md}`). |
| `toFigmaNumberVars(doc, opts?)` | Variables `number` para Figma (`radius/*`, `space/*`, `component/button/radius`…) con `com.figma.scopes`. Los colores siguen saliendo de `toFigmaTokens` de @dialmade/palette. |
| `toDesignMd(doc, opts?)` | DESIGN.md según la spec de Google: frontmatter `colors/typography/rounded/spacing/components` en kebab-case y luego las secciones de la spec en orden. |
| `toPromptPack(doc, target, locale?)` | Texto listo para copiar para `claude`, `claude-design`, `framer` (`npx @framer/agent@latest setup` + `/framer`), `figma` (`use_figma` + `generate_figma_design` desde Claude Code), `v0` (lleva el CSS) y `cursor` (lleva la regla `.mdc`). |

`EXPORT_FILES` fija los nombres de archivo del pack a los que se refieren los prompts.

## Scripts

`corepack pnpm test`, `corepack pnpm typecheck` y `corepack pnpm build` (tsup).
