# Encargo del chat «Prueba MCP After Effects»: capturas para el video promo

**Recibido el 2026-10-10.** El usuario pidió hacerlo y avisar a ese chat al terminar.

**Orden:**
1. Fusionar la importación a `main`.
2. Construir `/promo` y `pnpm promo:capture`.
3. Verificar que dos corridas den los mismos hashes.
4. Avisar con `SendMessage` a «Prueba MCP After Effects» [4a971b], incluyendo la ruta de salida, la lista de archivos y el comando para regenerarlos.

**Para no chocar con la Fase B del Modo Layout:** no se editan componentes reales. Las piezas se envuelven desde `src/components/PromoScene/` con `data-promo-part`.

---

## 1. Ruta `/promo` (solo en desarrollo)

- **Archivo:** `apps/web/src/app/promo/page.tsx`. En producción responde 404 (`notFound()` si `NODE_ENV === "production"`).
- **Parámetros:**
  - `scene`: qué pantalla o estado mostrar.
  - `only`: id de una pieza para mostrarla sola.
  - `bg=transparent`: body y `AppBackground` transparentes.
  - `lang=es|en`.
  - `viewport=mobile`: 390×844, solo si la app tiene vista móvil.
- **Determinista:**
  - marca ficticia fija (logo de `SampleLogos`, paleta y textos);
  - `MotionConfig reducedMotion="always"` con los estados finales;
  - sin cursor, sin toasts, sin anillo de foco y sin nada aleatorio (semillas y fechas fijas);
  - sin red ni IA.
- **Señal de listo:** cuando todo esté pintado y `document.fonts.ready` haya resuelto, poner `data-promo-ready` en `<html>`.
- **Piezas:** cada una lleva `data-promo-part="<id>"`.
- **Componentes reales**, no copias. Lo que vive en la mitad de diseño se carga con los loaders de `designHalf.ts`.
- **Reglas de `CLAUDE.md`:** un folder por componente (`src/components/PromoScene/`) y textos en `src/i18n`.

## 2. Escenas

| `scene` | Qué muestra | Piezas (`only`) |
|---|---|---|
| `home` | `HomeHero` | `hero`, `dialmark` |
| `logo-empty` | Dropzone vacía | `dropzone` |
| `logo-loaded` | Logo y paleta extraída | `dropzone`, `swatches` |
| `palette` | `PaletteLab` | `palette-card` |
| `style` | `LayoutStep` con el set «Landing» (lienzo con bloques y selector de estilo) | `style-picker` |
| `preview` | `Composer` con la landing generada desde el set «Landing» | `preview-page` |
| `export` | `ExportDialog` | `export-dialog` |

## 3. Script `pnpm promo:capture` (en `apps/web`)

- **Herramienta:** Playwright (devDependency, Chromium).
- **Servidor:** se corre contra el dev server ya levantado, `PROMO_BASE_URL` (por defecto `http://localhost:3000`).
- **Manifiesto:** `apps/web/promo/scenes.ts`.
- **Viewport:** 1440×900 por defecto.
- **Resolución:** pantallas a DPR 2 y piezas a DPR 3. Las piezas transparentes usan `omitBackground`.
- **Captura:** se espera a `data-promo-ready`.
- **Salida:**
  - va a `PROMO_OUT_DIR`, por defecto `apps/web/.promo-captures/` (añadirla al `.gitignore`);
  - nombres estables: `<scene>.png` y `<scene>__<part>.png`;
  - `manifest.json` con el tamaño de cada archivo, la caja de cada pieza y un hash.

## 4. Tokens

`tokens.json` con las variables de `:root` leídas con `getComputedStyle` (colores en hex, radios y sombras), más las familias y pesos tipográficos en uso.

## Criterios de aceptación

- `pnpm promo:capture` genera los PNG, `manifest.json` y `tokens.json`.
- Dos corridas seguidas dan los mismos hashes.
- Las piezas con `bg=transparent` tienen alfa real.
- `/promo` responde 404 con `build` + `start`.
- Pasan typecheck, lint y test.
- Al terminar se entrega la lista de archivos y el comando para regenerarlos.

## Fuera de alcance

- Grabar video o animar algo.
- Servicios de pago.
- Cambiar la estética de la app.

## Indicación posterior del chat de After Effects (2026-10-10)

- **Captura real:** se corre con `PROMO_OUT_DIR=/Users/diegoguerrero/Documents/dialmade-promo-demo/screens`, porque el proyecto de After Effects vive al lado.
- **Default del repo:** sigue siendo `apps/web/.promo-captures/`.
- **Recapturar `style`** ahora que el Modo Layout reemplazó a CreateStep no es problema: con nombres estables, solo hay que recargar el footage en After Effects.
