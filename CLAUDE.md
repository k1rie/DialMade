# Dialmade

App open source (MIT) que ayuda a devs a componer una dirección de diseño: logo → paleta → estilo → preview → handoff. Plan y decisiones en `docs/research/INFORME.md` (ver §15: presupuesto ~$0, edición tipo Claude Design).

## Monorepo

- pnpm workspaces + Turborepo. Los paquetes exportan su código TS fuente: `apps/web` los lista en `transpilePackages`.
  - `apps/web`: Next.js (App Router), Tailwind v4, motion. Tiene `pnpm test` (vitest) para `src/lib` y los exportes.
  - `packages/palette` (`@dialmade/palette`): motor de color en OKLCH, TS puro. No se cambia su API; solo se añaden exports.
  - `packages/catalog` (`@dialmade/catalog`): datos del catálogo (tipos de producto, recetas, tipografías, layouts, motion), generados por ETL desde `vendor/`.
  - `packages/doc` (`@dialmade/doc`): DesignDoc v1 (Zod), parches RFC 6902, `compileThemeVars` (incluye los colores de estado `--primary-hover`…) y exportadores (CSS, DTCG, Figma, DESIGN.md, prompt packs).
  - `packages/ui` (`@dialmade/ui`): kit de componentes de las páginas del usuario, CSS plano con clases `dl-`. Es dueño del contrato de variables del tema (`@dialmade/ui/contract`).
  - `packages/sections` (`@dialmade/sections`): registro de secciones, `PageRenderer`, copy determinista, minis y export a HTML estático. `addDefaultPage` es la forma de crear páginas (`createPage` de doc es de bajo nivel).
  - `packages/import` (`@dialmade/import`): «Trae tu marca». Detecta, lee y fusiona colores pegados, CSS, tokens, DESIGN.md, capturas y fuentes por nombre, y `applyImport` lo convierte en un JSON Patch del DesignDoc. TS puro, sin DOM: corre en `src/workers/import.worker.ts`.
- La mitad de diseño de la app (Crear, Ajustar, Exportar) carga en diferido por `src/components/PaletteFlow/designHalf.ts`: una vista nueva que deba cargar así añade ahí su loader. El flujo de importación tiene dos pasos: `import` (ImportPanel, por `next/dynamic`) y `review` («Esto detectamos», DetectedReview, por `loadDetectedReview` de designHalf).
- Los workers no pueden usar `typeof window` para saber si corren como worker (Turbopack lo sustituye por una constante): se usa `WorkerGlobalScope`.
- El chrome de la app dentro de `ThemeScope` (barras, insignias) lleva la clase `.app-chrome` para conservar los estilos base de la app.
- IA opcional en `src/lib/ai`: copy (`/api/ai/copy`), visión sobre capturas (`src/lib/ai/vision`, `/api/ai/fingerprint`) y `/api/ai/status`. Free tier por dispositivo dentro de un presupuesto duro mensual, después BYOK o «Copiar prompt para mi Claude». La infraestructura común es `withAiBudget`/`runWithAiBudget` en `src/lib/ai/access.ts`. El ledger vive en Supabase (`supabase/migrations/*_ai_ledger.sql`); sin Supabase, la IA hospedada solo funciona fuera de producción.
- Cuentas opcionales con **Better Auth** (no Supabase Auth) en `src/lib/auth`: magic link, GitHub/Google, passkeys y dispositivos anónimos que pasan a cuenta. Tablas en el schema `dialmade_auth` y «Mis diseños» en `dialmade.designs`, vía `DATABASE_URL` (`src/lib/db`). No hay RLS por usuario: **toda consulta de diseños filtra por el `userId` de la sesión en el servidor** (`src/lib/designs/repository.ts`). Sin `DATABASE_URL` la app funciona igual, sin cuentas. Stripe está instalado y apagado (`docs/design/billing.md`). Pendientes en `docs/design/login-pendientes.md`.
- Comandos: `pnpm dev`, `pnpm build`, `pnpm test`, `pnpm lint`, `pnpm typecheck` (pasan por turbo y necesitan `pnpm` en el PATH: `corepack enable pnpm`). Sin eso, `corepack pnpm -r <script>` o `corepack pnpm --filter <paquete> <script>`.

## Estructura de componentes (obligatoria)

**Un folder por componente.** Dentro del folder va el `.tsx` y todo lo que el componente necesite: hooks propios, tipos, constantes, tests y assets. Fuera del folder no va nada específico del componente.

```
src/components/
  LogoDropzone/
    LogoDropzone.tsx        # componente (PascalCase, mismo nombre que el folder)
    index.ts                # export { LogoDropzone } from "./LogoDropzone";
    useLogoDecode.ts        # hook usado solo por este componente
    LogoDropzone.test.tsx   # tests del componente
    types.ts / constants.ts # si hacen falta
```

- Se importa siempre por el folder: `import { LogoDropzone } from "@/components/LogoDropzone"`.
- Un subcomponente que solo usa un padre va dentro del folder del padre, en su propio folder: `LogoDropzone/DropHint/DropHint.tsx`.
- Las primitivas de shadcn/ui siguen la misma regla: `src/components/ui/Button/Button.tsx`. Después de `shadcn add`, se mueve el archivo a su folder.
- Lo compartido entre varios componentes va en `src/hooks/`, `src/lib/` o `src/i18n/`.
- Dos excepciones aceptadas: `icons.tsx` (los iconos SVG que usa un componente y sus hijos, como asset de su folder) y los componentes compuestos que se usan siempre juntos en un mismo archivo (`Card` con `CardHeader`, `CardBody` y `CardFooter`).

## Reglas

- Nada de servicios de pago, salvo **la API de Anthropic** con presupuesto duro mensual (`DIALMADE_AI_MONTHLY_BUDGET_USD`) y BYOK opcional. Lo decidió el usuario el 2026-10-09. La app debe funcionar completa sin IA.
- No se usa GSAP (por licencia). El motion va con `motion` (`motion/react`), con `<MotionConfig reducedMotion="user">`.
- Presupuesto de motion: feedback ≤200 ms, transiciones de estado ≤400 ms y momentos firma ≤900 ms, que se pueden saltar.
- Todo drag tiene una alternativa por clic y por teclado (WCAG 2.5.7). Space y Enter quedan reservados para coger y soltar.
- Los textos de la UI van en el diccionario es/en (`src/i18n`).
- Nada de logos de marcas reales en el repo: solo logos ficticios.
- Los colores, el estilo visual y las referencias de cada vista los define el usuario. No se inventa la estética de la app.
