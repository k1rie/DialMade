# Modo Layout: decisiones tomadas durante la Fase A

**Fecha:** 2026-10-10. **Rama:** `feat/layout-mode`.

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
