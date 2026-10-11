# «Diseño con IA» capa por capa

2026-10-11. Siete agentes analizaron una capa cada uno del proceso de generación (solo lectura, sin API) y un octavo
ordenó las mejoras. Cada paso mejora UNA capa y termina con tu voto antes del siguiente. Ningún cambio se queda si no
gana en al menos 2 de las 3 marcas (Brisa, Vectora, Ollaria).

## Las capas de hoy

| # | Capa | Qué hace hoy |
|---|------|--------------|
| 1 | Entradas y brief | Nombre, lema, tipo de producto, tono de color y receta. El «Contexto» solo si lo rellenas (viene plegado). Nunca fuentes ni logo. Las pantallas de app parten de textos de plantilla (MRR, churn). |
| 2 | Dirección de arte | Una llamada barata por documento: ejes y «moves» de un menú. Escribe el concepto solo si hay «Contexto». |
| 3 | Landings (modo página) | Una llamada por landing: una hoja de estilos y una sección por bloque, con variables del tema y SVG. Sin paso de plan ni de revisión. |
| 4 | Pantallas de app (modo bloques) | Una llamada por pantalla con el vocabulario de clases de tokens; la navegación del marco se diseña una vez y se clona. |
| 5 | Filtros (sanitizador y puertas) | Lista blanca de HTML, CSS con ámbito y SVG. Casi nunca falla, pero tiraba en silencio cosas que se veían. |
| 6 | Coherencia entre pantallas | Las pantallas comparten solo la dirección; cada landing tiene su navbar, su pie y su hoja de estilos. |
| 7 | Render y exportación | Una isla por sección, sin imágenes reales, cursivas falsas en la app, y TSX/Figma sin los bloques de página. |

## Plan

1. **Filtros** ($0): conservar degradados SVG, selectores `#id`, tokens de `:root` y fuentes de la marca; arreglar que
   la hoja de estilos de la landing se perdía al reconstruir el layout. **Hecho, falta tu voto.**
2. **Render** ($0): cursivas reales (y `opsz`) en las URLs de Google Fonts de producción; el eval deja de fingirlas.
3. **Pantallas de app** (~$0,15): eval de app con datos de cada marca; sin borrador de plantilla en los bloques de
   contenido; marco más rico (logo real, acción «Diseñar navegación», cambios que llegan a los clones); columna extra
   con las pantallas de app en modo página.
4. **Landings** (~$0,35): un brief en prosa como el que ganó (producto, contexto, concepto, fuentes con sus ejes reales)
   en lugar de ejes y «moves» pensados para tokens.
5. **Dirección de arte** (~$0,35): concepto siempre, también con «Contexto» vacío (lo normal en producción), con un
   objeto firma y sus datos de ejemplo, palabras del producto, plan de tipografía y campos de color.
6. **Coherencia** (~$0,15): encadenar las landings (Precios reutiliza la hoja, navbar y pie de Inicio). Primero solo
   en el eval.

## Capas nuevas que se propusieron

| Capa | Veredicto |
|------|-----------|
| Adaptador de la respuesta del agente («mi Claude» pegando un HTML entero) | Añadir ya |
| Ficha de producto (palabras, KPIs con unidades, filas de ejemplo) | Probar primero (después de los pasos 3 y 5) |
| Objeto firma en una llamada propia | Probar primero |
| Revisar y corregir (render a 1280/390, rehacer secciones con defectos) | Probar primero: solo defectos medibles, nunca gusto |
| Kit compartido de app y kit persistente del sitio | Más adelante, si ganan los pasos 3 y 6 |
| Elegir entre 3 conceptos, fotos del usuario, memoria de gusto | Más adelante |
| Skills en el prompt, DESIGN.md, referencias web, Opus en una llamada | No (ya perdieron en `prueba-skills.md`) |

## Paso 1 · Filtros

Cambios en `packages/ai-render`:

- `url(#id)` local en `fill`, `stroke`, `clip-path` y `mask` (atributo `style` y CSS de la sección), apuntando al id
  con el prefijo de la sección. Nada remoto.
- El `<style>` dentro de un `<svg>` y los `<style>` anidados se juntan en la hoja de la sección.
- Los selectores `#id` siguen los ids con prefijo (`#ai-<bloque>-id`; en la hoja de la página, `[id$="-id"]`).
- `:root`, `html` y `body` caen en el ámbito en vez de tirarse (los tokens propios de una página viven ahí).
- Los nombres de las fuentes de la marca (`"Outfit"`) pasan a `var(--dl-font-heading)` en vez de tirarse.
- `apps/web`: la hoja de estilos de una landing (`aiRender.pageCss`) ya sobrevive a «Generar», al cambio de idioma y a
  duplicar la pantalla (antes se perdía y la landing quedaba casi sin estilo).

Resultado con las 27 respuestas guardadas, sin gastar API: cambian exactamente las 5 páginas que tenían manchas negras
(4 de Ollaria y la de Vectora con Haiku). Los píxeles negros bajan de 474k a 95k, de 286k a 75k, de 243k a 51k, de
146k a 100k y de 157k a 71k. Las otras 22 quedan idénticas.
Las 3 páginas del agente que ganaron conservan ahora sus interruptores (6 de 6 en Brisa, 13 de 13 en Vectora; antes,
ninguno) y sus tokens de `:root` en Brisa y Vectora. Siguen cayendo sus colores literales: 28, 27 y 57 declaraciones
en Brisa, Vectora y Ollaria. Pasarlos a mezclas del tema queda para otro paso.

Hoja de voto: `assets/capas/paso1-degradados.png` (antes | después, 5 páginas).
