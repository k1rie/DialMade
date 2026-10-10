# @dialmade/doc

El **DesignDoc v2**: la única fuente de verdad de un diseño en Dialmade. Incluye el esquema (Zod 4), la edición con parches RFC 6902, la compilación a variables CSS del tema y los exportadores (CSS, DTCG, Figma, DESIGN.md y prompt packs). Es TypeScript puro, sin React.

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
DesignDoc v2 {
  version: 2,
  brand: { name, tagline?, logoRef?, seeds: { primary, secondary? }, achromatic },   // contenido compartido
  brief: { productType ("generic"), focus, locale, paletteStyleId, recipeId, pairingId, motionTier,
           dials: { variance, motion, density } (1–10),
           locks: string[] },   // JSON Pointers ("/tokens/color/light/primary") o claves antiguas ("pairingId")
  tokens: valores guardados (editados o importados): color { light, dark, scales? } (#rrggbb o #rrggbbaa),
          radius, fontSize, space, borderWidth, motion,
          typography { heading?, body?, mono?, scale }, elevation { sm?, md?, lg? },
  system: overrides por componente sobre la receta (button, card, input, badge, nav, table, sidebar),
  references: [{ id, kind: upload | url | mobbin-link, origin?: screenshot | pdf-page, ownership: own | third-party,
                 contentHash?, sourceUrl?, label?, fingerprint?, usedFor: string[] }],   // sin bytes ni miniaturas
  provenance: { engineVersion, catalogSha?, model?, createdAt?,
                imports?: [{ sourceId, kind, format, fileName, sha256, bytes, parser, ownership, rightsConfirmedAt?,
                             fields: [{ path, locator, confidence, method }], dismissed: string[] }] },   // nunca el archivo
  pages: { brand?, landing?, app? },   // pages[k].kind === k (superRefine); con pantallas, solo brand
  screens: { [ScreenId]: Screen },     // Modo Layout (v2); {} por defecto
  screenOrder: ScreenId[],             // permutación de las claves de screens, ≤ MAX_SCREENS (24)
  screenStash?: { [ScreenId]: Screen } // pantallas que quitó un «Generar», ≤ MAX_STASHED_SCREENS (4)
}
Page { kind, layoutId, dials?: Partial<Dials>, root, elements: { [id]: { type, props, children } }, hidden?,
       stash?: { [blockId]: { type, props, pinned? } } }   // solo páginas de pantalla (ver «Stash»)
Screen { id, name, kind: landing | app, route, layout: LayoutDoc, page: Page, shell: AppShell | null }
AppShell { nav, header, activeItem?, pinned? }   // pinned: props del marco editadas en «Ajustar»
```

- **Tokens derivados.** Solo se guardan las ediciones explícitas del usuario y los valores importados que aceptó (un valor, un sitio; `provenance.imports` dice de dónde salió). Todo lo demás se recalcula con `resolveTokens` a partir de `brand`, `brief`, la receta, el pairing y los diales: colores (de @dialmade/palette), escala tipográfica, radios, espacios, sombras, duraciones y tokens de componente. Así nunca queda desfasado. Un valor guardado gana siempre a la receta, al pairing y a los diales.
- **Familias propias.** `tokens.typography.heading|body|mono` sustituyen a la familia del pairing en ese rol (`family`, `substitute` libre, `fallback`, `weights`); `scale` guarda interlineado, tracking y peso por paso. Los tamaños siguen en `tokens.fontSize`.
- **Terceros.** Un import con `ownership: "third-party"` solo aporta atributos: no puede escribir `/brand`, `/tokens/color` ni las familias tipográficas.
- **Árbol de página.** El `root` existe y cada elemento tiene un solo padre. No hay ciclos ni huérfanos, y `hidden` solo apunta a ids existentes. Los tipos llevan namespace: una página `landing` solo admite `landing.*` y `ui.*`.
- **Props.** Tienen que ser JSON. Un texto compartido se guarda como `{ bind: "brand.name" | "brand.tagline" }` y se resuelve con `resolveBindings(doc, props)`.
- **Catálogo cerrado.** `productType`, `recipeId`, `pairingId` y el `layoutId` de la landing se validan contra @dialmade/catalog.
- **Página App.** Nace con `dials.density = 7`. `effectiveDials(doc, key)` combina los diales globales con los de la página (`key` = tipo de página, id de pantalla o un `RenderTarget`).

## Pantallas (DesignDoc v2, Modo Layout)

Cada pantalla es lo que el usuario dibujó en el lienzo (`layout`, el `LayoutDoc` de @dialmade/layout) y la página que @dialmade/sections compila desde él al pulsar «Generar» (`page`). Se añaden al lado de `pages`, sin moverlas.

- **Reglas de la pantalla.** `id` es un id de elemento que no puede ser `brand`, `landing` ni `app`. `name` es una línea limpia (lo que da `sanitizeLabel`) de ≤60. `route` es `/` o `/` + segmentos slug (`a-z`, `0-9`, `-`), ≤96 (`RouteSchema`). `shell` es un objeto en las de app (`nav: "none"` si no hay navegación) y `null` en las landing.
- **Página de pantalla.** `page.kind === kind`, raíz `${kind}.page`, `page.layoutId === LAYOUT_PAGE_ID` (`"custom"`, sin buscarlo en el catálogo) y el árbol admite `landing.*`, `app.*` y `ui.*`, nunca `brand.*` (crítica #1). `hidden` solo apunta a ids que existen. `checkScreenPage(page, kind)` devuelve esos problemas como texto (para los tests de otros paquetes).
- **Layout.** `LayoutDocSchema` comprueba tipos y formatos (bloques de la librería, etiquetas y notas en una línea limpia, `pinned` como JSON Pointers relativos a las props, huella `generated`, overrides `responsive`, `linkTo`) y su `superRefine` añade los errores de `validateLayout` (rects dentro de la rejilla, `MAX_ROW`, `MAX_HEIGHT_ROWS`, padres y ciclos, `count`, `LABEL_MAX`, `NOTE_MAX`, `MAX_BLOCKS`, ids `r-`), cada uno con su código en `params.layoutCode`. Los tipos de salida son los de @dialmade/layout: `screen.layout` va directo a `inferStructure`, `toCss` o `toAsciiWireframe`.
- **Reglas del documento.** Las claves de `screens` son los ids; `screenOrder` es una permutación de ellas; las rutas no se repiten; los ids de bloque no se repiten entre pantallas (decisión #42; se informa en la pantalla posterior: `Block id "b-1" is already used by screen "s-a"…`); cada `linkTo` apunta a una pantalla que existe; las pantallas de app con navegación comparten el mismo `nav`; y con pantallas, `pages.landing` y `pages.app` no existen (una sola fuente de verdad; `pages.brand` se queda).
- **Candados.** `POINTER_ROOTS` incluye `screens`: un candado puede apuntar a `/screens/{id}/…` (nunca a `/screenOrder`).
- **Stash.** `page.stash` guarda, por id de bloque, las últimas props de un bloque sin elemento de ese tipo, para que `buildPageFromLayout` se las devuelva: un bloque absorbido por otro (hasta que se saca), un bloque que cambió de tipo (las del tipo anterior, junto a su elemento del tipo nuevo, hasta que se deshace el cambio), un bloque que quitó un «Generar» (con sus `pinned`, porque su bloque del layout ya no existe; como mucho `MAX_REMOVED_STASH`, los más antiguos salen primero) y el marco de app (`shell`) mientras la pantalla no tiene navegación. Una entrada nunca tiene el mismo tipo que el elemento de su id, sus tipos siguen las reglas de espacios de nombres de la página y sus props son JSON. Las páginas antiguas (`pages.*`) no lo admiten.
- **Pantallas quitadas.** `screenStash` guarda, por id, la última versión de las pantallas que quitó un «Generar» (como mucho `MAX_STASHED_SCREENS`, las más antiguas salen primero), validadas como pantallas pero fuera de las reglas del documento (rutas, enlaces, navegación compartida): nada las pinta, exporta ni manda a la IA. Si un deshacer en Layout trae una de vuelta con el mismo id, el siguiente «Generar» la compila sobre ella (copy, valores fijados y huellas) y sale del stash. Una clave nunca es una pantalla del documento.
- **Marco fijado.** `AppShell.pinned` son JSON Pointers relativos a las props del `app.shell` de la pantalla: el copy del marco que el usuario editó en «Ajustar» (acción principal, subtítulo…). El documento es su única fuente; el draft de Layout no los toca.
- **Tamaño.** `documentSizeIssues(input)` rechaza antes del parse completo más de `MAX_SCREENS` pantallas (o entradas de `screenOrder`), más de `MAX_STASHED_SCREENS` en `screenStash` y más de `MAX_BLOCKS` bloques en una pantalla (también en las de `screenStash`), con las mismas rutas y mensajes del parse. Lo usan `safeParseDesignDoc` y `applyPatch`.
- **Migración.** `parseDesignDoc` y `safeParseDesignDoc` pasan antes por `migrateDesignDoc`: un documento v1 sube a v2 cambiando solo `version`. `applyPatch` valida contra v2 sin migrar. `createDesignDoc` escribe v2 (acepta `screens`, en orden).

| Helper | Qué hace |
|---|---|
| `orderedScreens(doc)` | Las pantallas en el orden de `screenOrder` |
| `renderTargets(doc)` | Lo que se pinta o exporta, en orden: `{ key, kind, page, screen? }[]`. Con pantallas: las pantallas y después la guía de estilo; sin ellas, el orden de siempre (foco primero) |
| `pageForKey(doc, key)` | La página de una `PageKey` (`"brand"`, un id de pantalla o, en documentos antiguos, `"landing"`/`"app"`) |
| `screenPointer(id, ...segs)` | `/screens/{id}/…` con los segmentos escapados |
| `removeScreenOps(doc, id)` | El parche que borra una pantalla: quita los `linkTo` que la apuntan, sus candados y su sitio en `screenOrder`. Con un candado debajo, `applyPatch` devuelve `locked`: se aplica con `allowLocked` después de preguntar «¿Desbloquear y borrar?» |
| `renameScreenOps(doc, id, name)` | El parche que renombra una pantalla con las reglas de Layout (decisión 43): nombre limpio y único («Ajustes 2»), y una ruta automática sigue al nombre (nunca `/`). Vacío si el nombre queda vacío o no cambia |
| `hasScreens(doc)` / `hasDesign(doc)` | Hay pantallas / hay pantallas o alguna página |

## Candados e importación

```ts
import { applyImport, isLocked, lock, unlock } from "@dialmade/doc";

const result = applyImport(doc, {
  source: { sourceId: "css-1", kind: "css", format: "shadcn-oklch", fileName: "globals.css", sha256, bytes, parser: "css@1.0.0", ownership: "own", rightsConfirmedAt },
  values: [{ path: "/tokens/color/dark/border", value: "#ffffff1a", locator: "globals.css:58 --border", confidence: "exact", method: "declared" }],
});
isLocked(result.doc, "/tokens/color/dark/border"); // true: exacta o alta, de la propia marca y sin IA
unlock(result.doc, "/tokens/color/dark/border");  // «Desbloquear»
```

- **Candado duro.** Un JSON Pointer en `brief.locks`. `applyPatch` rechaza (`reason: "locked"`, con `lock` e `index`) cualquier operación que cambie el valor de ese puntero o de sus hijos, también desde un ancestro, por desplazamiento de índices en un array o quitando el candado. Reescribir el mismo valor está permitido. Solo `{ allowLocked: true }` lo salta: es para acciones explícitas del usuario («Desbloquear», editar un chip bloqueado), nunca para «Barajar», estilos de paleta o la IA.
- **Claves antiguas** (`"pairingId"`, `"dials.density"`…). Siguen siendo válidas como candados blandos: `isLocked` las respeta y `applyPatch` no las impone.
- **Helpers.** `lock(doc, ptr, { value? })` (con `value` congela un valor derivado y crea los objetos padre que falten), `unlock(doc, ptr, { subtree? })`, `isLocked`, `lockedBy`, `locksWithin` y `hardLocks`.
- **`applyImport` / `importPatch`.** Un solo parche (un paso de deshacer): escribe los valores, añade los candados y registra la fuente en `provenance.imports`. Reimportar un `sourceId` actualiza su registro; los campos de otra fuente bajo un puntero nuevo se descartan.
- **Paleta.** Los colores bloqueados de `tokens.color` (roles y escalas) entran a `generateTheme` como `pinned` (`themeInputFor`, `pinnedFor`): el primario fijado ancla la escala `brand` aunque cambie el estilo de paleta. Los no bloqueados ganan igual en las variables, pero no anclan el tema.

## Diales

Todos son lineales por tramos: el valor 5 es neutro (la receta tal cual), y 1 y 10 son los extremos.

| Dial | Efecto |
|---|---|
| `density` | Escala `--dl-space-*` (×1,25 → ×0,75), `--dl-section-py`, las alturas (`--dl-button-h-*`, `--dl-nav-h`, `--dl-table-row-h`), el interlineado del texto y el contenedor. Más densidad significa más compacto. |
| `variance` | Ratio de la escala tipográfica (1,125 → 1,25 → 1,333), contraste display/body, interlineado de títulos y radios (×0,5 → ×1,5). |
| `motion` | Duraciones del tier (×0,6 → ×1,4). |

## Contrato de variables

`compileThemeVars(doc, { mode, theme?, recipe?, pairing?, motionTier?, pageDials?, colorFormat? })` devuelve, en orden estable (lo que no se pasa sale de `resolveThemeInputs(doc)`, con los colores bloqueados como `pinned`):

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
| `toDTCGFull(doc, opts?)` | DTCG 2025.10 con `primitives`, `semantic` (modos en `$extensions`), `font`, `font-weight`, `typography`, `dimension`, `shadow`, `duration`, `cubic-bezier` y `component.*` con alias (`{dimension.radius.md}`). Los valores guardados llevan `$extensions["design.dialmade"]` `locked` (`true`, o los modos bloqueados de un color semántico) y `provenance` (archivo, localizador, confianza y método); la raíz lista `locks` e `imports` (sin campos ni contenido). |
| `toFigmaNumberVars(doc, opts?)` | Variables `number` para Figma (`radius/*`, `space/*`, `component/button/radius`…) con `com.figma.scopes`. Los colores siguen saliendo de `toFigmaTokens` de @dialmade/palette. |
| `toDesignMd(doc, opts?)` | DESIGN.md según la spec de Google: frontmatter `colors/typography/rounded/spacing/components` en kebab-case y luego las secciones de la spec en orden. Con pantallas, dentro de «## Layout» van «### Pantallas y flujo» y un `### {nombre} (\`/ruta\`)` por pantalla (ver abajo); en «## Páginas» las pantallas dicen «Layout propio». |
| `toPromptPack(doc, target, locale?)` | Texto listo para copiar para `claude`, `claude-design`, `framer` (`npx @framer/agent@latest setup` + `/framer`), `figma` (`use_figma` + `generate_figma_design` desde Claude Code), `v0` (lleva el CSS) y `cursor` (lleva la regla `.mdc`). Con pantallas lleva el mismo bloque de layout, un paso «una ruta por pantalla, enlazadas como en el flujo» y nunca se inventa una página. |

`EXPORT_FILES` fija los nombres de archivo del pack a los que se refieren los prompts. `SCREEN_EXPORT_FILES` (`layout.css`, `layout.json`) son los que el pack de código escribe junto al `index.html` de cada pantalla: con pantallas, la lista de archivos de los prompt packs y el bloque «Pantallas y flujo» de DESIGN.md los nombran.

**Bloque de pantallas** (DESIGN.md y prompt packs; sin títulos `##` ni claves de frontmatter nuevas):
- «Pantallas y flujo»: las pantallas en orden con su ruta, su tipo y su navegación, y los enlaces (`linkTo` de los bloques visibles y la navegación compartida de app).
- Por pantalla: el wireframe ASCII (`toAsciiWireframe`, 64 caracteres, numerado; sin acentos graves en etiquetas y notas), el orden de lectura con los mismos números (`1. Calendario → \`ui.calendar@week\` ×3 — nota: "…" → enlaza a «Precios»`; el tipo y la variante salen de `screen.page.elements[blockId]`), los ocultos, las reglas de tablet y móvil (de `deriveResponsive`) y el `grid-template-areas` de las regiones sin corte limpio. Todo sale del layout tal como se compila la página (`absorbChildren`): un bloque absorbido no se dibuja ni se numera; la línea de su anfitrión dice `(con «Captura» dentro)` y su `linkTo` pasa al anfitrión, como en la página.
- El esquema de la página: las regiones estructurales (`ui.region` con `role: "scope" | "inferred"`, id `layout` o `r-…`) no salen en el esquema de «Páginas»; sus hijos suben un nivel.
- Las páginas de pantalla guardan las listas repetibles completas y `count` decide cuántas se ven. Con la opción `visibleProps` (`visibleProps` de `@dialmade/sections`), el esquema de «Páginas» lista solo lo que se ve. Sin ella lista todo lo guardado. Nunca se aplica a las páginas antiguas.
- Los documentos sin pantallas exportan exactamente lo mismo que antes de v2, salvo `DesignDoc v2` (golden en `src/exporters/__golden__/legacy-*`).

## Scripts

`corepack pnpm test`, `corepack pnpm typecheck` y `corepack pnpm build` (tsup).
