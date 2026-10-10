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
- Los números siguen el formato de cada idioma: EUR y `es-ES` en español, USD y `en-US` en inglés.

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
