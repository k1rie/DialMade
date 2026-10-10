# Modo Layout: propuesta consolidada (funcionalidad estrella)

**Fecha:** 2026-10-10.

**Origen:** idea del usuario. Este documento une la spec (`modo-layout-spec.md`) con las 8 correcciones de la crítica (`modo-layout-critique.md`), ya aplicadas. La investigación completa está en `modo-layout-research.json`.

**Referencia visual:** 11B Replit + 11F Klaviyo.

## Qué es

Un lienzo con rejilla. El usuario coloca **rectángulos con nombre** sacados de una librería (Navbar, Calendario, Cards ×3, Tabla…) y les añade notas («calendario semanal»). Elige un **estilo** («Tu guía de estilo», Glassmorphism, Minimalista…) con preview en vivo y pulsa **Generar**: cada caja se convierte en su sección real, con su marca.

## Honestidad sobre la innovación

- **Lo que ya existe:** pasar de cajas a UI no es nuevo. Lo hacen Balsamiq, Sketch2Code (2018), tldraw Make Real (2023) y Relume, que arma secciones con su librería en una pila vertical.
- **Lo que no encontré:** esta combinación concreta:
  - bloques tipados en un lienzo 2D;
  - marca desde el logo, con contraste AA;
  - generación instantánea sin IA ni créditos;
  - IA opcional que solo escribe textos;
  - export neutral (Figma, Claude Design, Framer, HTML, DTCG);
  - MIT y $0.
- **En LinkedIn:** nada de «primero» ni «revolucionario». Contarlo como una combinación nueva.

## Flujo

**Marca** (logo, colores, importar guía) → **Layout** (lienzo, librería, inspector y selector de estilo; CTA «Generar diseño») → **Ajustar** (el Composer actual, más «Editar layout») → **Exportar**.

**Qué pasa con lo que ya existe:**
- «¿Qué quieres crear?» se convierte en el estado vacío del lienzo: plantillas Landing, Dashboard y En blanco. Sus componentes se mueven a `LayoutStep/TemplatePicker/`.
- **El tipo de página lo fija la plantilla, no se deduce de los bloques.** Si el usuario elige «En blanco», se pregunta «¿Web pública o pantalla de app?».
- La Guía de estilo se genera siempre: aparece como pestaña en Ajustar y como carta en Exportar.

## Lienzo

- **Rejilla:** 12 columnas en X y snap de 8 px en Y, dentro de un marco Desktop/Tablet/Móvil. La rejilla se dibuja en coordenadas de pantalla, sin `scale()`, para que handles y textos se lean bien.
- **Barra inferior:** Dibujar · Editar · Mano · **Generar**.
  - Los atajos de una tecla solo funcionan con el foco en el lienzo y se pueden desactivar (WCAG 2.1.4).
  - Al dibujar una caja libre aparece «¿Qué es esto?» con sugerencias según su forma.
- **Librería** (estilo Klaviyo): grilla de bloques, buscador con sinónimos es/en, «Sugeridos» y categorías.
  - **MVP:**
    - ya existentes: Navbar, Sidebar, Footer, Hero, Features, Logos, Testimonios, Pricing, CTA, KPIs, Gráfica, Tabla, Actividad, Ajustes, Modal y Estado vacío;
    - nuevos: Texto, Media, Cards, Calendario, Lista, Formulario, Bloque libre y Contenedor.
  - **Después:** Kanban, Chat, Galería, Mapa, Carrito y el resto, priorizados por votos.
- **En pantalla de app**, la navegación es un **marco** con selector fijo (Lateral, Rail, Superior o Ninguna) y una opción de cabecera sí/no. No son bloques sueltos.
- **Normalizar se ve:** si el lienzo ajusta un solape o anida un bloque al soltar, lo anima y muestra el toast «Ajustado · Deshacer». Nunca corrige en silencio.
- **Accesible:**
  - insertar con clic;
  - dibujar con dos clics;
  - campos numéricos en el inspector;
  - coger, mover y soltar con teclado (Space o Enter, flechas, Esc) en un solo paso de deshacer;
  - lista de capas como treeview;
  - anuncios aria-live.

## Selector de estilo (decisión del usuario)

1. La primera opción es **«Tu guía de estilo»**, solo si el usuario importó una.
2. Después vienen las 12 recetas del catálogo (Glassmorphism, Minimalista, Soft UI, Neubrutal suave, Editorial, Dark luxury, Tech tipo Railway, Bento…).
3. **Preview sin IA:** los rectángulos del propio layout, pintados con la paleta de la marca y la receta (radios, sombras, vidrio).
4. Elegir una aplica `setRecipe`, que respeta los candados.

## Modelo y motor

- `pages[k].layout?: LayoutDoc` (opcional, así que el DesignDoc sigue en v1). Bloques en un `Record` con:
  - `type`, `label`, `note`, `count`;
  - `rect` en unidades de rejilla, `parentId`, `z`;
  - `hidden`, `pinned` (props editadas que regenerar no toca);
  - `generated`, la huella del último Generar, para regenerar solo lo que cambió.
- **Paquete nuevo `@dialmade/layout`** (TS puro):
  - recursive XY-cut → grid de 12 columnas y flex;
  - `grid-template-areas` cuando no hay corte limpio;
  - responsive derivado con reglas por bloque (tabla → tarjetas en móvil, calendario → agenda, sidebar → drawer);
  - es determinista y lleva tests golden y de propiedades.
- **Compilación:** `buildPageFromLayout` vive en `@dialmade/sections`. Una página con layout admite secciones `landing.*`, `app.*` y `ui.*`.
- **Cambiar idioma o producto** regenera desde el layout y conserva bloques, ids y textos editados. Hoy reemplaza la página, y eso hay que corregirlo.

## Generación

1. **Determinista, siempre:** layout → estructura → variante según el tamaño → copy por producto. Tarda menos de 100 ms y no cuesta nada.
2. **Momento firma dentro del lienzo:** cada caja se desvanece y su sección aparece con `clip-path`, en orden de lectura. Dura como máximo 900 ms y se puede saltar.
3. **IA opcional:** **una sola** petición por generación (no gasta varios usos del free tier). Incluye las **notas** de cada bloque como datos.
   - Free tier con Haiku 5.5: ≈ $0,002 por generación.
   - BYOK con Opus 5.5: ≈ $0,07–0,12.
   - Gratis siempre: «Copiar prompt para mi Claude».

## Export

- **HTML/ZIP:** grid con container queries, más `layout.json` y `layout.css`.
- **DESIGN.md y prompt packs:** incluyen el layout como wireframe ASCII, en orden de lectura y con las reglas de móvil.
- **Figma:** por ahora, la captura del HTML ya hereda el layout. Más adelante, un `figma-plan` y un plugin con auto layout.

## Plan

**Requisito previo:** terminar el feature de importación (rama `wip/import-brand`).

| Fase | Contenido | Tiempo (estimación propia, sin validar) |
|---|---|---|
| Spike | Lienzo mínimo, XY-cut con 10 casos y prueba con 3–5 devs | ~1 semana |
| **MVP** | El resto de lo descrito arriba | 7–9 semanas de 1 dev; con agentes, bastante menos |
| v1.1 | Ruta `/api/ai/layout` (la IA propone variantes y mapea los bloques libres), «Describe tu pantalla», unos 10 bloques más, overrides por dispositivo, TSX y figma-plan | — |
| v2 | Varias pantallas conectadas, plugin de Figma y foto de boceto → bloques | — |

## Decisiones del usuario (2026-10-10)

1. **Varias pantallas conectadas desde el MVP.** Ya no hay una sola pantalla por tipo.
2. **Rejilla con imán:** 12 columnas y snap de 8 px. Se descartan los píxeles libres.

### Implicaciones de tener varias pantallas (anexo a la spec)

**Modelo.** El DesignDoc pasa a v2, con una migración desde v1 (todavía no hay usuarios).

```ts
screens: Record<ScreenId, Screen>
screenOrder: ScreenId[]
Screen = {
  id, name, kind: 'landing' | 'app', route,
  layout: LayoutDoc, page: Page,
  shell?: { nav: 'sidebar' | 'rail' | 'topnav' | 'none', activeItem?: string },
}
```

- Las pantallas `app` comparten el **marco de navegación**. Cada una marca su ítem activo.
- Un bloque o un ítem de navegación puede llevar `linkTo?: ScreenId`.
- `pages.brand` (la guía de estilo) sigue siendo única y no cuenta como pantalla.

**UI.**
- **Panel «Pantallas»** a la izquierda: miniaturas, renombrar, duplicar, reordenar arrastrando (con alternativa por clic y teclado) y «+ Pantalla».
- **«+ Pantalla» desde plantillas:** Login, Dashboard, Ajustes, Detalle, Lista, Checkout, Perfil, Precios, En blanco.
- **Plantillas de inicio** que crean conjuntos:
  - «SaaS app» = Dashboard + Ajustes + Login;
  - «Landing» = Inicio + Precios.
- **Mapa de flujo (vista de conexiones):** v1.1.

**Generación.**
- El estilo y la marca son compartidos.
- «Generar» procesa todas las pantallas sin generar, o solo las que cambiaron. La parte determinista es instantánea.
- **IA:** una sola petición por «Generar» si cabe (≤64 ids y 160 campos); si no, una por pantalla. El costo y los usos del free tier se muestran antes de llamar.

**Preview.** Navegable: un clic en un ítem enlazado cambia de pantalla.

**Export.**
- ZIP multipágina con enlaces reales entre pantallas.
- El DESIGN.md y los prompt packs listan las pantallas y el flujo.
- En Figma, una página o un frame por pantalla.
