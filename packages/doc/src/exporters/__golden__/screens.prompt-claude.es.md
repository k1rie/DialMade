# Acme Cloud: dirección de diseño para Claude

## Antes de empezar

- Pégalo en Claude (claude.ai o Claude Code) y adjunta `theme.css` y `DESIGN.md` del pack exportado.

Construye «Inicio, Dashboard y Ajustes» para Acme Cloud con React y Tailwind CSS v4 (y shadcn/ui si el proyecto lo usa), siguiendo esta dirección de diseño al pie de la letra.

## Pasos

1. Añade `theme.css` a la hoja global, después de `@import "tailwindcss";`, y mapea los tokens con `@theme inline` (`--color-primary: var(--primary)`, `--radius-md: var(--dl-radius-md)`, `--font-heading: var(--dl-font-heading)`).
2. Carga las fuentes: `<link rel="stylesheet" href="https://fonts.googleapis.com/css2?family=Inter:wght@400;500;600;700&display=swap">` (o next/font con las mismas familias y pesos).
3. Construye las secciones de «Páginas» en ese orden, una por componente, con los textos indicados.
4. Da estilo solo con las variables: `var(--primary)`, `var(--dl-button-radius)`, `var(--dl-space-4)`, `var(--dl-card-shadow)`, `var(--dl-duration-base)` y `var(--dl-ease)`.
5. Una ruta por pantalla, enlazadas como en el flujo («Pantallas y flujo»): cada bloque que «enlaza a» otra pantalla lleva a ella y la navegación de app enlaza sus pantallas. Respeta el wireframe, el orden de lectura y las reglas de tablet y móvil de cada pantalla.
6. Haz que funcionen el modo claro y el oscuro (clase `.dark`) y comprueba el contraste AA y `prefers-reduced-motion`.

## Dirección de diseño

### Marca

- Nombre: Acme Cloud
- Tagline: Ship faster, sleep better
- Producto: SaaS (general)
- Foco: Landing page
- Estilo: Cristal. Capas translúcidas con desenfoque sobre fondos con color. Profundidad sin peso.
- Estilo de paleta: brand

### Colores

Hex exactos por rol (los nombres son las variables CSS). Todos los pares de texto y UI cumplen AA.

| Rol | Claro | Oscuro |
| --- | --- | --- |
| `--background` | #ffffff | #090a0d |
| `--foreground` | #090a0d | #f9fafd |
| `--card` | #ffffff | #15171b |
| `--card-foreground` | #090a0d | #f9fafd |
| `--popover` | #ffffff | #15171b |
| `--popover-foreground` | #090a0d | #f9fafd |
| `--primary` | #3a5bd9 | #6f94ff |
| `--primary-foreground` | #ffffff | #152355 |
| `--secondary` | #f3f5f9 | #24262b |
| `--secondary-foreground` | #15171b | #f9fafd |
| `--muted` | #f3f5f9 | #24262b |
| `--muted-foreground` | #6e7077 | #9ea1a8 |
| `--accent` | #e8efff | #152355 |
| `--accent-foreground` | #29408c | #e8efff |
| `--destructive` | #dd1b57 | #ff7d91 |
| `--destructive-foreground` | #ffffff | #4b0e1c |
| `--border` | #e3e5ea | #24262b |
| `--input` | #92959b | #60646b |
| `--ring` | #6b90fa | #8eadff |
| `--chart-1` | #3a5bd9 | #6f94ff |
| `--chart-2` | #c656a6 | #e875c6 |
| `--chart-3` | #ce6400 | #f58029 |
| `--chart-4` | #749400 | #8fb51e |
| `--chart-5` | #00999b | #00bcbd |
| `--brand` | #3a5bd9 | #3a5bd9 |
| `--cta` | #b37200 | #f0a024 |
| `--cta-foreground` | #090a0d | #3c2100 |
| `--primary-text` | #3a5bd9 | #6f94ff |
| `--border-strong` | #92959b | #60646b |
| `--success` | #00835e | #5dcea2 |
| `--success-foreground` | #ffffff | #053122 |
| `--warning` | #9c5500 | #ff972f |
| `--warning-foreground` | #ffffff | #3f1f00 |
| `--info` | #1f6dbf | #7bb7ff |
| `--info-foreground` | #ffffff | #0c2949 |

### Tipografía

- Títulos: Inter 600, tracking -0.02em, line-height 1.15
- Texto: Inter 400, line-height 1.6
- Google Fonts: https://fonts.googleapis.com/css2?family=Inter:wght@400;500;600;700&display=swap
- Escala: display 56px (fluido desde 34px) · h1 39px (fluido desde 31px) · h2 31px · h3 25px · body 16px · small 14px · caption 12px

### Forma, espacio y elevación

- Radios: sm 8px · md 12px · lg 16px · xl 24px · full 9999px
- Espaciado (densidad 5/10): 4, 8, 12, 16, 24, 32, 48, 64, 96, 128 px (`--dl-space-1…10`)
- Contenedor: 1200px · Padding de sección: 96px · Borde: 1px
- Sombras (modo claro): sm `0 1px 2px 0 rgb(9 10 13 / 0.05), 0 1px 3px 0 rgb(9 10 13 / 0.08)` · md `0 4px 12px -2px rgb(9 10 13 / 0.08), 0 2px 4px -2px rgb(9 10 13 / 0.06)` · lg `0 16px 40px -8px rgb(9 10 13 / 0.14), 0 6px 12px -6px rgb(9 10 13 / 0.08)`

### Componentes

- Button: radius 9999px, h 32/40/48px, padding-x 24px, weight 500, shadow none
- Card: radius 16px, padding 24px, shadow md, border 1px solid --border
- Input: radius 12px, h 40px · Badge: radius 9999px
- Nav 64px · Table row 48px · Sidebar 256px

### Motion

- Estándar: fast 200ms · base 440ms · slow 600ms · ease `cubic-bezier(0.215, 0.61, 0.355, 1)`
- Respeta `prefers-reduced-motion`.

### Pantallas y flujo

Una ruta por pantalla, en este orden. Cada pantalla es una rejilla de 12 columnas (filas de 8 px); su wireframe y su orden de lectura usan los mismos números.

1. Inicio (`/`) · Web pública
2. Dashboard (`/dashboard`) · Pantalla de app · navegación: Lateral · con cabecera de página
3. Ajustes (`/ajustes`) · Pantalla de app · navegación: Lateral · sin cabecera de página

Enlaces:

- Inicio → «Dashboard» (desde «Barra de navegación») · «Ajustes» (desde «Llamada»)
- Dashboard → «Ajustes» (desde «Tarjetas»)
- La navegación Lateral enlaza las pantallas de app: Dashboard, Ajustes.

### Inicio (`/`)

Web pública.

```text
+--------------------------------------------------------------+
| 1. Barra de navegación                                       |
+--------------------------------------------------------------+

+--------------------------------------------------------------+
| 2. Hero                                                      |
| con captura del producto      +------------------------------+
|                               | 3. Captura                   |
|                               |                              |
|                               |                              |
|                               |                              |
|                               |                              |
|                               |                              |
|                               |                              |
|                               |                              |
|                               |                              |
|                               |                              |
|                               |                              |
|                               |                              |
|                               +------------------------------+
|                                                              |
+--------------------------------------------------------------+

+--------------------------------------------------------------+
| 4. Características ×3                                        |
|                                                              |
|                                                              |
|                                                              |
|                                                              |
|                                                              |
|                                                              |
|                                                              |
|                                                              |
+--------------------------------------------------------------+

+-----------------------------------------+--------------------+
| 5. Calendario                           | 6. Próximos        |
| calendario "semanal"                    |                    |
|                                         |                    |
|                                         |                    |
|                                         |                    |
|                                         |                    |
|                                         |                    |
|                                         |                    |
|                                         |                    |
|                                         |                    |
|                                         |                    |
|                                         |                    |
+-----------------------------------------+--------------------+

+--------------------------------------------------------------+
| 7. Llamada                                                   |
|                                                              |
|                                                              |
|                                                              |
|                                                              |
+--------------------------------------------------------------+
```

Orden de lectura (DOM, foco y móvil):

1. Barra de navegación → `landing.navbar@simple` → enlaza a «Dashboard»
2. Hero → `landing.hero@split` — nota: "con captura del producto"
3. Captura → integrado en «Hero»
4. Características → `landing.features` ×3
5. Calendario → `ui.calendar@week` — nota: "calendario 'semanal'"
6. Próximos → `ui.list`
7. Llamada → `landing.cta@banner` → enlaza a «Ajustes»

Ocultos: «Pie».

- Tablet (8 columnas, menos de 64rem): «Calendario» y «Próximos» pasan a varias líneas.
- Móvil (4 columnas, menos de 40rem): todo en una columna, a ancho completo y en el orden de lectura; «Barra de navegación» → menú hamburguesa; «Hero» → texto arriba; «Características» → una columna; «Calendario» → agenda; ocultos: «Próximos».

### Dashboard (`/dashboard`)

Pantalla de app · navegación: Lateral · con cabecera de página.

```text
+--------------------------------------------------------------+
| 1. KPIs ×4                                                   |
|                                                              |
|                                                              |
+--------------------------------------------------------------+

+-------------------------------+------------------------------+
| 2. Gráfica                    | 3. Actividad                 |
|                               |                              |
|                               |                              |
|                               |                              |
|                               +--------------+---------------+
|                               | 4. Tabla     | 5. Tarjetas × |
|                               |              |               |
|                               |              |               |
|                               |              |               |
+---------------+------------------------------+               |
| 6. Texto      | 7. Lista                     |               |
|               |                              |               |
|               |                              |               |
|               |                              |               |
+---------------+------------------------------+---------------+
```

Orden de lectura (DOM, foco y móvil):

1. KPIs → `app.kpiRow` ×4
2. Gráfica → `app.chartCard@area`
3. Actividad → `app.activity`
4. Tabla → `app.dataTable`
5. Tarjetas → `ui.cards` ×2 → enlaza a «Ajustes»
6. Texto → `ui.text`
7. Lista → `ui.list`

- Tablet (8 columnas, menos de 64rem): «Gráfica», «Actividad», «Tabla», «Tarjetas», «Texto» y «Lista» se apilan; la navegación lateral pasa a rail.
- Móvil (4 columnas, menos de 40rem): todo en una columna, a ancho completo y en el orden de lectura; la navegación pasa a una barra superior; «KPIs» → rejilla 2×2; «Tabla» → lista de tarjetas; «Tarjetas» → una columna.
- Rejilla sin corte limpio: `grid-template-areas: "b-a b-a b-b b-b" "b-a b-a b-c b-d" "b-e b-f b-f b-d"` (b-a = 2. Gráfica · b-b = 3. Actividad · b-c = 4. Tabla · b-d = 5. Tarjetas · b-e = 6. Texto · b-f = 7. Lista).

### Ajustes (`/ajustes`)

Pantalla de app · navegación: Lateral · sin cabecera de página.

```text
+-----------------------------------------+--------------------+
| 1. Ajustes                              | 2. Formulario      |
|                                         | cambiar contraseña |
|                                         |                    |
|                                         |                    |
|                                         |                    |
|                                         |                    |
|                                         |                    |
|                                         |                    |
|                                         |                    |
|                                         +--------------------+
|                                         |
|                                         |
|                                         |
|                                         |
+-----------------------------------------+
```

Orden de lectura (DOM, foco y móvil):

1. Ajustes → `app.settingsForm@stacked`
2. Formulario → `ui.form` — nota: "cambiar contraseña"

- Tablet (8 columnas, menos de 64rem): «Ajustes» y «Formulario» pasan a varias líneas; la navegación lateral pasa a rail.
- Móvil (4 columnas, menos de 40rem): todo en una columna, a ancho completo y en el orden de lectura; la navegación pasa a una barra superior.

### Páginas

**Inicio** (Layout propio)

1. Barra de navegación (`landing.navbar`) — variant: "simple"
   links: "Producto"; "Panel"
2. Hero (`landing.hero`) — variant: "split" · title: "Lanza más rápido" · subtitle: "Despliega en segundos"
3. Funcionalidades (`landing.features`)
   items: "Rápido"; "Seguro"; "Simple"
4. Calendario (`ui.calendar`) — variant: "week" · title: "Agenda"
5. Lista (`ui.list`) — title: "Próximos eventos"
6. Llamada a la acción (`landing.cta`) — variant: "banner" · title: "Empieza hoy"

**Dashboard** (Layout propio)

1. Shell (sidebar y topbar) (`app.shell`)
   - Fila de KPIs (`app.kpiRow`)
      items: "MRR — 12k"
   - Gráfica (`app.chartCard`) — variant: "area" · title: "Ingresos"
   - Actividad (`app.activity`) — title: "Actividad"
   - Tabla de datos (`app.dataTable`) — title: "Clientes"
   - Tarjetas (`ui.cards`)
      items: "Plan"; "Equipo"
   - Texto (`ui.text`) — title: "Notas"
   - Lista (`ui.list`) — title: "Tareas"

**Ajustes** (Layout propio)

1. Shell (sidebar y topbar) (`app.shell`)
   - Formulario de ajustes (`app.settingsForm`) — variant: "stacked" · title: "Ajustes"
   - Formulario (`ui.form`) — title: "Contraseña"

**Guía de estilo** (`brand-board`)

1. Portada (`brand.cover`)
2. 01 Identidad (`brand.identity`)
3. 02 Paleta (`brand.palette`)
4. 03 Tipografía (`brand.type`)
5. 04 Formas (`brand.shape`)
6. 05 Componentes (`brand.components`)
7. 06 Dirección de arte (`brand.artDirection`)

## Reglas

- Usa los hex y los roles exactos. No inventes colores, fuentes, radios ni sombras.
- `--brand` es decorativo: para texto con color de marca usa `--primary-text`.
- `--cta` solo para la acción principal de cada vista. `--accent` es la superficie de hover, no el CTA.
- Un solo display por vista; la jerarquía sale de la escala tipográfica.
- Anima con CSS o Motion (motion.dev), nunca con GSAP, y sin pasar de la duración `slow`.

## Archivos del pack

- `theme.css`: todas las variables CSS (`:root` y `.dark`)
- `tokens.tokens.json`: tokens DTCG 2025.10 (color, tipografía, dimensiones, sombras, duraciones y componentes)
- `figma-light.tokens.json`: variables de color de Figma, modo claro
- `figma-dark.tokens.json`: variables de color de Figma, modo oscuro
- `figma-numbers.tokens.json`: variables numéricas de Figma (radios, espacios y componentes)
- `DESIGN.md`: brief legible para agentes (spec DESIGN.md)
