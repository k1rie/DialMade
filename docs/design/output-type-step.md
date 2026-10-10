# Paso «¿Qué quieres crear?»: definición y efecto técnico

## 1. Respuesta en 2 líneas

Después del Palette Lab aparece una pantalla con **3 cartas que ya muestran la marca del usuario aplicada**: **Guía de marca**, **Landing** y **App**. Debajo va un enlace «No sé, recomiéndame». El usuario elige **una** como foco y puede añadir las otras más tarde con «+», porque las tres salen del mismo DesignDoc y de los mismos tokens.
Se habilitan en este orden: **Guía de marca** en M1, **Landing** en la beta y **App** en la v1.2 (antes si los votos lo piden). Lo que aún no está listo se ve como «Pronto», con su preview real.

## 2. Las opciones

| Carta | Qué obtiene | Mini-preview (en vivo, con su tema) | Para quién | Mejor destino |
|---|---|---|---|---|
| **Guía de marca** (brand board) | Una página con 01 Identidad, 02 Paleta, 03 Tipografía, 04 Formas, 05 Componentes y 06 Dirección de arte | Logo sobre fondo claro y oscuro, 5 swatches, «Aa» del pairing y 2 botones | Tiene diseñador, o va a pedirle pantallas a su IA (Claude Code, Cursor, v0) y quiere que respete su marca | Link, Claude Design, Figma |
| **Landing** | La página que presenta su producto (nav, hero, features, precios, CTA y footer), editable por secciones | Nav, titular grande, CTA y 3 cards | Va a lanzar o validar algo (side project, OSS, waitlist) | Framer, Código (TSX), Claude Design |
| **App** (UI kit + dashboard) | Componentes con sus estados y una pantalla de ejemplo (sidebar, KPIs, gráfica y tabla) | Sidebar, 3 KPIs, barras chart1–3 y 2 filas con badges de éxito y aviso | Ya construye un SaaS o una herramienta con Tailwind/shadcn (no he verificado que ese sea el stack del público) | Código (`npx shadcn add`), Claude Design |

**«No sé, recomiéndame»** es un enlace bajo las cartas, no una 4.ª carta. Abre los 12 chips de tipo de producto; si hay BYOK, también una línea libre que Haiku clasifica. Esto absorbe el Paso 2 del INFORME. La recomendación se calcula sobre `products.csv`; conté hoy las filas del vendor:
- 70 de los 192 tipos solo tienen «Landing Page Pattern» → **Landing**, con ese patrón como layout por defecto.
- 2 solo tienen «Dashboard Style (if applicable)» (Financial Dashboard y Analytics Dashboard) → **App**.
- 120 tienen las dos columnas → **Guía de marca**, con el motivo visible: «Tu producto necesita web y app; la guía sirve para las dos y te enseña ambas en miniatura». Con BYOK, Haiku desempata leyendo la línea («ya tengo la app» → App).
- La recomendación solo marca la carta (badge «Recomendada» y glow) y el usuario confirma. Si la recomendada está en «Pronto», se dice y se propone la habilitada más cercana.

**Selección única, con «+ Añadir» después.** Por qué:
1. Una decisión y un CTA por pantalla («Crear Landing →»), según la regla de i-have-adhd.
2. El Composer cambia según el tipo (mazo de layouts, densidad por defecto, knobs), así que necesita un foco.
3. No hay lock-in. Color, tipografía, formas y recetas son comunes, así que añadir otra página después es instantáneo y lo hereda todo.
4. Elegir varias al principio duplica el trabajo de preview y el tiempo hasta el primer resultado. Además, con 2 de 3 en «Pronto» esa multi-selección sería falsa.
5. La Guía de marca se genera siempre como pestaña Style Guide del link, aunque el foco sea otro. Ya estaba en el MVP (INFORME §6).

## 3. Dónde va en el flujo e interacción

**Inicio → recorte → Palette Lab → ¿Qué quieres crear? → Composer → ajuste → Exportar**

Por qué ahí:
- **Antes del logo no:** rompería el CTA único «Suelta tu logo» y retrasaría el momento firma.
- **Aquí las cartas ya muestran *su* marca aplicada.** Un dev que no es diseñador elige mejor viendo que imaginando.
- **El Palette Lab no depende del tipo** (los tokens son comunes). El Composer sí depende.
- **Llega preseleccionada** la pestaña que tenía abierta en el LivePreview, así que confirmar cuesta 1 clic.

Interacción (referencias 7A Higgsfield y DESIGN-BRIEF §5):
- **Disposición:** una fila de 3 cartas verticales grandes. Encima, la silueta del canvas del Composer hace de slot: «Arrastra aquí lo que quieres crear».
- **Arrastrar:** la carta se levanta (1.03, inclinación según velocidad) y el slot se ilumina con `glow-purple`. Al soltar hay un spring `snappy` con destello blanco, y la mini-preview crece hasta convertirse en el canvas del Composer (`layoutId`, `smooth`, ≤400 ms; no es un 3.er momento firma).
- **Clic o tap:** selecciona la carta (borde `glow-purple`, como en 7A) y el CTA confirma.
- **Teclado:** el patrón DnD que ya existe (`DraggableItem` y `useKeyboardTargets`). Space/Enter coge, las flechas llevan al slot, Enter suelta y Esc cancela. `aria-live` anuncia «Landing colocada en Crear». Con reduced motion, todo pasa a fades de 150 ms.
- **«Pronto»:** la carta se ve a color completo, porque la preview real es lo que convence, con un badge «Pronto · v1.1». No se puede arrastrar. Al hacer clic abre un popover con «Mientras tanto» (App: «Copiar `globals.css`, tu tema ya funciona en tu app shadcn»; Landing: «Copiar prompt para tu Claude») y «Votar en GitHub».

## 4. Núcleo común vs específico por tipo

**Común (se construye una vez):**
1. **Tokens.** El color sale de `@dialmade/palette`, que ya existe. Faltan tipografía (pairing → escala), radio, spacing/densidad, elevación, borde y tiers de motion.
2. **Unas 12 primitivas `ui.*`** (shadcn, MIT), que solo leen CSS vars: Button, Input, Select, Badge, Card, Tabs, Alert, Avatar, Switch, NavItem, StatCard y TableRow.
3. **12 recetas y 10 pairings aplicados a nivel componente** (forma, sombra, densidad), no solo al color.
4. **Runtime en iframe:** postMessage, revelado circular, dispositivo y tema.
5. **Infra de edición** (selección, texto inline, knobs declarados en el schema, parches, undo) **y exports de tokens** (CSS vars, `@theme`, `globals.css`, DTCG, Figma, DESIGN.md).

**Específico:**

| | Guía de marca | Landing | App |
|---|---|---|---|
| Catálogo | `brand.*`: cover, identity, palette, type, shape, components, artDirection (motion opcional) | `landing.*`: navbar, hero, socialProof, features, testimonials, pricing, cta, footer (2 variantes cada una) | `app.*`: shell (sidebar y topbar) y 7 widgets (kpiRow, chartCard, dataTable, activity, settingsForm, emptyState, confirmDialog), más 8 primitivas (Dialog, Dropdown, Tooltip, Checkbox, Radio, Textarea, Progress, Breadcrumb) |
| Layouts | 1 grilla editorial (2–3 más adelante) | 6, sacados de landing.csv; el default depende del productType | Variantes de shell a partir de «Dashboard Style» |
| Contenido | La propia marca: ni copy ni imágenes | Copy placeholder ES/EN por chip (o BYOK) y mockups en CSS | Datos falsos deterministas por productType |

**DesignDoc.** Todavía no existe en el repo (no hay `DesignDoc` ni `pageType`), así que conviene definirlo ya con un mapa de páginas en lugar de `brief.pageType: 'landing'`:

```ts
type OutputKind = "brand" | "landing" | "app";
DesignDoc v1 {
  version: 1, brand, references, provenance,             // igual que §4.2
  brief: { productType?, focus: OutputKind, locale, styleId, paletteStyleId,
           typographyId, motionTier, dials, locks },     // sin pageType ni layoutId
  tokens: { color, typography, radius, space, elevation, border, motion }, // común
  system: { button: { shape, size }, card: { elevation, padding }, ... },  // recetas por componente, común
  pages: Partial<Record<OutputKind, Page>>,              // se crea al elegir o con «+ Añadir»
}
Page = { kind: OutputKind, layoutId, root, elements: Record<id, {type, props, children}>, hidden?: id[] }
// Zod: discriminatedUnion("kind"); cada kind solo admite tipos de su catálogo más ui.*
```

- **Por qué no `outputType` + `pageType`:** la App es a la vez sistema y página. Con dos ejes aparecen combinaciones inválidas, y un solo `kind` más un `system` común lo resuelven.
- **Alcance de cada edición:** un parche en `/pages/landing/elements/hero-1/props/title` cambia **solo ahí**. Uno en `/tokens/radius/md` o `/system/button/shape` cambia **en todo**: todas las páginas y todos los exports. El inspector muestra ese alcance.

**Edición tipo Claude Design (piezas del §15.2):**

| Pieza | Guía de marca | Landing | App |
|---|---|---|---|
| Texto inline | Nombre, tagline, do/don't | Todo el copy (el mejor encaje) | Nav, KPIs y columnas |
| Knobs | Casi todos son tokens, así que son globales | Variante, alineación, espaciado y énfasis por sección | Por componente; por defecto el alcance es «en todo» |
| Estructura | Solo ocultar o mostrar secciones | Reordenar, insertar y duplicar (lista vertical) | v1.2: reordenar widgets por zona (como lista). La grilla 2D libre, en la v2 |
| Comentario → IA | Parche de tokens, revalidado contra AA | Parche de props de la sección | Parche de `system` y densidad |

**Handoff.** Los exports compilan **todas** las páginas de `pages`. Las cartas de destino del Paso 6 se ordenan según el `focus`.

| Destino | Guía de marca | Landing | App |
|---|---|---|---|
| Link `/s/{slug}` | El board es la portada | Landing más la pestaña Style Guide | Galería, shell y Style Guide |
| Figma | Variables y captura del board como página «Style Guide» | Variables y un frame por breakpoint | Variables y captura. Componentes reales solo con el plugin de la v2. El auto layout de la captura no está verificado |
| Claude Design | README brand book y tokens (el encaje ideal) | La carpeta más `preview.html` de la landing | Carpeta y galería; `/design-sync` (React) en la v2 |
| Framer | Débil: prompt pack para `/framer` | El mejor: TSX por sección y prompt pack | Débil: code components sueltos |
| Código | `registry:theme` | `registry:page` (TSX) y theme | `registry:theme`, `ui` y `block` |

## 5. Secuencia de construcción (1 dev, $0)

Las semanas son estimación mía, no salen de los docs. La semana 0 es cuando terminen Inicio, recorte y Palette Lab. La crítica de la ronda 2 ya avisó de que el plan del INFORME era optimista.

| Fase | Qué queda habilitado | Trabajo | Semanas |
|---|---|---|---|
| Ahora | — | Tabs del LivePreview, MiniApp y MiniBrand | 0,5 |
| **M1** (demo pública) | **Guía de marca**. Landing y App en «Pronto» | Núcleo común (2), paso «¿Qué crear?» (0,5), board 00–06 (2–3), Composer sobre el board (2–3), link y exports (1,5) | ~8–10 |
| **Beta** (M2) | Se añade **Landing** | 8 secciones con 2 variantes, 6 layouts, copy ES/EN para 12 chips, mockups CSS, `registry:page` | +4–5 |
| **v1.1** | Modo edición 1–4 (sobre Landing y Guía de marca) y Framer TSX | — | +3–4 |
| **v1.2** | Se añade **App** | 8 primitivas más con estados, shell y 7 widgets, datos falsos, `registry:block` | +5–6 |

Por qué la Guía de marca va primero:
1. **Ya estaba en el MVP** como Style Guide del link (vista 5, Cofounder). Convertirla en opción cuesta 1–2 semanas extra, no un catálogo nuevo.
2. **Funciona entera sin IA ni copy.** No hay lorem ipsum que la haga parecer falsa.
3. **Es el posicionamiento** (INFORME §2): dirección de diseño, no «otro generador de landings».
4. **Enseña las otras dos en miniatura.** La sección 06 reutiliza MiniLanding y MiniApp, así que desde M1 se ven los 3 tipos.
5. **Llega a la demo pública unas 2–3 semanas antes** que si se empieza por la landing completa.

**Lo que cambia respecto al INFORME:** solo el orden. La landing sigue en la beta, y el post 4 de LinkedIn (Modo edición) se graba sobre la landing, que es donde mejor encaja.

**Decisión con datos en M1 ($0):** contar las elecciones de las cartas «Pronto» y los resultados de «Recomiéndame» (evento anónimo, sin datos personales, en Supabase Free), más los votos en 2 issues de GitHub. Si App le gana claramente a Landing (por ejemplo 60/40, un umbral que propongo yo), se invierte el orden: una App-lite en la beta (galería de primitivas, un shell estático y registry; unas 3 semanas, estimación mía) y la Landing pasa a la v1.1.

## 6. Cambios concretos a lo que se está construyendo ahora

1. **LivePreview pasa a tener 3 mini-specimens con tabs** «Landing · App · Marca» (flechas y roving tabindex). Irían en `/Users/diegoguerrero/Desktop/designApp/apps/web/src/components/LivePreview/{MiniLanding,MiniApp,MiniBrand}/`; todavía no están en el repo.
   - **MiniApp** es la que más aporta al Palette Lab. Pinta success, warning e info, chart1–5, la sidebar e input/ring: los pares de `CONTRAST_PAIRS` que la landing no enseña.
   - **MiniBrand** pone el logo sobre fondo claro, oscuro y de marca. Sirve para validar el recorte.
2. **Las minis solo leen las CSS vars del tema generado** (`--background`, `--primary`, `--chart-1`…), aplicadas con `style` en la raíz del preview. Nunca `--app-*` ni clases de la app.
   - Así pasan tal cual al iframe y se reutilizan en 4 sitios: las tabs, las cartas, la sección 06 del board y las cartas «Pronto».
   - Conviene añadir `toCssVarRecord(theme, mode)` en `/Users/diegoguerrero/Desktop/designApp/packages/palette/src/exporters.ts`, porque `toCssVars` hoy devuelve un string.
3. **Estado del flujo** en `/Users/diegoguerrero/Desktop/designApp/apps/web/src/hooks/usePaletteFlow.ts`: añadir `previewKind: OutputKind` y la acción `setPreviewKind`. `FlowStep` gana `"create"` después de `"palette"`. Los textos del paso van en el diccionario es/en.
4. **Barra de estado** del Palette Lab: «Logo · Paleta · AA · Siguiente: elegir qué crear». Exportar sigue disponible.
5. **Definir el DesignDoc ya** con `pages` y `brief.focus` (por ejemplo en `packages/doc`), antes de que el Composer escriba estado. Y **no** ampliar la mini landing a secciones completas: eso corresponde al catálogo `landing.*`.

## 7. Riesgo principal y mitigación

**El riesgo es la dispersión.** Tres catálogos para 1 dev pueden acabar en tres resultados mediocres con «cara de shadcn genérico» (INFORME §11) y en una pantalla de elección con opciones vacías.

1. **El núcleo común va primero.** La calidad vive en tokens, `system` y recetas por componente (forma, densidad, elevación, tipografía), y los tres tipos la heredan.
2. **Habilitar uno a uno**, con un «Pronto» honesto. Nunca un tipo a medias.
3. **Topes duros:** Guía de marca, 7 secciones y 1 grilla. Landing, 8 secciones con 2 variantes. App, 20 primitivas, shell y 7 widgets.
4. **Decidir con datos en M1** antes de elegir entre Landing y App.
5. **El gusto:** sustituir las 40–60 h de freelance por revisión de diseñadores de la comunidad antes de quitarle el «Pronto» a cada tipo.

La parálisis de elección se mitiga con previews con su propia marca, «Recomiéndame» y la posibilidad de deshacer la elección («+ Añadir»).

## 8. Pregunta para el usuario

¿Te vale que M1 (el post 2 de LinkedIn, sobre el Composer) salga con **la Guía de marca como único tipo habilitado**, y que la Landing llegue en la beta? Si necesitas la landing en M1, se invierte el orden y M1 se retrasa unas 2–3 semanas (estimación mía).