# @dialmade/handoff

El handoff de Dialmade a Figma y a código. Del DesignDoc v2 sale un **árbol de diseño** neutro (cajas anidadas con auto layout) y de ese árbol salen dos exportes:

- **figma-plan v1** (`toFigmaPlan`): JSON versionado (esquema Zod en `@dialmade/handoff/figma-plan`) que lee el plugin de `packages/figma-plugin`.
- **TSX** (`toTsx`): componentes React + Tailwind v4, uno por sección y una página por pantalla.

```ts
import { toFigmaPlan, toTsx, parseFigmaPlan } from "@dialmade/handoff";

const plan = toFigmaPlan(doc, inputs); // FigmaPlan (JSON)
const files = toTsx(doc, inputs);      // { "src/screens/InicioScreen.tsx": "…", "src/dialmade.css": "…", … }
```

## Cómo funciona

1. **Árbol** (`src/tree/build.ts`). Una pantalla del Modo Layout se recorre por su estructura inferida (`absorbChildren` + `inferStructure` de `@dialmade/layout`, la misma compilación que `buildPageFromLayout`): las pilas pasan a columnas, las filas y pilas parciales a rejillas de 12 columnas con colocación explícita y las regiones bento a pistas. Cada bloque se convierte en su sección. La Guía de estilo y los documentos sin pantallas se recorren elemento por elemento.
2. **Secciones** (`src/tree/sections/<familia>/`). Un builder por tipo de sección (`landing.*`, `app.*`, `ui.*`, `brand.*`) que replica el componente React y su CSS de `@dialmade/sections` con las props resueltas (`resolveSectionProps`). Las reglas para escribir uno están en `src/tree/sections/README.md`. Un tipo sin builder sale como esquema de su copy (`generic.ts`).
3. **Valores del tema**. El árbol nunca guarda colores ni tamaños resueltos: colores = variables del contrato de `@dialmade/ui` (`primary`, `muted-foreground`, `color-brand-500`), espacios = pasos de `--dl-space-*`, radios y sombras = tokens. Cada emisor los resuelve a su manera.
4. **figma-plan** (`src/figma/toFigmaPlan.ts`): colecciones de variables `Dialmade · Color` (Light/Dark, nombres como `figma-*.tokens.json`) y `Dialmade · Tokens`; estilos de texto y de sombra; una página por pantalla y la Guía de estilo; frames con auto layout (VERTICAL/HORIZONTAL, gap, padding, FIXED/HUG/FILL) y cada color, espacio y radio ligado a su variable. Los `linkTo` entre pantallas pasan a `navigateTo` (el plugin los convierte en enlaces de prototipo). Las regiones bento van con posiciones absolutas dentro de un frame fijo.
5. **TSX** (`src/tsx/`): clases de Tailwind v4 sobre las variables CSS (`bg-primary`, `gap-(--dl-space-5)`, `rounded-(--dl-card-radius)`, `text-h2` con `@utility`). Las rejillas del layout se apilan en móvil con container queries. `src/dialmade.css` trae el tema (claro, `.dark` y `.light`).

Todo es determinista: el mismo documento da el mismo plan y los mismos archivos.

## Tests

- Golden del figma-plan y del TSX (`src/golden.test.ts`, archivos en `src/__golden__/`). Para regenerarlos tras un cambio intencionado: `UPDATE_GOLDEN=1 corepack pnpm --filter @dialmade/handoff test`.
- El TSX exportado pasa por `tsc` (React 19, `strict`) y cada clase se compila con Tailwind v4 (`src/tsx/check.ts`).
- Comparación visual de cada sección, real contra plan (Playwright de `apps/web`):

  ```bash
  HANDOFF_SHOTS=/tmp/shots HANDOFF_ONLY=landing. corepack pnpm --filter @dialmade/handoff exec vitest run src/dev
  ```

  Escribe `<doc>-<página>/<tipo>--<id>.real.png` y `.plan.png`. `planPreviewHtml(plan, pageId)` dibuja un plan como lo maquetaría Figma.
