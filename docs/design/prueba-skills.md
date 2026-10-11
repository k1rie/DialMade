# Prueba: Claude + Impeccable + taste-skill (2026-10-11)

**Pregunta:** ¿las skills de diseño públicas dan diseños que el usuario prefiera a los de «Diseño con IA»?

**Montaje:**
- **Marcas:** las 3 ficticias de siempre (Brisa, Vectora, Ollaria), con la misma paleta, fuentes, contexto, datos reales y orden de secciones que la landing de hoy. Los briefs están en `assets/prueba-skills/<marca>/BRIEF.md`.
- **Generación:** un agente por marca cargó `.claude/skills/impeccable` y `.claude/skills/taste-skill` y escribió una página en HTML y CSS libre (sin el vocabulario de tokens, sin imágenes externas: lo visual se dibuja con CSS o SVG). Hizo una sola pasada de verificación con capturas a 1280 y 390 px.
- **Comparación:** «hoy» es la respuesta guardada de Haiku en la app (`art1`, muestra 1).

**Voto del usuario: «2, 2, 2».** Gana la versión con skills en las 3 marcas. Es la primera vez que una alternativa gana en todas: los presets, el arte, la coherencia y el acabado perdieron o empataron.

| Marca | Objeto firma de la versión con skills |
|---|---|
| Brisa | La agenda real de la semana en el héroe (pestañas de día, 3 sillas, «ahora», recordatorio de WhatsApp) y los precios en una pizarra de letras |
| Vectora | La previsión de 90 días con el hueco del cliente que paga 21 días tarde y el interruptor «A tiempo / 21 días tarde» |
| Ollaria | La hornada de 40 piezas dibujadas desde arriba, seleccionable, que marca el plan que encaja |

**No es una comparación pareja:**
- **El modelo y el bucle son distintos.** Cada página la hizo un agente de nivel Opus en 13–15 min y ~200k tokens, con lectura de la skill y autorrevisión. Haiku tarda ~20 s y cuesta $0,005 por pantalla.
- **La salida no está restringida.** Es HTML y CSS libre con SVG en línea, sin el vocabulario de tokens, sin el sanitizador y sin las celdas del layout.
- **Lo que se probó es el flujo «Claude Code + skills»**, no el pipeline de la app. Falta saber qué pesa más: el modelo, la libertad de salida o el texto de las skills.

**Archivos:** `assets/prueba-skills/` (`voto-*.png`; páginas interactivas en `<marca>/index.html`; `shot.mjs` y `sheet.mjs` para repetir las capturas).

## Segunda prueba (B): una sola llamada, HTML libre ($0,517)

Mismos briefs, sin bucle de agente. Brazos:
- **2 · Haiku sin skills:** $0,007 por página, ~50 s.
- **3 · Haiku con skills:** taste-skill y las partes de Impeccable que usaron los agentes, completas en el prompt de sistema, con caché. $0,010–0,02 por página, 70–110 s.
- **4 · Sonnet 5.5 con skills:** $0,10–0,25 por página, ~50 s.

Columnas de la hoja: 1 hoy, 2–4 los brazos de arriba, 5 el agente que ganó la primera prueba. Script y salidas en `assets/prueba-skills/una-llamada/`.

**Voto del usuario: «5, 2, 5».** Brisa: agente. Vectora: Haiku sin skills. Ollaria: agente.

- **El salto grande es dejar escribir la página entera en HTML libre.** Hasta Haiku sin skills gana a «hoy», y en Vectora gana a todo.
- **Las skills en una sola llamada no ganaron ninguna marca.** Ni con Haiku ni con Sonnet.
- **Lo que gana en las marcas cálidas es el agente:** modelo fuerte, plan, objeto firma interactivo y una pasada de revisión con capturas.
- **Un voto por marca es ruidoso.** En rondas anteriores una marca cambió de lado.

## Tercera prueba (C): bloque a bloque con CSS libre, en el layout ($0,024)

Como «Diseño con IA» hoy: Haiku, una llamada por pantalla, los 7 bloques del layout en sus celdas, la misma dirección de arte y el mismo borrador. La diferencia: cada bloque puede llevar su `<style>`, limitado a su raíz, y SVG en línea, con las variables del tema en vez de clases de tokens. Coste: $0,006–0,011 por pantalla, 40–78 s. Los 7 bloques entraron en sus celdas y no hubo desbordes. Script y salidas en `assets/prueba-skills/bloques-css-libre/`.

**Voto del usuario: «2, 2, 2».** La página libre de Haiku gana a los bloques con CSS libre en las 3 marcas.

- **Liberar el CSS dentro de los bloques no basta.** Mejora los héroes, pero arrastra el borrador de plantilla (eyebrows, «What people are saying», rasgos de banco en el pricing de Vectora) y la forma de plantilla por bloques.
- **La palanca es generar la página entera desde el brief** (contexto, datos reales y orden de secciones), no rellenar bloques a partir de un borrador.

## Cuarta prueba: duelo de flujos sobre el modo página del producto (≈ $1,3)

La tubería nueva del producto genera las páginas 1 a 9: prompt de página, `<style data-dl-page>`, sanitizador en modo página y render en las celdas del layout. La 10 es el agente de la primera prueba. Hojas en `assets/prueba-skills/duelo/`.

| # | Flujo | Coste por página |
|---|---|---|
| 1 | Haiku, modo página | ~$0,008 |
| 2 | + estrategia de color (escalas de la paleta) | ~$0,012 |
| 3 | + `baseline-ui` (ui-skills) | ~$0,008 |
| 4 | + paquete ui-skills (baseline-ui, accesibilidad, motion) | ~$0,008 |
| 5 | + `frontend-design` de Anthropic (Claude Design no tiene API) | ~$0,009 |
| 6 | + DESIGN.md más afín de 18 sistemas reales, destilado sin marcas | ~$0,01 + $0,002 |
| 7 | + referencias web (`web_search`/`web_fetch`; el fetch solo trae texto) | ~$0,01 + ~$0,05 |
| 8 | Sonnet 5.5, modo página | ~$0,06 |
| 9 | Opus 5.5, modo página | ~$0,30 |
| 10 | Agente con skills (prueba 1) | ~200k tokens |

**Voto del usuario: «5, 8, 10».** Brisa: Haiku + frontend-design. Vectora: Sonnet. Ollaria: el agente.

- No gana un flujo único. Gana más capacidad (Sonnet o el agente) en 2 de 3 marcas, y la guía de `frontend-design` sube a Haiku en la tercera.
- No ganaron: color, ui-skills, DESIGN.md, referencias web y Opus en una sola llamada.
- **Propuesta:** el modo página como base; Haiku + `frontend-design` en «Maqueta»; Sonnet en «Presentable»; el agente para «Producto final» (con key, o entregado a Claude Code).
