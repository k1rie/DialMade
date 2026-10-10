# Pendientes detectados en QA manual

- [ ] **Moneda y formato por locale:** el copy de ejemplo en español usa «€» (por ejemplo «84,2 mil €»). Debería salir en MXN/USD con formato es-MX (o según una región elegida). Origen: `packages/sections/src/content`.
- [x] **Renombrar el proyecto a «Dialmade»** (hecho el 2026-10-10) (lo eligió el usuario el 2026-10-09): `@dialed/*` → `@dialmade/*`, `DIALED_*` → `DIALMADE_*`, textos, logo y wordmark, `CLAUDE.md`, `NOTICE`, `README`, la cookie de dispositivo y `.env.local`.
- [x] **`.env.example`:** reconciliar con `apps/web/.env.local` (borrador en el scratchpad) cuando termine el build.
- [ ] **turbo.json:** declarar `.env*` en `inputs` o `globalDependencies`, para que la caché de turbo no ignore los cambios de env.
