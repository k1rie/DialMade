# Temas importados (daisyUI + tweakcn): integración y ajustes que sobran

Fecha: 2026-10-10. Origen: investigación de librerías de catálogo (`docs/research/INFORME.md` §8) y el ETL de esta rama.

## Qué hay hecho

- `@dialmade/catalog/themes`: **71 temas** (35 de daisyUI, MIT; 36 de tweakcn, Apache-2.0) con colores hex por modo, radios, borde, sombra, fuentes, tracking y espaciado. Datos en `packages/catalog/data/themePresets.json`, generados por `scripts/etl-themes.mjs` (`etl:check` los valida).
- `themeToRecipe(preset)` los convierte en una `StyleRecipe` (+ `themeId`, `archetypeId`). Cumple los invariantes de `catalog.test.ts` (radios monótonos, `xl ≤ 40`, tracking ≤ 0.06, `outlined ⇒ borde > 0`).
- **No son recetas nuevas, son variantes de las 12.** `styleRecipes` no cambia. Cada tema pertenece a un arquetipo por asignación manual (`src/data/themeArchetypes.ts`); eso es una primera pasada mía y **hay que revisarla con criterio de diseño**. La forma sola (radios + sombra) deja 5 arquetipos sin variantes y manda «cyberpunk» a minimal.
- Descartados 6 presets de tweakcn con nombre de marca o producto: `twitter`, `t3-chat`, `supabase`, `claude`, `vercel`, `doom-64`.
- **Conectado (opción A, 2026-10-10):** `brief.themeId` opcional en `packages/doc`, resuelto en `resolveThemeInputs` con `resolveRecipe(recipeId, themeId)`. En la UI, el panel «Variantes» del Composer (`ThemePanel/VariantGrid`) muestra las variantes de la receta actual más «Base». Ver «Integración (A)» abajo.

## Integración (A): qué quedó hecho

- **Catálogo:** `themeShapes` (17 KB, sin colores) entra en el bundle principal; los colores siguen en `@dialmade/catalog/themes`. `resolveRecipe(recipeId, themeId?)` devuelve la receta de la variante solo si su arquetipo es `recipeId`; si no, la receta.
- **Doc:** `brief.themeId` (slug opcional). Un id desconocido o de otro arquetipo se ignora, así un doc nunca deja de abrir porque un tema salió del catálogo. Los exportadores informan `recipeId` (arquetipo) y `themeId` por separado (DTCG y cabecera del CSS); DESIGN.md y los prompt packs muestran «Juguetón · Cupcake».
- **Motor:** `withTheme(doc, themeId | null, { cascade })`; `withRecipe` suelta la variante. `setTheme` en el store. El prompt de copy de IA usa la receta efectiva.
- **UI:** `VariantGrid` + `VariantCard` en el panel derecho, bajo «Temas». Aditivo: no se quitó ningún control. Reutiliza `StyleSample`, `PanelSection` y las clases de `ThemeCard`; solo añade el nombre visible bajo cada tarjeta.
- **Efecto lateral a tener en cuenta:** un tema de daisyUI de un solo modo (p. ej. `business`) trae `preferredMode: "dark"`; aplicarlo pone la vista previa en oscuro, y los exportadores y el handoff lo toman como modo por defecto. Es la misma semántica que ya tenía `preferredMode` en las recetas.
- **Pendiente:** opción «usar los colores del tema» (hoy la paleta siempre es la de la marca).

## Segunda pasada (2026-10-10, noche): ajustes, IA y capturas

### Ajustes quitados o fundidos

| Control | Qué se hizo | Por qué |
|---|---|---|
| Packs de fuentes ×4 (`FontPacks`) | **Quitado** | Subconjunto exacto del deck «Tipografía» (10 pairings) |
| Temas ×16 (`ThemeGrid`, `THEME_COMBOS`) | **Sustituido** por «Paleta» (`PaletteGrid`, 8 estilos de paleta) | Los 16 combos mezclaban receta × paleta; la receta ya la cubren el deck y «Variantes». La paleta solo se podía cambiar ahí en «Ajustar», así que se conserva como su propio control |
| Arrastrar tarjetas de tema a la página | **Quitado** (`DND.theme`) | Sin tarjetas de tema que arrastrar; las de receta y tipografía siguen arrastrables |
| «Estilo» deck ×12 (`DirectionControl`) | **Se queda** | Es el único selector de receta dentro de «Ajustar»: el `StylePicker` vive en el paso Layout. El informe del subagente lo daba por duplicado y no lo era |
| Chip «Estilo: …» de la barra de Layout | **Se queda** | Atajo del `StylePicker` (otro paso) |

Neto en «Ajustar»: panel derecho = Variantes · Paleta · Color de botón (antes Temas · Color de botón · Packs de fuentes).

### La IA elige la variante (`themeId` en la dirección)

- `directionCandidates` ofrece como `themes` las variantes de la receta del documento; el esquema de salida exige `theme` (`"none"` o uno de ellos) y `parseDirectionAnswer` solo acepta los que ofreció el código.
- `directionOps` escribe `/brief/themeId` en el mismo paso de deshacer que la dirección, con tres reglas (`themeOps`): no pisa una variante que el desarrollador puso a mano, «none» solo quita la que puso la IA anterior, y un bloqueo en `recipeId` o `themeId` («tu guía manda») lo impide. Es la única escritura fuera de `aiRender`.
- La barra de la ejecución dice «Variante «Cupcake»» junto a la dirección de arte.

### «Estilo» (texto + capturas): correcciones

1. Las capturas **ya no se borran al pulsar «Generar»**: el motor las gasta cuando la llamada de dirección responde (`onDirectionUsed`). Si falla la sesión o el cupo, siguen adjuntas.
2. **«Usar mi Claude» las lista como adjuntos** (`manualRenderJob.attachments`, que `ClaudePromptFallback` ya enseña) y el prompt le dice a Claude cómo usarlas. Antes se descartaban sin avisar.
3. **El coste incluye las imágenes** (`REFERENCE_IMAGE_TOKENS`) en la línea del popover y en el estimador BYOK.
4. Menores: el adjuntar usa lo adjunto *ahora* (`appendReferences`) y ids únicos; el tope de 3,7 MB solo vale para la tarea `direction` (las demás mantienen 128 KB).

## Por qué variantes y no recetas

Un hallazgo de cómo está construido el motor (verificado en el código):

1. Elegir una receta solo escribe `/brief/recipeId` (y `pairingId` / `motionTier` con cascada). Todo lo demás se resuelve al compilar (`resolveTokens`, `packages/doc/src/tokens.ts`). Los `tokens.*` y `system.*` guardados ganan siempre a receta y dials.
2. Meter 71 ids en `styleRecipes` rompe: `catalog.test.ts` (`toHaveLength(12)`), el enum de 12 de `lib/ai/vision/schema.ts` y de `lib/ai/layout/schema.ts`, `RECIPE_EXCLUSIONS` (`ai-render/src/direction.ts`), `GROUP_RECIPE` y `nearestRecipe`; y el StylePicker compilaría 71 cards (cache de 64).
3. Los bloques de IA guardan `provenance.recipeId`: cada cambio de receta enseña «El estilo cambió». Una variante clara/oscura como receta aparte lo dispararía sin motivo.
4. `surface`, `preferredMode`, `depth` y `noise` no tienen variable CSS hoy: un tema no puede expresarlos del todo.

## Cómo conectarlo (decisión pendiente)

| Opción | Qué toca | Pros | Contras |
|---|---|---|---|
| **A. `brief.themeId` opcional** (recomendada) | `packages/doc` (campo opcional, compatible hacia atrás) + `resolveTokens` | Se resuelve al compilar como la receta; deshacer funciona; el doc no engorda; `recipeId` no cambia | Toca el esquema y `tokens.ts` |
| B. Overlay en `tokens.*` al elegir | Un escritor de tokens en la UI | Sin esquema nuevo | Ningún UI escribe esos tokens hoy; el doc engorda; los dials de varianza y densidad quedan anulados |
| C. Solo candidatos para la IA | `ai-render` | Mínimo | El usuario no ve ni controla el tema |

## Ajustes que sobran con los temas

Inventario del subagente (≈45 controles; archivos y líneas en su informe). Veredicto:

| Control | Dónde | Veredicto |
|---|---|---|
| «Estilo» (slot y deck ×12) del Composer | `Composer/BriefPanel/DirectionControl` | **Quitar**: duplica el `StylePicker` |
| Packs de fuentes ×4 | `Composer/ThemePanel/FontPacks` | **Quitar**: duplica el deck de «Tipografía» y los temas de tweakcn traen fuentes |
| Temas ×16 (`THEME_COMBOS`) | `Composer/ThemePanel/ThemeGrid` | **Sustituir** por los 71: es su sitio natural |
| Chip «Estilo: …» de la barra superior | `LayoutStep/LayoutTopBar` | **Quitar**: solo enfoca el selector |
| `StylePicker` ×12 + «Tu guía» | `LayoutStep/StylePicker` | **Mantener**: el único selector de receta |
| Dials varianza / motion / densidad | `Composer/BriefPanel/DialsControl` | **Mantener, con ojo**: con un tema que fija radios o espaciado, la parte de radio (varianza) y de espaciado (densidad) quedan en no-op; siguen escalando ratio tipográfico, alturas y motion |
| Color de botón | `Composer/ThemePanel/ButtonColor` | **Mantener** como override con «restablecer»: pisa el primario del tema |
| Semillas, estilo de paleta ×8, «Ajustar a AA», claro/oscuro | PaletteLab / Canvas | **Mantener** (el estilo de paleta pasa a secundario si el tema trae sus 12 colores) |
| Tipografía + pin | `DirectionControl` | **Mantener** (única cerradura con UI) |
| Chips de IA (dirección ×6), «Estilo» + capturas, pantallas, nivel, modelo | `LayoutStep/GenerateBar` | **Mantener**: son composición por bloque, no tokens globales |

Neto: **3 piezas de UI se funden en un selector de «Temas» y se quita 1 atajo**. El resto se queda. `previewMode` vive en tres sitios y `motionTier` no tiene control: son deuda aparte.

**Tests:** `DirectionControl`, `DialsControl`, `ButtonColor`, `ThemeGrid`, `FontPacks`, `THEME_COMBOS` y `useComposerActions` no tienen tests; quitarlos o fundirlos no rompe nada. Los de motor (`compile.test.ts`, `design-engine.test.ts`, `styleVars.test.ts`, `direction.test.ts`) deben seguir verdes.

## Revisión de «Estilo» (texto + capturas) en «Diseño con IA»

Estado: monta en `DesignDetails`, y pasan `packages/ai-render` (362), `packages/doc` (529) y `apps/web` `src/lib/ai` + `LayoutStep` (796).

Bien resuelto: capturas en memoria (el store no persiste), re-codificadas en el navegador, esquema Zod estricto (`image/jpeg`, base64, máx. 3), tope de cuerpo de 3,7 MB (por debajo de los 4,5 MB de Vercel), `count_tokens` con las imágenes para el presupuesto duro, `style` siempre sale de la petición y no de la respuesta, y alternativa por botón al arrastrar (WCAG 2.5.7).

A corregir, por prioridad:

1. **Las capturas se borran al pulsar «Generar»** (`useAiRenderPlan.start`), antes de saber si la dirección se hizo. Si la sesión falla o el cupo está cerrado, hay que volver a adjuntarlas. Mejor: vaciarlas cuando exista la dirección.
2. **«Usar mi Claude» las descarta sin avisar**, y `DesignAccessDialog` llama a `directionReusable(existing, chip, style)` sin contar las capturas: con el mismo chip y estilo reutiliza la dirección vieja y el prompt copiado no lleva nada de ellas. La ayuda dice que «inspiran esta generación». Falta un aviso en esa vía.
3. **El coste mostrado ignora las imágenes** (`estimateRender` no recibe capturas): ~1,4 k tokens por captura, ~4 k con tres. El tope mensual sí las cuenta; solo la línea de coste queda corta.
4. Menor: `add()` usa `references` de la prop (dos adjuntos seguidos, o quitar una mientras lee, pisan el estado). El tope de cuerpo mayor vale para las dos tareas de `/api/ai/render`, no solo la de dirección.
5. Sin tests del componente ni de los topes del esquema (413).

## Sinergia pendiente

La IA nunca escribe `brief`, `tokens` ni `system`; solo `/aiRender/*`. Por eso «editorial y sobrio» influye en la composición de cada bloque pero **no puede cambiar radios, sombra, borde ni pesos globales**. Los temas son justo esa mitad que falta. Con la opción A, la dirección de arte podría elegir `themeId` entre 3–5 candidatos filtrados por receta, igual que hoy elige ejes y movimientos de una lista cerrada.

## Contexto antes de generar (2026-10-10, noche)

Motivo: el diseño salía correcto pero genérico porque Claude sabía el *estilo* pedido y no *de qué trata* ni *para quién*.
La palanca es la entrada (el doc de calidad ya decía que la variedad sale de las entradas, no del muestreo). El paso va
**antes** de generar: se pregunta el contexto, luego la dirección y el estilo, y solo después diseña la IA.

- **Qué se pregunta** («Contexto» en el popover «Diseño con IA», antes de «Dirección de arte» y «Estilo»; todo opcional,
  una línea, corto): ¿para quién es? (160) · ¿qué debe provocar? (120) · tono (80) · datos reales (300) · ¿qué NO debe
  parecer? (120). Es dato, nunca instrucciones.
- **Qué hace Claude con él:** la misma llamada de dirección (sin endpoint ni ledger nuevos) devuelve además un
  `concept` (≤ 480 caracteres, en el idioma de la marca): lo que deben sentir las páginas y la idea que las hace
  específicas de esa audiencia. El popover lo enseña («Lo que entendió Claude») para que se vea qué entendió.
- **Cómo viaja:** `AiDirection.context` (lo que dijo el desarrollador, viene de la petición, nunca de la respuesta) y
  `AiDirection.concept` van en la dirección de arte cacheada, así que llegan a **todas las pantallas y a «Otra
  versión» / «Pedir cambio»**. El prompt de sistema dice que los `facts` son reales (se usan tal cual, no se inventan
  cifras) y que `avoid` es un no rotundo. Un contexto distinto pide una dirección nueva (`directionReusable`).
- **Vías:** API del plan gratis, key propia y «mi Claude» (ahí el contexto va en la dirección de arte del prompt, sin
  `concept`: no hay llamada de dirección). DESIGN.md lo exporta como «Contexto del producto» y «Concepto».
- **Corregido de paso:** «Otra versión» y «Pedir cambio» mandaban solo ejes, movimientos y razón: perdían el «Estilo»
  del desarrollador y la nota de sus capturas. Ahora usan `directionForPrompt`, igual que las pantallas.
- **Popover:** el panel compartido (`ui/Popover`) no tenía altura máxima y con más campos se salía por arriba de la
  ventana; ahora hace scroll dentro (`max-h-[calc(100dvh-24px)]`).

**Límites honestos:** no hay medida de calidad antes/después (haría falta correr `eval:quality` con una key); el concepto
no se edita ni se aprueba antes de generar (se ve después de la dirección); el contexto no se persiste entre
documentos. Siguiente paso natural si funciona: que el desarrollador pueda editar el concepto y regenerar solo las
pantallas.
