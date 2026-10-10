# «Diseño con IA»: cuatro tracks en paralelo

**Fecha:** 2026-10-10. **Rama base:** `feat/ai-render` (cimientos en `cdc8a10` y `911db15`). Cada track trabaja en su worktree, sale de esa rama y vuelve a ella.

**Lee antes:** `diseno-con-ia-spec.md` (con §15, resultados del spike y desviaciones) y `CLAUDE.md`.

## Qué hay ya (los cimientos)

| Pieza | Dónde | Estado |
|---|---|---|
| Contrato de salida, vocabulario solo-tokens (lint), `@theme` | `packages/ai-render/src/{vocabulary,theme}.ts` | Hecho, con tests |
| Sanitizador parse5 con lista blanca y reserialización | `packages/ai-render/src/{sanitize,tree,allowlist}.ts` | Hecho; corpus inicial de 31 ataques |
| Parser incremental del stream | `packages/ai-render/src/stream.ts` | Hecho |
| Puertas 1, 2, 3, 6, 7 y 8 | `packages/ai-render/src/{gates,pipeline}.ts` | Hechas |
| Puerta 4, contraste **sobre tokens** con arreglos | `packages/ai-render/src/contrast.ts` | Hecha (claro y oscuro, degradados, hover, foco) |
| Puerta 5, responsive | `apps/preview/src/measure.ts` | **Stub**: mide solo al ancho actual de la isla |
| Dirección de arte con semilla, chips, compatibilidad y movimientos | `packages/ai-render/src/direction.ts` | Hecha |
| Prompts (system cacheado, dirección cacheada, pantalla, bloque, manual) | `packages/ai-render/src/prompt.ts` | Hechos |
| Llamadas a Claude compartidas (servidor y BYOK) | `@dialmade/ai-render/anthropic` | Hechas |
| CSS con `compile()` de Tailwind | `@dialmade/ai-render/css` | Hecho; **verificado en un worker con Turbopack** (≈ 80 ms) |
| Export: iconos y placeholders en SVG | `packages/ai-render/src/{export,assets}.ts` | Hecho |
| Almacenamiento en el DesignDoc (aditivo, versionado, procedencia, tope 1 MB) | `packages/doc/src/aiRender.ts` + `schema.ts` | Hecho |
| `PageRenderer`/`renderStaticPage` pintan bloques de IA | `packages/sections` (`replace`, `underlay`, `aiBlocks`, `aiSurfaces`) | Hecho |
| Origen de preview + runtime + CSP | `apps/preview` | Hecho (servidor de dev en :3611) |
| Isla sandbox | `apps/web/src/components/AiIsland` | Hecha |
| Worker de la app | `apps/web/src/workers/aiRender.worker.ts`, `src/lib/ai/render/worker.ts` | Hecho |
| Sesiones de diseño en el ledger | `src/lib/ai/{ledger,budget,ledgerSupabase}.ts`, `supabase/migrations/20261010150000_ai_render_sessions.sql` | Hecho; **migración sin aplicar** |
| Rutas `/api/ai/render/{session,,block}` | `src/lib/ai/render/{api,server,route}.ts`, `src/app/api/ai/render/**` | Hechas, con tests de cliente simulado |
| Página de comprobación | `src/app/dev/ai-render` | Solo desarrollo |

### Interfaces estables (no se cambian sin acordarlo entre tracks)

- `@dialmade/doc`: `AiBlock`, `AiScreenRender`, `AiDirection`, `AiProvenance`, `AiGateWarning` y sus esquemas. Se añaden campos opcionales, nunca se quitan.
- `@dialmade/ai-render`:
  - `processBlock(raw, { block, screenIds, theme }) → ProcessedBlock`;
  - `blockBasis(block, locale, directionId)`;
  - `screenInput(doc, screenId, { draftOf, skip?, only? })` y `brandInput(doc)`;
  - `directionCandidates(seed, recipeId, chip)` y `defaultPick`;
  - `StructureTracker`, `BlockStreamParser` y `splitBlocks`;
  - `contrastIssues`, `fixContrast` y `themeColorsFromVars`;
  - `inlineAssets`, `exportThemeCss` y `compileAiCss(classes, { scoped? })`;
  - las funciones de `./anthropic`: `screenParams`, `blockParams`, `directionParams`, `streamBlocks`, `createDirection` y `RenderOutputError`.
- `@dialmade/ai-render/protocol`: `ParentMessage` e `IslandMessage`, versión 1.
- `src/lib/ai/render/api.ts`: los cuerpos, las respuestas, los eventos SSE (`block`, `progress`, `usage`, `error`, `done`) y `RenderErrorCode`.
- `AiSessionLedger` (`openSession`, `reserveInSession`, `refundSession`).
- `AiIsland` (props) y `previewOrigin()`/`aiRenderAvailable()`.

### Reglas para los archivos compartidos

| Archivo | Regla |
|---|---|
| `src/i18n/ai.ts`, `src/i18n/composer.ts`, `src/i18n/layout.ts`, `src/i18n/export.ts` | **Solo añadir**, cada track en su propia clave de primer nivel: A `aiRender`, B `aiBlock`, C `aiAccess`, D `aiExport`. Sin tocar claves ajenas. En el merge, el conflicto solo puede ser de líneas contiguas: se resuelve conservando las dos. |
| `src/components/PaletteFlow/designHalf.ts` | **Dueño: A.** B y D piden por mensaje el loader que necesiten. |
| `packages/doc/src/aiRender.ts` y `schema.ts` | **Dueño: B** (es quien más los toca). A, C y D solo los leen; un campo nuevo se pide a B. |
| `packages/ai-render/src/{prompt,anthropic}.ts` | **Dueño: C.** |
| `packages/ai-render/src/{sanitize,allowlist,vocabulary,contrast,gates,export,assets}.ts` y `apps/preview/**` | **Dueño: D.** |
| `packages/ai-render/src/{pipeline,input,direction,stream}.ts` | **Dueño: A.** |
| `packages/sections/src/PageRenderer/**`, `renderToHtml.ts` | **Dueño: D** (A y B usan `replace`/`underlay` tal como están). |
| `src/lib/ai/{access,ledger,budget,ledgerSupabase,config}.ts`, `supabase/migrations/*render*` | **Dueño: C.** |
| `pnpm-lock.yaml` | Quien añade una dependencia la añade en su commit; los demás hacen `corepack pnpm install --offline` tras el merge. |

## Track A · «Generar con IA» desde el Layout

**Archivos propios (nuevos salvo indicación):**
- `src/components/LayoutStep/GenerateBar/AiCopyControl/**`, que pasa a ser el control «IA» (segmentado Sin IA · Textos · Diseño), con los subcomponentes:
  - `AiDirectionChips/`;
  - `AiRenderCost/`, la línea de coste;
  - `AiScreensPicker/`.
- `GenerateBar.tsx` (el CTA «Generar con IA»).
- `src/lib/ai/render/generation/`: el **store de generación** (zustand, fuera de React, sobrevive al cambio Layout → Ajustar). Orquesta así:
  1. sesión;
  2. dirección;
  3. hasta 3 pantallas en paralelo por SSE;
  4. cada bloque, por el worker;
  5. un parche del doc.
  Además lleva la clonación del kit (navbar y footer: el primero generado se clona en las demás pantallas con el mismo tipo y la misma etiqueta), los anuncios aria-live por pantalla, cancelar y reintentar.
- `src/components/Composer/AiRunBar/`: la barra flotante de progreso en Ajustar («Diseñando Inicio · bloque 2 de 6», Cancelar, Reintentar).
- `src/components/Composer/Canvas/PagePreview/AiBlocks/`: monta `AiIsland` por cada `AiBlock` activo con `replace`, y las superficies de contenedor con `underlay`. Incluye la insignia «La IA falló aquí · Reintentar» y el fundido de ≤400 ms (`motion`).
- `PagePreview.tsx`: solo para pasar `replace`/`underlay`.
- `designHalf.ts` (dueño).
- `packages/ai-render/src/{pipeline,input,direction,stream}.ts` (dueño).

**Consume:**
- `@dialmade/ai-render` (`screenInput`, `processBlock`, `blockBasis`, `directionCandidates`, `StructureTracker`);
- `src/lib/ai/render/{api,worker}.ts`;
- `AiIsland`;
- el transporte de C: `src/lib/ai/render/transport.ts`, a través de `generation/accessTransport.ts` (integración, 2026-10-10).

**Stub hoy:**
- nada de UI;
- el kit se clona en el cliente, no en la petición de dirección (desviación anotada en la spec, §15).

**Aceptación:**
- con «Diseño con IA», «Generar con IA» enseña antes de llamar el coste y los usos: «≈ $0,013 · 1 uso de 5 · 3 pantallas · ≈ 30 s»;
- los chips son opcionales; «Automática» por defecto;
- el streaming pinta bloque a bloque, y cada bloque pasa las puertas en el worker;
- un bloque que falla queda en base con su insignia;
- «Cancelar» en el free tier conserva lo terminado y dice «Ya se pagó esta pantalla»;
- reintentar una pantalla fallida no gasta otra;
- un bloque de IA tiene «Volver al diseño base» (`active: false`) y «Usar IA otra vez»;
- todo con teclado;
- `motion` con `reducedMotion="user"` y dentro del presupuesto;
- los textos van en `i18n` bajo `aiRender`;
- prueba en el navegador: describir → Generar con IA (1 llamada real con Haiku) → Ajustar con islas.

## Track B · Editar en «Ajustar»

**Archivos propios:**
- `src/components/Composer/Canvas/SelectionToolbar/AiBlockCard/`: la tarjeta «Bloque de IA», que sustituye a los knobs cuando el bloque es de IA. Lleva:
  - chips rápidos;
  - «Pedir cambio…» (≤500);
  - «Otra versión»;
  - «Usar diseño base» / «Usar IA otra vez»;
  - avisos de las puertas;
  - procedencia (modelo, fecha, coste).
- `SelectionToolbar.tsx`: solo para elegir entre los knobs y la tarjeta.
- `src/lib/ai/render/edit.ts`:
  - el texto inline (`textEdit {t, text}` → sustituir el texto del nodo `data-dl-t` en el árbol saneado → **un** parche `replace` = un paso de deshacer);
  - el remapeo de claves al duplicar una pantalla;
  - el borrado de `AiBlock` al borrar un bloque;
  - «Desactualizado» por `basis`.
- `src/hooks/useDesignDoc.ts`: solo los puntos de enganche para duplicar y borrar.
- `packages/doc/src/{aiRender,schema}.ts` (dueño).
- El comparador «Base | IA».

**Consume:**
- `AiIsland` (`onSelect`, `onTextEdit`);
- `POST /api/ai/render/block` mediante el transporte de C;
- `processBlock`;
- el store de A, para saber qué sesión está viva.

**Stub hoy:** el runtime ya envía `select` y `textEdit` (doble clic, Enter o salir del campo guarda, Escape restaura). Queda definir la interacción final.

**Aceptación:**
- «Pedir cambio» y «Otra versión» gastan 1 acción de la sesión (de 10) y se aplican como **un** paso de deshacer;
- el texto inline también es un paso;
- la paleta, «Barajar», la receta y claro/oscuro repintan las islas en vivo, sin regenerar (mensaje `theme`);
- un cambio de receta muestra «El estilo cambió · ¿Rehacer con IA?», nunca de forma automática;
- duplicar una pantalla conserva sus bloques de IA, y borrar un bloque borra su `AiBlock`;
- se cumplen el tope de 1 MB y el historial inmutable;
- textos en `i18n` bajo `aiBlock`.

## Track C · Caminos de acceso y la ruta terminada

**Archivos propios:**
- `src/lib/ai/render/transport.ts`: un transporte con tres implementaciones de la misma interfaz (sesión, dirección, pantalla por stream y acción de bloque):
  - **free tier**: las rutas;
  - **BYOK**: el navegador, con `@dialmade/ai-render/anthropic` y `dangerouslyAllowBrowser`, Opus 5.5 por defecto y Sonnet 5.5 como opción, con aborto de verdad y la key solo en memoria;
  - **manual**: `manualPrompt`, pegar → `splitBlocks` → las mismas puertas; tope de 400 KB.
- El modal de la key: elegir modelo, Opus o Sonnet, con la línea «Más barato: Sonnet 5.5».
- La estimación de coste por camino (`src/lib/ai/render/estimate.ts`).
- `src/lib/ai/render/{server,route,api}.ts` y las rutas (dueño).
- `packages/ai-render/src/{prompt,anthropic}.ts` (dueño).
- `src/lib/ai/{access,ledger,budget,ledgerSupabase,config}.ts` y la migración (dueño).
- La CSP de la app (`connect-src https://api.anthropic.com`, `frame-src <preview origin>`).

**Consume:** las interfaces de arriba.

**Stub hoy:**
- las rutas funcionan con tests simulados, pero no hay transporte de cliente ni BYOK;
- la migración `20261010150000_ai_render_sessions.sql` **no está aplicada** (el ledger en memoria funciona en desarrollo);
- no se ha verificado la caché del prompt en el camino real: el spike lanzó una llamada por marca.

**Aceptación:**
- **free tier**: una sesión = 1 «Generar con IA» (≤3 pantallas) + 10 acciones en 24 h, y se ve antes de llamar;
- **BYOK**: Opus 5.5 por defecto, Sonnet 5.5 ofrecido, la key nunca llega al servidor (lo comprueba un test de red), y Cancelar aborta;
- **manual**: pegar la respuesta de Claude produce los mismos bloques y pasa las mismas puertas;
- `cache_read_input_tokens > 0` en la 2.ª pantalla de una sesión (verificado con 1 llamada real);
- tests de inyección y de salida malformada;
- textos en `i18n` bajo `aiAccess`;
- **no se toca `DIALMADE_AI_MONTHLY_BUDGET_USD`**.

## Track D · Exports y endurecimiento

**Archivos propios:**
- `src/components/ExportDialog/**`, en lo que toca a la IA:
  - `exportPack.ts`: `renderStaticPage({ aiBlocks, aiSurfaces })`, con el CSS de `compileAiCss(…, { scoped: true })` y un comentario de procedencia;
  - «Copiar HTML» y «Copiar TSX» por bloque;
  - `theme.css` de `exportThemeCss()`.
- `packages/ai-render/src/tsx.ts` (nuevo, transformación determinista, con tests golden).
- En `@dialmade/doc`, `toDesignMd` y `toPromptPack`: la dirección de arte y los bloques de IA por pantalla. Es una sección nueva; se coordina con B, que es el dueño del esquema.
- Dueño de:
  - `packages/ai-render/src/{sanitize,allowlist,vocabulary,contrast,gates,export,assets}.ts`;
  - `apps/preview/**`;
  - `packages/sections/src/PageRenderer/**` y `renderToHtml.ts`.
- La configuración de producción del origen de preview (cabeceras de `scripts/headers.ts` en el host elegido).

**Stub hoy:**
- la puerta 5 mide solo al ancho actual;
- el corpus de XSS es inicial (31 casos);
- no hay fuzzing;
- no hay test de CSP en un navegador real;
- no hay TSX;
- DESIGN.md no menciona la IA.

**Aceptación:**
- corpus ampliado: el cheat sheet de PortSwigger, mXSS de parse5/DOMPurify y fuzzing con PRNG con semilla, todo neutralizado;
- un test con Playwright comprueba que la isla no puede hacer `fetch`, enviar formularios, navegar al padre ni leer el DOM del padre;
- puerta 5 en 3 anchos (`DEVICE_WIDTHS`), con desbordes y objetivos <24 px;
- puerta 4 con un aviso para el anillo de foco;
- el ZIP exportado abre sin scripts y se ve igual que Ajustar;
- TSX golden;
- DESIGN.md con la dirección de arte;
- textos en `i18n` bajo `aiExport`.

## Cómo se comprueba cada track antes del merge

- `corepack pnpm -r typecheck`, `-r lint`, `-r test` y `corepack pnpm --filter web build`.
- Servidores:
  - la app: `DIALMADE_AI_LEDGER=memory NEXT_PUBLIC_APP_URL=http://localhost:<puerto> NEXT_PUBLIC_PREVIEW_ORIGIN=http://localhost:<puerto+1> next dev`;
  - el origen de preview: `corepack pnpm --filter preview dev`, con `PREVIEW_PORT` y `PREVIEW_APP_ORIGIN`.

  Cada track usa su propio par de puertos.
- El panel Browser bloquea los iframes de otro origen (`ERR_BLOCKED_BY_CLIENT`): para ver las islas se usa Playwright (`apps/web` lo tiene), como hizo el cimiento.
- Llamadas reales: solo con Haiku, y pocas. Nunca con una key de Opus real.
