# Handoff: construir el Modo Layout (chat nuevo)

**Fecha:** 2026-10-10.

**Carpeta:** `/Users/diegoguerrero/dev/dialmade-layout`. **Rama:** `feat/layout-mode`, creada desde `main` (commit 1cffe18).

## Contexto en 30 segundos

- **Dialmade** es una app open source (MIT) para devs que no son diseñadores. La **funcionalidad estrella** es el Modo Layout, y todo lo demás lo complementa.
- **Cómo funciona:** el usuario carga su marca (logo, colores, guía importada). Después coloca **rectángulos con nombre**, sacados de una librería (Navbar, Calendario, Cards ×3…), en un lienzo con rejilla, elige un **estilo** con preview y pulsa **Generar**. Cada caja se convierte en su sección real, con su marca.
- **Antes de empezar, lee:** `CLAUDE.md`, `docs/design/modo-layout.md` (la propuesta consolidada **y las decisiones del usuario**), `docs/design/modo-layout-spec.md` y `docs/design/modo-layout-critique.md` (la crítica corrige la spec y tiene prioridad), `docs/design/DESIGN-BRIEF.md`, `docs/design/referencias-mobbin.md` (vista 11 = **11B Replit + 11F Klaviyo**) y `docs/research/INFORME.md` §16.
- **Capturas de referencia** (solo para uso local; no se suben al repo): `~/.dialmade-local/scratchpad-backup/shots/11B-Replit.png` y `11F-Klaviyo.png`. Para el Composer se usan `3A-Buffer.png` y `3C-Replit.png`.

**Decisiones ya tomadas por el usuario:**
1. **Varias pantallas conectadas desde el MVP.**
2. **Rejilla con imán:** 12 columnas y snap de 8 px.
3. **Flujo:** Marca → Layout (con selector de estilo: «Tu guía de estilo» si importó una, y después las 12 recetas) → Generar → Ajustar → Exportar.
4. **La IA es opcional:**
   - free tier con Haiku 5.5 o BYOK;
   - **una sola** petición por «Generar», que incluye las notas de los bloques como datos;
   - la generación determinista es completa, aunque no haya IA.

## Hay otros 2 chats trabajando en paralelo. Para no chocar:

| Chat | Carpeta / rama | Es dueño de |
|---|---|---|
| **Principal** | `~/Desktop/designApp` · `wip/import-brand` | Feature «Trae tu marca» (importar guía) + IA con free tier en Supabase. Toca `packages/doc`, `packages/palette`, `packages/import`, `apps/web` (HomeHero, PaletteLab, PaletteFlow, ImportPanel, DetectedReview, `lib/ai`) y `supabase/`. Cuando termine, se fusiona a `main` y el usuario te lo avisa. |
| Marketing | `~/dev/dialmade-site` · `feat/marketing-site` | `apps/site/**` y `docs/onboarding/**` |
| **Este (Modo Layout)** | `~/dev/dialmade-layout` · `feat/layout-mode` | Lo que dice abajo |

## Fase A: empieza ahora, sin conflictos

**Solo puedes crear o editar:**
- `packages/layout/**`: paquete nuevo `@dialmade/layout`, en TS puro y sin React. Contiene:
  - tipos `LayoutDoc` y `LayoutBlock`, provisionales hasta la Fase B;
  - **metadatos de la librería**: id, categoría, icono, `defaultSize`, `minCols` por breakpoint, `container`/`accepts`, `repeatable`, comportamiento en móvil, `sectionType` destino y `ready|soon`;
  - `inferStructure` (recursive XY-cut → grid de 12 columnas, flex y `grid-template-areas`; nunca corrige en silencio, devuelve `warnings`);
  - `deriveResponsive` (tablet de 8 columnas, móvil de 4, reglas por tipo de bloque);
  - `toCss` y `toAsciiWireframe`;
  - **tests golden y de propiedades**, y un benchmark (200 bloques en menos de 10 ms).
- `apps/web/src/components/LayoutStep/**`: el lienzo, **aislado y sin conectarlo todavía al flujo**:
  - lienzo con rejilla con imán, sin `scale()`; handles de ≥24×24;
  - librería estilo Klaviyo;
  - inspector;
  - lista de capas (treeview);
  - **panel de pantallas** (varias pantallas, plantillas de conjunto);
  - barra inferior (Dibujar · Editar · Mano · Generar);
  - `StylePicker` con preview determinista;
  - alternativas por clic y por teclado para todo (WCAG 2.5.7, 2.1.4 y 2.5.8).
  - Usa estado local o un store propio dentro de su folder. Para probarlo, crea una ruta solo de desarrollo, `apps/web/src/app/dev/layout/page.tsx`.
- `apps/web/src/lib/geometry/**`: **copia** la geometría de `LogoCropper/geometry.ts` aquí. No borres ni edites el original; eso se hace en la Fase B.
- `apps/web/src/lib/devices.ts` (`DEVICE_WIDTHS`, `DEVICE_ORDER`): copia, sin borrar el original.
- `apps/web/src/i18n/layout.ts`.
- `docs/design/**`: solo documentos nuevos del Modo Layout.

**NO edites** (léelos libremente):
- `packages/doc`, `packages/palette`, `packages/sections`, `packages/catalog` y `packages/ui`;
- `apps/web/src/components/` fuera de `LayoutStep/`;
- `apps/web/src/hooks`, `apps/web/src/lib/ai` y `supabase/`;
- `CLAUDE.md` y `pnpm-workspace.yaml`. Este último ya cubre `packages/*`.

Si necesitas un cambio en esas zonas, anótalo en `docs/design/modo-layout-fase-b.md`.

## Fase B: solo cuando el usuario diga «import ya está en main»

1. `git merge main` en `feat/layout-mode` y resuelve los conflictos. El `pnpm-lock.yaml` se regenera con `corepack pnpm install`.
2. **DesignDoc v2 con migración desde v1:**
   - `screens: Record<ScreenId, Screen>`, `screenOrder`, `Screen.layout` y `Screen.page`;
   - `shell` compartido entre las pantallas de app;
   - `linkTo` entre pantallas;
   - `pages.brand` sigue siendo única.
   - Aplica las correcciones #1, #2 y #3 de la crítica:
     - `checkTree` con `landing.*`, `app.*` y `ui.*` cuando la página tiene layout;
     - `rebuildPages` regenera desde el layout;
     - las huellas `generated`, `hidden` y `pinned`.
3. **En `@dialmade/sections`:**
   - `buildPageFromLayout`;
   - los bloques nuevos `ui.*` (Texto, Media, Cards, Calendario, Lista, Formulario, Bloque libre, Contenedor), cada uno en su folder y con `fit()` por tamaño.
4. **Conectar el flujo:** Marca → Layout → Ajustar → Exportar.
   - `LayoutStep` sustituye a `CreateStep`. Mueve `KindCard`, `MiniPreview` y `RecommendQuestion` a `LayoutStep/TemplatePicker/`.
   - Añade el loader en `designHalf.ts`.
   - Añade «Editar layout» en Ajustar.
5. **Generar:**
   - determinista, en menos de 100 ms;
   - momento firma dentro del lienzo, con `clip-path`, como máximo 900 ms y saltable;
   - IA con una petición y las notas dentro de `<layout_notes>`;
   - preview navegable entre pantallas.
6. **Export:** ZIP multipágina con enlaces reales; `layout.json` y `layout.css`; DESIGN.md y prompt packs con la sección «Layout» y el flujo entre pantallas.
7. **Revisión:**
   - código y seguridad;
   - a11y con VoiceOver y NVDA;
   - producto end-to-end;
   - regenerar sin perder ediciones (es el peor fallo posible: tests de propiedades).

## Reglas

- Sigue `CLAUDE.md`:
  - un folder por componente;
  - textos en i18n es/en;
  - `motion` (sin GSAP), con el presupuesto de motion;
  - nada de logos de marcas reales;
  - ningún servicio de pago salvo Anthropic con presupuesto duro.
- **Comandos:** `corepack pnpm …`, porque pnpm no está en el PATH. Servidor de desarrollo en el **puerto 3500**.
- **Git:** commits en `feat/layout-mode`. **No hagas push ni merge a `main` sin preguntarle al usuario.**
- **Copia de `.env.local`:** si necesitas probar la IA, cópiala desde `~/Desktop/designApp/apps/web/.env.local` sin imprimir sus valores. Para no gastar presupuesto real, añade `DIALMADE_AI_LEDGER=memory`.
- **Al usuario:** escríbele en español, con la respuesta primero y listas cortas, porque usa el modo i-have-adhd.
