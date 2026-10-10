# Pendientes detectados en QA manual

- [x] **Moneda y formato por locale** (hecho el 2026-10-10): el copy de ejemplo usa USD con el símbolo estrecho: es-MX en español (`$29`, `84.2 k$`, `$1,249.50`) y en-US en inglés. Cambiaron `packages/sections/src/content/format.ts`, `packages/ui/src/lib/format.ts`, los textos de ejemplo con «€» y el coste de la IA (`apps/web/src/lib/money.ts`).
- [x] **Renombrar el proyecto a «Dialmade»** (hecho el 2026-10-10) (lo eligió el usuario el 2026-10-09): `@dialed/*` → `@dialmade/*`, `DIALED_*` → `DIALMADE_*`, textos, logo y wordmark, `CLAUDE.md`, `NOTICE`, `README`, la cookie de dispositivo y `.env.local`.
- [x] **`.env.example`:** reconciliar con `apps/web/.env.local` (borrador en el scratchpad) cuando termine el build.
- [x] **turbo.json** (hecho el 2026-10-10): `.env*` está en los `inputs` de `build` y `test`, y `build` declara las env `NEXT_PUBLIC_*`, `DIALMADE_*`, `SUPABASE_*` y `ANTHROPIC_*` (`dev` las deja pasar con `passThroughEnv`).
