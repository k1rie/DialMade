# Modo Layout: pendientes para la Fase B

**Fecha:** 2026-10-10. **Rama:** `feat/layout-mode`.

La Fase A solo puede tocar su zona (`LayoutStep/`, `lib/geometry/`, `lib/devices.ts`, `i18n/layout.ts`, `packages/layout/` y los documentos nuevos). Aquí se apunta lo que se duplicó o se tocó fuera de esa zona, para resolverlo cuando `import` esté en `main`.

## Cambios fuera de la zona de la Fase A

**Primitivas duplicadas del Composer**
- `Segmented`, `Popover` y `PanelSection` están copiados en `LayoutStep/{Segmented,Popover,PanelSection}/`, sin cambios de comportamiento.
- Fase B: moverlos a `src/components/ui/{Segmented,Popover,PanelSection}/`, apuntar a ellos los imports del Composer y de `LayoutStep`, y borrar las dos copias.

**Geometría**
- `src/lib/geometry/rect.ts` es una copia literal de `components/LogoCropper/geometry.ts`.
- Fase B: borrar el original y que `LogoCropper` importe de `@/lib/geometry`.
- De paso: `isArrowKey` usa `key in ARROWS`, así que devuelve `true` para claves del prototipo (`"toString"`). No pasa con teclas reales; `grid.ts` ya usa un `Map`.

**Dispositivos**
- `DEVICE_WIDTHS` y `DEVICE_ORDER` están copiados en `src/lib/devices.ts`, con su propio tipo `Device` y `DEVICE_COLUMNS`.
- Fase B: borrarlos de `Composer/constants.ts` y que el Composer importe de `@/lib/devices`.
- Hoy hay tres uniones iguales: `PreviewDevice` (`hooks/useDesignDoc.ts`), `Device` (`lib/devices.ts`) y `Breakpoint` (`@dialmade/layout`). Fase B: dejar una (`PreviewDevice = Device = Breakpoint`).

**Paquete `@dialmade/layout` en la app**
- `apps/web/package.json`: dependencia `"@dialmade/layout": "workspace:*"`.
- `apps/web/next.config.ts`: `@dialmade/layout` en `transpilePackages`.
- `pnpm-lock.yaml` cambia por eso. En el merge con `main` el conflicto es trivial: se regenera con `corepack pnpm install`.

**Iconos**
- `LayoutStep/icons.tsx` repite algunos iconos de `Composer/icons.tsx` (deshacer, rehacer, ojo, chevrons, flechas, dispositivos…). CLAUDE.md lo permite (`icons.tsx` es un asset del folder).
- Fase B, opcional: si un tercer componente los necesita, moverlos a un `icons.tsx` compartido en `src/components/ui/`.

**Textos**
- `i18n/layout.ts` tiene su propio `common` (Deshacer, Rehacer, Cancelar…), igual que el Composer tiene `undoAction`.
- Fase B, opcional: subir las acciones repetidas a `i18n/common.ts`.

**Tests de `apps/web`**
- No hay `vitest.config`, así que en los tests el alias `@/` no se resuelve. Por eso `i18n/layout.ts` importa `../lib/geometry/grid` con ruta relativa.
- Fase B, opcional: añadir un `vitest.config.ts` con el alias `@/` (sin dependencias nuevas).
