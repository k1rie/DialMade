# @dialmade/ui

UI kit tematizable para **las páginas del usuario** (Guía de estilo, Landing, Dashboard y componentes). No es el UI de la app: nunca lee `--app-*` ni clases de Tailwind.

- React 19, CSS plano con clases `dl-` (BEM simple), un `.css` por componente dentro de su folder.
- Solo lee las variables del tema: color de `@dialmade/palette` (`toCssVars` / `toCssVarRecord`) y tokens `--dl-*` de `@dialmade/doc`. La lista está en `src/lib/contract.ts` y un test falla si un `.css` lee otra cosa.
- Los textos internos (cerrar, cargando, paginación…) van en es/en con `<UiProvider locale>`; sin provider, inglés.

## Uso

```tsx
import { Button, Card, CardHeader, Chart, UiProvider } from "@dialmade/ui";
import "@dialmade/ui/styles.css"; // bundlers; para HTML exportado: @dialmade/ui/dialmade-ui.css (dist)

<UiProvider locale="es">
  <div style={themeVars /* toCssVarRecord(theme, "light") + compileThemeVars(doc) */}>
    <Button variant="cta" iconEnd="arrow-right">Empezar</Button>
  </div>
</UiProvider>;
```

- `<a {...buttonStyleProps({ variant: "cta", size: "lg" })}>` pinta un enlace como botón.
- `previewState="hover" | "focus" | "active"` fuerza el aspecto de un estado (guías de estilo).
- `<Gallery locale="es" sections={["buttons", "charts"]} />` pinta todos los componentes con todas sus variantes y estados.

## Formato esperado de los tokens

| Variable | Valor |
|---|---|
| `--dl-radius-*`, `--dl-space-*`, `--dl-button-h-*`, `--dl-button-px`, `--dl-card-padding`, `--dl-input-h`, `--dl-nav-h`, `--dl-table-row-h`, `--dl-sidebar-w`, `--dl-border-width` | longitud (`8px`, `0.5rem`) |
| `--dl-heading-tracking` | longitud (`-0.02em`) |
| `--dl-heading-weight`, `--dl-button-weight` | número (`600`) |
| `--dl-shadow-*`, `--dl-button-shadow`, `--dl-card-shadow` | `box-shadow` completo o `none` |
| `--dl-card-border` | shorthand de `border` (`1px solid var(--border)` o `0 solid transparent`) |
| `--dl-duration-*` | tiempo con unidad (`200ms`) |
| `--dl-ease` | `transition-timing-function` |
| `--dl-font-*` | `font-family` completa con fallback |

Todas tienen un valor de respaldo en el CSS, así que el kit se ve bien aunque falte alguna.

## Scripts

- `pnpm build:css` (también `build`): concatena `src/styles.css` en `dist/dialmade-ui.css` y falla si algún `.css` no está importado.
- `pnpm test`: vitest + Testing Library (render, roles y nombres accesibles, contrato de variables, SSR).
- `pnpm typecheck`.
