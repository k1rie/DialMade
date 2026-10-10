# Modo Layout: especificación construible

**Estado:** propuesta del 2026-10-10. La referencia visual ya está elegida: **11 B Replit + F Klaviyo** (`docs/design/referencias-mobbin.md`). Las estimaciones son mías y no están validadas. Las afirmaciones sobre otras herramientas llevan fuente al final.

---

## 1. Respuesta en 3 líneas

1. **Qué es:** un lienzo con rejilla donde colocas rectángulos con nombre (Navbar, Calendario, Cards…) sacados de una librería. Al pulsar «Generar», cada rectángulo se convierte en su sección real, con tu marca.
2. **Qué lo hace diferente, siendo honestos:** convertir cajas en UI ya existe (tldraw Make Real, Relume, Balsamiq, Uizard). Lo nuevo es la combinación:
   - cada caja es un tipo de un catálogo cerrado;
   - genera al instante, sin IA ni créditos, y respeta tu layout 1:1;
   - la marca sale del logo;
   - exporta a cualquier herramienta y es MIT a $0.
3. **Cómo cambia el flujo:** Marca → **Layout** → Ajustar → Exportar. «¿Qué quieres crear?» pasa a ser las plantillas del lienzo vacío, y el Composer queda como «Ajustar».

---

## 2. Flujo nuevo

| Paso | Qué hace el usuario | Cambio en el código |
|---|---|---|
| 1 Marca | Logo, recorte, paleta, «Trae tu marca» | El CTA del Palette Lab pasa a «Crear layout →» |
| 2 **Layout** (nuevo) | Lienzo, librería e inspector; CTA «Generar diseño» | `LayoutStep` sustituye a `CreateStep`. Se añade `loadLayoutStep` en `designHalf.ts`. En `FlowStep`/`FLOW_STEPS`, `create` pasa a llamarse `layout` |
| 3 Ajustar | El Composer actual (cartas, dials, knobs, texto inline) más un botón «Editar layout» | El botón va en `ComposerTopBar`. Las operaciones de estructura pasan por el layout (`pageOps.ts`) |
| 4 Exportar | Lo de hoy más el layout | Ver §7 |

**«¿Qué quieres crear?» pasa a ser el estado vacío del lienzo**
- Muestra 3 cartas de plantilla: Landing, Dashboard y En blanco, reutilizando `KindCard` y `MiniPreview`. La recomendada viene marcada según la pestaña del Palette Lab, y `RecommendQuestion` queda como enlace «¿No sabes cuál?».
- Una plantilla se convierte en bloques con `layoutFromPage(buildDefaultPage(…))`, así que solo empieza en blanco quien elige «En blanco».
- La Guía de estilo deja de ser una opción: `pages.brand` se genera siempre, de forma determinista, y se ve como pestaña en Ajustar y como carta en Exportar.
- El tipo de página se deduce de los bloques: si hay Sidebar es app, si no es landing. Se muestra en un chip editable: «Web pública / Pantalla de app».
- El Dashboard deja de estar en «Pronto»: el layout lo adelanta.

**Qué pasa con el Composer**
- Sigue siendo el sitio de **cómo se ve**: receta, tipografía, dials, knobs y copy. El layout es el sitio de **qué va dónde**.
- La estructura tiene una sola fuente de verdad. Si la página tiene `layout`, reordenar, ocultar o insertar desde Ajustar se traduce a operaciones sobre el layout y se recompila.

---

## 3. Lienzo

### 3.1 Interacción
- **Marco y rejilla:** el marco usa `DEVICE_WIDTHS` (1440/768/390) con el toggle Desktop/Tablet/Móvil de Klaviyo. La rejilla es de 12 columnas: en X encaja a columnas y en Y cada 8 px. Arrastras donde quieras, pero el resultado se compila sin ambigüedad.
- **Barra inferior (Replit):** Dibujar (R) · Editar (V) · Mano (H) · **Generar**. «Chat» llega en la v1.1 (§6).
- **Rectángulo libre:** al terminar de dibujarlo aparece «¿Qué es esto?», con buscador y 5 sugerencias según la forma:
  - franja arriba → Navbar;
  - caja alta pegada a un borde → Sidebar;
  - caja ancha al final → Footer.

  Si no eliges nada, queda como «Bloque libre».
- **Cada caja muestra:** icono y nombre, la nota en una segunda línea, un badge «×N» si es repetible y un chip con lo que va a generar («Tabla · 8 filas»), para que el alto dibujado no engañe.
- **Solapes que no son anidamiento:** aviso no bloqueante con arreglo de un clic («Anidar» o «Poner debajo»). Nunca se corrige nada en silencio.

**Inspector (derecha):** tipo, nombre, nota (≤200 caracteres), cantidad, posición y tamaño numéricos, en qué dispositivos se ve y cómo se comporta en móvil. Aquí no hay nada estético.

**Motor: propio, 0 KB de dependencias nuevas**
- Pointer events, con la geometría de `LogoCropper/geometry.ts` (`moveRect`, `resizeRect`, `drawRect`, `nudgeRect`) movida a `src/lib/geometry/rect.ts`.
- `@dnd-kit/react` 0.5.0 (ya instalado) solo para llevar bloques de la librería al lienzo y para la lista de capas. No trae resize.
- Durante el gesto se escribe en motion values. Al soltar se aplica un único parche con `beginBatch`/`commitBatch`, que cuenta como un paso de deshacer.
- **Descartados:**
  - tldraw: en producción exige license key, y la licencia Hobby lleva marca de agua (verificado).
  - Excalidraw: es trazo libre y su IA vive en un backend alojado fuera del repo.
  - Konva: dibuja en canvas, sin DOM por bloque, así que no hay accesibilidad.
  - Plan B: React Flow (MIT). No he comprobado si permite redimensionar con teclado.

```
apps/web/src/components/LayoutStep/
  LayoutStep.tsx · index.ts · useLayoutShortcuts.ts · constants.ts · icons.tsx
  TemplatePicker/  BlockLibrary/{LibrarySearch,LibraryItem}/  BlockInspector/  LayersList/  GenerateBar/
  LayoutCanvas/{BlockFrame,ResizeHandles,GridOverlay,DrawTool,StructureOverlay}/
apps/web/src/i18n/layout.ts      # nombres, sinónimos y anuncios es/en
```
El chrome que vaya dentro de `ThemeScope` lleva `.app-chrome`.

### 3.2 Librería
- **Panel tipo Klaviyo:** bloques en grilla, buscador con sinónimos es/en («agenda» → Calendario, «header» → Navbar; sin IA), 5 «Sugeridos» y las categorías.
- **Insertar:** un clic o Enter coloca el bloque en el siguiente hueco libre, o dentro del contenedor seleccionado. Arrastrar lo coloca donde lo sueltes.
- **Bloques «Pronto»:** se pueden colocar igual. Salen como `ui.placeholder` con su etiqueta y un enlace para votar en GitHub.

| Categoría | MVP, ya existe (sección) | MVP, nuevo | Después (por votos) |
|---|---|---|---|
| Navegación | Navbar (`landing.navbar` / `app.shell` topnav), Sidebar (`app.shell`), Footer | — | Tabs, Stepper, Paginación |
| Contenido | Hero, Features, Logos/métricas (`socialProof`), Testimonios, Pricing, CTA | `ui.text`, `ui.media` | FAQ, Banner, Timeline |
| Datos | KPIs, Gráfica, Tabla, Actividad | `ui.cards`, `ui.calendar`, `ui.list` | Kanban, Búsqueda + filtros |
| Formularios | Ajustes (`app.settingsForm`) | `ui.form` (login o contacto) | Subir archivo |
| Estados y overlays | Modal (`confirmDialog`), Estado vacío | — | Notificaciones |
| Media, social y comercio | — | — | Galería, Chat, Perfil, Mapa ilustrado (sin teselas de pago), Carrito, Checkout, Video |
| Siempre | — | «Bloque libre» (`ui.placeholder`), «Contenedor» (`ui.region`) | — |

**Cada bloque nuevo:**
- se define con `defineSection` en `packages/sections/src/ui/<Bloque>/`, un folder por bloque;
- elige su variante según el tamaño con `fit()` y se adapta con container queries;
- cumple contraste AA y tiene tests;
- usa copy de plantillas genéricas con los sustantivos del productType. Escribirlo a mano para 16 perfiles × 2 idiomas sería lo más caro.

### 3.3 Accesibilidad
- **WCAG 2.5.7 (verificado en W3C):** todo arrastre necesita una alternativa con **un solo puntero y sin arrastrar**; el teclado solo no basta. Las alternativas son:
  - clic para insertar;
  - dos clics para dibujar (una esquina y la opuesta);
  - campos numéricos en el inspector;
  - botones «Mover a…» y de ajuste fino, como los de LogoCropper.
- **Lista de capas:** sigue el orden de lectura con el patrón treeview de la APG. En pantallas de menos de 640 px sustituye al lienzo (lista e insertar, sin arrastre libre).
- **Anuncios:** aria-live mediante `DndAnnouncer`, en es/en; por ejemplo, «Calendario: columnas 1 a 8, filas 3 a 20».
- **Detalles:** los handles tienen zona de toque de ≥24×24 px (2.5.8) y se respeta `reducedMotion="user"`. Hay que probar con VoiceOver y NVDA antes de la beta.

| Tecla | Acción |
|---|---|
| F6 | Saltar entre Librería · Lienzo · Inspector · Capas |
| Tab / Shift+Tab | Bloque siguiente o anterior, en orden de lectura |
| **Space o Enter** | Coger o soltar el bloque (teclas reservadas por CLAUDE.md) |
| Flechas (con el bloque cogido) | Mover 1 columna o 8 px |
| Shift+flechas (con el bloque cogido) | Redimensionar desde el borde derecho o el inferior |
| Esc | Cancelar el gesto o deseleccionar |
| Supr · ⌘D · ⌘Z/⇧⌘Z | Borrar (con toast para deshacer) · duplicar · deshacer/rehacer |
| R / V / H · F2 | Dibujar / Editar / Mano (pan; no hay Space+arrastrar) · renombrar o editar la nota |

---

## 4. Modelo de datos (LayoutDoc)

```ts
// @dialmade/doc: campo opcional y aditivo, así que el DesignDoc sigue en v1
pages[k].layout?: LayoutDoc

type LayoutDoc = {
  version: 1;
  columns: 12;                 // desktop; tablet (8) y móvil (4) se derivan
  rowUnit: 8;                  // px por fila
  blocks: Record<BlockId, LayoutBlock>;  // Record y no array: punteros estables para parches, locks y undo
};
type LayoutBlock = {
  type: LibraryBlockId;        // "navbar" | "calendar" | "cards" | … | "free"
  label: string;               // nombre visible (SingleLineText)
  note?: string;               // «calendario semanal»: una línea, ≤200, saneada
  count?: number;              // ×N en los repetibles
  rect: { col: number; row: number; w: number; h: number };  // enteros de rejilla
  parentId?: BlockId;          // anidado explícito (soltar dentro)
  z: number;
  responsive?: { tablet?: Override; mobile?: Override };     // v1.1: { order?, hidden?, behavior? }
  pinned?: string[];           // props que editó el usuario: regenerar no las toca
};
```

**Relación con el DesignDoc actual**
- El layout es la fuente de verdad de la **estructura**, y `Page.elements` es su compilación.
- **Ids:** cada hoja usa el **mismo id que su bloque**: `b-` + 6 caracteres base36 con `crypto.getRandomValues`, nunca derivado de la posición. Los contenedores inferidos son `ui.region` con id `r-` + hash de los ids hijos.
- El contenido (props, copy, knobs) sigue en los elementos, como hoy.
- Una página sin `layout` no cambia. `layoutFromPage(page)` crea bloques a ancho completo en orden de lectura, así que cualquier página existente entra al modo Layout sin pérdida.

**Cambios de schema (mínimos)**
1. `PageSchema` gana `layout: LayoutDocSchema.optional()`. El superRefine comprueba que el padre existe, que no hay ciclos, que el rect cabe en las columnas, que hay ≤200 bloques y que los ids son válidos.
2. Con `layout`, `layoutId = "freeform"` y no se busca en los layouts del catálogo. El JSON del catálogo no se toca, porque lo genera el ETL.
3. `registry.list(kind)` devuelve también los `ui.*`; `checkTree` ya los admite en cualquier página.
4. Parches y locks no necesitan nada nuevo: `/pages/k/layout/blocks/<id>/rect` es un puntero normal. Hay que revisar `touchedBy` y el tope de 500 operaciones de `PatchSchema`.
5. **Metadatos de la librería:** la parte estructural va en `@dialmade/layout` (categoría, icono, `defaultSize`, `minCols` por breakpoint, `container`/`accepts`, `repeatable`, comportamiento en móvil, `ready|soon`). Los nombres y sinónimos van en `src/i18n/layout.ts`.

**Requisito previo:** cerrar `wip/import-brand` antes de tocar el schema. Tiene cambios sin commitear en `patch.ts`, `pointer.ts` y `compile.ts`.

---

## 5. Inferencia de layout y responsive

**Paquetes**
- `@dialmade/layout`: paquete nuevo en TS puro, sin React, como `@dialmade/palette`. Exporta `inferStructure`, `deriveResponsive`, `toCss` y `toAsciiWireframe`.
- La compilación a `Page` va en `@dialmade/sections`, como `buildPageFromLayout`, junto a `buildDefaultPage`.

**Pipeline**

Todo trabaja con enteros, en orden estable y sin `Date` ni `random`: la misma entrada da siempre la misma salida.
1. **Contención.** Manda el `parentId` explícito. Si no hay, el padre es el contenedor más pequeño que cubre ≥90 % del bloque. Si un bloque que no es contenedor tiene algo dentro, eso se toma como pista: un hero con un media dentro pasa a `split`.
2. **Solapes.**
   - Si el solape es menor del 15 %, se recorta el bloque de menor z.
   - Los overlays (modal, toast) van a una capa absoluta.
   - Cualquier otro caso muestra un aviso con arreglo.
3. **Recursive XY-cut** (Nagy y Seth): corta por el hueco más ancho y, en caso de empate, en horizontal. Si no hay corte posible (bento), usa `grid-template-areas`.
4. **Salida.**
   - Fila: grid de 12 columnas con `grid-column: inicio / span w`, que respeta los huecos que dibujaste.
   - Columna: flex en columna.
   - Gaps: cuantizados a `--dl-space-*`, así que siguen el dial de densidad.
5. **Orden de lectura.** El orden que sale del XY-cut se usa para el DOM, el foco y el apilado en móvil.

**Variante por tamaño:** `SectionDefinition` gana `layout?: { minWidthPx, fit(size, ctx) }`, opcional. Ejemplos:
- en KPIs, `count = clamp(⌊w/3⌋, 2, 4)`;
- en Tabla, `pageSize` se calcula a partir del alto;
- un Sidebar de 1 columna usa la variante `rail`.

Además, la nota se lee de forma determinista: números como «3» o «tres» y palabras clave como «semanal» o «anual».

**Alto**
- En app es literal: el marco mide 100dvh y las regiones tienen scroll propio.
- En landing es una pista: se traduce en número de filas o ítems, o en aspect-ratio para media y gráficas.

**Detalle de app:** los bloques de chrome compilan a `app.shell`, y el resto va dentro de un único `ui.region` hijo. Así no se activan las reglas por `data-dl-type` de `.dl-app-shell__content`.

**Responsive**

En el MVP se dibuja en desktop y el resto se deriva.
- **Tablet (8 columnas):** la fila se mantiene si cabe la suma de los `minCols`; si no, hace wrap en orden de lectura.
- **Móvil (4 columnas):** apila en orden de lectura, con las reglas por tipo de la tabla de abajo.
- **En ejecución:** las container queries que las secciones ya usan, así que la preview y el export coinciden.
- **Toggle Desktop/Móvil:** anima el plegado (FLIP, ≤400 ms) para que el usuario vea las reglas.
- **v1.1:** overrides por dispositivo (orden, ocultar, comportamiento), con «Restablecer».

| Bloque | En móvil |
|---|---|
| Navbar | Menú hamburguesa |
| Sidebar | Drawer o tab bar inferior |
| KPIs ×4 | 2×2 |
| Cards ×N | 1 columna o carrusel |
| Tabla | Lista de tarjetas |
| Calendario (mes) | Agenda |
| Hero split | Texto arriba y visual debajo |
| Modal | Sheet |

**Tests**
- **Fixtures golden:** holy grail, dashboard, landing apilada, bento, cards anidadas, modal, bloques desalineados ±1, lienzo vacío y un solo bloque.
- **Propiedades:** cada bloque aparece una sola vez, recompilar es idempotente y un jitter dentro de la tolerancia no cambia la topología.
- **Rendimiento:** objetivo de menos de 10 ms con 200 bloques, sin medir. Si no se cumple, se pasa a un worker, como el de paleta.

---

## 6. Generación

**Fase 1, determinista: siempre y desde el MVP**
1. Se encadenan: `inferStructure` → `fit()` → `storedDefaultProps` (copy determinista por productType, locale y seed) → `buildPageFromLayout`.
2. Se aplica con `applyPatch`, reemplazando `elements` y `root` en un batch (un solo paso de deshacer), y se genera `pages.brand`. Objetivo: menos de 100 ms, sin medir.
3. Se renderiza con `PageRenderer` y `compileThemeVars`, sin cambios. Receta y tipografía salen del productType y se cambian en Ajustar sin regenerar.
4. **Momento firma:** cada caja se transforma en su sección con `layoutId` de motion (la preview está en el mismo documento, sin iframe).
   - Va en orden de lectura, con stagger de 30–40 ms y ≤900 ms en total.
   - Se salta con un clic o con Esc. Con reduced motion queda en un fade de 150 ms.

**Fase 2, IA opcional**
- **MVP, sin backend nuevo:** reutiliza `/api/ai/copy` con `sectionIds` (hasta 64), en lotes por orden de lectura.
  - Cada bloque muestra un chip: En cola · Escribiendo · Listo · Error (con «Reintentar»).
  - Cancelar conserva lo que ya terminó.
- **v1.1, ruta `/api/ai/layout`:**
  - Pasa por `withAiBudget`: estimación, reserva del peor caso, una llamada y liquidación con el uso real.
  - Usa structured outputs con un **esquema estable**: `{ blocks:[{id, variant, settings[]}], copy:[{id, text}] }`. Además propone mapear cada «Bloque libre» al tipo más cercano del catálogo, y el usuario acepta o no.
  - **Entrada:** el JSON del layout (tipos, clases de tamaño, notas y orden), la marca, el productType y la receta, nunca una imagen. Las notas van saneadas entre delimitadores, como datos.
  - **Salida:** pasa por `applyPatch` e `invalidKeys`, y lo inválido se descarta. Nunca HTML, y nunca toca nada `pinned` ni bloqueado.
- **v1.1, «Describe tu pantalla»** (el «Chat» de la barra de Replit):
  - Con IA, propone bloques en la rejilla y tú los ajustas.
  - Sin IA, ofrece 6–8 layouts de partida por productType.
  - Con las dos vías no hace falta afirmar que los bloques son «mejores que escribir».
- **Siempre:** «Copiar prompt para mi Claude», que cuesta $0.

**Coste.** Los precios están verificados hoy en platform.claude.com y coinciden con `pricing.ts`. Los tokens son estimación propia, sin medir: ≈3K de sistema cacheado, ≈3,4K de entrada y ≈2,5K de salida.

| | Haiku 5.5 | Opus 5.5 |
|---|---|---|
| Precio por MTok (entrada / salida / lectura de caché) | $0,10 / $0,50 / $0,01 | $4 / $20 / $0,20 |
| Generación típica, 20 bloques | ≈ $0,002 | ≈ $0,07–0,12 (incluye thinking) |
| Con el presupuesto por defecto de $5 al mes | ≈ 2.500 generaciones | ≈ 50 |

**Encaje con free tier y BYOK**
- **Free tier:** `DIALMADE_AI_FREE_MODEL=claude-haiku-5-5`, con los 5 usos gratis al mes por dispositivo que ya hay.
- **BYOK:** el usuario elige el modelo. Opus 5.5 sería la opción de «calidad alta».
- **Antes de llamar:** se muestra el coste estimado (`aiEstimate.ts`).
- **En serverless:** la IA sigue apagada hasta que el ledger sea persistente. Ahí la experiencia por defecto es la determinista, que es completa.

---

## 7. Export y regeneración

| Destino | MVP | Después |
|---|---|---|
| HTML / ZIP | `renderToHtml` (`ui.region` emite grid/flex con container queries, sin JS), más `layout.json` y `layout.css` | — |
| DESIGN.md y prompt packs | Sección «## Layout»: wireframe ASCII de unos 64 caracteres; lista en orden de lectura (bloque → sección@variante, ×N, nota); reglas de móvil; `grid-template-areas` | MCP `get_layout` (v1.1) |
| Figma | La captura del HTML (la vía actual) ya hereda el layout | `figma-plan.json` para el MCP de Figma (v1.1); plugin con auto layout GRID (v2; no verifiqué los nombres de las props de span) |
| TSX / Framer | — | Componente con áreas de grid nombradas por tus etiquetas (v1.1) |
| Wireframe SVG/PNG | — | v1.1, para Stitch o Claude Design |

**Pendiente de comprobar:** que `@google/design.md lint` acepte una sección extra.

**Regenerar conservando lo que editaste**

| Cambio en el layout | Qué hace «Regenerar» |
|---|---|
| Solo posición | Mueve el elemento; el contenido no cambia |
| Tamaño que cruza de variante | Recalcula la variante o el count, salvo los keys en `pinned`; los textos se quedan |
| `count` | Añade o quita ítems; los que ya existían conservan su texto |
| Tipo | Aplica los defaults del tipo nuevo y arrastra los textos compatibles (title, subtitle, cta) |
| Bloque nuevo o borrado | Lo genera o lo elimina (deshacer lo restaura) |
| Nota (con IA) | Regenera solo el copy de ese bloque |

**Garantías**
- Editar texto inline o un knob añade ese key a `pinned` automáticamente.
- El parche lleva operaciones `test` sobre los elementos que no tocaste.
- `applyPatch` ya respeta los hard locks.
- El botón dice el número real: «Regenerar 2 bloques».
- **v1.1:** si un bloque se editó en Ajustar y además cambió en el layout, se pregunta «Conservar mis textos» o «Regenerar de cero».
- Perder ediciones es el peor fallo posible, así que la identidad de los bloques (agrupar, cambiar de tipo, separar un ×N) lleva tests de propiedades.

---

## 8. Plan por fases

Para 1 dev con agentes; estimación propia, sin validar.

| Fase | Semanas | Qué entra | Criterio de salida |
|---|---|---|---|
| 0 | — | Cerrar `wip/import-brand` | `packages/doc` estable |
| Spike | 1 | Geometría a `src/lib`; lienzo mínimo (insertar con clic, mover y redimensionar con teclado e inspector); XY-cut con 10 fixtures; 5 plantillas; prueba con 3–5 devs | Primer diseño en menos de 2 min y «se parece a lo que dibujé»; decidir go/no-go |
| **MVP** | 7–9 | LayoutDoc y `layoutFromPage` (1); `@dialmade/layout` con tests (1,5); lienzo, teclado, inspector y capas (2,5); `ui.region`, compilación y `fit` de las 16 secciones (1,5); 6 bloques nuevos más placeholder (2); exports HTML, pack y DESIGN.md (0,5); QA con lectores de pantalla (1). Hay solape entre tareas | Post de LinkedIn con video |
| v1.1 | 6–7 | `/api/ai/layout` con merge de `pinned` (1); «Describe tu pantalla»; ~10 bloques por votos (3–4); overrides por dispositivo (1); TSX, figma-plan, wireframe SVG y MCP `get_layout` (1) | — |
| v2 | 8+ | Varias pantallas conectadas (cambia `pages`); plugin de Figma con GRID; foto de boceto → bloques (visión, BYOK); diseñar en móvil primero; comentarios | — |

**Documentos que hay que actualizar**
- INFORME §2: «No es un generador de pantallas libre» pasa a «Genera pantallas solo a partir de tu layout, el catálogo y tu marca».
- `que-quieres-crear.md`: su orden de construcción queda sustituido por este plan.

---

## 9. Cómo contarlo en LinkedIn

**Reglas**
- Nada de «primero», «nadie lo hace», «revolucionario» ni «adiós Figma»: Relume y MockFlow lo desmienten en un comentario.
- Antes de afirmar «mejor que escribir», hacer una prueba con 5 devs y la misma pantalla: bloques en Dialmade frente a un prompt en Stitch o v0. Medir tiempo, correcciones de estructura y satisfacción.
- Mencionar solo los destinos de export que funcionen el día del post, y usar un logo ficticio.
- **Video de 20 s:** arrastrar Navbar, Calendario y Cards ×3 → Generar → las cajas se transforman → toggle móvil → exportar.

**Borrador**
> Dibujar cajas y que salga una interfaz no es nuevo: Balsamiq, Sketch2Code y tldraw Make Real ya lo hacen, y Relume arma webs con su librería de componentes.
> Lo que estoy construyendo en Dialmade es otra combinación:
> → cada caja es un bloque con nombre (navbar, calendario, cards, tabla…)
> → tu marca sale de tu logo, con contraste AA
> → al pulsar Generar, la vista aparece al instante, sin IA y sin créditos
> → si quieres, la IA solo escribe los textos
> Lo exportas a HTML, Figma o Claude Design. Open source (MIT). ¿Qué bloque te falta?

---

## 10. Supuestos por defecto y preguntas

**Lo que asumo si no me dices otra cosa:**
- La Guía de estilo se genera siempre y deja de ser una opción.
- Los bloques «Pronto» se pueden colocar y salen como placeholder.
- El free tier usa Haiku 5.5.
- «Describe tu pantalla» llega en la v1.1.

**Preguntas**
1. ¿En el MVP basta con **una pantalla por tipo** (una landing y una pantalla de app), o necesitas **varias pantallas conectadas** (Dashboard + Ajustes + Login) desde el principio? Por defecto, una por tipo; varias obliga a cambiar `pages` y lo dejo para la v2.
2. Para que se sienta freeform, ¿te vale una **rejilla con imán** (mueves libre, pero encaja en 12 columnas y filas de 8 px) o quieres **píxeles libres tipo Figma**? Recomiendo la rejilla: con píxeles libres, el móvil y el diseño generado se parecerían menos a lo que dibujas.

---

**Fuentes**

Verificadas hoy, 2026-10-10:
- WCAG 2.5.7: https://www.w3.org/WAI/WCAG22/Understanding/dragging-movements.html
- Licencia de tldraw: https://tldraw.dev/community/license
- Make Real (18-nov-2023, GPT-4V → HTML): https://tldraw.dev/blog/make-real-the-story-so-far
- Relume (más de 1.000 componentes; Figma, Webflow y React): https://www.relume.ai/
- Precios de Anthropic: https://platform.claude.com/docs/en/about-claude/pricing

Verificadas por la investigación previa, no las he vuelto a comprobar hoy:
- Balsamiq AI, Sketch2Code (The Register, 2018), MockFlow, Google Stitch, Framer Wireframer.
- El XY-cut de Nagy y Seth.
- Los tamaños de bundlephobia.

Código del repo consultado:
- `packages/doc/src/schema.ts:448-475`
- `apps/web/src/lib/ai/{pricing,config,serverConfig,api}.ts`
- `apps/web/src/components/PaletteFlow/{designHalf.ts,FlowStepper/FlowStepper.tsx}`
- `apps/web/src/hooks/usePaletteFlow.ts`
- `apps/web/src/components/LogoCropper/geometry.ts`
- `apps/web/src/components/Composer/constants.ts`
- `docs/design/referencias-mobbin.md` (vista 11 = B Replit + F Klaviyo)
- `docs/research/INFORME.md` §2, §15.2 y §16