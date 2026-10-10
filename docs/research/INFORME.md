# Informe final: app de diseño para devs

**Fecha:** 2026-10-09
**Nombre de trabajo:** «Dialed». Lo propuso el juez y es provisional: no he comprobado si el dominio está libre.

## Cómo se hizo

Trabajaron 24 agentes en tres pasos:

1. **Investigación:** 11 agentes. 3 leyeron los repos y 8 investigaron en la web.
2. **Verificación adversarial:** 8 agentes revisaron 110 afirmaciones de la investigación contra fuentes primarias.
   - 65 confirmadas
   - 36 parcialmente ciertas (corregidas)
   - 7 sin poder verificar
   - 2 refutadas
3. **Diseño de la arquitectura:** 3 propuestas, un juez y un crítico de completitud.

**Regla de lectura:** cuando la verificación contradice a la investigación, este documento sigue a la verificación. Lo que no pude confirmar va marcado como *(no verificado)*.

| Si quieres… | Lee |
|---|---|
| Decidir rápido | §1 y §12 |
| Empezar a construir | §4, §10 y §13 |
| Ver el detalle completo | `round2-synthesis.md` (juez), `round2-critique.md` (correcciones ya aplicadas aquí), `round1-digest.md`, `round1-raw.json` y `round2-raw.json` |

---

## 1. TL;DR

1. **La app es viable y hay un hueco de mercado, pero no está en generar pantallas.** Generar pantallas ya es commodity:
   - Claude Design está en el plan Free desde el 8-oct-2026.
   - Google Stitch es gratis.
   - Figma Make viene incluido en el seat Full.
   - v0 y Lovable generan UI como subproducto.

   Lo que nadie resuelve de punta a punta es **el paso previo**. Ese paso es componer la *dirección de diseño* (logo → paleta, estilo, tipografía y referencias) y llevarla a cualquier herramienta. Ahí está el producto.
2. **Arquitectura ganadora: una web propia.**
   - Stack: Next.js + Motion + dnd-kit.
   - Preview: en un iframe aislado.
   - Fuente de verdad: un único formato canónico, el **DesignDoc**. Contiene tokens DTCG y un árbol de secciones de un catálogo cerrado.
   - Salidas: de él se compilan Figma, Claude Design, Framer, código y el link compartible.

   **La app tiene que deslumbrar sin IA.**
3. **Sí se puede usar la IA del usuario, por 3 vías legítimas:**
   - **BYOK:** el usuario pone su propia API key. Desde el 7-oct-2026, los planes Max y Team incluyen créditos API mensuales.
   - **Plugin o skill** para su Claude Code o su claude.ai.
   - **MCP remoto** primero, y después una MCP App con la UI dentro de Claude.

   **Lo que no se puede:** ofrecer «Sign in with Claude» ni usar su suscripción Pro/Max mediante OAuth.
4. **Compatibilidad con cada destino:**
   - **Figma:** sí. Se importan las variables con DTCG, se captura la preview, y el MCP oficial de Figma trabaja a través del Claude del usuario. El plugin propio llega en la v2.
   - **Claude Design:** no tiene API. Se alimenta con archivos que el Claude del usuario sube.
   - **Framer:** mediante sus *external agents* (`/framer` en Claude Code), code components y, en la v2, la Server API.
5. **Los dos repos y el plazo:**
   - `ui-ux-pro-max` sirve como **catálogo semilla**, no como motor: tiene bugs, la búsqueda solo funciona en inglés, sus paletas tiran a azul y **no extrae la paleta de un logo**.
   - `i-have-adhd` aporta reglas de UX, el «modo enfoque» del asistente y un harness de evals.
   - **MVP:** 12 semanas con el alcance recortado. Con el alcance completo serían de 16 a 18.

---

## 2. Posicionamiento

**Qué es:** el compositor de dirección de diseño. Convierte tu workflow actual en una mesa de mezclas visual:

```
logo → paleta → referencias → IA
```

Arrastras cartas y la preview responde al instante. El resultado es un **Direction Pack** portable y un diseño base: una landing de catálogo con tus tokens exactos. Tu diseñador lo abre, lo inspecciona y se lo lleva a Figma.

**Qué NO es:**
- No es un generador de pantallas libre. No compite con Stitch, Claude Design, Figma Make, v0 ni Lovable.
- No sustituye a Figma: le entrega a Figma.
- No es una galería de referencias ni un clon de Mobbin.
- No es un site builder ni un editor de animación.

**Por qué no competir generando pantallas:**
1. **Es gratis en otros sitios.** Además, pagaríamos la inferencia contra laboratorios que la subvencionan.
2. **El problema real de los devs no es generar.** Es que todo sale con «cara de IA»: azul `#2563EB`, fondo crema, serif display y pills. El valor está en **la entrada**:
   - el color, fijado desde la marca;
   - el gusto, curado;
   - las referencias, usadas como atributos y no como plantillas.
3. **La neutralidad es una ventaja.** Cada plataforma empuja su propio contenedor: DESIGN.md en Stitch, Design System en Claude Design, Make kits en Figma. Quien compile hacia todos a la vez es «Suiza».

**Riesgo de commoditización: alto.** Un power user ya puede encadenar Claude + Mobbin MCP + Figma MCP + la skill `ui-ux-pro-max`. Tu foso es otro:
- la UX de componer (arrastrar, preview en vivo, motion);
- las recetas curadas;
- los compiladores deterministas;
- la neutralidad.

---

## 3. Tu workflow dentro de la app

### Dónde vive cada paso de tu workflow

| Tu paso actual | En la app |
|---|---|
| Sacar la paleta del logo | **Paso 1.** Determinista, en el navegador, ~1 s |
| Buscar muchas referencias en Mobbin | **Paso 3b.** Tu Claude busca en Mobbin con *su* conector oficial, usando las consultas que la app genera a partir de tu brief. En la app solo pegas capturas propias o con licencia compatible. Un link de mobbin.com se guarda como tarjeta sin imagen y sin análisis con IA (ver §8) |
| Pedirle a la IA el resultado | **Paso 4.** Con tu key (BYOK) o con tu Claude, vía plugin o pack |
| Pasárselo al diseñador | **Paso 6.** Link, Figma, Claude Design, Framer o código |

### Los pasos, uno a uno

| # | Paso | Qué ocurre | Drag y motion | Tiempo |
|---|---|---|---|---|
| 0 | Entrada | Un solo CTA: «Suelta tu logo» (SVG, PNG, JPG o WebP). Como opciones secundarias: «Pegar URL del sitio» y «No tengo logo». Sesión anónima, reclamable después con magic link | El fondo está quieto | 0 s |
| 1 | Logo → paleta | En un Web Worker, en OKLCH (ver detalle debajo) | **Momento firma:** el logo se rompe en 5–6 swatches que vuelan en arco al slot Paleta, y el fondo transiciona a la marca | ~1 s |
| 2 | Producto (opcional) | Una línea, p. ej. «reservas para yoga». Con key, Haiku la clasifica en el enum de 192 tipos de uupm. Sin key, eliges uno de 12 chips. El mazo se reordena y aparecen avisos «Do Not Use For» | Las cartas se reordenan con FLIP y stagger de 30 ms | 2–5 s |
| 3a | Estilo | Mazo con un máximo de 5 cartas visibles por categoría: estilo web, estilo de paleta, tipografía, layout y motion. Opciones «Barajar» (tecla **S**) y «más». Candados por slot. 3 dials (variance, motion, density) con detents en 3 y 7 | La carta se imanta al slot (spring) y la preview se re-tiñe con un **revelado circular desde el punto donde soltaste** | <100 ms por cambio |
| 3b | Referencias | Pegas capturas propias o con licencia, o links. Sin key se extrae color y claro/oscuro. Con key (v1.1), visión → *fingerprint* de atributos limitado a IDs del catálogo. Los hex nunca los inventa el LLM. Además se genera `references.md` con 5–8 consultas para el Mobbin de tu Claude | Animación de «escaneo» y pills que salen volando. **Mezcla por atributo:** arrastras «Densidad de A» o «Tipografía de B» a un slot. El slot Color queda bloqueado por el logo | 3–8 s por captura |
| 4 | Generar | Con key: Haiku propone **4 direcciones** (~$0.003). Eliges una y Sonnet rellena el árbol de secciones y el copy, **dentro del catálogo** y en streaming (~$0.05). Sin key: plantilla determinista con copy placeholder | Las 4 mini-previews entran escalonadas | 8–25 s |
| 5 | Ajuste fino | Dispositivo 390/768/1440, claro u oscuro, rotar variantes de sección, reordenar, deshacer y rehacer. Barra de brief persistente, p. ej.: «Marca ✓ · Soft UI · AA ✓ · Siguiente: publicar» | View Transitions para los cambios de estructura. CSS vars para los de tokens, sin pasar por la red | — |
| 6 | Publicar y entregar | «Crear link»: HTML estático **más el runtime hidratado**, para que el motion real llegue al diseñador. Después arrastras una **carta de destino** (Figma, Claude Design, Framer, Código, «Mi Claude») al slot «Enviar» | **Momento firma:** el botón se convierte en progreso y termina en «Link copiado» | ~3 s |

**Detalle del paso 1 (logo → paleta):**
- Extracción de color con histograma OKLab o con colorthief v3.
- Escalas 50–950 ancladas al hex exacto de la marca.
- Roles de shadcn en claro y oscuro.
- Autoajuste para cumplir WCAG AA.
- Si el logo es negro o gris, se ofrecen 3 acentos: el `theme-color` del sitio, la paleta de la industria y el acento del estilo.

---

## 4. Arquitectura

### 4.1 Diagrama

```
[Navegador · app.dialed.design — Next.js 16.4 / React 19.3]
 ├─ Composer UI: motion 14.1 + @dnd-kit/react 0.5.0 + shaders (Paper)
 │    └─ Store (Zustand + zundo) ─► DesignDoc v1 (Zod) ─► parches RFC 6902
 ├─ Palette Worker: OffscreenCanvas + culori + colorthief v3 + Material Color Utilities 0.4.0
 ├─ Cliente IA BYOK: @anthropic-ai/sdk → api.anthropic.com (la key no toca nuestro servidor)
 ├─ packages/compilers (TS puro): CSS vars · @theme v4 · shadcn · DTCG 2025.10 · figma-{light,dark}.tokens.json
 │    · DESIGN.md · MASTER.md · README brand book · HTML · TSX · prompt packs · [v1.1] figma-plan
 └─ <iframe sandbox="allow-scripts" src="https://dialed-usercontent.com/runtime">
        ◄── postMessage {doc, patch, dropPoint, theme, device} ──►
        Runtime: React + catálogo de secciones (shadcn + Motion) + Tailwind precompilado

[Vercel Pro] /api/logo-from-url (metascraper; anti-SSRF) · /api/publish → R2 · /s/{slug} · /r/{slug}/*.json (shadcn registry)
[Supabase] Auth anónima + magic link · designs, design_versions(doc, patch), references(fingerprint, source_url) · RLS
[Cloudflare] Worker en dialed-usercontent.com (otro eTLD+1, CSP por header) · R2
[CI] ETL Python 3.12 (uupm@50d8a7d → catalog.json) · Playwright · axe-core · design.md lint

[v1.1] mcp.dialed.design: MCP remoto de solo lectura (get_direction, get_tokens, get_design_md, get_figma_plan)
       + plugin de Claude Code (.mcp.json con URL fija)
[v2]   MCP App · tools de escritura con OAuth · plugin de Figma · push a Framer (framer-api) · Mobbin in-app (con permiso)
```

### 4.2 Formato canónico: DesignDoc

```ts
DesignDoc v1 {
  version: 1,
  brand: { logoRef, seeds: { primary, secondary? }, achromatic },
  brief: { productType /* enum de 192 tipos de uupm */, pageType: 'landing', locale,
           styleId, paletteStyleId, typographyId, layoutId, motionTier,
           dials: { variance, motion, density }, locks },
  tokens: /* DTCG 2025.10: color {colorSpace:'oklch', components, hex}; modos light y dark */,
  page: { root, elements: { [id]: { type /* SOLO del catálogo */, props, children } } },
  references: [{ id, kind: 'upload'|'url'|'mobbin-link', sourceUrl?, fingerprint }],
  provenance: { catalogSha, engineVersion, model? }
}
```

**Regla de oro:** la IA **nunca** produce HTML libre como fuente de verdad. Si lo hiciera, el diseño dejaría de poder editarse arrastrando y no llegaría estructurado a Figma.

**Reparto del trabajo:**
- **El algoritmo calcula:** hex, escalas, contraste y spacing.
- **La IA elige y redacta:** IDs de catálogo, copy y justificación.

### 4.3 Formatos de salida

| Formato | Para qué |
|---|---|
| DesignDoc (JSON + Zod) | Fuente de verdad |
| DTCG 2025.10 `.tokens.json` (oklch + hex) | Tokens neutrales para código. El Claude del usuario también los usa para crear el Claude Design. Serializador **propio**: Style Dictionary y Terrazzo no cubren 2025.10 completo |
| `figma-light.tokens.json` / `figma-dark.tokens.json` | Import nativo del panel Variables de Figma. Ver detalle debajo |
| DESIGN.md (spec de Google, alpha) | Brief para Stitch, Claude Code y Cursor. Se valida con `@google/design.md lint`; su `export` es con pérdida, así que no se usa |
| README brand book + CSS vars + `@theme` + fuentes + logos | Lo que Claude Design lee para construir un Design System |
| CSS vars, `@theme` v4 y registry de shadcn | Código: `npx shadcn add …` |
| HTML y TSX | El link, la captura a Figma y los code components de Framer |

**Detalle de los archivos para Figma:**
- Colores **solo en sRGB o HSL**.
- Dimensiones en px y duraciones en s.
- Un archivo por modo, en **una sola colección** con modos Light y Dark.
- En Starter no hay modos, así que se hacen dos colecciones.

**Nombres de variables: lo decide el spike de la semana 1.**

Figma empareja las variables primero por *code syntax* y después por nombre. El import DTCG **no** fija el code syntax. Además, Tailwind v4 lee `--color-primary`, no `--primary`. El spike tiene que elegir entre dos opciones:
- (a) CSS var `--color-primary` ↔ variable de Figma `color/primary`.
- (b) Fijar el code syntax con el plugin de la v2 o con `use_figma`.

Ojo también con `accent`: en uupm significa CTA y en shadcn es la superficie de hover. Por eso usamos `--cta` y `--brand` propios.

### 4.4 Stack

| Capa | Elección |
|---|---|
| Framework | Next.js 16.4, React **19.3** (necesaria para `<ViewTransition>` estable), TypeScript, Tailwind v4.3, shadcn 4.x |
| Motion | `motion` **14.1.0 exacta** (`AnimateView` es gratis). Versión publicada el 2026-10-09: vigila los parches |
| Drag and drop | `@dnd-kit/react` **0.5.0 exacta**. Motion no trae drop zones |
| Extras | `@paper-design/shaders-react` 0.0.81, `@number-flow/react`, `sonner` |
| Color | culori, colorthief v3, `@material/material-color-utilities` 0.4.0 (pasar `specVersion`), colorjs.io |
| Estado | zustand + zundo, zod 4, fast-json-patch; `@json-render/*` 0.21 detrás de un adaptador |
| Infra | Vercel Pro, Supabase, Cloudflare Workers + R2 |

**Descartados por licencia:**
- **GSAP:** su licencia prohíbe usarlo en herramientas no-code de animación visual que compitan con Webflow. No lo usamos ni en la UI ni en los exports sin consultar antes.
- **tldraw:** necesita licencia comercial.
- **Motion+:** cuesta $399 y exige licencia aparte si revendes sus capacidades.
- **Huemint API:** solo para uso no comercial.
- **Sandpack:** parado desde 2025.
- **WebContainers:** licencia comercial.

---

## 5. Integración con la IA del usuario

### Lo que SÍ es posible

| Vía | Qué permite | Quién paga | Fase |
|---|---|---|---|
| **BYOK en la web** (navegador → api.anthropic.com) | Clasificar, 4 direcciones, árbol de secciones y copy. Fingerprint de referencias en la v1.1 | El usuario, de dos formas (ver debajo) | MVP |
| **Prueba hosted** (tu key, Haiku) | 3 sesiones para quien no tiene key | Tú, con tope duro de ≤$50 al mes | MVP (opcional) |
| **Plugin de Claude Code** | Su Claude lee el pack y usa *su* conector de Mobbin y *su* Figma MCP. El mismo plugin carga sus skills también en el chat de claude.ai y en Cowork | Su suscripción. Claude Code está en Pro, Max, Team y Enterprise, **no en Free** | MVP (sem. 9) |
| **MCP remoto** como connector (claude.ai, Desktop, Code, móvil; también ChatGPT y Codex) | Su Claude lee la dirección y pide `get_figma_plan` | Su suscripción. En Free cabe 1 solo custom connector; en Team y Enterprise solo lo añade un Owner | v1.1 |
| **MCP App** fullscreen | Tablero reducido dentro de Claude y ChatGPT. «Generar» lo dispara `sendMessage`: solo `sendMessage` provoca respuesta, `updateModelContext` solo deja contexto | Su suscripción | v2 |
| Claude Code **sin modificar**, hospedado, con el login del usuario | Un «modo local» que aplica el diseño en su repo | Su suscripción. Tú no puedes pagar, revender ni intermediar ese uso | v3, a evaluar |

**Cómo paga el usuario el BYOK:**
- Con una cuenta de Console de pago por uso.
- Con los **créditos API de su plan**: Max 5x recibe $100 al mes, Max 20x $200 y Team $20 o $100 por seat (tope de $500).
  - No los reciben Free, Pro ni Enterprise.
  - Caducan en cada ciclo de facturación.
  - Cualquier key de la organización vinculada los consume.

### Lo que NO es posible

- **«Sign in with Claude», OAuth de suscripción o enrutar credenciales Free/Pro/Max.** Está prohibido salvo aprobación previa de Anthropic.
- **El MCP de Claude Design desde tu app.** Es OAuth first-party de claude.ai, con scopes `user:design:*`.
- **El MCP de Figma desde tu backend.** Solo entran los clientes del Figma MCP Catalog. Se puede solicitar la entrada, pero es discrecional.
- **MCP sampling.** Está deprecado en la spec 2026-07-28.

### Coste por sesión

Estimación propia sobre precios oficiales.

| Modelo | Precio por MTok (input / output) | Sesión típica |
|---|---|---|
| Haiku 5.5 | $0.10 / $0.50 (si el prompt pasa de 100K tokens, $0.50 / $2.50) | ~$0.01 |
| Sonnet 5.5 | $2 / $10 | ~$0.15 |
| Opus 5.5 | $4 / $20 | ~$0.30 |

Una captura de 1280×800 equivale a unos 1.334 tokens de imagen.

### Seguridad de la key BYOK

- Por defecto, la key vive solo en memoria (la pestaña).
- «Recordar» la guarda en IndexedDB, cifrada con WebCrypto.
- CSP estricta y Trusted Types.
- Sin session replay en el editor.
- `beforeSend` de Sentry elimina `x-api-key`.
- Recomendar keys con spend limit y caducidad de 30 días.

---

## 6. Compatibilidad por destino

| Destino | MVP | v2 | Requisitos y avisos |
|---|---|---|---|
| **Figma: variables** | Descargar `figma-light/dark.tokens.json` y arrastrarlos al panel Variables | Plugin propio: colecciones con alias, scopes y code syntax | Starter no tiene modos (confirmado). Que el import funcione en Starter *(no verificado)*. No existe un tipo easing: las curvas van en la Style Guide. La REST API de Variables exige plan **Enterprise** |
| **Figma: capas** | Extensión de Chrome de Figma sobre `dialed-usercontent.com/s/{slug}` (la página del render, no la shell) o html.to.design (Free: 10 imports cada 30 días). «Copiar a Figma» con Figit pasa a la v1.1 *(fidelidad no verificada)* | Plugin «Dialed Import»: auto layout, componentes, `pluginData` para re-sync | La REST API de Figma **no crea nodos**. Que Code to Canvas genere auto layout *(no verificado)*. El motion **no llega** a Figma: el link es la referencia de motion |
| **Figma: vía tu Claude** | Prompt para Claude Code: `generate_figma_design` sobre localhost (`npx serve` del zip) y `use_figma` para las variables | `get_figma_plan` (v1.1): un builder JS de 8 KB o menos más datos JSON por sección | `generate_figma_design` funciona **solo en Claude Code o en IDEs**, no en Claude Desktop. `use_figma` funciona en Claude Code y Desktop, está en beta y será de pago por uso. Para escribir fuera de drafts hace falta seat Full; las docs se contradicen sobre los drafts |
| **Claude Design** | «Abrir en Claude»: descargar la carpeta (README brand book, CSS vars, `@theme`, `tokens.tokens.json`, fuentes, logos, `preview.html`), subirla a un artifact Design System y pegar el prompt «respeta los hex y roles exactos». Alternativas: repo de GitHub o captura del link | Paquete React `dist/` compatible con `/design-sync`, que solo acepta React | **No hay API pública.** Desde el 16-sep-2026 es un tipo de Artifact dentro de Claude y está en todos los planes desde el 8-oct-2026. El standalone `claude.ai/design` cierra el **14-dic-2026**. Claude Design **no exporta a Figma**. DESIGN.md **no** es un requisito suyo. Subir el `.zip` tal cual *(no verificado)* |
| **Framer** | Prompt pack para **External Agents** (`npx @framer/agent@latest setup` y luego `/framer` en Claude Code). Code components TSX con el import `framer-motion`, que Framer incluye | Push con `framer-api` 5.1.0 (Server API en beta), o plugin propio | External agents: gratis en preview en Basic y Pro; Node 22 o más. Que la key de la Server API no exija plan de pago *(no verificado)*. Framer no importa HTML |
| **Link compartible** | `/s/{slug}`: dispositivo, tema, tokens copiables, **Style Guide** (swatches, escala tipográfica, tabla AA y curvas de motion) y exports. Unlisted en el MVP | Comentarios del diseñador, links privados (Pro) | **Nunca** muestra capturas de terceros |
| **Código** | `npx shadcn@latest add https://…/r/{slug}/direction.json` (tema, página TSX, DESIGN.md, skill), zip y DTCG | `dialed-apply` vía MCP | — |
| **v0, Lovable, Stitch** | Open in v0: no soporta `cssVars`, el registry tiene que ser público. Lovable: `#prompt=…&html=…`, **sin autoenvío**. Stitch: vía DESIGN.md | — | — |

---

## 7. Cómo usar los dos repos

### `nextlevelbuilder/ui-ux-pro-max-skill` (MIT, SHA `50d8a7d`)

**Qué tomar** (un ETL en el build genera `catalog.json`):

| Archivo | Cómo se usa |
|---|---|
| `styles.csv` | De los 50 estilos activos salen **12 recetas JSON escritas a mano** para el MVP. No se pueden usar tal cual: solo 11 de 50 traen radius parseable y 12 tienen CSS inválido |
| `colors.csv` | 192 paletas, quitando los 23 grupos duplicados y añadiendo mood tags calculados en OKLCH. Sirven como acentos de respaldo y como presets |
| `typography.csv` | Se curan 10 pairings. Se eliminan las columnas Popularity y Trending Rank, que tienen licencia incierta |
| `landing.csv` | Pasa a 6 layouts |
| `motion.csv` | Se agrupa en 3 tiers |
| `products.csv` + `ui-reasoning.csv` | Enum de 192 tipos, «Do Not Use For» y anti-patrones para el prompt |
| Python del motor | Port a TS de las funciones de contraste y de derivación de dark mode |

**Qué NO usar:**
- El buscador BM25: solo entiende inglés. «coffee shop» devuelve Link-in-Bio y «restaurant» no devuelve nada.
- Los dials tal cual.
- `generate-tokens.cjs` ni `extract-colors.cjs`.
- Las skills `brand` y `design` (bugs concretos debajo).
- La galería como base de código.

**Bugs que confirmé:**
- **variance 4–7:** el estilo sale vacío (5 de 16 queries). El arreglo es mover la guarda de `_select_best_match`.
- **variance 8–10:** fuerza siempre brutalism.
- **Sesgo azul:** 69 de 192 primarios son azules y `#2563EB` aparece 17 veces.
- **Contraste:** el texto Primary sobre Background falla AA en 94 de 192 paletas, y Border nunca llega a 3:1. **Tu motor recalcula todo.**
- **Skill `brand`:** el error sale igual al primary y la marca se llama «ClaudeKit Marketing».
- **Skill `design`:** usa modelos de Gemini deprecados.

**Licencia:** MIT. Exige un NOTICE y atribución en la página About.

### `ayghri/i-have-adhd` (MIT, v0.4.1)

> Nota: escribiste «atghri». El repo correcto es **ayghri**.

1. **Reglas de UX para la app:**
   - un solo CTA inicial;
   - stepper de 5 pasos o menos;
   - chip de «siguiente acción»;
   - barra de estado persistente;
   - ETAs concretas;
   - logros visibles;
   - 5 cartas o menos por bandeja;
   - motion solo en los cambios de estado.
2. **«Modo enfoque» del asistente:** las 10 reglas adaptadas al diseño, con un lint determinista y un toggle «Explicar». Lección de su regla 8: provocó una regresión, porque empuja al modelo a inventar una causa. Tu crítico de diseño debe decir «sin evidencia» en lugar de inventar.
3. **Harness de evals:**
   - 20 casos de diseño;
   - 3 trials;
   - gate comparativo;
   - Playwright, axe-core, ΔE frente a la marca y un juez visual con structured outputs.

   Cuesta entre $1 y $4 por corrida y necesita **Python 3.12** (el 3.9 del sistema falla).
4. **Patrón multi-harness** (un SKILL.md canónico y manifiestos delgados) para distribuir tu propio plugin.

**Qué no hacer:**
- No usar la marca «ADHD» de cara al usuario.
- No usar el flag global `~/.claude/.i-have-adhd-always`, porque afecta a todos tus repos.

**Su mejora medida:** +0.427 en el puntaje ponderado y blockers de 7 a 3. El juez es de la misma familia de modelo, así que no es una validación independiente.

### Tu entorno de desarrollo (lo que dejé instalado)

- Las skills de los dos repos están copiadas en `.claude/skills/`. Para activar el modo ADHD escribes `/i-have-adhd` en cada sesión.
- **Problema 1:** `brand`, `design`, `banner-design` y `slides` se pueden invocar solas y tienen los bugs de arriba.
- **Problema 2:** `vendor/ui-ux-pro-max-skill/.claude/skills/` también se carga, así que hay skills duplicadas.
- **Recomendación:**
  - Dejar solo `ui-ux-pro-max`, `design-system`, `ui-styling` e `i-have-adhd`.
  - Mover `vendor/` fuera del árbol que escanea Claude Code, o quitar su carpeta `.claude/`.
  - Para tener el modo ADHD siempre activo solo en este repo: `.claude/output-styles/adhd.md` y `"outputStyle": "adhd"` en `.claude/settings.local.json`.
- **Dogfooding:** usar `ui-ux-pro-max` en la semana 3 para fijar el design system de la propia app.

---

## 8. Referencias: Mobbin y alternativas

| Fuente | Desde el Claude del usuario | Dentro de tu app |
|---|---|---|
| **Mobbin** (MCP oficial `api.mobbin.com/mcp`: `search_screens`, `search_flows`, `search_sections`) | ✅ Es el uso previsto. Requiere Pro (~$10/mes) y permite 60 req/60 s. Usa el modo `standard`: desde el 12-oct-2026 el modo `deep` gasta 5 créditos | ⚠️ **Solo con permiso escrito de Mobbin.** Sus Terms admiten la integración en productos propios, pero prohíben usar IA para crear obras derivadas y dicen que esas obras son de Mobbin. Eso incluye **capturas de Mobbin pegadas** y analizadas con IA. Nunca cachear ni re-hostear imágenes |
| Capturas propias o con licencia | — | ✅ Con una casilla de derechos. Se procesan en efímero y solo se guardan el fingerprint y el link |
| **Refero** (MCP) | ✅ | ❌ Sin acuerdo B2B, que se negocia por email. Está prohibido pedirle al usuario su token |
| Lazyweb, A1 Gallery | ✅ | ⚠️ Prohíben redistribuir o re-hostear |
| Dribbble, Behance, Awwwards | — | ❌ No hay API utilizable |
| dembrandt (MIT) | ✅ | v2: worker URL → tokens, respetando robots.txt y sin stealth |
| Logo por URL | — | ✅ metascraper sobre el sitio del propio usuario. ❌ Las Logo API de Brandfetch y logo.dev solo sirven para `<img>`, no para procesar píxeles. Clearbit cerró en dic-2025 |

**Propiedad intelectual:** desde 2025 la UE protege las GUIs como diseño, también las animadas. Mitigaciones:
- Referencias como **atributos**, no como plantillas.
- Prohibición de clonar en el prompt.
- Ninguna imagen de terceros en los links.
- Control de similitud en la v2.

**Esta semana:** escribe a Mobbin pidiendo confirmación escrita del caso de uso.

---

## 9. Motion y drag

Pediste motion graphics. Por eso el presupuesto tiene 3 niveles.

| Nivel | Qué cubre | Duración |
|---|---|---|
| 1. Feedback directo | Hover, press, imantado, reorder | ≤200 ms, interrumpible |
| 2. Transiciones de estado | Revelado circular, cambio de paleta | ≤400 ms |
| 3. Dos momentos firma por sesión | Logo → paleta, y publicar | Hasta 900 ms, se pueden saltar con un clic |

**Fondo:** el shader arranca quieto y solo se anima unos 1,5 s cuando cambia la marca. Nunca corre en bucle mientras trabajas (WCAG 2.2.2).

**Las 5 micro-interacciones «wow»:**
1. **Carta magnética:** rota ±8° según la velocidad y escala a 1.04. El slot compatible brilla y la carta se imanta (spring ~500/30).
2. **Revelado circular** desde el punto donde soltaste la carta, con stagger de 30–50 ms por sección.
3. **Logo → swatches:** vuelan en arco con `layoutId` y el fondo transiciona en OKLCH.
4. **Dials con detents** en 3 y 7: overshoot de spring al cruzar un tier y NumberFlow mostrando el valor.
5. **Barajar en abanico** (tecla S), con wiggle del candado, y Exportar → progreso → «Link copiado».

**Accesibilidad (requisitos obligatorios):**
- Cada arrastre tiene una alternativa de **clic para colocar** y de teclado (WCAG 2.5.7). Space y Enter quedan reservados para coger y soltar.
- `<MotionConfig reducedMotion="user">`, porque por defecto está en `never`.
- Animar solo `transform` y `opacity`.

---

## 10. Plan: 1 dev, MVP de 12 semanas con alcance recortado

**Alcance del MVP:**
- 8 secciones, 12 recetas, 10 pairings y 1 tipo de página (landing).
- BYOK solo para las 4 direcciones y el copy.

| Sem. | Entregable |
|---|---|
| 1 | Monorepo (pnpm + Turborepo). DesignDoc en Zod. ETL de uupm → `catalog.json`. NOTICE. **Spike de Figma** sobre `spike/demo.html` (ver §13) |
| 2 | Motor de paleta en un worker: escalas, roles, autoajuste AA, flujo acromático y estilos de paleta con tope de ±15° de tono. Tests con 30 logos reales |
| 3 | Runtime en `dialed-usercontent.com`: sandbox, postMessage, CSS vars y revelado circular. Secciones 1–5. Dogfooding de uupm para la UI de la app |
| 4 | Composer: mazo, slots, dials, dnd-kit + Motion, clic y teclado, candados, undo y barra de brief. Micro-interacciones 1–3 |
| 5 | 12 recetas, 10 pairings, thumbnails con Playwright. Secciones 6–8. **Revisión de un diseñador freelance** |
| 6 | Publicar `/s/{slug}` (R2 + hidratación, OG, Style Guide) y auth anónima. **Hito M1: demo pública sin IA** (logo → paleta → arrastrar → preview → link) |
| 7 | Compiladores: DTCG, figma light/dark, `@theme`, shadcn, DESIGN.md, carpeta para Claude Design y zip. La vía de Figma que gane el spike |
| 8 | BYOK: key en memoria, validación con `GET /v1/models` y `count_tokens`. Haiku para las 4 direcciones y Sonnet para el árbol y el copy. Modo enfoque. Prueba hosted con tope |
| 9 | Bandeja de referencias sin IA (capturas propias, tarjetas-link, color determinista) y `references.md`. **Plugin de Claude Code**, enviado también al directorio. Cartas de destino. Micro-interacciones 4–5 |
| 10 | Evals v0, axe-core, rendimiento, reduced motion. Seguridad: SVG saneado, anti-SSRF y rate limits. Analítica sin replay en el editor. Landing y política de privacidad. **Hito M2: beta privada** |
| 11–12 | Beta con 10–20 devs y 3–5 diseñadores. Métricas: tiempo hasta el primer link, exports por destino y fidelidad en Figma. Lanzamiento |

**Versiones siguientes:**
- **v1.1 (semanas 13–18):**
  - Fingerprint de referencias con visión.
  - «Copiar a Figma» con Figit.
  - Framer TSX.
  - MCP de solo lectura y `get_figma_plan`, limitado a variables y estilos de texto.
  - Brandfetch o logo.dev como opción.
- **v1.2:** tipo de página dashboard (necesita un catálogo nuevo) y capas vía `use_figma`.
- **v2 (meses 5–7):**
  - Plugin de Figma nativo y MCP App.
  - Tools de escritura con OAuth.
  - `framer-api` y el paquete para `/design-sync`.
  - Mobbin in-app (con permiso) y dembrandt.
  - Control de similitud y comentarios.
  - Plan Pro de $8–12 al mes.

**Coste mensual al lanzar:**
- Infra: ~$60 (Vercel Pro $20, Supabase Pro $25, Workers ~$5, dominios y evals).
- Prueba hosted: hasta $50 de tope.
- Cuentas de test: Figma Professional $16, Mobbin Pro ~$10, Framer Basic $10 y Claude Pro $20 (o Max si quieres probar los créditos API).

---

## 11. Riesgos y mitigaciones

| Riesgo | Mitigación |
|---|---|
| Commoditización: Claude Design en Free, Stitch, Relume → Claude Design, power users encadenando MCPs | El foso es la UX de componer, las recetas curadas, los compiladores y la neutralidad. Salir rápido con M1 |
| **El gusto curado lo decide un dev que no es diseñador** | 40–60 h de un diseñador freelance en las semanas 4–6. Validar con 3–5 diseñadores en la beta |
| Un catálogo pobre da resultados con «cara de shadcn genérico» | Las recetas y secciones son el trabajo principal. Evals con ΔE y un juez ciego |
| «Copiar a Figma» (formato kiwi no documentado) se rompe sin aviso | Spike en la semana 1. Priorizar las vías oficiales. Plan B: code.to.design, que pasa el HTML por un tercero y por eso necesita aviso de privacidad |
| Límites de Figma: Starter sin modos y con 3 archivos; `use_figma` en beta y de pago por uso | Exports con fallback para Starter. Avisos de una línea. Plugin propio en la v2 |
| Claude Design cambia sus formatos internos | Usar solo entradas documentadas (README, CSS vars, DTCG) y el Claude del usuario |
| Legal: Mobbin, clonación, GUIs protegidas en la UE | Nada de Mobbin in-app sin permiso. Fingerprints por atributos. Nunca imágenes en los links |
| La key BYOK queda expuesta a XSS o extensiones | Las medidas de §5 |
| Abuso de links públicos (phishing) que acaba con el dominio en una blocklist | Publicar exige email verificado. `noindex`. Botón «Reportar». Monitorizar Safe Browsing |
| SVG malicioso o SSRF en logo-from-url | Sanear con svgo. Bloquear IPs privadas. Timeout de 5 s y máximo de 2 MB |
| Dependencias pre-1.0: dnd-kit 0.5, json-render 0.21, DESIGN.md alpha, motion 14.1 | Versiones exactas, un adaptador por librería y Renovate con revisión manual |

---

## 12. Decisiones que tienes que tomar

Cada una lleva mi recomendación.

1. **Tipo de página del MVP.** Recomiendo **landing**: el catálogo es más chico y el handoff a Framer es mejor. Si tu público construye SaaS o apps (Mobbin tira a apps), empieza por dashboard o app shell.
2. **Prueba hosted con tu key.** Recomiendo **sí**: Haiku, 3 sesiones por usuario y tope de $50 al mes. Cuesta poco y desbloquea la conversión.
3. **Idioma.** Recomiendo UI **bilingüe ES/EN** desde el MVP. Son unos 60 textos de cartas traducidos a mano, y el copy placeholder se genera por locale.
4. **Mobbin dentro de la app.** Recomiendo **escribirles esta semana**. Hasta tener respuesta, Mobbin solo vía el Claude del usuario.
5. **Distribución.** Recomiendo **core cerrado** y plugin, skill y catálogo de prompts con licencia MIT para ganar distribución. Freemium con Pro a $8–12 al mes.

---

## 13. Primeros pasos (esta semana)

1. **Spike de Figma (días 1–2).** Sobre `spike/demo.html`, una landing estática con CSS vars servida con `npx serve`, prueba:
   - ¿Importa `figma-light.tokens.json` en Starter y en Professional?
   - ¿La extensión de Chrome y `generate_figma_design` (Claude Code, localhost) enlazan las variables?
   - ¿El import fija el code syntax?
   - ¿Qué fidelidad da Figit en 3 pantallas?
   - ¿Funciona el portapapeles desde un iframe de otro origen?

   Resultado: la vía principal de Figma para el MVP.
2. **ETL y 5 recetas (días 3–4).** Python 3.12 desde `vendor/ui-ux-pro-max-skill` → `catalog.json`: sin duplicados, sin columnas de ranking y con mood tags OKLCH.
3. **Legal y entorno (día 5).**
   - Email a Mobbin.
   - NOTICE (MIT de los dos repos).
   - Revisar que el nombre y los dos dominios (app y usercontent) estén libres.
   - Limpiar las skills (ver §7).

Los spikes de paleta y de composer abren las semanas 2 y 4.

---

## 14. Fuentes primarias clave

| Tema | URLs |
|---|---|
| Política de Anthropic | https://code.claude.com/docs/en/legal-and-compliance · https://support.claude.com/en/articles/17154008-monthly-api-credits-for-max-and-team-plans · https://platform.claude.com/docs/en/about-claude/pricing |
| MCP Apps y plugins | https://claude.com/docs/connectors/building/mcp-apps/design-guidelines · https://code.claude.com/docs/en/plugins/components · https://blog.modelcontextprotocol.io/posts/2026-07-28/ |
| Claude Design | https://support.claude.com/en/articles/14604416-get-started-with-claude-design · https://support.claude.com/en/articles/17440474 |
| Figma | https://developers.figma.com/docs/figma-mcp-server/write-to-canvas · https://developers.figma.com/docs/figma-mcp-server/code-to-canvas/ · https://help.figma.com/hc/en-us/articles/15343816063383-Modes-for-variables · https://developers.figma.com/docs/rest-api/variables/ |
| Framer | https://www.npmjs.com/package/@framer/agent · https://www.framer.com/updates/server-api |
| Mobbin | https://mobbin.com/terms.md · https://docs.mobbin.com/mcp/build-an-integration.md · https://docs.mobbin.com/ai-credits.md |
| Tokens y color | https://www.designtokens.org/tr/2025.10/format/ · https://github.com/google-labs-code/design.md |
| Motion y licencias | https://motion.dev/docs/react-animate-view · https://react.dev/blog/2026/09/09/react-19-3 · https://gsap.com/community/standard-license/ |

La lista completa de fuentes está en `round2-synthesis.md` §12 y en `round2-raw.json`.

---

## 15. Ajustes del 2026-10-09: presupuesto mínimo, proyecto open source y edición tipo Claude Design

Estos ajustes vienen de tu respuesta. Cambian las decisiones 2 y 5 de §12:
- **Decisión 2:** no habrá prueba hosted. La IA nunca la pagas tú.
- **Decisión 5:** el proyecto es open source para la comunidad, sin plan de pago por ahora.

### 15.1 Infra a $0 al mes

| Pieza | Antes | Ahora (gratis) | Nota |
|---|---|---|---|
| App web | Vercel Pro ($20) | **Vercel Hobby** | Hobby es para uso personal y no comercial, así que sirve para un proyecto comunitario. Si algún día monetizas, pasa a Pro |
| Preview aislada (otro origen) | Cloudflare Worker + dominio propio | **Segundo proyecto de Vercel** en `*.vercel.app` | `vercel.app` está en la Public Suffix List (verificado hoy), así que cada subdominio cuenta como un sitio distinto y el aislamiento del iframe se mantiene |
| Usuarios y datos | Supabase Pro ($25) | **Supabase Free** (Auth, Postgres, Storage) | Lo pediste. Los renders publicados van en Supabase Storage en lugar de R2. Los proyectos Free inactivos se pausan *(no verificado hoy)* |
| IA | Prueba hosted (≤$50) | **$0 para ti** | Dos vías: BYOK opcional (paga el usuario) y plugin/skill/MCP para el Claude del usuario. La app funciona completa sin IA |
| Dominio | ~$25 al año (2 dominios) | Opcional | Puedes lanzar en `*.vercel.app` |
| Cuentas de test | Figma Pro, Mobbin Pro, Framer | Las gratuitas | Para probar los modos de variables en Figma hace falta un plan con modos. Si no lo tienes, se prueba la variante de 2 colecciones de Starter |

**Coste para arrancar: $0.** Lo único opcional es un dominio.

### 15.2 La plantilla editable tipo Claude Design (no tipo Figma)

En Claude Design editas conversando y tocando el diseño: comentas sobre un elemento, editas el texto directamente y ajustas con controles (sliders) en lugar de mover capas sueltas. La arquitectura del §4 ya lo soporta. El DesignDoc es un árbol de elementos con ID, de un catálogo cerrado, que se edita con parches RFC 6902. El «Modo edición» se monta encima en cinco piezas:

1. **Seleccionar.** Clic sobre un elemento de la preview: el iframe envía `elementId` por postMessage, se resalta el elemento y aparece una barra flotante.
2. **Texto inline.** `contenteditable` solo sobre las props de texto. Cada cambio se convierte en un parche y se puede deshacer y rehacer.
3. **Controles («knobs») por sección.** Variante, alineación, espaciado, radio, énfasis e imagen. Cada sección del catálogo declara sus controles en su schema, así que son deterministas y no cuestan IA. Los dials globales (variance, motion, density) y los tokens siguen arriba.
4. **Estructura.** Arrastrar para reordenar secciones, e insertar o duplicar secciones del catálogo. Se reutiliza la misma mecánica de cartas del composer.
5. **Comentario → IA (opcional).** «Haz este hero más audaz». Con BYOK o con el Claude del usuario vía MCP, el modelo devuelve **solo un JSON Patch** validado contra el schema del catálogo. Si el parche no es válido, se descarta. No hay HTML libre.

**Cuándo:** después del MVP base, como v1.1. Las piezas 1–4 no tienen coste de IA y son la base. La 5 llega cuando exista el MCP.

**Alternativa evaluada:** Puck, un editor visual MIT para React con datos JSON. Fija `@dnd-kit` en 0.4.0 y choca con la 0.5.0 que usamos. Recomiendo un inspector propio, más pequeño y con el mismo motion de la app.

### 15.3 Publicarlo para la comunidad («build in public» en LinkedIn)

**Cuatro posts, cada uno con una demo de 15 a 30 segundos:**

| Post | Tema | Demo |
|---|---|---|
| 1 | **Palette Lab** | Suelto mi logo y en 1 s tengo una paleta accesible exportable a Figma y Tailwind |
| 2 | **Composer** | Arrastro cartas de estilo, tipografía y layout, y la preview cambia en vivo |
| 3 | **Handoff** | Link para mi diseñador más variables de Figma más un pack para Claude Design |
| 4 | **Modo edición** | Edito la plantilla como en Claude Design |

**Licencia:** recomiendo **MIT** para todo el repo, con el NOTICE de los dos repos de origen. La decisión es tuya; el scaffold no incluye LICENSE.

**Ojo con las marcas:** las demos y los ejemplos usan logos ficticios. Si haces una demo con un logo real, que sea el tuyo o uno con permiso.
