# Dialmade

Herramienta abierta para devs que no son diseñadores: compones una **dirección de diseño** (logo → paleta → estilo, tipografía y referencias → preview) y la entregas a Figma, Claude Design, Framer o como link.

Primer módulo en construcción: **Palette Lab**. Sueltas tu logo, se extraen sus colores y sale una paleta accesible (WCAG AA) con roles de shadcn en claro y oscuro, lista para exportar. Todo corre en el navegador, sin servicios de pago.

## Requisitos

- Node 24+
- pnpm 10 (`corepack enable pnpm`; si no tienes permisos, usa `npx pnpm@10` en lugar de `pnpm`)

## Cómo correrlo

```bash
pnpm install
pnpm dev          # http://localhost:3000
```

| Script | Qué hace |
|---|---|
| `pnpm dev` | App web en modo desarrollo |
| `pnpm build` | Build de todos los paquetes |
| `pnpm test` | Tests (vitest) |
| `pnpm lint` | ESLint |
| `pnpm typecheck` | TypeScript estricto |

## Estructura

```
apps/web            Next.js (App Router) + Tailwind v4 + motion
packages/palette    @dialmade/palette: motor de color en OKLCH (TS puro)
packages/catalog    @dialmade/catalog: catálogo de diseño en datos (ETL desde vendor/)
packages/doc        @dialmade/doc: DesignDoc, parches, variables del tema y exportadores
packages/ui         @dialmade/ui: kit de componentes tematizable de las páginas del usuario
packages/sections   @dialmade/sections: secciones, PageRenderer, minis y HTML estático
docs/research       Investigación y decisiones de producto
scripts/            fetch-vendor.sh: descarga los repos de referencia en vendor/
```

Los scripts de la raíz pasan por Turborepo, que necesita `pnpm` en el PATH. Sin `corepack enable pnpm`, usa `corepack pnpm -r typecheck`, `corepack pnpm -r test` o `corepack pnpm --filter web dev`.

La IA (copy con Claude) es opcional: copia `apps/web/.env.example` a `apps/web/.env.local` y pon tu `ANTHROPIC_API_KEY`.

## Créditos

Usa material de [ui-ux-pro-max-skill](https://github.com/nextlevelbuilder/ui-ux-pro-max-skill) e [i-have-adhd](https://github.com/ayghri/i-have-adhd), ambos MIT. Detalle en [NOTICE](./NOTICE).
