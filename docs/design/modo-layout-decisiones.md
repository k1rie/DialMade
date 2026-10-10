# Modo Layout: decisiones tomadas durante la Fase A

**Fecha:** 2026-10-10. **Rama:** `feat/layout-mode`.

## Resumen (léelo primero)

- **Fase A y Fase B terminadas** en `feat/layout-mode`, sin push ni merge a `main`.
- **Qué hay:**
  - el paquete `@dialmade/layout`: motor del lienzo con XY-cut, responsive, CSS y wireframe;
  - el lienzo en el paso **Layout** del flujo (Marca → Layout → Ajustar → Exportar), con varias pantallas, librería, inspector, capas, selector de estilo y plantillas;
  - **DesignDoc v2** con pantallas y migración desde v1;
  - las 8 secciones `ui.*` y `buildPageFromLayout`;
  - **Generar** determinista (~6–9 ms con 200 bloques) con momento firma dentro del lienzo;
  - IA opcional con **una sola** petición y las notas en `<layout_notes>`;
  - preview navegable entre pantallas («Probar»);
  - ZIP multipágina con enlaces reales, `layout.css` y `layout.json`;
  - DESIGN.md y prompt packs con el layout y el flujo.
- **Calidad:**
  - dos revisiones adversariales con verificación (58 hallazgos en la Fase A y 41 en la B), todos arreglados con tests;
  - typecheck, lint y tests en verde en los 8 paquetes (unos 2.700 tests);
  - el build de producción compila, y `/dev/layout` da 404 en producción.
- **Cómo probarlo:** en el worktree, ejecuta `corepack pnpm --filter web exec next dev --port 3500` y abre `http://localhost:3500/` (el flujo completo) o `/dev/layout` (el lienzo aislado, solo en desarrollo).
- **Lo que necesita tu decisión** está al final: «Pendiente para el usuario».

Lo que la documentación (`modo-layout.md`, spec, crítica y handoff) no definía, y la opción que elegí. La regla fue: la opción más simple que no cierre puertas para la Fase B. Los cambios que hacen falta fuera de la zona de la Fase A están en `modo-layout-fase-b.md`.

## Repo y paquetes

1. **`apps/web/package.json` y `next.config.ts`.** El handoff no los lista, pero sin ellos la app no puede importar `@dialmade/layout`. Añadí una línea en cada uno: la dependencia `workspace:*` y la entrada en `transpilePackages`. En la Fase B, el conflicto con `main` es trivial y `pnpm-lock.yaml` se regenera igual.
2. **Sin dependencias nuevas.** Los tests de propiedades usan un PRNG con semilla propio (`packages/layout/src/testing/random.ts`) en lugar de `fast-check`, para tocar el lockfile lo mínimo.
3. **`crypto.getRandomValues` sin tipos DOM.** El paquete compila con `lib: ES2023`, como `@dialmade/palette`. Por eso `ids.ts` declara lo mínimo de `crypto` que usa y acepta una fuente de aleatoriedad inyectable para los tests.
4. **`.claude/launch.json` del worktree** apunta al puerto 3500, como pide el handoff. El archivo está en git (con el puerto 3200), así que el cambio queda solo en local y no entra en ningún commit.
5. **Documentos ajenos.** No hago commit de `INFORME.md` ni de `referencias-mobbin.md`, ni de los `modo-layout-*` que ya estaban sin seguimiento en el worktree. Solo de los documentos nuevos de esta fase.
6. **Tests de UI.** `apps/web` no tiene jsdom ni Testing Library, y añadirlos tocaría `package.json` y el lockfile. Por eso solo llevan tests los módulos puros (store, geometría, búsqueda), y la UI se verifica en el navegador.

## Motor (`@dialmade/layout`)

7. **XY-cut: primero los cortes horizontales.** La spec dice «corta por el hueco más ancho; en empate, en horizontal».
   - Si los huecos se miden en píxeles, una columna (120 px) siempre gana a unas filas (8 px cada una). Entonces una cuadrícula 2×2 de cards se leería por columnas (1, 3, 2, 4), y en móvil se apilaría en ese orden.
   - Por eso: si hay algún corte horizontal, se corta por todos ellos (`stack`). Si no, por los verticales (`row`). Si no hay ninguno, `grid`.
   - Quien quiera agrupar en columnas usa un «Contenedor», que da identidad y orden explícitos.
8. **Tolerancia τ = 1 unidad (1 columna u 8 px).** Un solape de 1 unidad entre dos grupos sigue permitiendo el corte, si es menor que la mitad del bloque más pequeño de los dos. Así, los bloques desalineados ±1 no cambian la estructura.
   - No es una corrección silenciosa: el solape sigue saliendo como warning `overlap`.
9. **Los solapes se resuelven sin cambiar la geometría.** Si hay solapes que impiden cortar, la región pasa a `grid` con colocación por líneas, que admite solape, y `areas: null`. El warning trae arreglos de un clic: «Poner debajo», «Recortar» (si el solape es menor del 15 %) o «Anidar».
10. **Contención implícita = warning, no anidado.** Un bloque que cae ≥90 % dentro de un contenedor sin `parentId` produce `implicit-containment`, con el arreglo «Anidar». Solo `normalizeDrop` (al soltar en el lienzo, de forma visible) fija `parentId`.
11. **Un bloque no contenedor con hijos** (un media dentro de un hero) es una pista, como dice la spec: el hijo se coloca dentro y el hero pasa a `split`. Si el tipo del hijo no está en `accepts`, se avisa con `not-accepted`.
12. **Huecos.** Los verticales se cuantizan a la escala `--dl-space-*` (4…128 px) como `margin-block-start`. Por encima de 128 px se usa `calc(var(--dl-space-10) * n)`. Entre columnas, `column-gap: var(--dl-space-5)`. El espacio antes del primer bloque de un ámbito no se conserva.
13. **Alto.** En `landing` es una pista: solo media y gráficas llevan `aspect-ratio`. En `app` es literal (`min-height`). Las pistas del `grid` usan `minmax(N × 8px, auto)` en los dos tipos.
14. **Container queries:** tablet `(width < 64rem)` y móvil `(width < 40rem)`, alineadas con los rem que ya usan las secciones (48, 52 y 64rem).
15. **Contrato del DOM** (para la Fase B): hay un elemento por bloque y por región, con `data-dl-id`. Un bloque con hijos aplica él mismo las reglas de su grupo, sin un elemento de región extra. Los overlays son hijos directos del elemento raíz. `toElementTree` devuelve ese árbol.
16. **Alturas derivadas en móvil:** son una aproximación por comportamiento, solo para la preview del lienzo. Por ejemplo, 2×2 multiplica las filas de KPIs, «una columna» apila los ítems de cards y hamburguesa o drawer dejan una barra de 64 px.
17. **Tamaños por defecto y `minCols`.** La investigación no los daba. Están en `library.ts`: se pasaron los altos propuestos en px a filas de 8 px, y los mínimos de tablet (tabla 560 px, gráfica 320 px, card 240 px, calendario 640 px) a columnas.
18. **Categorías de la librería:** las 7 filas de la tabla de la spec (Básicos, Navegación, Contenido, Datos, Formularios, Estados y overlays, Media/social/comercio). «Bloque libre» y «Contenedor» van primero, en «Básicos».
19. **Sidebar y Navbar en pantallas de app** son el marco de navegación (`frame`), no bloques: insertarlos cambia `shell.nav`. En pantallas de landing, el Sidebar no está disponible (sale deshabilitado, con «Solo en pantallas de app»).
20. **Modal** es contenedor (puede llevar un formulario dentro) y overlay: va en la capa absoluta, fuera del XY-cut.
21. **Plantillas de pantalla.** Las composiciones no estaban documentadas, así que usé las propuestas de la investigación. Quité `componentGallery` del Dashboard porque no tiene bloque en la librería. Login y Checkout son pantallas de app sin navegación (`nav: none`).

## Lienzo y UI

22. **Posiciones visibles para el usuario:** columnas en base 1, y posición vertical y alto en px (filas × 8). «Filas 3 a 20» de 8 px no le dice nada a un dev. Los anuncios dicen, por ejemplo, «Calendario: columnas 1 a 8, de 24 a 504 px».
23. **Sin zoom en la Fase A.** La crítica prohíbe `scale()`, y la herramienta Mano desplaza el scroll. La rejilla se dibuja en px de pantalla: columna = ancho disponible / 12, fila = 8 px × (ancho del marco / ancho del dispositivo).
24. **Selección única.** La multiselección (Shift+clic, marquee) queda para después.
25. **Tablet y móvil se ven en solo lectura,** con la estructura derivada. Los bloques se pueden seleccionar para editar su visibilidad y su comportamiento en el inspector. Mover y redimensionar solo se hace en Escritorio.
26. **Lista de capas** sin reordenar: el orden lo da la geometría. Sirve para seleccionar, ocultar y renombrar.
27. **Store propio de `LayoutStep`** (zustand + zundo, ya instalados), una instancia por montaje. El historial guarda solo `screens` y `screenOrder`. La selección y la herramienta no se deshacen.
28. **«Generar» en la Fase A** no compila secciones, porque eso es de la Fase B. Calcula estructura, responsive, CSS y wireframe de cada pantalla, muestra los avisos con sus arreglos y entrega el resultado por `onGenerate`. La ruta de desarrollo lo enseña.
29. **«Tu guía de estilo»** se representa con el valor `"guide"` en el selector. En la Fase B, elegirla conserva los valores importados y bloqueados. Las recetas llaman a `onStyleChange(recipeId)`, que en la Fase B será `actions.setRecipe(id, { cascade: true })`.
30. **Preview del selector de estilo:** variables del tema aplicadas con `style` en la raíz de cada carta (`compileThemeVars` con la receta cambiada). No uso `ThemeScope`, para no cargar el CSS de las secciones solo por una miniatura. El vidrio sale de `recipe.surface === "glass"`, porque el contrato del tema no tiene variable para él.

## Detalles del motor que fijó la implementación

31. **Un bloque raíz solo y más estrecho que la rejilla** recibe `width` y `margin-inline-start` en porcentaje. Un grid en el elemento raíz no serviría, porque un elemento no puede responder a sus propias container queries.
32. **Ocultar solo en tablet** genera un bloque extra `@container dl-layout (40rem <= width < 64rem)`, porque las reglas de móvil no pueden deshacer un `display: none`.
33. **Ocultar se hereda:** un bloque dentro de uno oculto (overlays incluidos) queda oculto en todos los breakpoints.
34. **`moveBlock`** arrastra a los descendientes solo cuando el bloque se mueve sin cambiar de tamaño. Al redimensionar (por ejemplo, desde el borde izquierdo) los hijos se quedan donde están.
35. **`normalizeDrop`:**
    - El padre actual cuenta como candidato aunque no sea contenedor, así que un media dentro de un hero se queda ahí.
    - Al desanidar, el bloque pasa al ancestro más cercano que aún contiene ≥50 % de él; si no hay ninguno, va a la raíz.
    - Un recorte (`clip`) nunca deja fuera a los hijos de un contenedor: si recortar a uno los dejaría fuera, se recorta el otro; si tampoco se puede, el solape queda como aviso.
    - El arreglo «Anidar» también mete el bloque dentro de su nuevo padre, igual que al soltar.
36. **Contenedor sin sitio:** al insertar o duplicar dentro, crece, y `insertBlock` lo devuelve en `grown`. No hay un `Adjustment` nuevo.
    - Al crecer empuja hacia abajo todo lo que en su ámbito empezaba en su fondo anterior o más abajo (con sus hijos), y los ancestros crecen igual hasta la raíz.
    - Un modal insertado en un contenedor nunca lo hace crecer: sube para caber si puede; si no, sobresale con el aviso `outside-parent`.
37. **`count`** se limita a los topes del bloque repetible, o a 1–99 en los que no lo son. `validateLayout` usa la misma regla.
38. **Tipos desconocidos** se tratan como «Bloque libre» al inferir. Solo `validateLayout` los reporta.

## Detalles del store y de la UI que fijó la implementación

39. **Las huellas de «Generar» viven en el estado del store, no en `block.generated`.** Si se escribieran en los bloques, «Generar» sería un paso de deshacer invisible.
    - «Regenerar N» compara tipo, ancho, alto, `count` y la nota. Mover sin cambiar de tamaño no cuenta.
    - En la Fase B pasan a `block.generated`, en el mismo batch que `elements`.
40. **La navegación de app se comparte.** Cambiar la navegación en una pantalla de app la cambia en todas las que tienen navegación; Login y Checkout se quedan en «Ninguna». `header` y `activeItem` son de cada pantalla.
41. **Convertir una landing en pantalla de app** quita los bloques Navbar y Sidebar y los convierte en el marco (gana Sidebar). Convertir a landing quita el marco y conserva todos los bloques.
42. **Ids únicos en todo el proyecto,** no solo en la pantalla. Los de pantalla son `s-` + 6 caracteres base36.
43. **Nombres y rutas.** Los nombres de pantalla se hacen únicos («Dashboard 2»). La ruta es «/» para la primera landing; si no, «/» + slug único. Una ruta automática sigue al nombre al renombrar; una ruta escrita a mano se queda.
44. **Deshacer** también revierte «aplicar plantilla de conjunto», así que se puede volver al selector de plantillas. Borrar una pantalla quita los enlaces a ella en el mismo paso. La última pantalla no se puede borrar.
45. **Nombres en español:** «Características» (features) y «Tarjetas» (cards). La categoría `overlays` se llama «Estados y ventanas». Los sinónimos mezclan es y en en los dos idiomas.

## Detalles del lienzo y de los paneles

46. **La selección sigue al foco** en el lienzo: al llegar con Tab a un bloque se selecciona, y el inspector lo sigue.
47. **La preview de un gesto es local.** Mover, redimensionar y coger con teclado solo cambian el estado local; el store se escribe una vez al soltar. Si se escribiera en cada paso, `normalizeDrop` recortaría a los vecinos de forma permanente a mitad del gesto.
48. **Dibujar una caja y responder «¿Qué es esto?» es un solo paso de deshacer.** Después de dibujar, la herramienta vuelve a Editar.
49. **Se puede dibujar encima de bloques,** para dibujar dentro de un contenedor. Con Dibujar, un clic en un bloque no lo selecciona.
50. **Soltar desde la librería** centra el tamaño por defecto del bloque en el puntero. Mientras pasa por encima se ve la caja encajada y, si cae ≥90 % dentro de un contenedor, «Suelta para meterlo en…».
51. **El marco de navegación en las vistas derivadas:** en tablet, el lateral pasa a rail; en móvil, cualquier navegación es una barra superior de 64 px.
52. **El marco de app** (navegación y cabecera) no está en el orden de Tab. Un clic deselecciona y lleva el foco al panel de la pantalla; con teclado: Esc y después F6.
53. **Los avisos** salen como insignia en el primer bloque del aviso y solo en Escritorio. Las líneas de «Ver estructura» también son solo de Escritorio; los números de orden de lectura salen en todas las vistas.
54. **Las pestañas Bloques/Capas** se quedan montadas (la oculta, escondida) para no perder la búsqueda, las categorías abiertas ni el scroll. En pantallas de menos de 640 px se abre Capas; al ensanchar se vuelve a Bloques, salvo que el usuario haya elegido otra.
55. **`PanelSection` es un grupo (`role="group"`), no un landmark,** para que los paneles no creen regiones dentro de las de `LayoutStep`.

## Ajustes tras la revisión de la Fase A

56. **Enter no inserta desde la librería.** La spec (§3.2) decía «un clic o Enter coloca el bloque», pero CLAUDE.md reserva Space y Enter para coger y soltar, y CLAUDE.md manda. Por eso:
    - Un clic inserta en el siguiente hueco libre (la alternativa de un solo puntero, WCAG 2.5.7).
    - Con teclado, Space o Enter coge la carta y Space o Enter la suelta. Si se suelta sin llegar al lienzo, el bloque va al siguiente hueco libre; si se lleva con las flechas al lienzo, también.
    - Un Space o Enter mantenido o con modificadores no empieza un arrastre.
57. **Límites del lienzo:** `MAX_ROW` = 4000 filas (32.000 px) y `MAX_HEIGHT_ROWS` = 2000 filas (16.000 px). `validateLayout` rechaza valores mayores; el motor, el store, la rejilla y el inspector los limitan.
58. **Notas y nombres:** se normalizan a NFC y se quitan todos los caracteres de formato invisibles (incluidas las etiquetas Unicode). Se conservan el ZWJ dentro de emojis y entre letras de escrituras que lo usan.
59. **El wireframe ASCII mide en columnas de monoespaciado** (emoji y CJK ocupan 2). Es una aproximación propia; no uso `Intl.Segmenter` porque sus datos cambian entre navegadores y rompería el «misma entrada, misma salida».
60. **Tablet mantiene una fila si la suma de los `minCols` cabe** (spec §5). Si sobran columnas por redondeo, se quitan al hijo que más pasa de su mínimo.
61. **«Deshacer» de un toast solo deshace su propia acción.** Si después hubo otros cambios, el toast avisa «Ya hiciste otros cambios. Usa ⌘Z o Ctrl+Z para deshacer paso a paso.» (`changeToken`/`undoIfLatest`).
62. **Deshacer con un lote abierto** (por ejemplo, durante «¿Qué es esto?») primero cierra el lote, para que el historial nunca quede en pausa.
63. **Mantener pulsado ⌘Z o ⇧⌘Z** repite deshacer o rehacer; mantener Supr o ⌘D no encadena borrados ni duplicados.
64. **Insignia de avisos:** si un bloque tiene la insignia en la esquina superior derecha, esa esquina no tiene handle de redimensionado (los otros 7 sí).
65. **Contraste:** todo texto informativo usa `text-muted` (≥4,5:1). `text-subtle` queda para texto decorativo o ≥14 px seminegrita, como dice el Design Brief. Un test recorre `LayoutStep/` para que no vuelva.
66. **La pila del lienzo está aislada** (`isolation: isolate`): ningún bloque ni handle pinta por encima de la barra inferior ni de los popovers.

# Fase B

**Inicio:** 2026-10-10, cuando el chat principal avisó de que import ya estaba en `main` (ba15249). Merge de `origin/main` en `feat/layout-mode` sin conflictos de código (solo `package.json`, `next.config.ts` y el lockfile).

## DesignDoc v2 (`@dialmade/doc`)

67. **v2 es aditivo:** `pages` se queda igual y se añaden `screens` y `screenOrder`. Reemplazar `pages` habría tocado unos 57 archivos y obligado a inventar pantallas en la migración. La migración de v1 a v2 solo sube la versión (al parsear); `applyPatch` solo acepta v2.
68. **Una sola fuente de verdad:** con pantallas, `pages.landing` y `pages.app` no pueden existir. `pages.brand` (la guía de estilo) sigue siendo única y no es una pantalla.
69. **Reparto de validación:** Zod comprueba tipos y formatos; `validateLayout` del motor, rangos, padres, ciclos, `count`, longitudes y el tope de bloques. Cada problema se reporta una vez, con su código del motor.
70. **Reglas de pantalla:** ids que no pueden ser `brand`, `landing` ni `app` (así una `PageKey` nunca es ambigua); rutas únicas de hasta 96 caracteres (`/` o segmentos slug); `layoutId = "custom"` en sus páginas, sin buscar en el catálogo; las pantallas de app con navegación comparten la misma; un bloque puede enlazar a su propia pantalla. Máximo 24 pantallas.
71. **`pinned`** son JSON Pointers relativos a las props (hasta 128). `generated.noteHash` va en base36, como `hashString` del motor.
72. **Los candados pueden apuntar dentro de `/screens`.** `removeScreenOps` quita también los candados de la pantalla (con `allowLocked`, tras confirmar).
73. **Exportes:** «Pantallas y flujo» y un bloque por pantalla van dentro del `## Layout` que ya existía (los tests fijan los `##` y el frontmatter). Los bloques ocultos salen de la lista numerada, bajo «Ocultos». La salida de los documentos sin pantallas es idéntica byte a byte (goldens).
74. **Los exportes describen lo que se ve:** en las páginas de layout las listas se guardan al máximo y `count` decide cuántos ítems se pintan; DESIGN.md y los prompt packs usan `visibleProps` para no listar 6 KPIs donde se ven 4.

## Secciones (`@dialmade/sections`)

75. **Las ocho secciones `ui.*` tienen `kind: "app"`** en el registro. Ese campo solo agrupa `registry.list`, que nadie usa fuera del paquete; la librería sale de `@dialmade/layout` (crítica #1).
76. **Calendario:** la vista es la variante (mes, semana, agenda, mini). La semana empieza en lunes en es y en domingo en en.
77. **Formulario:** guarda los 11 campos una vez y cada propósito (login, registro, contacto, búsqueda, genérico) muestra su subconjunto, recortado a `count`. Cambiar de propósito nunca pierde una etiqueta editada.
78. **`fit()` no escribe textos** (no conoce el idioma): usa interruptores (`showBody`, `showAction`) y variantes. El h1 lo pone `buildPageFromLayout` en el primer texto visible cuando no hay hero ni cabecera de página.
79. **Semillas de copy:** el primer bloque de cada tipo, en orden de lectura, usa la semilla del documento (así el botón del hero coincide con el del navbar); los siguientes usan una semilla derivada de su id, para que dos listas no repitan textos. Si un título nuevo repite otro de la página, se prueban hasta 8 semillas alternativas (nunca en títulos fijados o conservados).
80. **Regenerar:**
    - Huella sin cambios: se conservan las props tal cual (incluido el copy de la IA aunque no esté fijado).
    - Huella cambiada: se conservan las props, se reajustan las claves del layout y la variante, y si una lista crece se añaden ítems al final sin tocar los existentes.
    - Modo `content` (cambio de idioma o de producto): copy nuevo, conservando variante, claves del layout y valores fijados.
    - Cambio de tipo: valores por defecto del tipo nuevo, más eyebrow, título, subtítulo y descripción si encajan, y los valores fijados que sigan siendo válidos.
81. **Absorción:** los hijos que un bloque no contenedor sí acepta (un media dentro de un hero) se absorben en él (el hero pasa a `split`); los que no acepta se recolocan en el ámbito de ese bloque. Un bloque absorbido conserva su huella (variante `absorbed`) y su `linkTo` pasa al bloque que lo absorbe.
82. **El marco de app** se construye con el nombre de la pantalla como título y las pantallas de app como ítems de navegación (máximo 10). Un Sidebar suelto en una landing se compila como un marco rail o lateral sin cabecera.
83. **Modal:** se compila como `app.confirmDialog` en panel; sus hijos van en el cuerpo del diálogo.
84. **Contenido de relleno:** cuando el chip permite más ítems de los que traen los perfiles (un 4.º plan, testimonios o KPIs hasta 6, actividad hasta 8, logos hasta 8), se completan con ítems neutros.
85. **Login:** la plantilla de Login lleva la nota «Login» en su formulario, que `parseNote` lee como palabra clave en es y en.

## Limpieza en la web

86. **`Segmented`, `Popover` y `PanelSection` viven en `components/ui/`.** El `Popover` compartido es la versión de `LayoutStep` (Tab fuera de los extremos lo cierra), así que el Composer gana ese arreglo de teclado. La barra de acento de `Segmented` es opcional y solo la usa `LayoutStep`, porque cambia el aspecto y la estética la decide el usuario.
87. **Anuncios:** el feedback de arrastre sigue siendo `assertive`; en `LayoutStep` todo es `polite` salvo los rechazos (vista de solo lectura, última pantalla, ya está arriba o abajo, solo en pantallas de app).
88. **Toasts:** suben por encima de la barra inferior del lienzo mientras está visible (`--app-toast-bottom`, `useToastClearance` en `src/hooks/`).

## Flujo, store y Ajustar (ola 2)

89. **El paso «Crear» pasa a llamarse «Layout»** en todo el flujo (stepper, etapas, CTA «Crear layout →» del Palette Lab, «Editar layout» en Ajustar). `CreateStep` se borró; sus piezas (`KindCard`, `MiniPreview`, `RecommendQuestion` y `DetailsPanel`) viven en `LayoutStep/TemplatePicker/`.
90. **Selector de inicio:** `KindCard` es ahora la carta de conjunto (mini con la marca, nombre, descripción y «Para ti si…»). La pestaña del Palette Lab recomienda: landing → «Landing», app → «SaaS app». Si la respuesta a «¿No sabes cuál?» es «Pasárselo a mi diseñador o a mi IA», no se recomienda ninguno y una nota explica que la guía de estilo se genera siempre.
91. **El draft del layout vive a nivel del flujo,** uno por documento, así que salir de Layout no lo pierde. Al volver se sincroniza con `doc.screens` (comparando contenido):
    - Draft sin cambios desde la última sincronización: pasa a ser lo del documento.
    - Los dos cambiaron: geometría, tipo, nombre, nota y enlaces vienen del draft; `pinned` y `generated`, del documento; `hidden` y `count` se fusionan a tres bandas (gana el lado que cambió; si cambiaron los dos, el draft). No se añade ningún paso de deshacer.
92. **Generar** escribe todo en una sola escritura validada (pantallas, huellas, marco de app compartido, guía de estilo y foco) y tarda unos 6–9 ms con 200 bloques. La primera vez reinicia el historial, para no poder deshacer hasta un documento vacío.
93. **Candados al generar:** un valor bloqueado que Generar cambiaría conserva su valor. Si un bloque borrado tiene un candado, la escritura falla y aparece un toast con «Desbloquear y borrar»; el reintento usa `allowLocked` y quita los candados que quedan colgando.
94. **Estilo:** «Tu guía de estilo» es la opción por defecto si hay una guía importada (`provenance.imports` no vacío), hasta que el usuario elige una receta. Elegir receta llama a `setRecipe(id, { cascade: true })`; si está bloqueada, el selector vuelve atrás y un toast ofrece «Desbloquear».
95. **Marco de app compartido:** solo una pantalla que gana marco (nueva, o que no lo tenía) copia las props del primer marco existente; los marcos que ya existen conservan las suyas. Los cambios del marco hechos en Ajustar se aplican a todas las pantallas de app con marco del mismo tipo.
96. **Ajustar en pantallas:** las pestañas son las pantallas y después «Guía de estilo»; no hay «+ Añadir página» (las pantallas se añaden en Layout) ni se reordenan secciones (el orden lo da el layout; aviso «El orden y el tamaño se cambian en Layout.»).
    - Ocultar escribe `page.hidden` y `layout.blocks[id].hidden` en un solo parche; solo se pueden ocultar bloques del layout.
    - Editar un knob o la variante añade esa prop a `layout.blocks[id].pinned` en el mismo parche, para que regenerar no la toque.
    - El copy de la IA no se fija: sobrevive a regenerar el layout, pero no a un cambio de idioma o de producto.

## IA y export (ola 2)

97. **Una petición por Generar:** si se piden más de 64 secciones en total, se mandan las pantallas enteras. Cada nota de bloque lleva también su `count` y el nombre de la pantalla enlazada. Los bloques absorbidos no llevan nota.
98. **Campos que la IA no toca en pantallas:** además de las notas y nombres de bloque, los nombres ficticios de personas de las listas, los `meta` de listas y tarjetas, y el título, la navegación y el buscador del marco (los reescribe el build). El subtítulo y la acción principal del marco sí, para que la IA pueda ajustarlos por pantalla.
99. **`<` y `>` se escapan** en el JSON que va a la IA (`page_copy` y `layout_notes`), también en las peticiones antiguas; el valor JSON es el mismo.
100. **Estados por bloque:** un bloque que el usuario editó durante la petición queda en «Sin cambios»; «Error» solo cuando reintentar puede ayudar (red, saturación, respuesta inútil). Sin usos gratis, sin clave o sin configuración, se abre el menú de la IA en lugar de marcar error.
101. **El CSS del export y de la preview sale del layout compilado** (sin los bloques absorbidos), con la misma función en los dos sitios (`lib/screen-layout.ts`), para que el HTML exportado y la preview coincidan.
102. **ZIP:** la raíz es la pantalla con ruta `/` (si no hay, la primera). En el pack de Claude Design, `preview.html` es siempre la primera pantalla. `layout.json` añade `absorbed` (bloque → anfitrión), que explica por qué algunos bloques no salen en `order`. Los textos del usuario en el README pierden comillas invertidas y saltos de línea.

## Generar, Ajustar y cabos sueltos (ola 3)

103. **Momento firma:** la capa con la pantalla generada se pinta al ancho del dispositivo y se escala al marco (es la única capa con `scale()`; el lienzo editable sigue sin él). Con más de unos 20 bloques se abren por oleadas para no pasar de 900 ms.
104. **Con IA activada, la página generada se queda en el lienzo** al terminar el momento firma, con los chips por bloque, hasta pulsar «Ir a Ajustar» o «Seguir editando el layout». Salir antes desmontaría el paso y `useAiCopy` cancelaría la petición. Mientras tanto los paneles laterales están `inert`.
105. **Qué recibe la IA al regenerar:** una pantalla nunca generada va entera; una pantalla con cambios manda solo sus bloques cambiados (un bloque absorbido se manda como su anfitrión); «Generar de nuevo» sin cambios, o si solo se borraron bloques, manda todas las pantallas enteras. «Reintentar» reintenta todos los bloques en error en una sola petición (un uso).
106. **El interruptor de IA empieza apagado** en cada visita a Layout y aparece apagado mientras la IA esté bloqueada (sin key ni usos gratis). «Copiar prompt para mi Claude» antes del primer Generar genera primero, porque el prompt necesita las páginas escritas.
107. **«Probar» es un modo explícito** de Ajustar, solo en documentos con pantallas; en «Editar» los enlaces nunca navegan. Un enlace a la pantalla actual sube al principio y lo anuncia.
108. **CSS por pantalla en la app:** la preview, la capa del momento firma y la mini del export usan el CSS del layout con ámbito `[data-dl-screen="<id>"]` (con `:where()`, así que la especificidad es la misma que en el export). El ZIP usa el CSS sin ámbito.
109. **×N desde Ajustar** escribe también `layout.blocks[id].count` en el mismo parche; la huella no se toca, así que al regenerar el bloque cuenta como cambiado y se recalculan las claves que dependen del tamaño (salvo las fijadas).
110. **Marco de app por pantalla:** el título del marco es el nombre de la pantalla; el subtítulo y la acción principal salen del propósito de la pantalla (detalle, ajustes, perfil, formulario, checkout, lista, calendario o genérico) y del tipo de producto. Las claves por pantalla (título, subtítulo, acción, ítem activo, cabecera) no se copian a las otras pantallas al editarlas en Ajustar; las demás (tono, densidad…) sí.
111. **`page.stash`:** cuando un bloque se absorbe (un media dentro de un hero), sus props se guardan en `page.stash`; si se vuelve a sacar, recupera su copy y sus valores fijados. Solo existe en páginas de pantalla.
112. **Formulario de ajustes:** `count` de 1 a 11 (por defecto 8, que es el formulario completo de antes; el knob va de 2 a 8).
113. **Ids de bloque únicos en todo el documento** (decisión 42) como regla del schema. Más de 24 pantallas o más de 200 bloques en una pantalla se rechazan antes del parseo completo.
114. **Los wireframes de DESIGN.md usan el layout compilado** (sin cajas para los bloques absorbidos, que se nombran «con X dentro»), igual que la página. Los archivos por pantalla (`layout.css`, `layout.json`) van en `SCREEN_EXPORT_FILES`, aparte de `EXPORT_FILES`, para no romper sus tipos.

## Ajustes tras la revisión final de la Fase B

115. **Nada se pierde al deshacer después de Generar.** Si Generar quita un elemento (bloque borrado o con otro tipo), sus props y sus valores fijados quedan en `page.stash` (máximo 32 entradas de bloques quitados; las más antiguas salen primero). Las pantallas borradas quedan en `screenStash` del documento (las 4 más recientes). Si un deshacer en Layout devuelve el bloque o la pantalla con el mismo id, vuelve con su copy y sus valores fijados. Un cambio de idioma o de producto regenera también lo guardado.
116. **Knobs del marco de app en Ajustar:**
    - «Navegación» escribe la navegación compartida de las pantallas de app; «Cabecera de página», la de esa pantalla; «Título de la página» renombra la pantalla (nombre único, y la ruta automática la sigue).
    - El resto del copy del marco (subtítulo, acción principal…) queda fijado por pantalla (`AppShell.pinned`): se conserva al regenerar y al cambiar idioma o producto, y la IA no lo toca.
117. **Fusión del draft a nivel de pantalla:** nombre, ruta, navegación y cabecera también se fusionan a tres bandas. Si un nombre o una ruta que viene del documento ya lo usa otra pantalla del draft, se numera («Ajustes 2», `/ajustes-2`).
118. **Duplicar una pantalla** conserva en la copia las ediciones de Ajustar de la original (copy, valores fijados, ocultos, dials y marco).
119. **Topes en el lienzo:** 24 pantallas y 200 bloques por pantalla, con un aviso claro al llegar; Generar ya no falla con un error genérico.
120. **Aviso de cambios sin generar:** si Ajustar o Exportar muestran una generación más antigua que el layout, aparece un aviso con «Generar».
121. **Filas de pantallas:** Space o Enter coge y suelta (para reordenar con las flechas); las flechas sin coger mueven el foco y abren la pantalla, como unas pestañas. Alt+↑/↓ y el menú siguen como alternativas.
122. **Un h1 por pantalla:** el primer texto visible; si no hay, el título de la primera sección que lo admite (formulario, lista, tarjetas o calendario, con la prop `level`, mismo aspecto).
123. **Copy por pantalla:** los textos y las listas de cada pantalla usan su propia semilla y el propósito de la pantalla (las pantallas de app nunca reciben copy de marketing). Navbar, hero, footer, precios y KPIs mantienen la semilla del documento, para que botones y precios coincidan entre pantallas.
124. **Navbar de landing:** con dos o más pantallas de landing, sus enlaces abren esas pantallas primero.
125. **«Enlaza a»** solo aparece en los bloques cuya sección pinta un enlace (`linkable` en la librería); si el bloque no lo pinta, el inspector lo dice.
126. **Media y gráficas en una fila:** la proporción va en un elemento interior, así que ya no desbordan la rejilla cuando el bloque de al lado es más alto.

## Límites conocidos (medidos)

- `applyPatch` con 10 pantallas × 200 bloques: unos 5–8 ms por cambio de knob (objetivo de la crítica: < 16 ms). La validación completa del documento sigue en cada edición.
- Historial de deshacer: comparte las partes que no cambian; un Generar sí guarda una copia nueva de las pantallas.
- Petición de IA: unos 258 KB por pantalla de 200 bloques, así que caben 3–4 pantallas así por petición (límite de 1 MB). Si no cabe, se ofrece la key propia o «Copiar prompt para mi Claude».
- Render de una pantalla de 200 bloques en Ajustar: cambiar la selección cuesta unos 3 ms; una edición, unos 29 ms, porque `PageRenderer` rehace su contexto con todo el documento. Bajarlo a ~3 ms exige un contexto estable, con riesgo de mostrar contenido viejo, y lo dejé para después.

## Pendiente para el usuario

- **Revisar los textos nuevos** de la UI (es/en): están en `src/i18n/layout.ts`, `flow.ts`, `ai.ts` (`layoutCopy`), `composer.ts` y `export.ts`.
- **Probar con VoiceOver y NVDA** (handoff §7). Aquí solo pude revisar el árbol de accesibilidad, el foco y las regiones `aria-live` en el navegador.
- **Contraste del `Segmented` del Composer:** la pastilla elegida tiene ~1,1:1 respecto al resto. El de `LayoutStep` usa una barra de acento; para el Composer hace falta tu decisión, porque cambia su aspecto.
- **`CLAUDE.md`:** está desactualizado (DesignDoc v1, paso «Crear», falta `@dialmade/layout`). El cambio propuesto está en `modo-layout-fase-b.md`.
- **Push y merge a `main`:** no hice ninguno. La rama tiene todos los commits.
