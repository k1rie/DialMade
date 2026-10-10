# @dialmade/import

Núcleo de «Trae tu marca» (`docs/design/importar-guia.md`): detecta, lee y fusiona lo que el usuario suelta (colores pegados, CSS, tokens, DESIGN.md, capturas, fuentes) y lo convierte en un JSON Patch del DesignDoc. TypeScript puro, sin DOM: corre en un Web Worker o en Node.

```ts
import { applyImport, defaultSelection, importBatch } from "@dialmade/import";

const imported = await importBatch(
  [{ name: "globals.css", bytes }],
  { ownership: "own", rightsConfirmedAt: new Date().toISOString(), logo: { primary: "#e11d48" } },
);
// «Esto detectamos»: imported.colors / fonts / shape / spacing / typeScale / conflicts / recipe…

const result = applyImport(doc, imported, defaultSelection(imported), { ownership: "own", rightsConfirmedAt });
if (result.ok) commit(result.ops); // un solo paso de deshacer; result.doc ya validado
```

## Flujo

1. **`detectFormat(bytes, name)`**: bytes mágicos (PNG, JPEG, GIF, WebP, AVIF, PDF, ASE, fuentes, ZIP) y después contenido (JSON de tokens, DESIGN.md, CSS, Coolors, lista de colores, nombres de fuente, `next/font`). Lee el tamaño de las imágenes de la cabecera, sin decodificar.
2. **Límites** (`IMPORT_LIMITS`): 20 archivos y 12 imágenes por lote, 5 MB de CSS o tokens, 1 MB pegado, 10 MB y 50 MP por imagen (una imagen cuya cabecera no da el tamaño no se decodifica), 64 niveles de anidación, líneas o valores cortados a 10.000 caracteres antes de cualquier regex. Un archivo que no cumple sale en `files` con su código y no bloquea al resto.
3. **Registro de parsers**: `Parser { id, kind, version, detect, parse }`. `detect` es barato y síncrono; `parse` carga su código con `import()` dinámico. Los seis de la v1 viven en `src/parsers/<id>/`, todos en `1.0.0`:
   - `paste`: hex, `rgb()`/`hsl()`/`oklch()`, nombres CSS en líneas con etiqueta y URLs de Coolors. Un hex sin `#` («fade», «600») nunca es un color.
   - `css`: shadcn en oklch y en canales HSL, `@theme` de Tailwind v4 y CSS compilado (postcss lee el archivo entero: un CSS minificado de una sola línea no pierde nada), con alfa. Un `:root` oscuro sin `.dark` se toma como modo oscuro (aviso `mode-inferred`).
   - `tokens`: DTCG 2025.10 con resolver y `$ref` locales (por nombre de archivo; los modificadores light/dark son modos y el resto, alternativas), export nativo de Figma (las dos formas), Tokens Studio (con sus sets) y Style Dictionary.
   - `design-md`: front matter YAML (`maxAliasCount` 50) con colores, tipografía, radios, espaciado y `components` → roles y `system` (forma del botón, campo e insignia; sin candado).
   - `screenshot`: modo, tono de los grises, viveza y acento desde los píxeles (`minCoverage` 0.002), con votación entre capturas (`aggregateScreenshots`).
   - `fonts`: listas de familias pegadas o en un archivo (una por línea o separadas por comas, con etiquetas como «Títulos: Newsreader») y layouts con `next/font` (`readNextFonts`), sin ejecutar nada. Texto por defecto; títulos o código cuando lo dice la etiqueta, la variable CSS o el nombre.
   Avisos nuevos de los parsers: `read-through`, `resolver-modifier`, `deprecated-skipped`, `no-tokens`, `no-fonts`, `mode-inferred`, `no-front-matter`, `yaml-alias-limit` e `invalid-yaml`.
4. **Normalización**: el núcleo sella `sourceId` e ids, parsea los colores con alfa (`oklch(1 0 0 / 10%)` → `#ffffff` + 0.1), descarta `transparent`/`currentColor` (aviso `non-color`), manda `var()`, `color-mix()` y `light-dark()` a `unresolved` (con un `code` que la interfaz traduce), limpia nombres y locators (sin control ni bidi) y resuelve las fuentes con el matcher de `src/fonts/`: exacto → alias (Source Sans Pro → Source Sans 3) → alternativa con las mismas métricas (Arial → Arimo) → alternativa de estilo → difuso, contra las 1934 familias de Google Fonts de `src/fonts/font-index.json` (`pnpm --filter @dialmade/import font-index` lo regenera desde el CSV de ui-ux-pro-max sin las columnas de popularidad; `font-index:check` lo comprueba). Un `var(--font-inter)` sin definir se deduce de su nombre.
5. **Fusión** (`mergeFragments`): tokens/CSS > tailwind.config > DESIGN.md > archivo de paleta > texto > PDF > capturas > IA. Colores de fuentes distintas con ΔEok < 0.02 se fusionan y conservan las dos procedencias (`also`); dentro de un mismo archivo solo si son prácticamente iguales (ΔEok < 0.001). Un rol que sugiere la IA nunca se funde con un color declarado. En cada rol y modo gana el más fuerte y el resto queda `overriddenBy`. Logo frente a guía con ΔEok > 0.06 → `conflicts`.
6. **Valores por defecto**: `isFrameworkDefault` marca, solo en hojas CSS, lo que coincide con el tema de Tailwind 4.3.3 (`src/defaults/tailwind.generated.ts`, regenerable con `pnpm --filter @dialmade/import defaults`) o con la base de shadcn/ui. Se aplican, pero sin candado. El mismo blanco en tus tokens o tu DESIGN.md es tuyo.
7. **Receta**: `nearestRecipe` compara radios, sombra, superficie, borde y métricas de títulos con las 12 recetas del catálogo. `applyImport` solo la escribe cuando hay sombras, borde o superficie que la respalden: los radios solos no dicen un estilo.
8. **`applyImport`**: lo aceptado va a `tokens.*`, `brand.seeds`, `brief.pairingId` / `brief.recipeId`, `system`, `references` y `provenance.imports`, con `importPatch` de `@dialmade/doc` fuente a fuente. Bloquea lo propio con confianza exacta o alta (ni IA ni valores por defecto). Una fuente de terceros solo aporta atributos: sin colores, sin familias y sin marca. Lo que pisaría un candado se salta (`locked`) salvo `allowLocked` («Desbloquear»). Elegir una alternativa libre (`editedFont`) guarda la familia declarada con la alternativa como `substitute`, o la familia de Google si era un candidato.
9. **IA de visión** (opcional): `attachFingerprint` añade la huella de una captura (roles por índice de muestra, nunca hex) como sugerencias sin candado; `detachFingerprint` las quita cuando se apaga.

## Seguridad

Sin `eval`, sin red y sin DOM. Las claves `__proto__`, `constructor` y `prototype` se descartan y los objetos se crean con `Object.create(null)`. El recorrido del JSON es iterativo, con un pre-escaneo de profundidad antes de `JSON.parse`. Las regex son lineales y corren sobre líneas ya cortadas. Hay tests de fuzz con 10.000 niveles de anidación, ciclos, bombas de alias y líneas de 1 MB.

## Licencias

`src/defaults/` copia datos de Tailwind CSS y de shadcn/ui, los dos con licencia MIT, y `src/fonts/font-index.json` sale del CSV de Google Fonts de ui-ux-pro-max-skill (MIT). Ver `NOTICE`.

Dependencias: `postcss` y `postcss-value-parser` (solo `postcss.parse` y el parser de valores; nunca se sigue un `@import` ni un `url()`) y `yaml` (front matter de DESIGN.md).
