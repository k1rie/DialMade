**Crítica de completitud: paso «¿Qué quieres crear?»**

He comprobado contra el repo y los docs: las cuentas de `products.csv` (70/2/120) son correctas. El repo no tiene `DesignDoc`, ni `LivePreview`, ni la app del runtime (`apps/` solo contiene `web`).

### 1. [Alta] En M1 la elección no es real y la pantalla sobra
- **Problema:** de las 3 cartas, 2 están en «Pronto», así que solo hay una opción de verdad. La propuesta descarta la multi-selección por «falsa» en §2.4, y ese argumento vale igual para la selección única. Además:
  - La carta llega preseleccionada por la pestaña del LivePreview, así que el clic de confirmar repite una elección ya hecha.
  - El flujo pasa a 7 etapas, y el INFORME §7 fija un «stepper de 5 pasos o menos».
  - El usuario quiere que el usuario final elija cuando haya algo que elegir.
- **Corrección para pegar:**
  > **Dónde se elige.** En el Palette Lab. Las pestañas del LivePreview («Guía · Landing · App») son las 3 opciones. Cada una lleva su mini-preview con la marca del usuario y una línea «Para ti si…». El CTA de la barra de estado dice «Crear {pestaña activa} →». La pantalla «¿Qué quieres crear?» (con slot y arrastre) solo se construye cuando haya al menos 2 tipos habilitados. Hasta entonces, las pestañas no habilitadas muestran su preview real con «Pronto · Votar». Stepper: **1 Marca** (logo, recorte, paleta) · **2 Crear** (tipo + Composer) · **3 Ajustar** · **4 Exportar**.

### 2. [Alta] Las estimaciones se contradicen entre sí y con el INFORME
- **Problema:**
  - §5 dice que convertir la guía en opción «cuesta 1–2 semanas extra, no un catálogo nuevo». La propia tabla añade un catálogo `brand.*` de 7 tipos, más el board (2–3 semanas) y el Composer sobre el board (2–3).
  - «Núcleo común (2 semanas)» incluye bastante:
    - tokens que no son de color;
    - 12 primitivas;
    - 12 recetas y 10 pairings a nivel componente;
    - el runtime del iframe, que no existe;
    - los exports.

    El INFORME §10 repartía el runtime (semana 3), las recetas con revisión (semana 5) y los compiladores (semana 7) en unas 3 semanas, sin contar primitivas. Además, §4 mete la «infra de edición» en el núcleo común, pero §5 la presupuesta en la v1.1.
  - «Ahora: 0,5 semanas» no se sostiene. El panel Preview hoy solo pinta la escala brand (`/Users/diegoguerrero/Desktop/designApp/apps/web/src/components/PaletteLab/PaletteLab.tsx`, líneas 96–104). Las 3 minis se hacen desde cero.
  - «Lo que cambia respecto al INFORME: solo el orden» es falso. M1 pasa de la semana 6 a unas 10–12 semanas, y cambia su contenido. «Llega 2–3 semanas antes» no tiene base: el INFORME ya tenía la landing en M1.
  - El post 2 de LinkedIn (§15.3) promete «cartas de estilo, tipografía y layout», pero el board tiene 1 sola grilla.
  - La gráfica de App no tiene librería decidida (dependencia y licencia sin evaluar).
- **Corrección para pegar:**
  > **Calendario (estimación propia, sin validar).**
  > - Ahora, 3 minis y pestañas: 1–1,5 sem.
  > - Núcleo común de M1, 3–4 sem: tokens no-color, runtime en iframe, 12 primitivas, 5 recetas y 5 pairings. Las 7 recetas y 5 pairings restantes llegan después de la revisión de la comunidad.
  > - Catálogo `brand.*`: 2–3 sem.
  > - Composer sobre el board: 2–3 sem.
  > - Link y exports: 1,5 sem.
  >
  > **M1 ≈ 10–13 semanas desde la semana 0.** La infra de edición no forma parte de M1: va en la v1.1. Esto cambia el orden, la fecha y el contenido de M1 del INFORME. El guion del post 2 pasa a ser «Arrastro cartas de estilo, tipografía y forma, y la guía cambia en vivo». La librería de gráficas de App se decide (MIT o SVG propio) antes de estimar la v1.2.

### 3. [Alta] Huecos en el DesignDoc
- **Problema:**
  - **`productType?` es opcional, pero muchas cosas dependen de él:** el copy por chip, el layout por defecto de la Landing y los datos falsos de App. Además, en el flujo nuevo solo se pregunta dentro de «Recomiéndame».
  - **`brief.dials` es global,** pero la propuesta dice «densidad por defecto según tipo». Elegir App cambiaría la densidad de la Landing.
  - **Nombre y tagline pueden divergir.** Se editan inline en la Guía y vuelven a aparecer en el navbar y el hero de la Landing.
  - **Puede haber dos guías.** La «Style Guide siempre generada» convive con `pages.brand`, que «se crea al elegir».
  - **La vista 5 del DESIGN-BRIEF (Cofounder) es una vista de la app,** oscura. El board editable, en cambio, se pinta con el tema del usuario.
  - **La clave del mapa y `kind` están duplicados** y no se valida que coincidan.
- **Corrección para pegar:**
  ```ts
  DesignDoc v1 {
    version: 1,
    brand: { name, tagline?, logoRef, seeds, achromatic },   // contenido compartido: una sola fuente
    brief: { productType: ProductType | "generic", focus: OutputKind, locale, styleId,
             paletteStyleId, typographyId, motionTier, dials, locks },
    tokens, system, references, provenance,
    pages: Partial<Record<OutputKind, Page>>,
  }
  Page = { kind, layoutId, dials?: Partial<Dials>, root, elements, hidden?: id[] } // App nace con density 7
  // Zod: superRefine → pages[k].kind === k; las props de texto admiten { bind: "brand.name" }
  ```
  > Reglas:
  > 1. `productType` vale `"generic"` si nadie elige. Los 12 chips van en el panel izquierdo del Composer: son opcionales y nunca bloquean.
  > 2. La pestaña Style Guide del link **es** `pages.brand`. Si el usuario no la creó, se compila con valores por defecto y sin ediciones. Nunca hay dos guías.
  > 3. El board se pinta con el tema del usuario dentro del runtime. La vista 5 del DESIGN-BRIEF pasa a ser el shell oscuro que lo enmarca. Esto hay que confirmarlo con el usuario.

### 4. [Alta] Handoff: `system` no llega a ningún export
- **Problema:** la propuesta dice que un cambio en `/system/button/shape` alcanza «todos los exports». Pero:
  - Los exporters de `@dialmade/palette` solo sacan color (`/Users/diegoguerrero/Desktop/designApp/packages/palette/src/exporters.ts`).
  - `shape: "pill"` es un enum, no un token.

  Sin una regla de compilación, la preview no coincide con `globals.css`, Figma ni Claude Design. El shadcn instalado saldría con los radios por defecto, justo la «cara de shadcn genérico» del INFORME §11.
- **Corrección para pegar:**
  > **Compilación de `system`.** Cada receta se resuelve en tokens de componente antes de exportar. Por ejemplo: `button.shape: "pill"` → `--button-radius: 9999px`, `card.elevation` → `--card-shadow`, `card.padding` → `--card-padding`.
  >
  > Dónde sale cada uno:
  > - CSS vars y `@theme`.
  > - DTCG, en el grupo `component.*`, con alias a `tokens.*`.
  > - Figma, como variables `component/button/radius` (number). Las sombras van a la página Style Guide: no he verificado si se pueden exportar como variable.
  > - README brand book: una tabla «Componentes».
  >
  > Los componentes `registry:ui` leen esas vars. Test: snapshot de la preview contra el `globals.css` exportado con la misma receta.

### 5. [Media] «Recomiéndame» usa `products.csv` para algo que el archivo no dice
- **Problema:** las cuentas cuadran, pero la lectura está mal.
  - Entre los 70 tipos que solo tienen «Landing Page Pattern», la columna de dashboard vale «N/A - Game focused», «Editor», «DAW», «Inbox», «Timer» o «Canvas». Son apps que no son dashboards, no productos de landing.
  - 120 de 192 tipos (62 %) caen en Guía, que es justo lo único habilitado en M1. El recomendador siempre diría «lo que hay».
  - Montar 12 chips y una llamada a Haiku para elegir entre 3 opciones choca con «se lo preguntaremos al usuario».
- **Corrección para pegar:**
  > «No sé, recomiéndame» sale de M1. Cada opción lleva su línea «Para ti si…». Si hace falta ayuda, una sola pregunta determinista: «¿Qué vas a hacer primero con este diseño?»
  > - «Lanzar o validar una web» → Landing.
  > - «Construir la interfaz de mi producto» → App.
  > - «Pasárselo a mi diseñador o a mi IA» → Guía.
  >
  > `products.csv` solo se usa para el layout por defecto de la Landing («Landing Page Pattern») y la variante de shell de App («Dashboard Style»), ignorando los valores «N/A - …».

### 6. [Media] Las minis no caben donde se proponen y la transición a la carta no es viable
- **Problema:**
  - **Regla de CLAUDE.md:** un subcomponente solo va dentro de la carpeta del padre si nadie más lo usa. Las minis se reutilizan en 4 sitios. Uno de ellos, la sección 06 del board, corre en el runtime del iframe: otro proyecto de Vercel con otro origen (§15.1). Por eso no pueden vivir en `apps/web/src/components/LivePreview/`.
  - **`layoutId` no anima entre documentos:** la mini está en el DOM de la app y el canvas está en un iframe.
  - **El dato de la sidebar es erróneo.** La sidebar no está en `CONTRAST_PAIRS`: es un alias de `card` (`SIDEBAR_ALIASES` en `exporters.ts`).
- **Corrección para pegar:**
  > Las minis van en un paquete compartido, con un folder por componente: `packages/specimens/src/{MiniLanding,MiniApp,MiniBrand}/` (cada una con su `.tsx` e `index.ts`). Lo consumen `apps/web` y el runtime. Solo leen las CSS vars del tema, nunca el Tailwind de la app.
  >
  > Transición: `layoutId` anima la mini hasta el marco del canvas (`smooth`, ≤400 ms). El iframe aparece encima con un crossfade de 150 ms cuando avisa `ready` por postMessage; mientras tanto se ve la mini escalada.
  >
  > Texto corregido: «MiniApp enseña success/warning/info, chart1–5, input y ring. La sidebar usa los alias de `card`».

### 7. [Media] Posicionamiento mal citado, riesgo de commoditización omitido y estética no elegida por el usuario
- **Problema:**
  - **INFORME §2 citado al revés.** §2 define el resultado como un Direction Pack y «una landing de catálogo con tus tokens exactos». El «no competir» se refiere a generar pantallas libres, no a la landing.
  - **La Guía sola es lo más commoditizado.** Según `round1-digest.md`, Claude Design (en Free) construye design systems a partir de logos, y Relume exporta su style guide a Claude Design en un clic.
  - **La vista nueva no tiene referencia elegida.** Reutiliza 7A Higgsfield y un slot con silueta inventado. CLAUDE.md dice: «No se inventa la estética de la app».
- **Corrección para pegar:**
  > En §5: «La Guía va primero porque se puede hacer completa sin IA ni copy. El riesgo es que se parezca a lo que Claude Design y Relume ya hacen gratis. Por eso M1 se juzga por la tabla AA, los roles light/dark, los exports neutrales en un clic y la sección 06 con la marca aplicada a Landing y App.»
  >
  > En §8 se añade: «¿Qué referencia quieres para elegir el tipo? ¿Reutilizamos 7A Higgsfield?»

### 8. [Media-baja] Nombres que confunden a un dev que no es diseñador
- **Problema:**
  - «App» se lee como app móvil: Mobbin está orientado a apps y uupm trae tipos móviles. Pero lo que se entrega es web.
  - «Guía de marca» no explica qué gana un dev con ella.
  - El badge «Pronto · v1.1» contradice el plan (Landing en la beta, App en la v1.2) y mete jerga de versiones.
- **Corrección para pegar:**

  | Carta | Título | «Para ti si…» |
  |---|---|---|
  | Guía | **Guía de estilo** | …vas a pasarle tu marca a un diseñador o a tu IA (Claude, Cursor, v0) |
  | Landing | **Landing page** | …vas a lanzar o validar algo y necesitas una web |
  | App | **Dashboard y componentes (web)** | …ya construyes una app web: SaaS, panel o herramienta interna |

  > Badge: «Pronto» con el contador de votos, sin número de versión.