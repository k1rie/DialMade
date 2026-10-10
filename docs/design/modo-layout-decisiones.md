# Modo Layout: decisiones tomadas durante la Fase A

**Fecha:** 2026-10-10. **Rama:** `feat/layout-mode`.

Lo que la documentación (`modo-layout.md`, spec, crítica y handoff) no definía, y la opción que elegí. La regla fue: la opción más simple que no cierre puertas para la Fase B. Los cambios que hacen falta fuera de la zona de la Fase A están en `modo-layout-fase-b.md`.

## Repo y paquetes

1. **`apps/web/package.json` y `next.config.ts`.** El handoff no los lista, pero sin ellos la app no puede importar `@dialmade/layout`. Añadí una línea en cada uno: la dependencia `workspace:*` y la entrada en `transpilePackages`. En la Fase B, el conflicto con `main` es trivial y `pnpm-lock.yaml` se regenera igual.
2. **Sin dependencias nuevas.** Los tests de propiedades usan un PRNG con semilla propio (`packages/layout/src/testing/random.ts`) en lugar de `fast-check`, para tocar el lockfile lo mínimo.
3. **`crypto.getRandomValues` sin tipos DOM.** El paquete compila con `lib: ES2023`, como `@dialmade/palette`. Por eso `ids.ts` declara lo mínimo de `crypto` que usa y acepta una fuente de aleatoriedad inyectable para los tests.
4. **`.claude/launch.json` del worktree** apunta al puerto 3500, como pide el handoff. Es un archivo local, ignorado por git.
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
