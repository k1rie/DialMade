# @dialmade/sections

Catálogo de secciones de **las páginas del usuario**: Guía de estilo (`brand`), Landing page (`landing`) y Dashboard y componentes (`app`). Incluye el registro, el render de una `Page` del DesignDoc, el copy determinista, las minis, el contenedor de tema y el export a HTML estático.

- React 19 y CSS plano con clases `dl-` (BEM simple). Cada componente tiene su `.css` en su folder. Como `@dialmade/ui`, solo lee las variables del tema (contrato en `@dialmade/ui` → `isThemeContractVar`); un test falla si un `.css` lee otra cosa.
- Los componentes de las secciones usan `@dialmade/ui`.

## Añadir una sección

Cada sección va en su folder (`src/landing/Hero/Hero.tsx` + `Hero.css` + `index.ts`). Se registra en el array de su kind (`src/landing/index.ts`) y su `.css` se añade a `src/landing/styles.css`.

```tsx
import { z } from "zod";
import { defineSection, heroCopy } from "@dialmade/sections"; // dentro del paquete: "../../defineSection", "../../content"

export const heroSection = defineSection({
  type: "landing.hero",
  kind: "landing",
  label: { es: "Portada", en: "Hero" },
  variants: [{ id: "centered", label: { es: "Centrada", en: "Centered" } }, { id: "split", label: { es: "Dividida", en: "Split" } }],
  schema: z.strictObject({ title: z.string(), subtitle: z.string(), cta: z.string() }),
  knobs: [{ key: "variant", label: { es: "Composición", en: "Layout" }, control: "select", scope: "section" }],
  defaultProps: (ctx) => {
    const hero = heroCopy(ctx);
    return { title: hero.title, subtitle: hero.subtitle, cta: hero.primaryCta };
  },
  // bindings: { brandName: "brand.name" },   // se guardan como { bind } y siguen a la marca
  Component: ({ title, subtitle, cta, variant, ctx, elementId }) => <header data-variant={variant}>…</header>,
});
```

- `variant` se guarda en `props.variant`. Si no existe, se usa la primera.
- Las props guardadas se validan **clave a clave**: una clave inválida vuelve a su valor de `defaultProps`.
- `defaultProps(ctx)` tiene que ser determinista y JSON, porque `buildDefaultPage` lo guarda en el doc.
- Contenedores (`container: true`, p. ej. `app.shell`): reciben los elementos hijos ya renderizados en `children`. `defaultChildren` fija los widgets por defecto (`APP_SHELL_WIDGETS` de `@dialmade/doc` para el shell). En modo edición envuelven su propio chrome (navegación, botones) con `EditInert` para que solo sus hijos sigan siendo seleccionables.
- `ctx: RenderContext` extiende `ContentContext`, así que vale para los helpers de copy (`tableData(ctx)`). Lleva también `mode`, `interactive`, `doc` y la marca (`ctx.brand.logoUrl`).
- El wrapper de cada elemento tiene la clase `dl-el dl-el--<tipo>` (p. ej. `dl-el--app-kpi-row`), por si el contenedor necesita colocarlo en su grilla.

## Secciones ui.*

Son los bloques genéricos del Modo Layout. Viven en `src/ui/`, un folder por sección (`X.tsx`, `X.css`, `schema.ts`, `definition.ts`, `fit.ts`, `index.ts` y `X.test.tsx`), y se registran en `uiSections` (`src/ui/index.ts`).

| Tipo | Bloque de la librería | Variantes | `fit` (claves en `owns`) |
|---|---|---|---|
| `ui.text` | Texto | heading · prose · callout | `level`, `align`, `showBody`, `showAction` y `frame` |
| `ui.media` | Media | gradient · browser · device | `ratio` (la del chip) y `frame` |
| `ui.cards` | Tarjetas | feature · compact · stat | `count`, `columns` (una cada 240 px), `mobile` y `frame` |
| `ui.calendar` | Calendario | month · week · agenda · mini | la variante es la vista del chip; `mobile` y `frame` |
| `ui.list` | Lista | simple · avatars · divided | `count` (filas del chip) y `frame` |
| `ui.form` | Formulario | card · plain | `purpose` (por la nota), `count` (campos del chip) y `frame` |
| `ui.placeholder` | Bloque libre y bloques «Pronto» | dashed · skeleton | `count` y `frame`; `blockType`, `blockLabel`, `blockNote` y `soon` los escribe `buildPageFromLayout` |
| `ui.region` | Contenedor (y las regiones del layout) | plain · card · muted | `role: "group"` |

**Reglas**
- `fit(input)` traduce lo que promete el chip del lienzo (`input.estimate`, de `estimateContent`). Un test recorre la rejilla (w 1–12 × h 4–80) y comprueba que siempre da props válidas y que coincide con el chip.
- Las listas repetibles se guardan completas (12 tarjetas, 12 filas, 12 eventos, los 11 campos del formulario) y `count` decide cuántas se ven. Así, cambiar el tamaño nunca pierde textos editados.
- `kind: "app"` («Dashboard y componentes») solo agrupa estas secciones en `registry.list`. La librería del Modo Layout sale de `LIBRARY` de `@dialmade/layout`, nunca de `registry.list(kind)`.
- Cada bloque es su propio container (`dl-ui` más `dl-ui-<bloque>`). El comportamiento en móvil va en una prop (`mobile`) y se aplica con `@container dl-layout (width < 40rem)`.
- `frame`: `plain`, `card` o `section`. Con `section`, el bloque lleva los márgenes laterales y el contenedor centrado de las secciones de landing; `fit` lo pone en los bloques de ancho completo de una landing.
- `ui.region` no pinta caja propia, porque `toCss` coloca sus hijos sobre el wrapper. Con `role: "scope"` pinta el `.dl-layout` de la página. `frame.structural` hace que `scope` y `inferred` no se puedan seleccionar. `frame.attributes` pone `data-dl-region`, `data-dl-layout`, `data-dl-surface` y `data-dl-padding` en el wrapper.
- `blockLabel` y `blockNote` son datos del usuario y se muestran como texto. La IA no debe reescribirlos. El enlace «Votar en GitHub» solo sale en modo edición.
- `ui.form` sin `title`, `description`, `submit` o `secondary` usa el texto de su propósito («Iniciar sesión»). Una cadena vacía lo oculta.
- Las acciones principales usan `linkProps(ctx, elementId)`: el enlace del bloque (`linkTo`) más `data-dl-screen-link`, o `#` si no hay. Un formulario enlazado envía a esa pantalla en el HTML estático.
- El dinero sale de `formatMoney`: USD con `es-MX` o `en-US`, nunca «€».

## Modo Layout

`buildPageFromLayout(layout, kind, shell, ctx, options?)` compila el layout de una pantalla (`LayoutDoc` de `@dialmade/layout`) a la `Page` de esa pantalla. Devuelve `{ page, css, fingerprints, absorbed, warnings, links }`.

- **Árbol:** raíz (`${kind}.page`) → `shell` (`app.shell`, solo en pantallas de app con navegación) → `layout` (`ui.region` con `role: "scope"`) → las regiones inferidas (`ui.region` con `role: "inferred"`, ids `r-…`) y los bloques, anidados como `toElementTree`. El id de cada elemento es el id del bloque y su tipo es el `sectionType` de la librería. `root`, `shell`, `layout` y el prefijo `r-` están reservados (`isValidBlockId`).
- **Validez:** la página pasa `checkScreenPage(page, kind)` de `@dialmade/doc` y `css` es `toCss` del layout compilado (sin los bloques absorbidos). Cada id que apunta el CSS es un `data-dl-id` del HTML.
- **Props:** cada sección con `layout` declara `owns` (las claves que decide el tamaño) y `fit(input: FitInput)`, que traduce lo que promete el chip del lienzo (`estimateContent`). El primer bloque de cada tipo usa la semilla del documento y los demás `deriveSeed(seed, blockId)`. Un texto nuevo nunca repite un título que ya está en la página.
- **Regenerar** (`options.previous`): si la huella (`block.generated`) no cambió, el bloque se queda como estaba. Si cambió, conserva su copy y se recalculan `owns` y la variante. `mode: "content"` (cambio de idioma o de producto) genera copy nuevo y conserva `owns`, la variante y lo fijado. `block.pinned` son JSON Pointers relativos a las props (`/title`, `/items/2/title`) y siempre se respetan.
- **Absorber:** un bloque que no es contenedor no tiene hijos en la página. Sus hijos aceptados (media, texto o formulario dentro de un hero) se integran en su sección (`absorbed`) y el resto sube a su ámbito.
- **Enlaces:** `links` (id de elemento → pantalla, de `linkTo`) y `linkHref` van a `PageRenderer` o `renderStaticPage`. Las acciones principales llevan `data-dl-screen-link` y `onNavigate` cambia de pantalla en la vista previa navegable.
- **Estructurales:** `isStructuralElement(def, element)` dice si un elemento es una caja del layout (el ámbito o una región inferida): no se selecciona, no tiene parada de tabulación y no es copy. Las capas, el inspector y la IA lo usan para saltarlo.
- **Lo que se ve:** las listas repetibles se guardan completas y `count` decide cuántas se muestran. `visibleProps(element)` devuelve las props tal como se ven (listas cortadas, textos ocultos fuera). Lo usan los exportadores de `@dialmade/doc` (opción `visibleProps`) y el recolector de la IA, para no describir lo que la página no enseña. Una sección nueva con listas así declara `visible` (`countedList("items")` en `src/lib/visible.ts`).

## Render

```tsx
import { PageRenderer, ThemeStyles, pairingForDoc } from "@dialmade/sections";
import "@dialmade/ui/styles.css";
import "@dialmade/sections/styles.css";

const vars = compileThemeVars(doc, { ...resolveThemeInputs(doc), mode });
<ThemeStyles vars={vars} mode={mode} pairing={pairingForDoc(doc)}>
  <PageRenderer doc={doc} kind="landing" mode={mode} interactive selectedId={id} onSelect={setId} logoUrl={logoUrl} />
</ThemeStyles>;
```

- Sin `page` usa `doc.pages[kind]`, o `buildDefaultPage` si el doc no tiene esa página.
- No pinta los elementos de `page.hidden` ni los de `exclude`.
- Cada sección tiene su error boundary: en modo edición se ve un aviso y en estático, nada.
- En modo edición cada elemento es focusable y se selecciona con clic, Enter o Espacio. Se marca con `data-dl-selected` y `aria-current`, y el contorno lo pinta la app. El contenido de cada sección es `inert`: sus botones, enlaces y campos no reciben clics ni foco (una parada de tabulación por sección, y una demo como un diálogo no se abre sobre la app). El HTML estático sí es interactivo.
- `.dl-page` lleva `lang` con el idioma del contenido, que puede diferir del de la app.

## Páginas por defecto

`buildDefaultPage(kind, ctx, layoutId?)` devuelve una `Page` válida, con ids de `@dialmade/doc` (`hero-1`):

| Kind | Secciones |
|---|---|
| `landing` | Las del layout del catálogo (por defecto, el del productType) |
| `brand` | `brand.cover` … `brand.artDirection` |
| `app` | `app.shell` con los widgets dentro y `dials.density = 7` |

`addDefaultPage(doc, kind, opts)` hace lo mismo y la añade al doc.

## Copy determinista

Hay helpers para cada pieza:
- `heroCopy`, `navLinks`, `featureList`, `statList`, `logoWall`, `testimonialList`, `pricingPlans`, `ctaCopy`, `footerCopy`, `sectionHeading`
- `appNav`, `kpiList`, `chartData`, `tableData`, `activityFeed`

Cómo funcionan:
- Salen de 13 perfiles de contenido escritos a mano en es y en, uno por cada grupo del catálogo (los 17 grupos se reparten entre los 13 perfiles).
- La semilla es `contentSeed(doc)`, que depende del productType y de `createdAt`. No cambia al renombrar la marca.
- Las personas, las empresas y las publicaciones son ficticias. No hay marcas reales ni lorem ipsum.
- Los números siguen el formato de cada idioma (`es-MX` o `en-US`) y el dinero siempre va en USD con «$» (`formatMoney`).

## Export a HTML

```ts
import { readBundledCss } from "@dialmade/sections/node"; // solo en Node
const html = renderStaticPage(doc, "landing", vars, { mode: "light", css: await readBundledCss() });
```

El documento incluye `<style>` con las variables, el `<link>` de Google Fonts del pairing y el CSS del kit, inline (`css`) o enlazado (`stylesheets`). React no tiene error boundaries en el servidor, así que cada sección se prueba primero por separado: las que fallan se quedan fuera y se reportan en `onSectionError`.

## Scripts

- `corepack pnpm build:css` (también `build`): concatena `src/styles.css` en `dist/dialmade-sections.css` y falla si algún `.css` no está importado.
- `corepack pnpm test`
- `corepack pnpm typecheck`
