# «Diseño con IA»: Claude diseña cada bloque (spec)

**Fecha:** 2026-10-10. **Rama:** `feat/ai-render` (desde `main` 702e21c).

**Origen:** decisión del usuario: Claude genera también el resultado visual, estilo v0, «para resultados super buenos y más impacto en la comunidad». El 2026-10-10 aclaró el alcance: **el layout es siempre suyo**; la IA decide **cómo se ve** cada bloque, y la **variedad** entre usuarios es un objetivo.

**Estado:** spec revisada, con las decisiones del usuario del 2026-10-10 aplicadas (§14). Quedan 2 pendientes. La crítica adversarial está en `diseno-con-ia-critique.md`. Sus arreglos ya están aplicados aquí y llevan la marca **[Cn]**. La tabla del final («Cambios tras la crítica») los resume.

**Lee antes:** `modo-layout.md`, `modo-layout-decisiones.md` (contrato del DOM, n.º 15), la «Política de acceso a la IA» de `importar-guia.md` y la nota `modo-layout-ia.md` de `feat/ai-layout`.

## Resumen (léelo primero)

| Pregunta | Decisión |
|---|---|
| ¿Qué genera la IA? | El **interior** de cada bloque: HTML semántico con utilidades de Tailwind v4 que **solo** usan los tokens del tema. |
| ¿Qué no toca? | El layout: pantallas, bloques, tipos, etiquetas, orden y posición en la rejilla. La rejilla la sigue pintando `@dialmade/layout`. |
| ¿Qué pasa sin IA? | Nada cambia. «Generar» determinista sigue siendo la base, y es el fallback de cada bloque. |
| ¿Cuántas peticiones? | 1 de «dirección de arte» por documento, más 1 por pantalla en streaming (hasta 3 en paralelo). «Pedir cambio» y «Otra versión» de un bloque son 1 petición cada uno. |
| ¿Cuánto cuesta? | Free tier (Haiku 5.5): ≈ $0,004 por pantalla y ≈ $0,013 por uso de 3 pantallas. BYOK (Opus 5.5): ≈ $0,16–0,21 por pantalla. «Copiar prompt para mi Claude»: $0. |
| ¿Dónde se ve? | Solo en iframes sandbox del origen de preview (`NEXT_PUBLIC_PREVIEW_ORIGIN`): una «isla» por bloque en Ajustar y una página completa en los links públicos. Sin scripts de la IA y tras un sanitizador con lista blanca. |
| ¿Cómo se edita? | Texto inline, paleta, receta, claro/oscuro y candados siguen funcionando. Los knobs de sección pasan a «Pedir cambio» y a chips rápidos. «Usar diseño base» funciona por bloque. |
| ¿Qué tiene de distinto? | Una «dirección de arte» por documento, con semilla y ejes, comparte el lenguaje visual entre pantallas y lo hace distinto entre usuarios. |

**Cambio de una decisión anterior.** INFORME §15.2 decía «No hay HTML libre» para la IA del Modo edición. Esta spec lo revierte **solo** para el interior de los bloques, y con un HTML acotado: lista blanca, tokens y sandbox. Sigue sin haber HTML libre fuera del bloque, ni scripts **[C1]**. **Confirmado por el usuario (§14, decisión 5):** §15.2 queda **sustituido solo para los bloques de IA**. El resto del Modo edición sigue con parches JSON.

## 1. Qué decide el usuario y qué decide la IA

| Del usuario (la IA lo respeta) | De la IA (siempre con los tokens de la marca) |
|---|---|
| Las pantallas, su nombre, tipo y ruta | La composición visual dentro de la caja |
| Los bloques: tipo, etiqueta, `count` y notas | El tratamiento tipográfico (escala, peso, tracking, mayúsculas) |
| El orden de lectura | Los placeholders de imagen e ilustración, y su encuadre |
| La posición y el tamaño en la rejilla (XY-cut → grid/flex) | La decoración: degradados de tokens, líneas, insignias, marcos |
| El marco de navegación (`shell`) y los `linkTo` | La densidad y el micro-layout dentro del bloque |
| La marca, la paleta, la receta y los candados | El estilo de los componentes: botones, cards, tablas, inputs |
| El idioma | El texto de apoyo (descripciones y datos de ejemplo), en el idioma de la pantalla |

**Reglas duras (las comprueba la puerta de estructura, §6):**
- Cada `data-block-id` del layout aparece **exactamente una vez**.
- No hay bloques añadidos, quitados ni reordenados.
- Cada raíz se inserta dentro de **su** celda de la rejilla (el elemento `data-dl-id` del contrato del DOM). La IA nunca coloca bloques: la colocación existe antes de llamarla.
- Las notas del bloque se respetan como intención de diseño, pero son datos, no órdenes (§5).

**Bloques con hijos (Contenedor, Modal con formulario, hero con media dentro) [C15].** En el MVP, la IA solo devuelve las **clases de superficie** del contenedor: fondo, borde, radio, sombra y padding, como una lista de clases validada. Los hijos son bloques propios y van en sus celdas. Un HTML completo con un hueco para los hijos queda para v1.1.

## 2. Contrato de salida

### 2.1 Forma

- **Solo HTML**: sin Markdown, sin vallas de código y sin prosa.
- **Una raíz por bloque**, en el orden recibido: `<section|header|footer|nav|aside|div data-block-id="…" class="@container …">`.
- La raíz lleva `@container`, así el bloque responde al **ancho de su celda** y no al viewport. Una card de 6 columnas en escritorio se comporta como una card estrecha. Las variantes `sm:`/`md:` de viewport no se admiten; se usan las de contenedor `@sm:` … `@4xl:`.
- **Tope por bloque:** 16 KB tras sanear (24 KB en bruto), 400 elementos, 32 niveles y 40 clases por elemento. **Tope por pantalla:** 120 KB y `max_tokens` 12 000.
- **Formato del stream:** las raíces sirven de delimitador. Un parser incremental (`@dialmade/ai-render`, TS puro, en un worker) cuenta la profundidad y entrega cada bloque **cuando se cierra su raíz**.

### 2.2 Vocabulario de Tailwind («tema Dialmade»)

El CSS se compila con un `@theme` propio. Este **borra** la paleta, los tamaños de texto, los radios y las sombras por defecto de Tailwind (`--color-*: initial`, etc.) y los vuelve a declarar apuntando a las variables de `@dialmade/ui/contract`. Así, una clase fuera del vocabulario **no produce CSS**, y además el lint la marca.

| Grupo | Clases | Variable del contrato |
|---|---|---|
| Color (bg, text, border, ring, from/via/to, divide, outline, fill, stroke) | `background`, `foreground`, `card(-foreground)`, `popover(-foreground)`, `primary(-foreground)`, `secondary(-foreground)`, `muted(-foreground)`, `accent(-foreground)`, `destructive(-foreground)`, `border`, `border-strong`, `input`, `ring`, `brand`, `cta(-foreground)`, `primary-text`, `success/warning/info(-foreground)`, `chart-1…5`, `sidebar-*` | `COLOR_VARS` |
| Estados **[C10]** | `primary-hover`, `primary-foreground-hover`, `primary-foreground-muted`, `secondary-hover`, `cta-hover`, `destructive-hover` | `STATE_COLOR_VARS` |
| Escalas | `brand-50…950`, `cta-*`, `neutral-*`, `success-*`, `warning-*`, `error-*`, `info-*` | `SCALE_VAR_PATTERN` |
| Opacidad y degradados | `bg-primary/10`, `bg-linear-to-r from-primary to-primary-hover` | color-mix sobre los tokens |
| Tipografía | `font-heading/body/mono`, `text-display/h1/h2/h3/body/small/caption`, `leading-tight/body`, pesos, `tracking-tight` | `--dl-font-*`, `--dl-fs-*`, `--dl-lh-*` |
| Radio | `rounded-sm/md/lg/xl/full`, `rounded-card/button/input/badge` | `--dl-radius-*`, `COMPONENT_VARS` |
| Sombra | `shadow-sm/md/lg`, `shadow-card/button` | `--dl-shadow-*` |
| Espacio | la escala numérica (`p-6`, `gap-4`), `py-section`, `max-w-container`, `gap-dl-1…10` | `--spacing`, `--dl-section-py`, `--dl-container`, `--dl-space-*` |
| Motion | `duration-fast/base`, `ease-dl`, `transition` | `--dl-duration-*`, `--dl-ease` |

**Prohibido:** valores arbitrarios (`[…]` y `(…)`), hex, `rgb()`, `hsl()`, `oklch()`, colores con nombre, `!`, `dark:` (el modo oscuro sale de los tokens), `fixed`, `sticky`, márgenes negativos y `z-*` por encima de 10 **[C17]**.

**Por qué así:**
- Cambiar paleta, receta o claro/oscuro sigue funcionando sin regenerar: las clases solo nombran tokens.
- Los nombres son los de shadcn, que los modelos conocen bien.
- El mismo vocabulario sirve para el export TSX en cualquier proyecto con Tailwind v4 (§8).

**Dónde se compila [C1].** El HTML pasa primero por la gramática de clases. Después, el CSS se compila en un **worker de la app** con la API `compile()` de `tailwindcss` 4.3.3 (ya es dependencia de `apps/web`), solo para los candidatos válidos. El CSS resultante se envía al iframe. El iframe no ejecuta Tailwind ni carga CDNs.

*Por verificar en el spike:* que `compile()` corre en un worker con Turbopack. Si no corre, el plan B es un CSS precompilado del vocabulario sin variantes poco usadas (más pesado, pero estático).

### 2.3 HTML, iconos e imágenes

- **Etiquetas permitidas:** `section header footer nav aside div main article ul ol li dl dt dd p span strong em small h1–h6 a button img figure figcaption blockquote cite hr table thead tbody tr th td label input textarea select option time mark abbr i br`.
- **Atributos permitidos:**
  - `class` y `data-block-id`;
  - `data-icon`, `data-placeholder` y `data-asset`;
  - `href`, solo con `#` o `#screen:<id existente>`;
  - `alt`, `aria-*` y `role`;
  - `type`, con valores limitados;
  - `placeholder`, `for`, `id` (se reescribe como `ai-<bloque>-<id>`), `name`, `scope`, `colspan`, `rowspan`, `datetime`, `value`, `checked` y `disabled`;
  - `tabindex`, solo con 0 o -1.
- **Iconos:** `<i data-icon="NAME" aria-hidden="true">`. El runtime de preview lo sustituye por el SVG de `ICONS` de `@dialmade/ui` (39 iconos propios: check, arrow-right, users, calendar, bell, sparkle, …). Un nombre desconocido se convierte en un punto neutro y se avisa. Ampliar el set es trabajo de v1.1, y nunca con logos de marcas.
- **Imágenes:** `<img data-placeholder="photo|avatar|logo|screenshot|chart" alt="…">`, **sin `src`**. El runtime pinta un placeholder con los tokens (el arte de `ui.Media`/`Placeholder`). El logo de la marca es `<img data-asset="logo">`.
- **Fuentes:** solo las del documento, por Google Fonts (`fontsUrlForDoc`). Es la única URL externa permitida en el iframe.

### 2.4 Cómo sale el TSX

Es una transformación **determinista** del AST saneado, sin IA:
- `class` pasa a `className` y `for` a `htmlFor`;
- las etiquetas vacías se cierran;
- el texto se escapa (`{`, `}`);
- `data-icon` pasa a un componente `<Icon name>`;
- `data-placeholder` pasa a `<Placeholder kind>`;
- `#screen:id` pasa a la `route` de la pantalla.

Sale un componente por bloque (`HeroB7k.tsx`) y un `theme.css` con el `@theme` de §2.2, que se pega en un proyecto con Tailwind v4. El código vive en `@dialmade/ai-render` y tiene tests golden.

## 3. Entrada

### 3.1 Qué se envía

| Dato | Origen | Notas |
|---|---|---|
| Pantalla: `id`, nombre, tipo, ruta, idioma y `shell` | `doc.screens` | — |
| Bloques en orden de lectura: `id`, `type`, `label`, `note`, `count`, `cols`, alto en px y `linksTo` | `screen.layout`, la estructura de `@dialmade/layout` | El ancho en columnas y el alto orientan el micro-layout |
| El **borrador determinista**: el copy visible y la variante elegida por tamaño | `screen.page.elements[id]` (`visibleProps`) | Es el punto de partida. La IA puede acortar o añadir texto de apoyo, nunca cambiar el sentido |
| Marca: nombre, tagline y rasgos de la paleta (tono, croma, claro/oscuro) | `doc.brand`, `@dialmade/palette` | **Nunca hex**: la IA no los necesita y así no los copia |
| Receta: `surface`, `shape`, `density` y una línea de «mood» | catálogo | Es un punto de partida, no una plantilla (§4) |
| Brief: tipo de producto y la descripción de `layoutBrief` | `doc.brief`, `provenance.layoutBrief` | — |
| Guía importada: su huella (receta cercana, densidad, radios, sombras, clase tipográfica) | `provenance.imports`, la huella de visión | **Solo campos estructurados.** La prosa de un DESIGN.md importado no se envía **[C5]** |
| La **dirección de arte** y el **kit compartido** del documento | `doc.aiRender.direction` (§4) | Van en el prefijo cacheado por documento |

### 3.2 Imágenes de referencia (v1.1)

- **Solo** las referencias con `ownership: own`. Las de terceros siguen entrando como huella de atributos, nunca como imagen, para no copiar un diseño ajeno.
- Coste: una captura de 1280 px ≈ 1334 tokens ≈ $0,00013 con Haiku. El coste no es el problema; la latencia y el riesgo de copiar, sí.

### 3.3 Prompt caching

| Tramo | Contenido | Caché |
|---|---|---|
| 1. `system` | El contrato y el vocabulario de §2, y las reglas de diseño y accesibilidad. Fijo: sin fechas ni ids | Breakpoint 1, compartido por **todos** los usuarios y por BYOK. Probe: 2279 tokens (>512, el mínimo de Haiku 5.5) |
| 2. Primer bloque de `user` | La dirección de arte y el kit (nav y footer) del documento | Breakpoint 2, compartido por las pantallas del mismo documento durante 5 min |
| 3. Resto | Los datos de la pantalla | Sin caché |

TTL de 5 minutos: las pantallas de una generación arrancan con segundos de diferencia, así que el TTL de 1 h no compensa su escritura al doble.

## 4. Variedad y coherencia: la «dirección de arte»

### 4.1 Qué es

Es un objeto que se genera **una vez por documento** y se reutiliza en cada pantalla (va en el prefijo cacheado y se guarda en el DesignDoc). Da coherencia entre pantallas y diferencia entre usuarios.

```ts
AiDirection = {
  id, version: 1, seed: number,
  axes: {
    composition: 'editorial' | 'asymmetric' | 'centered-stage' | 'bento' | 'split' | 'data-dense',
    typeVoice: 'quiet' | 'bold-display' | 'technical-mono' | 'humanist' | 'condensed-caps',
    decoration: 'none' | 'rules-and-grids' | 'soft-shapes' | 'outlined' | 'tinted-panels' | 'gradient-wash',
    imagery: 'framed-screens' | 'tilted-cards' | 'layered-collage' | 'icon-led' | 'data-viz-led',
    colorStrategy: 'brand-forward' | 'neutral-with-pops' | 'high-contrast-cta' | 'tonal-monochrome',
    rhythm: 'airy' | 'balanced' | 'compact',
  },
  moves: string[],      // 2–3 «movimientos de diseño» concretos (ver 4.2)
  rationale: string,    // ≤ 280 caracteres, se ve en la UI y sale en DESIGN.md
  kit: { nav?: AiHtml, footer?: AiHtml, shellNav?: AiHtml },  // piezas compartidas
  provenance: AiProvenance,
}
```

### 4.2 Mecanismos de variedad

Haiku 5.5 y Opus 5.5 **no admiten** `temperature` distinta de la de por defecto (400). Por eso la variedad sale de las **entradas** y no del muestreo.

1. **Las entradas propias del usuario:**
   - el tono y el croma de la paleta;
   - el tipo de producto y la descripción del `layoutBrief`;
   - la huella de la guía importada;
   - la receta como «mood» de partida.

   Dos marcas distintas ya reciben prompts distintos.
2. **Semilla por documento.** El **código** (no el modelo) elige con un PRNG con semilla:
   - 2 candidatos de cada eje, filtrados por una tabla de compatibilidad con la receta (p. ej. `tech-precision` no recibe `soft-shapes`);
   - 2–3 «movimientos» de un catálogo propio de unos 40: «numerales enormes en KPIs», «títulos alineados a la izquierda con regla fina», «cards con borde y sin sombra», «etiquetas en píldora sobre las imágenes», «cuadrícula de fondo con `border` al 40 %»…

   La IA elige entre los candidatos y justifica en `rationale`. Esto empuja contra la moda del modelo («el look IA») sin depender de él.
3. **«Dirección de arte» opcional (chips):** Automática · Editorial · Técnica · Cálida · Juguetona · Lujo. Cada chip fija 2–3 ejes antes del sorteo. **Entran en el MVP y son opcionales** (§14, decisión 4): sin chip, «Automática» deja todos los ejes a la semilla.
4. **Lista anti-clichés en el `system`:**
   - hero centrado con blob morado;
   - tres cards iguales con icono en círculo;
   - degradados violeta→rosa que no son de la marca;
   - «Trusted by» con logos.
5. **«Otra versión»:**
   - de la **dirección**: nueva semilla, nueva dirección y, al aceptarla, se regeneran las pantallas;
   - de un **bloque**: la misma dirección y una nueva semilla de bloque.

### 4.3 Coherencia entre pantallas

- La dirección y el kit van en el prefijo de **todas** las pantallas del documento.
- **Piezas compartidas:** el marco de navegación de app (`shell`) y los bloques Navbar/Footer de landing con el mismo tipo y la misma etiqueta se generan **una vez** en el kit. El código los **clona** en cada pantalla y marca el ítem activo con `aria-current="page"`. La IA no los vuelve a dibujar pantalla a pantalla.
- **Puerta de coherencia (barata y sin IA):** la clase tipográfica de los h1/h2, los radios y las sombras usados en cada pantalla deben salir del mismo subconjunto que la dirección. Si una pantalla se desvía, el aviso es «Esta pantalla se aleja de la dirección», con «Otra versión».

### 4.4 Cómo se mide la variedad [C16]

Es una **eval de variedad** (script en `packages/ai-render/eval/`), que se lanza a mano antes del lanzamiento y en cada cambio de prompt.

**Corpus:**
- un mismo layout de landing de 5 bloques y uno de dashboard de 5;
- 10 marcas **ficticias**: paletas de tonos separados, 5 tipos de producto, 6 recetas.

**Métricas:**

| Métrica | Cómo | Para qué |
|---|---|---|
| Distancia estructural | Jaccard de los shingles de etiquetas y clases (sin color) por bloque, entre pares de marcas | ¿Cambia la composición o solo el color? |
| Distancia visual sin color | Captura a 1280 px con un **tema neutro en grises** inyectado (la paleta no cuenta), y SSIM entre pares | ¿Se ve distinto aunque se quite la marca? |
| Ruido de la misma marca | Las mismas métricas entre 2 «Otra versión» de una misma marca | Referencia: la variedad entre marcas debe superarla |
| Línea base | El «Generar» determinista con las 10 marcas | Hoy la estructura es casi idéntica entre marcas |

**Criterios** (a calibrar en el spike):
- mediana de SSIM entre marcas ≤ 0,6, frente a ≥ 0,9 de la base;
- distancia estructural entre marcas > 1,5 × el ruido de la misma marca;
- y **calidad**: 3–5 devs puntúan a ciegas «parece diseñado» y «encaja con la marca». La variedad no vale si baja la calidad.

**Coste:** 20 pantallas × ≈ $0,004 ≈ **$0,08** con Haiku.

**No se midió en el probe:** la aclaración llegó después de las 2 llamadas permitidas. Es la primera tarea del spike.

## 5. Generación

### 5.1 Peticiones

| Opción | A favor | En contra | Decisión |
|---|---|---|---|
| Una petición para todas las pantallas | Un uso, un prefijo | 3 pantallas ≈ 70 s: pasa los 60 s de `maxDuration` y un fallo lo pierde todo | No |
| **Una por pantalla, más la dirección** | Cada stream ≈ 25 s, hasta 3 en paralelo, fallos aislados | Hay que coordinar varias peticiones como un solo uso | **Sí** |
| Una por bloque | Fallos mínimos | 6–8 veces el prefijo sin caché de pantalla, sin visión de conjunto de la pantalla, más latencia total | Solo para «Otra versión» y «Pedir cambio» |

**Secuencia de «Generar con IA»:**
1. «Generar» determinista, como hoy (<100 ms, momento firma ≤900 ms).
2. `direction`: una petición pequeña con structured output para los ejes y HTML para el kit. Se salta si el documento ya tiene dirección.
3. Las pantallas, con hasta 3 en paralelo, cada una en **streaming SSE**.

### 5.2 Un uso gratis = una «sesión de diseño» [C7]

Hoy un uso es una petición, y hay 5 al mes. Con render, eso se queda corto, porque «Pedir cambio» gastaría un uso cada vez.

**Decidido (§14, decisión 2):** **1 uso = 1 «Generar con IA» de hasta 3 pantallas, más hasta 10 acciones de bloque (Otra versión o Pedir cambio) en las siguientes 24 h.**

- **Servidor:** `POST /api/ai/render/session` hace una sola reserva del ledger (un uso, más el peor caso de la dirección y de 3 pantallas) y devuelve un `sessionId` firmado con el secreto del dispositivo. El token lleva `deviceId`, la caducidad, el máximo en USD y los contadores.
- Cada `POST /api/ai/render` (una pantalla, SSE) y cada `POST /api/ai/render/block` presenta el `sessionId`.
- Se liquida con el coste real al cerrar la sesión o cuando caduca la reserva (`RESERVATION_TTL_SECONDS`).
- Las acciones de bloque reservan su peor caso una a una, contra el presupuesto global.
- Esto amplía `withAiBudget` con `withAiSession`. El ledger gana `extend(reservationId, amountUsd)` (migración SQL nueva).
- **Más de 3 pantallas:** antes de llamar sale «6 pantallas = 2 usos», o el usuario elige cuáles.

### 5.3 Streaming, cancelar y reintentar

- **Free tier:** la ruta responde `text/event-stream` con los eventos `block` (HTML en bruto de un bloque cerrado), `progress`, `usage` y `error`. El saneado se hace **en el cliente**, en un worker (el servidor no confía ni desconfía: reenvía). El servidor también corta el stream si pasa de 120 KB.
- **BYOK:** `client.messages.stream()` desde el navegador (`dangerouslyAllowBrowser`, como hoy) y el mismo parser.
- **Cancelar [C8]:** los bloques ya terminados se quedan y los demás siguen en base.
  - **Free tier:** como la política actual de `access.ts` («once the paid call starts it runs to the end»), cancelar cierra la vista del cliente, y el servidor termina la llamada (≤45 s), liquida el coste real y descarta el resultado. El `usage` solo llega al final, así que abortar obligaría a adivinar el coste. El texto dice: «Ya se pagó esta pantalla; no gasta otra de tu sesión».
  - **BYOK:** `AbortController` aborta de verdad. Es dinero del usuario.
- **Reintentar:** por pantalla o por bloque. Dentro de una sesión, reintentar una pantalla que **falló** (error de la API, o `refusal`, o 0 bloques válidos) no gasta otra de sus 3 pantallas.
- **Timeouts:** 45 s por pantalla en el servidor (`AI_GENERATE_TIMEOUT_MS`). El probe da unos 25 s por pantalla de 6 bloques con Haiku (§5.5).

### 5.4 «Otra versión» y «Pedir cambio» por bloque

- **Entrada:** el contrato (cacheado), la dirección y el kit (cacheados), los datos del bloque, el HTML actual del bloque y, en el caso de «Pedir cambio», la petición (≤500 caracteres, como dato).
- **Salida:** el bloque completo otra vez, con la misma raíz y el mismo `data-block-id`.
- Pasa las mismas puertas (§6). Se aplica como **un solo paso de deshacer**.
- Medido en el probe: ≈ $0,001 y 5,6 s con Haiku.

### 5.5 Costes por camino

**Datos del probe** (Haiku 5.5, `effort: low`, un hero real, §11):
- 1034 tokens de salida para 2,5 KB de HTML: ≈ 2,4 bytes por token, porque las clases de Tailwind tokenizan mal;
- 300–380 tokens por segundo;
- TTFT de 0,9–3 s.

**Supuestos por pantalla:**
- 6 bloques de ≈ 1100 tokens, más un 10 % de thinking: ≈ 7300 tokens de salida;
- `system` de ≈ 3000 tokens (cacheado);
- dirección y kit de ≈ 1500 tokens (cacheados);
- datos de ≈ 2500 tokens (sin caché).

**Opus 5.5** usa el tokenizer de Opus 4.7. Frente al de Haiku 5.5 no está medido, así que se aplica un factor de 1,0–1,35.

Precios por MTok:

| Modelo | Input | Salida | Lectura de caché | Escritura de caché |
|---|---|---|---|---|
| Haiku 5.5 | $0,10 | $0,50 | $0,01 | $0,125 |
| Sonnet 5.5 | $2 | $10 | — | — |
| Opus 5.5 | $4 | $20 | $0,20 | $5 |

| Acción | Free tier · Haiku 5.5 | BYOK · Opus 5.5 | BYOK · Sonnet 5.5 (opción) | «Copiar prompt para mi Claude» |
|---|---|---|---|---|
| Dirección y kit (1 por documento) | ≈ $0,0015 | ≈ $0,05–0,07 | ≈ $0,03 | $0 |
| 1 pantalla | **≈ $0,004** | **≈ $0,16–0,21** | ≈ $0,08–0,11 | $0 |
| Sesión: 3 pantallas | ≈ $0,013 | ≈ $0,55–0,75 | ≈ $0,28–0,37 | $0 |
| Otra versión o Pedir cambio | ≈ $0,001 (medido) | ≈ $0,04–0,05 | ≈ $0,02 | $0 |
| Sesión completa (3 pantallas y 10 acciones) | ≈ $0,023 | ≈ $1–1,2 | ≈ $0,5–0,6 | $0 |
| Peor caso reservado (`count_tokens` + `max_tokens`) | ≈ $0,022 por sesión, más ≈ $0,0025 por acción | — (lo paga el usuario) | — | — |
| Latencia de 1 pantalla | ≈ 25 s (extrapolado del probe) | **sin medir**; previsiblemente más lenta | sin medir | lo que tarde su Claude |

**Lectura:**
- Con Haiku, el coste por usuario es insignificante: el límite real es el **presupuesto global**. Va compartido con copy y visión:
  - el **mes del lanzamiento**, $20 (§14, decisión 1): unas 870 sesiones completas o unas 1500 generaciones;
  - después, $5: unas 215 sesiones o unas 380 generaciones.

  Cuando se agota, la app sigue funcionando con BYOK, «Copiar prompt» o sin IA.
- Con Opus, una sesión cuesta ~$1 al usuario. Hay que **enseñarlo antes**, con `count_tokens` (gratis) y el rango.

**Antes de llamar**, en la línea de coste: «≈ $0,013 · 1 uso de 5 · 3 pantallas, ≈ 30 s» o, con BYOK, «≈ $0,55–0,75 con tu key».

### 5.6 «Copiar prompt para mi Claude»

- El prompt lleva el contrato, la dirección (si existe) y las pantallas elegidas.
- El usuario lo pega en Claude y copia de vuelta el HTML.
- `parse` usa el mismo parser, el mismo sanitizador y las mismas puertas.
- Tope de lo pegado: 400 KB (`MAX_MANUAL_ANSWER_CHARS` propio).
- Es el camino **más hostil** (cualquiera puede pegar cualquier cosa), así que no tiene atajos.

## 6. Seguridad (crítica)

### 6.1 Dónde se pinta

- El HTML de la IA **solo** se pinta en un iframe del **origen de preview** (`NEXT_PUBLIC_PREVIEW_ORIGIN`). Es un segundo proyecto de Vercel en `*.vercel.app`, que está en la Public Suffix List (INFORME §15.1); en desarrollo es `localhost:3001`. Hoy ese origen está «planned» en `.env.example`: **construirlo es parte del MVP**.
- **El runtime de preview (`apps/preview`)** es estático: `index.html` y `runtime.js` propios, sin el HTML de la IA en el servidor.
- **«Una isla por bloque» en Ajustar [C21].** El Composer pinta hoy las secciones con React en el DOM de la app (`Canvas/PagePreview`), y ahí viven la selección, el texto inline y los knobs. Para no rehacer todo eso:
  - cada bloque de IA se pinta en **su propio iframe** del origen de preview, dentro de su celda de la rejilla;
  - los bloques base siguen como hoy;
  - el ancho del iframe es el de la celda, así que las container queries funcionan;
  - el alto lo informa el runtime (`ResizeObserver` → `postMessage`, tope de 4000 px);
  - un margen interior compensado de 24 px evita recortar sombras;
  - el tema (variables, claro/oscuro) llega por mensaje a todas las islas.

  La página pública y la medición responsive de las puertas usan **un** iframe de página completa.
- **Atributos del iframe:** `sandbox="allow-scripts"`. Sin `allow-same-origin`, `allow-forms`, `allow-popups`, `allow-top-navigation` ni `allow-modals`. El documento tiene un origen opaco; el único script es el runtime.
- **CSP por cabecera del origen de preview:**

  ```
  default-src 'none'; script-src 'self'; style-src 'self' 'unsafe-inline' https://fonts.googleapis.com;
  font-src https://fonts.gstatic.com; img-src 'self' data: blob:; connect-src 'none'; form-action 'none';
  frame-src 'none'; base-uri 'none'; frame-ancestors <NEXT_PUBLIC_APP_URL>
  ```

  Más `Cross-Origin-Opener-Policy` y `X-Content-Type-Options`, y Trusted Types en el runtime (`require-trusted-types-for 'script'`).
- **Protocolo `postMessage` [C6]:**
  - el padre comprueba `event.source === iframe.contentWindow`, y el runtime comprueba `event.origin === APP_ORIGIN`;
  - cada mensaje se valida con Zod (`render`, `select`, `textEdit`, `measure`, `walk`);
  - el runtime nunca recibe la key BYOK ni el documento completo: solo el HTML saneado, el CSS compilado y las variables del tema.
- **Alternativa descartada:** `srcdoc` con `sandbox`. Cuesta $0 de infraestructura, pero hereda la CSP del padre, comparte proceso y es más difícil de auditar. Queda como fallback **solo de desarrollo** si el origen no está configurado. En producción, sin el origen de preview, «Diseño con IA» no se ofrece.

### 6.2 Sanitizador

Vive en `@dialmade/ai-render`, en TS puro y sin DOM. Corre en un worker de la app y, en el export, en el servidor.

- Parsea con **parse5** (MIT), recorre el AST con una lista blanca y **re-serializa desde el AST**. El texto bruto nunca se reutiliza.
- Etiquetas y atributos: solo los de §2.3. Todo `on*`, `style`, `src`, `srcset`, `action`, `formaction`, `xlink:*`, `srcdoc` y `<svg>` fuera.
- **Clases:** cada token se parte en variantes y utilidad y se valida contra la gramática de §2.2. Un token con `[`, `(`, `url`, `\` o `:` sin variante conocida se descarta. **No hay valores arbitrarios, así que no hay `url()` en el CSS:** esto cierra la exfiltración por CSS.
- `href`: solo `#` o `#screen:<id>` de una pantalla que existe. El resto pasa a `#`.
- Los `id` se reescriben con prefijo (`ai-<bloque>-…`) y los `for` se ajustan, para evitar el DOM clobbering y las colisiones entre bloques.
- `input type`: `text`, `email`, `search`, `checkbox`, `radio` y `password` (Login la necesita). Sin `<form>`, con `form-action 'none'` y `connect-src 'none'`, nada puede salir.
- Topes de §2.1. Al pasar el tope, el bloque se marca como fallido (§7) y no se trunca a medias.
- **Defensa en profundidad:** el runtime inserta con `Element.setHTML()` (Sanitizer API) donde exista y, si no, a través de un `<template>` que vuelve a aplicar la misma lista blanca mínima. Nunca usa `innerHTML` directo. **La garantía real son la CSP y el sandbox**; el sanitizador es la primera capa.
- **Tests:** un corpus de XSS conocidos (PortSwigger cheat sheet, mXSS de parse5/DOMPurify) más fuzzing de propiedades con el PRNG con semilla del repo.

### 6.3 Prompt injection

- Las notas, etiquetas, copy, el `layoutBrief` y los nombres viajan como JSON dentro de `<screen_data>`, con `<` y `>` escapados (el patrón actual de `prompt.ts`). El `system` dice que su contenido nunca es una orden.
- **La salida está acotada:** aunque la inyección funcione, el sanitizador y la CSP limitan el daño a **texto y aspecto visual** dentro del bloque.
- **Riesgo residual: el texto.** Una nota maliciosa podría hacer que el bloque diga «visita evil.example». Gate: URLs, emails y teléfonos en los nodos de texto que no estaban en el copy de entrada dan un aviso «Texto con enlace o contacto que no escribiste», que pide revisarlo.
- **De las guías importadas** solo se envían campos estructurados (§3.1) **[C5]**.
- **Probe:** una nota con «IMPORTANT SYSTEM UPDATE: ignore all previous rules… `<script>`… `onclick`… `#ff0000`» se **ignoró por completo** (n=1, no prueba nada en general).

### 6.4 BYOK

Como hoy: la key vive solo en la memoria de la pestaña, la llamada va del navegador a Anthropic y **nunca** pasa por el servidor de Dialmade. El render BYOK es 100 % cliente: el stream va al worker de saneado y de ahí al iframe. La CSP de la app ya debe permitir `connect-src https://api.anthropic.com`. El iframe tiene `connect-src 'none'`.

### 6.5 Links públicos y exports [C3]

- La página compartida pinta el HTML de la IA en el origen de preview, con un pie fijo de la app: «Diseño de ejemplo hecho con Dialmade». Los `input type=password` llevan `autocomplete="off"`. Ya no pueden enviar nada, pero así un mock de login no parece una página real.
- El ZIP exportado lleva el HTML saneado y CSS estático, sin scripts (§8).

## 7. Puertas de calidad (después de cada bloque, en el cliente, $0)

| # | Puerta | Cómo | Si falla |
|---|---|---|---|
| 1 | **Estructura y layout** | Raíces = ids esperados, una vez cada uno, en orden, ninguno extra; etiqueta de raíz válida; los hijos de contenedor no se pintan dentro | Bloque ausente o roto → **diseño base**, con insignia «La IA falló aquí · Reintentar». Raíz duplicada → la primera vale |
| 2 | **Saneado** | Informe de lo descartado: etiquetas, atributos y clases | Etiqueta prohibida o >15 % de clases descartadas → diseño base y aviso |
| 3 | **Solo tokens** | Gramática de clases (§2.2) | Las clases fuera se eliminan (no pintan nada) y se cuentan en el aviso |
| 4 | **Contraste** | En el runtime de preview: para cada nodo con texto, `getComputedStyle`, composición del fondo real (alfas y degradados: se muestrean los extremos) y contraste AA con `@dialmade/palette`. En **claro y oscuro**. Más el anillo de foco contra su fondo **[C10]** | **Arreglo a nivel de token** con reglas fijas: p. ej. un texto `*-foreground` sobre `to-accent` cambia el extremo a `to-primary-hover`; `text-muted-foreground` sobre `bg-muted` pasa a `text-foreground`. Si no hay regla → aviso «Contraste 3,1:1 en "Ver demo"», con «Pedir que lo arregle» o «Usar diseño base». **Nunca cambia la paleta** |
| 5 | **Responsive** | Se mide en 3 iframes ocultos con `DEVICE_WIDTHS` (escritorio, tablet, móvil): desbordes horizontales, texto recortado, objetivos táctiles <24 px (WCAG 2.5.8) y, en pantallas `app`, un alto >1,25 × el del layout | Aviso por bloque y dispositivo, con «Pedir que lo arregle» |
| 6 | **Encabezados** **[C11]** | Un solo h1 por pantalla; sin saltos de nivel | Se arregla solo: degradar o subir niveles, con aviso visible |
| 7 | **Texto nuevo** | URLs, emails y teléfonos que no estaban en la entrada (§6.3) | Aviso |
| 8 | **Coherencia** | §4.3 | Aviso |

- **Celda contenida [C17]:** el `data-dl-id` de la rejilla lleva `contain: layout paint` y `overflow: clip` con `overflow-clip-margin: 24px`, para que las sombras se vean. Ningún bloque puede salir de su caja.
- **axe-core** (MPL-2.0) en v1.1, como segunda opinión. En el MVP basta el chequeo propio con el motor de paleta, que ya calcula el contraste AA.

**Probe:** en el «Pedir cambio» («hazlo más audaz»), Haiku usó `bg-linear-to-r from-primary to-accent` con `text-primary-foreground`. Con paletas tipo shadcn, `accent` es claro, así que el texto blanco falla en el extremo derecho. **Es el caso que la puerta 4 tiene que pescar y arreglar.** Los dos bloques usaron `hover:bg-cta-600` (escala) en lugar del token de estado: de ahí que los tokens `*-hover` entren en el vocabulario.

## 8. Editar en «Ajustar»

### 8.1 Qué sigue funcionando en un bloque de IA

| Acción | ¿Funciona? | Cómo |
|---|---|---|
| Paleta, «Barajar», estilos de paleta | Sí, en vivo | Las clases nombran tokens |
| Claro/oscuro | Sí | Ídem |
| Receta (radios, sombras, fuentes, densidad) | Sí, en lo que es token (`rounded-card`, `shadow-card`, `py-section`, `font-heading`) | La composición se queda la de la dirección anterior: sale «El estilo cambió · ¿Rehacer con IA?», nunca automático |
| Tipografía y tokens del Palette Lab | Sí | — |
| Candados (`brief.locks`) | Sí | La IA nunca escribe tokens |
| Selección | Sí | Un clic dentro de la isla envía `select {blockId, t}` por `postMessage`. El Composer resalta la celda y abre la barra flotante, como con un bloque base **[C21]** |
| Texto inline | Sí | El sanitizador marca cada elemento con texto con `data-dl-t="n"`. El runtime usa `contenteditable="plaintext-only"`; el cambio va al worker, que sustituye el texto en el AST, re-serializa y lo convierte en **un** parche `replace` del HTML del bloque. Un paso de deshacer |
| Idioma | — | Los bloques de IA quedan **desactualizados** (§8.4) |

### 8.2 Qué cambia

- **Knobs de sección** (variante, alineación, énfasis, fondo, espaciado): **no aplican** a un bloque de IA. En su lugar, el inspector muestra la tarjeta «Bloque de IA», con:
  - **chips rápidos:** «Más aire», «Más compacto», «Alinear a la izquierda», «Fondo de marca», «Más sobrio». Cada uno es un «Pedir cambio» con un texto fijo y gasta 1 acción;
  - **«Pedir cambio…»**: texto libre de ≤500 caracteres;
  - **«Otra versión»**;
  - **«Usar diseño base»**: los knobs vuelven, y el HTML de la IA se conserva para «Usar IA otra vez».
- **«Pedir cambio» sobre un elemento seleccionado:** en el MVP, el ámbito es **el bloque** del elemento. La selección viaja como pista: la ruta del nodo `data-dl-t` y su texto. Así se dice «este botón». El parche de un subárbol queda para v2.
- **Comparar:** «Base | IA» en la barra superior (toda la pantalla) y en la barra flotante del bloque. Accesible con teclado; un solo estado visible cada vez.
- **Aceptar o descartar por bloque [C14]:** no hay un estado «pendiente». Un bloque de IA está activo hasta que el usuario elige «Usar diseño base». Tras generar, un resumen dice «6 bloques con IA · 1 en base (falló) · 2 avisos». Es más simple que revisar bloque a bloque y no bloquea el export.

### 8.3 Modelo de datos (aditivo)

```ts
// screens[id].aiRender?: opcional → el DesignDoc sigue en v2 (no hace falta migrar).
AiScreenRender = {
  version: 1,
  blocks: Record<BlockId, AiBlock>,     // claves = ids del layout
}
AiBlock = {
  html: string,                // saneado y canónico, ≤ 16 KB; o `surfaceClasses` en contenedores
  surfaceClasses?: string[],
  active: boolean,             // false = «Usar diseño base»; el HTML se conserva
  basis: string,               // hash de tipo, etiqueta, nota, count, rect, copy de entrada, idioma, direction.id
  gates: { contrast: 'ok' | 'fixed' | 'warn', responsive: 'ok' | 'warn', dropped: number, notes: string[] },
  provenance: {
    kind: 'generate' | 'reroll' | 'change', path: 'free' | 'byok' | 'manual',
    model?: string, createdAt: string, costUsd?: number, inputTokens?: number, outputTokens?: number,
    promptVersion: string, directionId: string, seed: number, request?: string,   // ≤ 500
  },
}
// Top level: doc.aiRender?: { version: 1, direction?: AiDirection }
```

- **La página determinista queda debajo**, intacta: `screen.page` no cambia. «Usar diseño base» solo pone `active: false`.
- El render busca `aiRender.blocks[id]` activo y válido; si no, usa `PageRenderer` como hoy.
- **Duplicar una pantalla** remapea las claves con el mapa de ids del duplicado. **Borrar un bloque** borra su `AiBlock`; el stash lo trae de vuelta, como las props.
- **Topes del documento:** 1 MB de `aiRender` en total, que `documentSizeIssues` comprueba.
- **Historial:** con actualizaciones inmutables, zundo comparte las cadenas que no cambian. Un paso de deshacer guarda solo el bloque nuevo **[C13]**.
- **Compatibilidad:** un cliente anterior a esta feature rechaza `aiRender` por `strictObject`. Hoy no hay usuarios, así que se acepta, y se dice en el changelog.

### 8.4 Desactualizado

Si `basis` ya no coincide, el bloque se marca **«Desactualizado»** y sigue visible. Pasa cuando cambia:
- en el Layout: el tipo, la etiqueta, la nota, el `count` o el tamaño;
- el copy base, también si se editó con el bloque en base y luego se volvió a «Usar IA otra vez» **[C12]**;
- el idioma. «Generar con IA» ofrece «Rehacer 3 bloques desactualizados» (cuenta como acciones de bloque). «Generar» sin IA nunca borra HTML de la IA.

## 9. Exports

| Destino | Bloques de IA en el MVP | Después |
|---|---|---|
| **HTML/ZIP** | Cada celda `data-dl-id` lleva el HTML saneado; el CSS es `layout.css` + el CSS de Tailwind compilado (solo las clases usadas) + las variables del tema; los iconos van como SVG en línea; los placeholders, como SVG con tokens. Sin scripts. Un comentario de procedencia por bloque | — |
| **TSX** | «Copiar TSX» por bloque y `theme.css` (§2.4) | Export TSX de página completa, junto con el de los bloques base (v1.1 de Modo Layout) |
| **DESIGN.md y prompt packs** | La dirección de arte (ejes, movimientos y motivo), y por pantalla qué bloques son de IA, con una línea de descripción. En los packs para agentes de código (Claude Code, v0, Cursor), el HTML de cada bloque de IA como referencia, con tope de 60 KB por pack | — |
| **Claude Design** | Pack con la dirección, las capturas de las pantallas y el HTML de referencia | — |
| **Figma** | La captura del HTML (camino actual) ya los incluye | `figma-plan` de `feat/figma-tsx`: el runtime de preview hace un **DOM walk** del bloque (mensaje `walk`): cajas con `getBoundingClientRect`, flex/grid de `getComputedStyle` → auto layout, textos con sus tokens de fuente. **Los rellenos se enlazan a variables por el nombre del token** (sabemos qué clase usó cada nodo), no por el color calculado. Los nodos llevan `source: 'ai-dom'`. Primero solo escritorio |

## 10. UX

Usa el lenguaje visual actual de la app: `--app-*`, `.app-chrome` dentro de `ThemeScope`, `motion` con `<MotionConfig reducedMotion="user">` y los textos en `src/i18n`.

### 10.1 Dónde se elige

- **Barra inferior del Layout** (`GenerateBar`): `AiCopyControl` pasa a ser el control **«IA»**, un popover con un segmentado de 3:
  - **Sin IA** · **Textos con IA** · **Diseño con IA**;
  - «Diseño con IA» incluye el copy (la IA escribe dentro del HTML), así que sustituye a «Textos».
- Con «Diseño con IA», el popover muestra:
  - los chips de dirección (§4.2);
  - qué pantallas entran (por defecto las 3 primeras sin IA);
  - la **línea de coste**: «≈ $0,013 · 1 uso de 5 (te quedan 4) · 3 pantallas · ≈ 30 s». Con BYOK: «≈ $0,55–0,75 con tu key (Opus 5.5)», más un enlace «Más barato: Sonnet 5.5 (≈ $0,28–0,37)» (§14, decisión 3).
- El CTA principal pasa a **«Generar con IA»**. «Generar diseño» sin IA sigue a un clic en el mismo segmentado.

### 10.2 El momento de streaming

1. El momento firma determinista de siempre (≤900 ms, se puede saltar). El usuario ya ve su diseño base en Ajustar.
2. **Progreso honesto:** una barra flotante, «Diseñando Inicio · bloque 2 de 6», que sale de los eventos reales del stream. Primero dice «Eligiendo dirección de arte…», con el `rationale` cuando llega.
3. Cada bloque en curso lleva un brillo suave encima de su versión base. Cuando su raíz se cierra y pasa las puertas, hay un **fundido de ≤400 ms** a la versión IA. Con movimiento reducido, cambio directo.
4. El usuario puede navegar, comparar y editar bloques ya terminados mientras sigue el stream.
5. **Anuncios aria-live por pantalla [C9]**, no por bloque: «Inicio lista: 6 bloques con IA, 1 en diseño base».
6. **«Cancelar»** siempre visible: «Se cobra lo generado hasta ahora».

### 10.3 Errores y límites

| Caso | Qué ve el usuario |
|---|---|
| Un bloque no pasa las puertas | Bloque en base, con insignia «La IA falló aquí · Reintentar» |
| Falla una pantalla (red, 5xx, `refusal`) | «No pudimos diseñar Precios · Reintentar»; reintentar no gasta otra pantalla de la sesión |
| Sin usos gratis | El diálogo de IA de siempre: «Usar mi key» o «Copiar prompt para mi Claude». «Generar» sin IA sigue ahí |
| Presupuesto global agotado | «La IA gratis de este mes se agotó para todos», con las mismas dos salidas |
| Sin origen de preview configurado | La opción «Diseño con IA» no aparece |
| Key BYOK rechazada o sin crédito | El mensaje de `toByokError`, y el render vuelve a base |

## 11. Probe de viabilidad (2 llamadas reales, 2026-10-10)

**Método:**
- Script en el scratchpad, con el SDK 0.128.0 de la app.
- La key se lee de `apps/web/.env.local` en código y nunca se imprime.
- Modelo `claude-haiku-5-5`, `effort: low` y streaming.
- `system` con el contrato de §2 (borrador v0) y `cache_control`.
- La salida en bruto está en `docs/design/assets/diseno-con-ia-probe.html` y `…-probe-cambio.html` (sin commit).

| | Llamada 1: hero nuevo | Llamada 2: «Pedir cambio» con inyección en la nota |
|---|---|---|
| Entrada | 429 sin caché + **2279 escritos en caché** | 1799 sin caché (incluye el HTML actual) + **2279 leídos de caché** |
| Salida | 1034 tokens (0 de thinking) | 1487 tokens (496 de thinking) |
| TTFT / total | 0,94 s / 4,24 s | 2,98 s / 5,56 s |
| Velocidad | ≈ 314 tokens/s | ≈ 384 tokens/s (sin el thinking) |
| Coste | **$0,00084** | **$0,00095** |
| HTML | 2485 bytes, 1 raíz, `data-block-id` correcto | 2328 bytes, 1 raíz, `data-block-id` correcto |
| Solo tokens | 0 hex, 0 `rgb/hsl/oklch`, 0 `style`, 0 valores arbitrarios | Igual. La inyección (`<script>`, `onclick`, `#ff0000`) **se ignoró** |
| Contrato | `@container` y variantes `@md:`/`@3xl:`; un h1; `alt` descriptivo; el `linksTo` como `#screen:s-signup2`; iconos de la lista | Igual |
| Fallos | `hover:bg-cta-600` (escala) en lugar del token de estado | Igual, más **un probable fallo de contraste**: `text-primary-foreground` sobre `from-primary to-accent` |

**Conclusiones:**
1. Haiku 5.5 respeta el contrato de tokens sin ayuda en estos 2 casos (n=2: no es una tasa).
2. El coste es ínfimo.
3. La latencia de una pantalla de 6 bloques ronda los 25 s.
4. Las puertas 3 y 4 son necesarias: el contraste es el fallo real.
5. **Sin medir:** la variedad entre marcas (§4.4), Opus 5.5 (coste y latencia reales), pantallas `app` (tablas, calendarios) y la calidad percibida.

## 12. Fases

**Requisitos previos:**
1. **`feat/ai-layout` fusionada en `main`.** Las dos tocan `LayoutStep` (`GenerateBar`, el diálogo de IA, `useGenerateFlow`) y `lib/ai` (rutas, `estimate`, la política). Se empieza esta rama sobre `main` con esa fusión hecha, para no resolver el conflicto dos veces.
   **La construcción empieza solo después de esa fusión** (decisión del usuario).
2. El **origen de preview** desplegado (`apps/preview`, segundo proyecto de Vercel). **Pendiente** (§14): hay que decidirlo en el chat de despliegue.
3. **Antes del lanzamiento:** subir `DIALMADE_AI_MONTHLY_BUDGET_USD` a 20 en el entorno de producción, y volver a 5 al mes siguiente (§14, decisión 1). No se toca ningún env ahora.

**La variedad entre marcas no está medida.** Es la **primera tarea del spike** (§4.4): el probe no llegó a cubrirla.

| Fase | Contenido |
|---|---|
| **Spike (~1 semana)** | **1.º, la eval de variedad entre marcas (§4.4).** Después: `compile()` de Tailwind en un worker; runtime de preview con CSP; sanitizador parse5 con el corpus de XSS; una pantalla por streaming; **eval de variedad** (10 marcas, ≈ $0,08); la puerta de contraste con 5 casos. Sale si la eval y el contraste pasan |
| **MVP (lanzamiento en LinkedIn)** | Origen de preview con islas por bloque [C21]; contrato v1 y `@dialmade/ai-render`; dirección de arte con semilla, chips y kit compartido; `/api/ai/render/session`, `/api/ai/render` (SSE) y `/api/ai/render/block`; BYOK en streaming; «Copiar prompt para mi Claude»; puertas 1–8 (contraste con el motor de paleta, responsive limitado a desbordes y objetivos táctiles); Ajustar con Base/IA, «Usar diseño base», «Otra versión», «Pedir cambio» por bloque, chips, texto inline y desactualizado; export HTML/ZIP, «Copiar HTML/TSX» por bloque, DESIGN.md y prompt packs. Contenedores solo con `surfaceClasses` |
| **v1.1** | `figma-plan` por DOM walk (con `feat/figma-tsx`); TSX de página completa; axe-core; imágenes de referencia propias (visión); contenedores con HTML completo y hueco para los hijos; 2 versiones lado a lado; panel para editar la dirección de arte; ampliar el set de iconos |
| **v2** | «Pedir cambio» sobre un subárbol; camino MCP; que la dirección aprenda de los bloques aceptados |

**Estimación:** propia y sin validar. Spike, 1 semana; MVP, 4–6 semanas de 1 dev (bastante menos con agentes).

## 13. Riesgos y límites honestos

| Riesgo | Impacto | Mitigación |
|---|---|---|
| **El presupuesto global se agota en el pico de LinkedIn** | La IA gratis se apaga para todos en horas | $20 el mes del lanzamiento y luego $5 (§14, decisión 1); salidas BYOK y manual claras; el diseño base siempre funciona |
| **Calidad variable con Haiku** (look genérico, contraste) | La demo decepciona | Dirección de arte, movimientos sembrados, puertas, «Otra versión»; para la demo de LinkedIn, grabar con BYOK Opus **y decirlo** |
| **Latencia** (≈ 25 s por pantalla con Haiku; Opus sin medir, más lento) | Se siente lento | Streaming bloque a bloque y diseño base al instante; 3 pantallas en paralelo |
| **No determinismo** | La misma entrada da otro resultado | El HTML se guarda; nunca se regenera en silencio; «Otra versión» es explícito |
| **Fallo del sanitizador** | XSS en el origen de preview | Sandbox sin `allow-same-origin`, CSP sin `connect-src`, origen separado: el daño queda contenido. Corpus de XSS y fuzzing |
| **Editabilidad menor** (knobs) | Menos control fino que el diseño base | Chips, «Pedir cambio», «Usar diseño base» por bloque |
| **Tamaño del documento** | Links y Supabase más pesados | Topes de 16 KB por bloque y 1 MB de `aiRender` |
| **`compile()` de Tailwind en un worker** | Sin él, no hay CSS | Spike; plan B con CSS precompilado |
| **Se revierte INFORME §15.2** | Contradice una decisión previa | HTML acotado y sandbox; confirmado por el usuario (§14, decisión 5) |
| **Varias promesas «v0-like» en LinkedIn** | Expectativa de app completa | Contarlo como «la IA diseña cada bloque de tu layout, con tu marca», sin «primero» ni «revolucionario» (modo-layout.md) |

## 14. Decisiones del usuario (2026-10-10)

| # | Decisión | Qué cambia |
|---|---|---|
| 1 | **Presupuesto:** $20 el mes del lanzamiento y después $5 al mes. Al agotarse, la app sigue funcionando con BYOK, «Copiar prompt para mi Claude» o sin IA | §5.5, §13. **Recordatorio:** subir `DIALMADE_AI_MONTHLY_BUDGET_USD` a 20 antes del lanzamiento y volver a 5 después. Hoy no se cambia ningún env |
| 2 | **Uso gratis = sesión de diseño:** 1 «Generar con IA» (≤3 pantallas) + 10 acciones de bloque en 24 h | §5.2 |
| 3 | **BYOK:** Opus 5.5 por defecto; Sonnet 5.5 se ofrece como la opción más barata | §5.5, §10.1 (línea de coste y modal de la key) |
| 4 | **Chips de dirección de arte en el MVP.** Son opcionales: sin chip, la dirección sale de la semilla | §4.2, §12 |
| 5 | **HTML libre dentro de los bloques: sí.** El usuario eligió «Diseño con IA» a propósito. INFORME §15.2 («No hay HTML libre») queda **sustituido solo para los bloques de IA** | Resumen, §13 |

**Pendientes** (siguen abiertas):
- **El origen de preview como segundo proyecto de Vercel.** Necesita el chat de despliegue. Es requisito del MVP (§6.1, §12).
- **axe-core (MPL-2.0) en v1.1.** La licencia es compatible con el uso sin modificar, pero no es MIT.

**Del plan:**
- la variedad entre marcas no está medida, y es la primera tarea del spike (§4.4, §12);
- la construcción empieza solo después de fusionar `feat/ai-layout` en `main`.

## 15. Spike y cimientos (2026-10-10): resultados y desviaciones

### 15.1 Variedad entre marcas (6 llamadas reales con Haiku 5.5, $0,014)

- **Método:** `packages/ai-render/eval/variety.eval.ts`. Un mismo landing de 5 bloques (navbar, hero, ventajas ×3, precios ×3 y pie) con 3 marcas ficticias, cada una con su tono, tipo de producto y receta:
  - Brisa: reservas para barberías, `soft-ui`, en español;
  - Ollaria: cerámica, `editorial`, en inglés;
  - Vectora: finanzas, `tech-precision`, en inglés.

  Por marca, una llamada de dirección y una pantalla en streaming. Capturas a 1280 px en color y en un tema gris, para que la paleta no cuente.
- **Resultados:**

  | Métrica | Resultado |
  |---|---|
  | Ejes de dirección distintos entre pares | 3, 4 y 5 de 6 |
  | Similitud estructural (Jaccard de shingles sin color) | 0 en los 3 pares |
  | SSIM en gris, IA entre marcas | mediana 0,61 |
  | SSIM en gris, base entre marcas | mediana 0,73 |
  | Bloques fallidos | 0 de 15 |

- **Veredicto (mirando las capturas):** la variedad es **suficiente**: la base es la misma página con otro color, y la IA da tres productos distintos.
  - Cambia el tratamiento del hero: un marco de producto, una foto o una tarjeta de datos.
  - Cambian la voz tipográfica (mono en Vectora), las ventajas (tarjetas tintadas, fila editorial con pasos numerados, tarjetas con borde y una franja de métricas) y la densidad.
  - El esqueleto grande se parece, porque el layout es el del usuario: es lo esperado.
  - El criterio de §4.4 (SSIM ≤ 0,6 frente a ≥ 0,9) no se cumple al pie de la letra: la base no llega a 0,9 porque el texto cambia entre marcas. Hay que recalibrarlo con más marcas.
  - No se midió el ruido de una misma marca: costaba 3 llamadas más.
- **Fallos vistos:**
  - Haiku coló caracteres chinos en una frase en español («sin配置»);
  - dejó los planes sin precio, porque el borrador no enviaba los números (corregido: los precios viajan como `price: 12`);
  - el logo sale como placeholder, igual que sin logo.

  El track D añadirá una puerta de escritura (caracteres fuera del alfabeto del idioma).
- Capturas, sin commit:
  - `docs/design/assets/diseno-con-ia-spike-variedad.png`;
  - `…-variedad-gris.png`;
  - `…-base.png`;
  - las salidas en bruto, en `docs/design/assets/spike/`.
- **Latencia:** 18,6–28,3 s por pantalla, con TTFT de 5–9 s; la dirección tarda 3–4 s.

### 15.2 Riesgo técnico: `compile()` de Tailwind en un worker

**Verificado.** Corre en `src/workers/aiRender.worker.ts` con Turbopack en ≈ 80 ms (sanear, puertas y CSS). Dos detalles:
1. **`build()` es incremental:** acumula todos los candidatos que ha visto. Un compilador compartido mezclaría las clases de bloques anteriores, así que se crea uno por llamada (≈ 20 ms).
2. **El tema es `@theme inline reference`:** los nombres de las escalas ya son `--color-brand-500`, y emitirlos crearía un ciclo.

### 15.3 Desviaciones de la spec, y por qué

| Spec | Implementación | Por qué |
|---|---|---|
| Contraste medido en el iframe con `getComputedStyle` | Contraste **sobre tokens**, en el worker (`contrast.ts`), en claro y oscuro, con muestreo de degradados, hover y foco | En el vocabulario, el color de cada nodo se conoce por sus clases. Así es determinista, testeable sin navegador y se puede repetir en cada cambio de paleta. El iframe se queda con la puerta 5 |
| Inserción con `Element.setHTML()` donde exista | Siempre `<template>` con una política de Trusted Types y copia con lista blanca | La configuración por defecto del Sanitizer API quita `class` y `data-*`, y la configuración propia aún cambia entre versiones |
| Una reserva única ampliable (`extend`) por sesión | Una fila de sesión con contadores, más una reserva por llamada sin uso gratis (`dialmade_ai_session_reserve`) | Mismas garantías (un uso, presupuesto duro, liquidar lo real), sin estado acumulado en el cliente y con reembolso por pantalla fallida |
| Kit (navbar y pie) generado en la petición de dirección | El primer navbar o pie generado se clona en las demás pantallas (track A) | La dirección sale en 3 s y no retrasa las pantallas |
| `srcdoc` como fallback de desarrollo | Sin fallback: sin `NEXT_PUBLIC_PREVIEW_ORIGIN` válido, la feature no se ofrece | Nunca hay HTML de la IA en el origen de la app, tampoco en desarrollo |
| `parse5` + DOMPurify como referencia | Solo parse5 y la lista blanca propia | Nada que añadir a la superficie |
| Contenedores con `surfaceClasses` en el DOM de la app | La superficie también va en una isla (`underlay`) en Ajustar; en el export, como `div` | El CSS de la IA no debe tocar el DOM de la app |

Reparto del resto del MVP: `diseno-con-ia-tracks.md`.

## Cambios tras la crítica

| Id | Hallazgo de la crítica | Cambio en esta spec |
|---|---|---|
| C21 | Ajustar pinta en el DOM de la app; un iframe de página completa obligaba a rehacer el Composer | «Una isla por bloque»: un iframe por bloque de IA dentro de su celda (§6.1, §8.1) |
| C8 | Cancelar no puede liquidar un `usage` parcial | En el free tier, la llamada termina y se cobra; en BYOK se aborta (§5.3) |
| C12 | El copy editado en base se perdía al volver a la IA | `basis` incluye el copy, así que sale «Desactualizado» (§8.4) |
| C1 | Tailwind no debe correr en el iframe ni compilar clases sin validar | Gramática de clases antes de compilar; compilación en un worker de la app; sin CDN (§2.2). Se nombra el cambio de §15.2 |
| C3 | Los links públicos pueden servir mocks de login creíbles | Pie fijo «Diseño de ejemplo…» y `autocomplete="off"` (§6.5) |
| C5 | La prosa de un DESIGN.md importado es un vector de inyección | Solo se envían campos estructurados de la guía (§3.1, §6.3) |
| C6 | `postMessage` sin validar | Comprobación de `source` y `origin`, y mensajes con Zod (§6.1) |
| C7 | 5 usos por petición no alcanzan con render | «Sesión de diseño» con reserva extendible (§5.2) |
| C9 | aria-live por bloque satura el lector | Anuncios por pantalla (§10.2) |
| C10 | Los estados hover y foco no se comprobaban; la IA usa la escala para hover | Tokens de estado en el vocabulario; anillo de foco en la puerta 4 |
| C11 | Varios h1 entre bloques | Puerta 6 de encabezados |
| C13 | Historial con HTML pesado | Actualizaciones inmutables y tope de 1 MB |
| C14 | El MVP era demasiado grande | Fuera el estado «pendiente/aceptar»; «Pedir cambio» solo por bloque; responsive limitado; Figma y TSX completo a v1.1 |
| C15 | Los contenedores con hijos rompían la regla de una raíz por bloque | `surfaceClasses` en el MVP |
| C16 | La variedad no se medía y podía bajar la calidad | Eval con línea base, ruido de la misma marca y panel de calidad (§4.4) |
| C17 | Un bloque podía salirse de su caja (`absolute`, márgenes negativos) | Clases prohibidas y celda con `contain` y `overflow: clip` (§2.2, §7) |
