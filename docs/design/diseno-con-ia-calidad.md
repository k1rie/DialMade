# «Diseño con IA»: calidad (diagnóstico, biblioteca y medidas)

**Fecha:** 2026-10-10. **Rama:** `feat/ai-quality` (desde `main` 58252c6). **Lee antes:** `diseno-con-ia-spec.md` y
`diseno-con-ia-critique.md`. Las reglas no cambian: el layout es del usuario, solo tokens, sanitizador e isla en el origen
de preview, la app funciona sin IA y la única IA de pago es Anthropic.

**Traspaso y pendientes:** `diseno-con-ia-calidad-handoff.md`. **Imágenes:** `assets/quality/` (antes/después en
`comparisons/`, galería en claro de Brisa en `library/`).

## Resumen

| Pregunta | Respuesta |
|---|---|
| ¿Por qué salían diseños pobres? | El modelo no era el cuello de botella: Haiku, Sonnet y Opus producían la misma página limpia y genérica. Fallaban el **vocabulario**, el **prompt** y la **falta de ejemplos**. |
| ¿Qué cambia más? | Una **biblioteca de bloques de referencia** hechos a mano (34 entradas) que el modelo adapta, y **gráficos dibujados por el runtime** (`data-chart`). |
| ¿Cuánto cuesta? | Haiku: $0,0044 por pantalla (+7 %). Sonnet: $0,086 (+51 %). Opus: $0,18 (+58 %). Las referencias cuestan input, no output. |
| ¿Qué modelo en el free tier? | **Haiku.** Con referencias supera al Opus «antes». Sonnet/Opus solo aportan mejor copy y pulido. |

## 1. Diagnóstico (antes)

Misma pantalla, 2 marcas ficticias (Brisa, es; Vectora, en), landing de 7 bloques y dashboard de 4, con el **mismo**
código de la app (esfuerzo `low`, streaming, dirección cacheada). `packages/ai-render/eval/quality.eval.ts`.

| | Haiku 5.5 | Sonnet 5.5 | Opus 5.5 |
|---|---|---|---|
| Landing | $0,005 · 28 s | $0,074 · 30 s | $0,149 · 43 s |
| Dashboard | $0,003 · 20 s | $0,039 · 18 s | $0,079 · 26 s |

Fallos, de más a menos frecuentes:

- **El hero era un wireframe vacío** (5 de 6 landings): `data-placeholder="screenshot"` dibuja cajas grises.
- **Gráficos vacíos** (3 de 6 dashboards, solo Sonnet y Opus): barras con `h-1/2` dentro de contenedores sin alto
  definido colapsan a 0.
- **`border-b`, `border-t`, `border-y`, `border-l` se descartaban siempre** (16 veces en 12 pantallas): el vocabulario
  solo aceptaba `border-b-2`. Son las líneas finas de las direcciones editorial y técnica.
- **Contraste en modo oscuro:** tintes de escala fija (`bg-brand-50`) con `text-foreground`; y `outline-ring` fallaba
  AA no textual sobre tintes y bandas.
- **Copy de plantilla** conservado por Haiku y Sonnet cuando «parecía encajar».
- **Solapes y huecos** (Haiku): meta absoluta sobre la cita; tarjetas enormes y vacías.
- **Composición idéntica** en los tres modelos: 3 tarjetas iguales, 3 testimonios en rejilla, 3 precios.

## 2. Qué se construyó

| Pieza | Dónde |
|---|---|
| Biblioteca (34 entradas: hero, features, testimonios, logos, stats, pricing, CTA, FAQ, navbar, footer, KPIs, gráficos, tablas, actividad) | `packages/ai-render/src/library/` |
| Selección por tipo, superficie y ejes de la dirección, con semilla de rasgos estructurados | `library/select.ts` |
| Referencias en el prompt de pantalla y en «Otra versión» (y en «Copiar prompt») | `prompt.ts` (`referencesText`) |
| Gráficos `<img data-chart="bar\|line\|area\|spark\|donut" data-values="…">` dibujados por el runtime, el export HTML y el TSX | `chart.ts`, `sanitize.ts`, `export.ts`, `tsx.ts`, `apps/preview/src/insert.ts` |
| Vocabulario: bordes por lado, `font-sans` | `vocabulary.ts`, `theme.ts` |
| Prompt v2: mockups de producto, gráficos, tintes, foco, ritmo, jerarquía, composición, solapes, copy siempre reescrito | `prompt.ts` (`ai-render/2`) |
| Reserva de presupuesto con 24 k tokens de entrada típicos | `apps/web/src/lib/ai/render/server.ts` |
| Galería (`eval:library`) y eval de calidad (`eval:quality`) | `packages/ai-render/eval/` |

**Seguridad.** `data-chart` y `data-values` solo en `<img>`; los números se validan en el sanitizador **y** otra vez en
la segunda pared del runtime (2–24 puntos, hasta 3 series, 0…1 000 000, solo dígitos). Sin `<svg>` en el vocabulario del
modelo y sin cambios en CSP ni en el sandbox.

## 3. Medidas (antes → después, mismas 2 marcas)

| | Haiku 5.5 | Sonnet 5.5 | Opus 5.5 |
|---|---|---|---|
| Costo por pantalla | $0,0041 → **$0,0044** | $0,057 → **$0,086** | $0,114 → **$0,181** |
| Tiempo medio | 24 s → **18 s** | 24 s → **26 s** | 34 s → **41 s** |
| Avisos de las puertas (12 pantallas) | 19 → **3** | 21 → **4** | 23 → **0** |
| Heroes con caja vacía | 5/6 → **0** | | |
| Gráficos vacíos (de 2 dashboards) | 0 → **0** | 1 → **0** | 2 → **0** |

- **Copy copiado de los ejemplos:** con ejemplos de finanzas, una marca de finanzas copiaba 45–60 % de los textos; tras
  pasar los ejemplos a dominios ajenos (panadería, biblioteca, huerto…) baja a 1–17 % (etiquetas de interfaz).
- **Caché:** la 2.ª pantalla lee ≈ 4,2–5,4 k tokens de caché en los tres modelos.
- **Gasto de esta línea de trabajo:** ≈ $1,80 (diagnóstico $0,70, después $1,10).

## 3 bis. Segunda ronda: lo que el dueño del gusto descartó

El 2026-10-10 el dueño del gusto aprobó **héroes, testimonios y pricing** y descartó el resto («muy planos, parecidos a
otros diseños de IA genéricos»). Lo aprobado tenía **un gesto fuerte**: escala enorme, una superficie invertida o un
número dominante. Lo descartado eran cajitas con borde de peso parejo y texto pequeño.

- Se reescribieron features, CTA, FAQ, navbar, footer, logos, stats, KPIs, gráficos, tablas y actividad con la regla
  «**un gesto por bloque**» (21 entradas nuevas; las 11 aprobadas no se tocaron y pesan más al elegir: `approved`).
- Motor: `data-highlight` (resalta una barra/segmento o marca un punto de una línea) y `text-giant` (2× display, para
  un wordmark o una sola cifra).
- Medido con Haiku, mismas 2 marcas: $0,0041 por pantalla, 16 s, avisos 0–4 por pantalla. El modelo adopta los
  patrones nuevos (navbar invertida mono, lista expandida con panel, puntuación + citas).

## 3 ter. Arreglo: features en tarjetas y CTA sin fuerza (`ai-render/3`)

En la ronda 2 las landings completas seguían cayendo en lo genérico en dos bloques, aunque la biblioteca tenía mejores
opciones: **features de Brisa** salía como 3 tarjetas iguales con tintes alternos y **el CTA** de las dos marcas salía
como una caja con tinte suave, un titular y dos botones.

**Causas** (reconstruyendo el prompt exacto de cada bloque):

1. **El eje `tinted-panels` se leía como «un tinte en cada elemento»** y el prompt decía que los ejes y los *moves* se
   aplican a todos los bloques: Haiku metía cada feature en su propia tarjeta para aplicar el tinte y el *move*
   «meta en las esquinas de las tarjetas». Las dos marcas tienen `tinted-panels`.
2. **El gesto del CTA dependía de un contenido que el bloque no tiene:** `cta-tilted-cards` ponía un campo de email en la
   tarjeta de delante, y el CTA de Dialmade lleva dos botones. El modelo se quedaba con el panel teñido (lo seguro) y
   tiraba las tarjetas (el gesto).
3. **«Combina sus ideas»:** con dos referencias por bloque, el prompt invitaba a mezclarlas, y la mezcla salía en promedio.

**Cambios:**

- Cada entrada de la biblioteca declara su **`gesture`**: el movimiento que debe sobrevivir a la adaptación. Viaja en
  el prompt (`<reference gesture="…" pattern="…">`) con la orden de tomar **una** referencia, conservar su gesto aunque
  cambie el contenido y no mezclar dos en un promedio.
- Prompt: los ejes y *moves* ajustan la superficie de la referencia y **nunca convierten filas, columnas o listas en
  tarjetas**; tarjetas iguales siguen siéndolo aunque cambie el tinte o se desplacen; dos bloques de una pantalla no
  comparten composición; un CTA es un momento fuerte (banda a sangre, frase a tamaño display o una cifra gigante).
- Glosario: `tinted-panels` = «uno o dos paneles grandes con tinte que contienen el bloque, no un tinte por elemento».
- Biblioteca: `cta-tilted-cards` pone los **botones** en la tarjeta de delante; nueva entrada **`cta-brand-figure`**
  (banda a sangre en el color de marca con una cifra gigante de la oferta). Las dos pasan las puertas sin cambios.
- Eval: métrica `equalPanels` (bloques con 3+ paneles hermanos que solo difieren en tinte o desplazamiento).

**Medido con Haiku, mismas 2 marcas y misma dirección, 2 muestras** (`comparisons/06-*.png`):

| | Ronda 2 | Arreglo (muestra 1) | Arreglo (muestra 2) |
|---|---|---|---|
| Bloques con paneles iguales (4 pantallas) | 1 (features de Brisa) | 0 | 0 |
| Avisos de las puertas (4 pantallas) | 6 | 1 | 0 |
| CTA | caja teñida en las 2 marcas | banda de marca + cifra en las 2 | banda de marca + cifra en las 2 |
| Costo por pantalla (media) | $0,0041 | $0,0046 | $0,0040 |

Features sale como frase en dos tonos + columnas numeradas (Brisa) o lista con un elemento abierto + panel (Vectora).
Los dashboards no empeoraron. Gasto: ≈ $0,04.

**Ojo:** las dos marcas eligen ahora el mismo CTA (`cta-brand-figure`). Es mejor que la caja teñida, pero resta
variedad: hacen falta más entradas de CTA con gesto fuerte.

## 4. Límites honestos

- **Una ejecución por celda**, 2 marcas, 2 pantallas: sin ruido entre ejecuciones ni panel ciego de calidad.
- Capturas del **export estático** en modo claro; el modo oscuro de la galería se revisó en 2 entradas y por avisos.
- **Sin medir:** móvil y tablet, más de 2 marcas, pantallas de tipo formulario, ajustes o calendario (sin referencias).
- La composición de una pantalla sigue pareciéndose entre marcas con la misma dirección: más entradas y más variantes
  por tipo es el siguiente paso (ver §5).
- Las referencias suben el input en ≈ 12 k tokens por pantalla: Sonnet y Opus cuestan +50 %. En Haiku es +$0,0003.

## 5. Cómo ampliar

1. **Elige un patrón** que te guste (en tus referencias, en sitios públicos, en tu trabajo). Descríbelo: qué mira el ojo
   primero, cómo se muestra el producto, dónde está la tipografía.
2. **Escríbelo desde cero** en la familia que toque de `library/` con el vocabulario de tokens (ver `library/README.md`).
3. `eval:library`: nada marcado en `report.json` y se ve bien en claro y oscuro.
4. `eval:quality` con Haiku (≈ $0,02) antes y después.

**Políticas**

- **Mobbin** no se integra: no tiene API pública y sus términos no permiten extraer capturas. Sirve como referencia
  privada de quien diseña; lo que entra al repo es **código propio**.
- Las librerías abiertas consultadas (shadcn/ui, Launch UI, HyperUI y Tremor Blocks, todas MIT) se **estudiaron** y no se
  copió ni su código ni sus assets, así que no hay atribución que mantener. Origin UI (AGPL), Cruip (sin licencia) y
  Preline (licencia propia) quedan fuera.
- Nada de nombres ni logos de marcas reales en el repo (CLAUDE.md). `library.test.ts` lo comprueba.
