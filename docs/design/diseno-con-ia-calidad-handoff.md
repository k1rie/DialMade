# «Diseño con IA»: calidad — traspaso (2026-10-10)

Contexto completo para retomar el trabajo en otra sesión o con otra cuenta. Léelo junto con
`diseno-con-ia-calidad.md` (diagnóstico y medidas) y `packages/ai-render/src/library/README.md` (reglas de la biblioteca).

## 1. Dónde está todo

| Qué | Dónde |
|---|---|
| Carpeta de trabajo (git worktree) | `/Users/diegoguerrero/dev/dialmade-ai-quality` |
| Rama | `feat/ai-quality`, desde `main` 58252c6. **Sin push y sin merge** (decisión del usuario: preguntar antes). |
| Commits | `63ee20e` eval · `a1b00ee` biblioteca + gráficos + prompt v2 · `641480d` docs + test del runtime · `c740d47` aprobadas · `12e2841` segunda ronda + `data-highlight` + `text-giant` · `95e65eb` docs · (este traspaso) |
| Evidencia visual | `docs/design/assets/quality/` (antes/después y la galería en claro de Brisa) |
| Biblioteca | `packages/ai-render/src/library/` (`heroes`, `features`, `proof`, `conversion`, `app`, `select`, `types`) |
| Gráficos | `packages/ai-render/src/chart.ts` + `sanitize.ts`, `export.ts`, `tsx.ts`, `apps/preview/src/insert.ts` |
| Prompt | `packages/ai-render/src/prompt.ts` (`AI_RENDER_PROMPT_VERSION = "ai-render/3"`: gestos y arreglo de features/CTA, ver `diseno-con-ia-calidad.md` §3 ter) |
| Evals | `packages/ai-render/eval/` (`quality.eval.ts`, `library.gallery.eval.ts`, fixtures) |

El worktree sigue en la máquina: otra cuenta de Claude en el mismo equipo lo abre tal cual.

## 2. Decisiones y reglas (no se rediscuten)

- **Reglas del proyecto:** el layout es del usuario; solo tokens; sanitizador e isla en el origen de preview; la app
  funciona sin IA; la única IA de pago es Anthropic con presupuesto duro. Textos de UI en es/en; sin logos de marcas
  reales; estructura de componentes en `CLAUDE.md`.
- **Mobbin no se integra:** no tiene API pública y sus términos prohíben extraer capturas. Es la referencia **privada**
  de quien diseña; al repo solo entra **código propio**. No se sube nunca una captura suya.
- **Licencias revisadas (GitHub):** shadcn/ui, Launch UI, HyperUI, Tremor Blocks, Magic UI, daisyUI: MIT. Origin UI:
  AGPL-3.0 (fuera). Cruip: sin licencia (fuera). Preline: licencia propia sin confirmar (fuera). Tailwind Plus: de pago.
  Se **estudiaron** patrones; no se copió código ni assets, así que no hay atribución que mantener.
- **Los ejemplos no copian marcas:** nombres de marcas reales no aparecen en el código, ids, patrones ni HTML de la
  biblioteca (lo comprueba `library.test.ts`).
- **El copy de muestra va en dominios ajenos al software** (panadería, biblioteca, huerto, carreras, viñedo…). Con
  ejemplos de finanzas, una marca de finanzas copiaba 45–60 % de los textos (medido).
- **La semilla de selección sale de rasgos estructurados** (tipo de producto, receta, tono), nunca del texto libre de la
  marca: así el test de inyección de prompts sigue siendo invariante.
- **Aprobadas** (`approved: true`, pesan más al elegir): 5 héroes, 3 testimonios, 3 pricing.
- **Presupuesto:** el usuario puso un tope de $3 en esa conversación; se gastaron ≈ $1,82 (diagnóstico $0,70,
  después $1,10). No se tocó `DIALMADE_AI_MONTHLY_BUDGET_USD`.
- **Free tier:** Haiku 5.5. Sonnet/Opus suben el costo +50 % (las referencias añaden ≈ 12 k tokens de entrada por
  pantalla) y aportan sobre todo copy y pulido.
- **`data-chart`/`data-highlight`** se asumieron aprobados con el «Sí» del usuario; viven en su propio commit y se
  pueden revertir.

## 3. El gusto del usuario (criterio de diseño)

Aprobó lo que tiene **un gesto fuerte**: escala enorme (titulares y citas gigantes, numerales), una superficie
invertida, un número dominante, una regla gruesa. Descartó, por «planos y parecidos a otros diseños de IA genéricos»:
cajitas con borde de peso parejo, texto pequeño, cuadrículas de tres tarjetas iguales y paneles con pills.

Regla de la segunda ronda: **un gesto por bloque** y menos contenedores. Lo aprobado en la primera ronda no se tocó.
La **segunda ronda (21 bloques) aún no tiene veredicto**: pidió marcar cuáles le gustan.

## 4. Qué se midió (mismas 2 marcas: Brisa es/soft-ui y Vectora en/tech-precision)

| | Haiku | Sonnet | Opus |
|---|---|---|---|
| Costo por pantalla, antes → después | $0,0041 → $0,0044 | $0,057 → $0,086 | $0,114 → $0,181 |
| Avisos de las puertas (12 pantallas) | 19 → 3 | 21 → 4 | 23 → 0 |

Heroes con caja gris: 5/6 → 0. Gráficos vacíos: 3 → 0. Copy copiado de ejemplos: 45–60 % → 1–17 %. Haiku con la
biblioteca de la segunda ronda: $0,0041 por pantalla, 16 s, 0–4 avisos.

## 5. Cómo se trabaja

```bash
cd /Users/diegoguerrero/dev/dialmade-ai-quality
corepack pnpm install --offline
corepack pnpm --filter @dialmade/ui build:css && corepack pnpm --filter @dialmade/sections build:css   # una vez, para las evals
corepack pnpm --filter @dialmade/ai-render test                    # 343 tests
corepack pnpm -r typecheck && corepack pnpm -r lint && corepack pnpm -r test && corepack pnpm --filter web build
# galería de la biblioteca ($0): PNG por tipo y marca en claro/oscuro + report.json
DIALMADE_EVAL_OUT=/tmp/lib corepack pnpm --filter @dialmade/ai-render eval:library
# eval de calidad con la API (Haiku ≈ $0,02; los 3 modelos ≈ $0,7–1,1). Guarda las respuestas antes de renderizar.
DIALMADE_EVAL_LIVE=1 DIALMADE_EVAL_LABEL=nombre DIALMADE_EVAL_MODELS=haiku DIALMADE_EVAL_MAX_USD=0.3 \
  DIALMADE_EVAL_OUT=/tmp/q corepack pnpm --filter @dialmade/ai-render eval:quality
```

- La clave de Anthropic se lee de `apps/web/.env.local` por código y **nunca** se imprime. Ese archivo tiene
  `DIALMADE_AI_LEDGER=memory`.
- Para comparar justo se copian los `*-direction.json` del label anterior al nuevo antes de lanzar.
- Dev: app en :3700 y preview en :3701, según `docs/design/diseno-con-ia-tracks.md` («Cómo se comprueba»).
- Build de Vercel simulado (pasó): clon limpio, shim de `pnpm` en el PATH (`exec corepack pnpm "$@"`),
  `turbo run build --filter=web` y `PREVIEW_APP_ORIGIN=… turbo run build --filter=preview`.
- Otro agente termina capturas del promo en `feat/ai-render` (`apps/web/promo/**`, `PromoScene/**`): no tocar.

## 6. Trampas aprendidas

- Las puertas de contraste **cambian las clases** silenciosamente (`outline-ring` → `outline-foreground`,
  `to-transparent` → `to-foreground`): una entrada de la biblioteca debe pasar con **cero** cambios. El reporte de la
  galería (`changed`, `authoredIssues`) lo muestra.
- `outline-ring` es demasiado tenue sobre tintes y bandas de color (< 3:1): la biblioteca y el prompt usan
  `outline-foreground`, `outline-primary-foreground` u `outline-background`.
- `text-muted-foreground` sobre un tinte (`bg-primary/10`) falla AA: va `text-foreground`.
- Un tinte de escala fija (`bg-brand-50`) con texto de tema desaparece en oscuro: tintes con `bg-primary/10`.
- `-space-x-*`, márgenes negativos, `-translate-y-1/2` y `w-[…]` no existen en el vocabulario.
- `rotate-1…3`, `shadow-*`, `ring-*`, `divide-*`, `border-t-2`, `text-giant` sí.
- No hay `lock`, `shield` ni `zap` en el set de iconos (39): `check`, `arrow-*`, `bell`, `calendar`, `users`, `sparkle`…
- Un `str.replace` global en los scripts de reescritura de copy pisa otras entradas: ordenar lo específico primero.
- `vitest` en este repo no muestra `console.log`: para depurar, escribir a un archivo.

## 7. Pendientes (en orden)

1. **Veredicto del usuario sobre la segunda ronda** (features, CTA, FAQ, navbar, footer, logos, stats, KPIs, gráficos,
   tablas, actividad) y marcar `approved` lo que le guste.
2. **Footer con wordmark gigante:** es la entrada que menos convence; ver si se quiere más extremo.
   (Hecho el 2026-10-10: features en tarjetas y CTA sin fuerza, `ai-render/3`, §3 ter del informe. Queda: las dos
   marcas eligen ahora el mismo CTA; faltan más entradas de CTA con gesto fuerte.)
3. **Tercera ronda:** formularios, ajustes, calendario, estados vacíos, perfil, modal; hoy esos tipos no tienen
   referencias. Y **una referencia de Mobbin por dirección** (editorial, técnica, cálida, juguetona, lujo) que el
   usuario debe aportar; sirven de criterio, el HTML lo escribe quien trabaja en el repo.
4. **Bandas en blanco** entre secciones: vienen de los altos de celda del layout del usuario; ver si el prompt debe
   pedir que el bloque llene su celda en landing.
5. **Medir con más marcas** (≥ 6) y con un panel ciego; ruido entre ejecuciones; móvil y tablet; revisar el modo
   oscuro de toda la galería (solo se revisaron héroes y gráficos).
6. **Variedad:** una pantalla sigue pareciéndose entre marcas con la misma dirección; más variantes por tipo.
7. **Merge a `main`:** preguntar al usuario. Antes, correr otra vez `-r typecheck/lint/test`, `web build` y la
   simulación de Vercel.
8. **Línea de costo de la UI:** `estimate.ts` mide el prompt real, así que ya incluye las referencias; comprobar que
   los textos «≈ $0,013 · 1 uso de 5» siguen siendo coherentes con Haiku.
