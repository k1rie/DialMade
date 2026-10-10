# «Diseño con IA»: calidad (diagnóstico, biblioteca y medidas)

**Fecha:** 2026-10-10. **Rama:** `feat/ai-quality` (desde `main` 58252c6). **Lee antes:** `diseno-con-ia-spec.md` y
`diseno-con-ia-critique.md`. Las reglas no cambian: el layout es del usuario, solo tokens, sanitizador e isla en el origen
de preview, la app funciona sin IA y la única IA de pago es Anthropic.

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
