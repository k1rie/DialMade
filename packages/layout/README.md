# @dialmade/layout

Motor del **Modo Layout** en TypeScript puro, sin React ni DOM (como `@dialmade/palette`). Corre igual en el navegador, en un worker o en Node.

Convierte los rectángulos con nombre que el usuario coloca en una rejilla de 12 columnas en una estructura compilable: filas (grid de 12 columnas), columnas (flex) y `grid-template-areas` cuando no hay corte limpio. Deriva tablet (8 columnas) y móvil (4), y escribe el CSS y un wireframe ASCII.

**Reglas del motor**
- Determinista: la misma entrada da siempre la misma salida. Solo enteros, orden estable, sin `Date` ni `Math.random` (salvo `newBlockId`, que es para ids nuevos y acepta una fuente inyectable).
- **Nunca corrige en silencio.** `inferStructure` no toca la geometría: si encuentra solapes o una contención ambigua, devuelve `warnings` con arreglos (`LayoutFix`). Las correcciones visibles al soltar son de `normalizeDrop`, que devuelve qué cambió (`Adjustment[]`) para animarlo y ofrecer «Ajustado · Deshacer».
- Los tipos (`LayoutDoc`, `LayoutBlock`…) son **provisionales hasta la Fase B**, cuando `@dialmade/doc` los adopte en DesignDoc v2.

```ts
import { inferStructure, deriveResponsive, toCss, toAsciiWireframe, emptyLayout, insertBlock } from "@dialmade/layout";

let layout = emptyLayout();
layout = insertBlock(layout, { type: "navbar", label: "Navbar" }).layout;
layout = insertBlock(layout, { type: "hero", label: "Hero" }).layout;

const structure = inferStructure(layout);        // { root, overlays, order, warnings }
const responsive = deriveResponsive(layout, structure);
const css = toCss(layout, { kind: "landing", structure, responsive });
console.log(toAsciiWireframe(layout, { label: (b) => b.label }));
```

## Modelo

- `LayoutDoc = { version: 1, columns: 12, rowUnit: 8, blocks: Record<BlockId, LayoutBlock> }`.
- `rect` va en unidades de rejilla y siempre es absoluto en la pantalla, también para los bloques anidados: `col` (0–11) y `w` en columnas, `row` y `h` en filas de 8 px. Topes: `row` ≤ `MAX_ROW` = 4000 (32.000 px) y `h` ≤ `MAX_HEIGHT_ROWS` = 2000 (16.000 px). `validateLayout` rechaza lo que pase de ahí; el motor lo calcula recortado (con warning `out-of-bounds`) y `normalizeDrop` lo recorta (`clamp`). Así un alto escrito a mano como «999999999999 px» no llega al CSS ni al wireframe.
- `parentId` es el anidado explícito. `inferStructure` nunca lo deduce.
- Ids: `b-` + 6 caracteres base36 (`newBlockId`). Se aceptan ids existentes que cumplan `ElementIdSchema` (`hero-1`), salvo los reservados (`isReservedBlockId`): los que empiezan por `r-`, para regiones inferidas (`r-` + hash de sus bloques, que no se pueden direccionar), y `root`, `shell` y `layout` (`RESERVED_BLOCK_IDS`), que son la raíz, el marco de app y el ámbito de la página compilada (`buildPageFromLayout`).
- Máximo `MAX_BLOCKS` = 200 bloques. La nota (`note`) tiene una línea y ≤200 caracteres (`sanitizeNote`); el nombre (`label`), una línea y ≤60 (`sanitizeLabel`).
- Saneado (`sanitizeLine`): normaliza a NFC, los controles pasan a espacio y se quitan los caracteres invisibles: todos los de formato (`Cf`: marcas bidi, BOM, espacios y unificadores de ancho cero, *word joiner*, operadores invisibles, guion suave, etiquetas Unicode U+E0000–E007F…), el *combining grapheme joiner* y los rellenos de Hangul. Excepciones, porque cambian lo que se dibuja: el ZWJ dentro de una secuencia de emoji (👩‍💻), ZWJ/ZWNJ entre letras de escrituras que los usan (persa, hindi…) y las tres banderas con etiquetas (Inglaterra, Escocia, Gales). El recorte nunca deja media secuencia.

## API

### Librería

| Export | Qué es |
|---|---|
| `LIBRARY: readonly LibraryBlockDef[]` | Metadatos de cada bloque: categoría, icono, `status` (`ready`/`soon`), `sectionType`, `defaultSize`, `minCols` por breakpoint, `container`/`accepts`, `repeatable`, comportamiento en móvil, `overlay`, `frame` y `kinds`. En el orden en que se muestran |
| `BLOCK_CATEGORIES` | Categorías en orden: `basics`, `navigation`, `content`, `data`, `forms`, `overlays`, `commerce` |
| `getBlockDef(type)` | Metadatos de un tipo (lanza si no existe) |
| `isLibraryBlockType(value)` | Guarda de tipo |
| `suggestBlocks(layout, kind)` | 5 tipos sugeridos según la pantalla y lo que ya hay (en landing vacía: navbar, hero, features, cta, footer; después de un navbar, hero…) |
| `suggestTypesForShape(rect, layout, kind)` | 5 sugerencias para «¿Qué es esto?» según la forma del rectángulo dibujado |
| `estimateContent(block, layout?)` | Lo que dirá el chip del bloque («Tabla · 8 filas»), o `null` |
| `blockCount(block)` | El ×N de un bloque repetible tal como lo lee el chip: `count`, si no el número de la nota, limitado al rango de la librería; `undefined` si no hay ninguno o el bloque no es repetible |
| `parseNote(note)` | Lee la nota sin IA: números («3», «tres», «×3») → `count`; palabras clave es/en («semanal», «buscador», «login»…) → `keywords`. «un/una/uno» no cuentan (casi siempre son artículo: «para una startup»), y «once» solo vale 11 si no va seguido de una palabra que lo haga el adverbio inglés («once a day») |

Los nombres y sinónimos de cada bloque viven en la app (`apps/web/src/i18n/layout.ts`), no aquí.

### Inferencia

`inferStructure(layout, options?) → Structure`

1. **Ámbitos.** Los bloques sin `parentId` (o con un padre que no existe, o en un ciclo: ambos con warning) forman el ámbito raíz, con marco de 12 columnas. Los hijos de un bloque forman su ámbito, con el marco de columnas del padre.
2. **Overlays.** Los bloques con `overlay: true` en la librería (modal) salen del flujo y van a `overlays`.
3. **Recursive XY-cut** sobre cada ámbito, con los bloques ordenados por `(row, col, z, id)`:
   - Busca cortes horizontales: un barrido por `row` con el fondo acumulado. Hay corte cuando el siguiente bloque empieza en o después del fondo, **con tolerancia τ = 1 unidad**: un solape de 1 fila también corta si es menor que la mitad del bloque más bajo de los dos. Los cortes verticales son iguales por columnas.
   - **Si hay cortes horizontales, corta por todos ellos** → `stack`. Si no, por los verticales → `row`. Si no hay ninguno → `grid`. Es una desviación consciente de «el hueco más ancho» (ver `docs/design/modo-layout-decisiones.md`): con píxeles, una cuadrícula 2×2 de cards se leería por columnas.
   - Recursión sobre cada parte. Un grupo de un solo bloque es un `BlockNode`.
4. **Salida.**
   - `stack`: hijos de arriba abajo, cada uno con `start`/`span` relativos al marco (los grupos ocupan el marco entero); `gaps` en filas entre hijos.
   - `row`: hijos de izquierda a derecha, cada uno en su banda de columnas; los grupos de una banda usan esa banda como marco.
   - `grid`: pistas desde los bordes únicos; `areas` con los nombres de área (o `null` si hay solapes). El nombre es el id, salvo que no sea un identificador CSS o sea una palabra reservada (`auto`, `span`, `none`, `default`, `inherit`, `initial`, `unset`, `revert`, `revert-layer`, en cualquier caja): entonces `a-` + id (`areaName`).
5. **Orden de lectura** (`order`): recorrido en profundidad; un bloque va antes que su contenido; filas de izquierda a derecha; celdas de grid por `(rowStart, colStart)`; overlays al final.
6. **Warnings**: solapes entre hermanos (`overlap`, con `ratio` y arreglos `move-below`, `clip` si es <15 % o `nest` si uno contiene al otro y es contenedor; `clip` recorta el de menor z, o el otro si el recorte dejaría fuera a un hijo, y no se ofrece si ninguno vale), `implicit-containment` (un bloque ≥90 % dentro de un contenedor sin `parentId`: arreglo `nest`), `outside-parent`, `missing-parent`, `cycle`, `not-accepted`, `out-of-bounds`, `invalid-rect` y `too-many-blocks`.

### Responsive

`deriveResponsive(layout, structure?) → { tablet, mobile }`

- **Tablet (8 columnas).** Cada `span` se escala por 8/12 y se redondea, con un mínimo de `minCols.tablet` (para un grupo: el máximo de su `stack` o la suma de su `row`). Una fila se mantiene (`keep`) si cabe la suma de los `minCols` de sus hijos (spec §5): si el redondeo se pasa del marco, se quitan columnas a los hijos que más sobran sobre su mínimo (en empate, al de más a la derecha). Si los mínimos no caben, hace wrap en orden de lectura (`wrap`). Un `grid` se mantiene si todas sus celdas caben con su mínimo; si no, se apila.
- **Móvil (4 columnas).** Todo se apila a ancho completo en orden de lectura, con el comportamiento de cada tipo (`mobile` de la librería, o `responsive.mobile.behavior`): navbar → hamburguesa, sidebar → drawer, KPIs → 2×2, cards → una columna, tabla → lista de tarjetas, calendario → agenda, hero → texto arriba, modal → sheet. `hide` y `responsive.<bp>.hidden` lo ocultan.
- Una tab bar (`tabbar`) va al final del flujo en móvil; dentro de un overlay (o de otra tab bar) se coloca en su sitio, nunca se pierde.
- Devuelve, por breakpoint, el plan de cada región (`nodes`, para `toCss`) y el rect derivado de cada bloque (`blocks`, para la preview del lienzo). Las alturas en móvil son una aproximación por comportamiento (p. ej., 2×2 duplica las filas de KPIs), con el ×N limitado a los topes del bloque, como el chip.

### CSS

`toCss(layout, options?) → string`

- Opciones: `scope` (selector raíz, por defecto `.dl-layout`), `kind` (`landing` | `app`), `space` (escala en px para cuantizar huecos; por defecto la de `@dialmade/doc`: 4, 8, 12, 16, 24, 32, 48, 64, 96, 128), `selector(id)` (por defecto `[data-dl-id="<id>"]`), `container` (nombre del container, `dl-layout`) y `structure`/`responsive` precalculados.
- Solo usa variables del contrato del tema (`--dl-space-*`) o privadas (`--_*`).
- Desktop: cada región es un grid con sus columnas (`grid-column: inicio / span w`). Los huecos verticales se cuantizan a `--dl-space-*` como `margin-block-start`; las columnas usan `column-gap: var(--dl-space-5)`.
- `landing`: el alto es una pista (solo `aspect-ratio` en media y gráficas). `app`: el alto es literal (`min-height`), también en los bloques con hijos (un contenedor o un modal mide lo dibujado aunque sus hijos ocupen menos).
- En tablet, cada contenedor anidado o región usa sus propias columnas derivadas (`repeat(4, …)` si ocupa 4 de 8), no las 8 del marco.
- Tablet y móvil con container queries: `@container dl-layout (width < 64rem)` y `(width < 40rem)`.

**Contrato del DOM** (lo que `toCss` espera; la Fase B lo genera desde `toElementTree`):
- Un elemento por bloque y por región, con `data-dl-id`, anidados como el árbol de `toElementTree(structure)`.
- Un bloque con contenido es a la vez el contenedor de su grupo raíz: no hay elemento de región extra entre el bloque y sus hijos.
- Los overlays son hijos directos del elemento raíz (`scope`), posicionados en absoluto.

### Wireframe ASCII

`toAsciiWireframe(layout, options?) → string`

- Opciones: `width` (caracteres, por defecto 64), `label(block, id)` (por defecto `block.label`), `breakpoint` (`desktop` | `tablet` | `mobile`) y `numbered` (antepone el orden de lectura).
- Solo ASCII (`+`, `-`, `|`). Cada borde de fila tiene su línea y cada caja al menos una línea interior, así que nunca se pierden etiquetas.
- Las etiquetas se miden en columnas de monoespaciada: emoji y caracteres anchos de Asia oriental (CJK, kana, Hangul, formas de ancho completo) cuentan 2 y las marcas combinantes 0, así que los bordes no se descuadran. Es una aproximación propia (rangos tipo `wcwidth`, sin `Intl.Segmenter`, para que la salida sea igual en todos los entornos): algún símbolo ambiguo puede ocupar distinto según la fuente.
- Tamaño acotado: como mucho 1000 caracteres de ancho y, si los huecos entre filas pasarían de ~2000 líneas, la escala vertical crece (cada borde conserva sus líneas).

### Edición (para el lienzo)

| Export | Qué hace |
|---|---|
| `emptyLayout()` | `LayoutDoc` vacío |
| `newBlockId(taken?, random?)` | `b-` + 6 base36 con `crypto.getRandomValues`, sin repetir los de `taken` |
| `findFreeSlot(layout, size, { parentId?, overlay? })` | Primer hueco libre (fila a fila) donde cabe el tamaño, dentro del contenedor si se da. Si no cabe dentro, devuelve también el rect agrandado del contenedor. Un overlay se centra en la fila 8 del ámbito (más arriba si así cabe en el contenedor) y nunca agranda el contenedor |
| `insertBlock(layout, { type, label, rect?, parentId?, count?, id? })` | Inserta (en el siguiente hueco libre si no hay `rect`) y normaliza → `{ layout, id, adjustments, grown? }`. Si el contenedor crece, empuja hacia abajo a los hermanos que empiezan en o debajo de su borde inferior (con sus descendientes), y los ancestros crecen igual si hace falta: nunca tapa lo que hay debajo |
| `normalizeDrop(layout, id)` | Tras mover, redimensionar o insertar: mete el rect en la rejilla (`clamp`, también los topes de filas), anida si cae ≥90 % dentro de un contenedor (`nest`), desanida si sale (`unnest`) y recorta solapes <15 % del bloque de menor z (`clip`), o del otro si el recorte dejaría fuera a un hijo; si ninguno vale, el solape se queda como warning. Devuelve `{ layout, adjustments }` |
| `moveBlock(layout, id, rect)` | Cambia el rect y arrastra a los descendientes con el mismo desplazamiento |
| `removeBlocks(layout, ids)` | Borra los bloques y sus descendientes |
| `duplicateBlock(layout, id, { newId })` | Copia el bloque (y sus descendientes) debajo del original. Si el padre está lleno, crece como en `insertBlock` |
| `applyFix(layout, fix)` | Aplica un `LayoutFix` de un warning. `nest` también mete el bloque dentro del padre (como al soltar), y un `clip` que ya dejaría fuera a un hijo no se aplica |
| `validateLayout(layout)` | Errores duros (`LayoutIssue[]`): versión, columnas, ids, rects (dentro de las 12 columnas, `row` ≤ `MAX_ROW`, `h` ≤ `MAX_HEIGHT_ROWS`), tipos, padres, ciclos, `count`, nota y el tope de 200. Para el `superRefine` de la Fase B |
| `sanitizeNote(raw)` / `sanitizeLabel(raw)` | Una línea en NFC, sin caracteres de control ni invisibles (ver «Modelo»), recortada a 200 / 60 |
| `layoutBounds(layout)` | Fila final ocupada |
| `toElementTree(structure)` | Árbol de elementos (bloques y regiones) que espera `toCss` |
| `absorbChildren(layout)` | Antes de compilar a una página: un bloque que no es contenedor no puede colocar hijos (su sección tiene un solo elemento raíz). Sus hijos aceptados (`accepts`: media, texto o formulario dentro de un hero) se absorben y no tienen elemento; los no aceptados pasan al ámbito del padre con un warning `not-accepted`. Contenedores y modales conservan sus hijos. Devuelve `{ layout, absorbed, unparented, warnings }`, y el mismo objeto `layout` si no cambia nada (la estructura cacheada sigue valiendo) |

### Plantillas

| Export | Qué es |
|---|---|
| `SCREEN_TEMPLATES` | Inicio, Precios, Login, Dashboard, Ajustes, Detalle, Lista, Checkout, Perfil y En blanco, con su `kind`, su marco de app (`shell`) y sus bloques. Un bloque puede traer nota inicial: el formulario de Login trae `Login`, para que salga un formulario de inicio de sesión |
| `SET_TEMPLATES` | «SaaS app» = Dashboard + Ajustes + Login; «Landing» = Inicio + Precios |
| `instantiateTemplate(template, { label, newId? })` | Crea el `LayoutDoc` de una plantilla con ids nuevos |

## Tests

- **Golden** (fixtures en `src/testing/fixtures.ts`, salidas en `src/__golden__`): holy grail, dashboard, landing apilada, bento, pinwheel, cards anidadas, modal, bloques desalineados ±1, solape parcial, lienzo vacío y un solo bloque. Cada uno fija la estructura, el CSS y el wireframe.
- **Propiedades** (PRNG con semilla propio en `src/testing/random.ts`, sin `fast-check`): cada bloque aparece una sola vez en `order`, recompilar es idempotente, permutar el orden de las claves no cambia nada, un jitter de ±1 dentro de la tolerancia no cambia la topología y las áreas son rectangulares.
- **Rendimiento:** `inferStructure` + `deriveResponsive` con 200 bloques en menos de 10 ms (test con mediana y `pnpm bench`).
- Los generadores y las fixtures se exportan en `@dialmade/layout/testing` para los tests de la app.
