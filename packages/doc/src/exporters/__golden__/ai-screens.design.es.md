---
version: "alpha"
name: "Acme Cloud"
description: "Ship faster, sleep better"
colors:
  background: "#ffffff"
  foreground: "#090a0d"
  card: "#ffffff"
  card-foreground: "#090a0d"
  popover: "#ffffff"
  popover-foreground: "#090a0d"
  primary: "#3a5bd9"
  primary-foreground: "#ffffff"
  secondary: "#f3f5f9"
  secondary-foreground: "#15171b"
  muted: "#f3f5f9"
  muted-foreground: "#6e7077"
  accent: "#e8efff"
  accent-foreground: "#29408c"
  destructive: "#dd1b57"
  destructive-foreground: "#ffffff"
  border: "#e3e5ea"
  input: "#92959b"
  ring: "#6b90fa"
  chart-1: "#3a5bd9"
  chart-2: "#c656a6"
  chart-3: "#ce6400"
  chart-4: "#749400"
  chart-5: "#00999b"
  brand: "#3a5bd9"
  cta: "#b37200"
  cta-foreground: "#090a0d"
  primary-text: "#3a5bd9"
  border-strong: "#92959b"
  success: "#00835e"
  success-foreground: "#ffffff"
  warning: "#9c5500"
  warning-foreground: "#ffffff"
  info: "#1f6dbf"
  info-foreground: "#ffffff"
  brand-50: "#f4f7ff"
  brand-100: "#e8efff"
  brand-200: "#d3e0ff"
  brand-300: "#b6cbff"
  brand-400: "#8eadff"
  brand-500: "#6f94ff"
  brand-600: "#4b72ff"
  brand-700: "#3a5bd9"
  brand-800: "#304bae"
  brand-900: "#29408c"
  brand-950: "#152355"
  cta-50: "#fef6ed"
  cta-100: "#ffecd6"
  cta-200: "#ffdab0"
  cta-300: "#fcc177"
  cta-400: "#f0a024"
  cta-500: "#d68a00"
  cta-600: "#b37200"
  cta-700: "#935b00"
  cta-800: "#784900"
  cta-900: "#653d00"
  cta-950: "#3c2100"
  neutral-50: "#f9fafd"
  neutral-100: "#f3f5f9"
  neutral-200: "#e3e5ea"
  neutral-300: "#d1d4da"
  neutral-400: "#9ea1a8"
  neutral-500: "#70737a"
  neutral-600: "#4f5259"
  neutral-700: "#3d4046"
  neutral-800: "#24262b"
  neutral-900: "#15171b"
  neutral-950: "#090a0d"
  success-50: "#f1faf5"
  success-100: "#dff6eb"
  success-200: "#c1eed9"
  success-300: "#95e2c0"
  success-400: "#5dcea2"
  success-500: "#31bb8c"
  success-600: "#00a275"
  success-700: "#00835e"
  success-800: "#06694b"
  success-900: "#13563f"
  success-950: "#053122"
  warning-50: "#fff6ee"
  warning-100: "#ffebdc"
  warning-200: "#ffd9bc"
  warning-300: "#ffbf8a"
  warning-400: "#ff972f"
  warning-500: "#e58000"
  warning-600: "#bf6a00"
  warning-700: "#9c5500"
  warning-800: "#7f4500"
  warning-900: "#6b3900"
  warning-950: "#3f1f00"
  error-50: "#fff5f5"
  error-100: "#ffe8ea"
  error-200: "#ffd1d6"
  error-300: "#ffb0b9"
  error-400: "#ff7d91"
  error-500: "#ff4270"
  error-600: "#dd1b57"
  error-700: "#b71146"
  error-800: "#94173a"
  error-900: "#791c32"
  error-950: "#4b0e1c"
  info-50: "#f3f8ff"
  info-100: "#e5f0ff"
  info-200: "#cde4ff"
  info-300: "#abd1ff"
  info-400: "#7bb7ff"
  info-500: "#4fa1ff"
  info-600: "#2c87e9"
  info-700: "#1f6dbf"
  info-800: "#1c5899"
  info-900: "#1d497c"
  info-950: "#0c2949"
typography:
  display:
    fontFamily: "Inter"
    fontSize: "56px"
    fontWeight: 600
    lineHeight: 1.15
    letterSpacing: "-0.02em"
  h1:
    fontFamily: "Inter"
    fontSize: "39px"
    fontWeight: 600
    lineHeight: 1.15
    letterSpacing: "-0.02em"
  h2:
    fontFamily: "Inter"
    fontSize: "31px"
    fontWeight: 600
    lineHeight: 1.15
    letterSpacing: "-0.02em"
  h3:
    fontFamily: "Inter"
    fontSize: "25px"
    fontWeight: 600
    lineHeight: 1.15
    letterSpacing: "-0.02em"
  body:
    fontFamily: "Inter"
    fontSize: "16px"
    fontWeight: 400
    lineHeight: 1.6
  small:
    fontFamily: "Inter"
    fontSize: "14px"
    fontWeight: 400
    lineHeight: 1.6
  caption:
    fontFamily: "Inter"
    fontSize: "12px"
    fontWeight: 400
    lineHeight: 1.6
  button:
    fontFamily: "Inter"
    fontSize: "16px"
    fontWeight: 500
    lineHeight: 1
rounded:
  sm: "8px"
  md: "12px"
  lg: "16px"
  xl: "24px"
  full: "9999px"
spacing:
  xxs: "4px"
  xs: "8px"
  sm: "12px"
  md: "16px"
  lg: "24px"
  xl: "32px"
  "2xl": "48px"
  "3xl": "64px"
  "4xl": "96px"
  "5xl": "128px"
  section: "96px"
  container: "1200px"
components:
  button-primary:
    backgroundColor: "{colors.primary}"
    textColor: "{colors.primary-foreground}"
    typography: "{typography.button}"
    rounded: "{rounded.full}"
    padding: "{spacing.lg}"
    height: "40px"
  button-secondary:
    backgroundColor: "{colors.secondary}"
    textColor: "{colors.secondary-foreground}"
    typography: "{typography.button}"
    rounded: "{rounded.full}"
    padding: "{spacing.lg}"
    height: "40px"
  button-cta:
    backgroundColor: "{colors.cta}"
    textColor: "{colors.cta-foreground}"
    typography: "{typography.button}"
    rounded: "{rounded.full}"
    padding: "{spacing.lg}"
    height: "40px"
  button-sm:
    height: "32px"
  button-lg:
    height: "48px"
  card:
    backgroundColor: "{colors.card}"
    textColor: "{colors.card-foreground}"
    rounded: "{rounded.lg}"
    padding: "{spacing.lg}"
  input:
    backgroundColor: "{colors.background}"
    textColor: "{colors.foreground}"
    rounded: "{rounded.md}"
    height: "40px"
  badge:
    backgroundColor: "{colors.secondary}"
    textColor: "{colors.secondary-foreground}"
    rounded: "{rounded.full}"
  nav:
    backgroundColor: "{colors.background}"
    textColor: "{colors.foreground}"
    height: "64px"
  table-row:
    height: "48px"
  sidebar:
    backgroundColor: "{colors.card}"
    textColor: "{colors.card-foreground}"
    width: "256px"
---

# Acme Cloud

## Overview

> Ship faster, sleep better

Cristal: Capas translúcidas con desenfoque sobre fondos con color. Profundidad sin peso.

- Producto: SaaS (general)
- Foco: Landing page
- Páginas: Inicio, Dashboard, Ajustes, Guía de estilo
- Estilo de paleta: brand
- Diales: variance 5/10 · motion 5/10 · density 5/10
- Modo por defecto: Claro

Generado por Dialmade desde un DesignDoc v2. Los valores son exactos: no los aproximes.

## Colors

Todos los pares de texto y UI cumplen WCAG 2.2 AA en los dos modos. Los nombres coinciden con las variables CSS (`--primary`) y con shadcn/ui.

| Rol | Claro | Oscuro | Uso |
| --- | --- | --- | --- |
| `background` | #ffffff | #090a0d | Fondo de página |
| `foreground` | #090a0d | #f9fafd | Texto principal |
| `card` | #ffffff | #15171b | Superficie de tarjetas, popovers y sidebar |
| `card-foreground` | #090a0d | #f9fafd |  |
| `popover` | #ffffff | #15171b |  |
| `popover-foreground` | #090a0d | #f9fafd |  |
| `primary` | #3a5bd9 | #6f94ff | Acciones principales (botón primario, enlaces activos) |
| `primary-foreground` | #ffffff | #152355 | Texto sobre primary |
| `secondary` | #f3f5f9 | #24262b | Botón secundario y chips |
| `secondary-foreground` | #15171b | #f9fafd |  |
| `muted` | #f3f5f9 | #24262b | Fondos discretos |
| `muted-foreground` | #6e7077 | #9ea1a8 | Texto secundario (AA sobre background, card y muted) |
| `accent` | #e8efff | #152355 | Superficie de hover (convención shadcn), no es el CTA |
| `accent-foreground` | #29408c | #e8efff |  |
| `destructive` | #dd1b57 | #ff7d91 | Errores y acciones destructivas |
| `destructive-foreground` | #ffffff | #4b0e1c |  |
| `border` | #e3e5ea | #24262b | Divisores decorativos |
| `input` | #92959b | #60646b | Borde de campos (3:1) |
| `ring` | #6b90fa | #8eadff | Anillo de foco (3:1) |
| `chart-1` | #3a5bd9 | #6f94ff |  |
| `chart-2` | #c656a6 | #e875c6 |  |
| `chart-3` | #ce6400 | #f58029 |  |
| `chart-4` | #749400 | #8fb51e |  |
| `chart-5` | #00999b | #00bcbd |  |
| `brand` | #3a5bd9 | #3a5bd9 | Color exacto de la marca. Decorativo: sin garantía de contraste |
| `cta` | #b37200 | #f0a024 | Llamada a la acción principal |
| `cta-foreground` | #090a0d | #3c2100 |  |
| `primary-text` | #3a5bd9 | #6f94ff | Texto con color de marca (4.5:1 sobre background y card) |
| `border-strong` | #92959b | #60646b | Borde de UI que cumple 3:1 |
| `success` | #00835e | #5dcea2 | Éxito |
| `success-foreground` | #ffffff | #053122 |  |
| `warning` | #9c5500 | #ff972f | Aviso |
| `warning-foreground` | #ffffff | #3f1f00 |  |
| `info` | #1f6dbf | #7bb7ff | Información |
| `info-foreground` | #ffffff | #0c2949 |  |

Escalas 50–950 disponibles como `--color-<escala>-<paso>`: brand, cta, neutral, success, warning, error, info.

## Typography

Títulos en **Inter** y texto en **Inter** (Google Fonts: https://fonts.googleapis.com/css2?family=Inter:wght@400;500;600;700&display=swap). Display y h1 son fluidos entre 375 px y 1280 px; la tabla muestra el máximo.

| Token | Tamaño | Interlineado | Peso | Tracking |
| --- | --- | --- | --- | --- |
| `display` (`--dl-fs-display`) | 34–56px | 1.15 | 600 | -0.02em |
| `h1` (`--dl-fs-h1`) | 31–39px | 1.15 | 600 | -0.02em |
| `h2` (`--dl-fs-h2`) | 31px | 1.15 | 600 | -0.02em |
| `h3` (`--dl-fs-h3`) | 25px | 1.15 | 600 | -0.02em |
| `body` (`--dl-fs-body`) | 16px | 1.6 | 400 | 0 |
| `small` (`--dl-fs-small`) | 14px | 1.6 | 400 | 0 |
| `caption` (`--dl-fs-caption`) | 12px | 1.6 | 400 | 0 |

## Layout

Escala de 10 pasos con base de 4 px, ajustada a densidad 5/10 (más densidad, menos aire). Variables `--dl-space-1`…`--dl-space-10`.

| Token | Valor | Variable |
| --- | --- | --- |
| xxs | 4px | --dl-space-1 |
| xs | 8px | --dl-space-2 |
| sm | 12px | --dl-space-3 |
| md | 16px | --dl-space-4 |
| lg | 24px | --dl-space-5 |
| xl | 32px | --dl-space-6 |
| 2xl | 48px | --dl-space-7 |
| 3xl | 64px | --dl-space-8 |
| 4xl | 96px | --dl-space-9 |
| 5xl | 128px | --dl-space-10 |

- Ancho máximo del contenedor: 1200px (`--dl-container`)
- Padding vertical de sección: 96px (`--dl-section-py`)

### Pantallas y flujo

Una ruta por pantalla, en este orden. Cada pantalla es una rejilla de 12 columnas (filas de 8 px); su wireframe y su orden de lectura usan los mismos números.

En el pack de código, cada pantalla lleva junto a su `index.html` su `layout.css` (la rejilla; va después del CSS del kit) y su `layout.json` (bloques, orden de lectura, reglas de tablet y móvil y enlaces).

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
| con captura del producto                                     |
|                                                              |
|                                                              |
|                                                              |
|                                                              |
|                                                              |
|                                                              |
|                                                              |
|                                                              |
|                                                              |
|                                                              |
|                                                              |
|                                                              |
+--------------------------------------------------------------+

+--------------------------------------------------------------+
| 3. Características ×3                                        |
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
| 4. Calendario                           | 5. Próximos        |
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
| 6. Llamada                                                   |
|                                                              |
|                                                              |
|                                                              |
|                                                              |
+--------------------------------------------------------------+
```

Orden de lectura (DOM, foco y móvil):

1. Barra de navegación → `landing.navbar@simple` → enlaza a «Dashboard»
2. Hero → `landing.hero@split` (con «Captura» dentro) — nota: "con captura del producto"
3. Características → `landing.features` ×3
4. Calendario → `ui.calendar@week` — nota: "calendario 'semanal'"
5. Próximos → `ui.list`
6. Llamada → `landing.cta@banner` → enlaza a «Ajustes»

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

## Elevation & Depth

Sombras «soft» sobre superficies «glass».

| Token | Claro | Oscuro |
| --- | --- | --- |
| `--dl-shadow-sm` | 0 1px 2px 0 rgb(9 10 13 / 0.05), 0 1px 3px 0 rgb(9 10 13 / 0.08) | 0 1px 2px 0 rgb(9 10 13 / 0.11), 0 1px 3px 0 rgb(9 10 13 / 0.176) |
| `--dl-shadow-md` | 0 4px 12px -2px rgb(9 10 13 / 0.08), 0 2px 4px -2px rgb(9 10 13 / 0.06) | 0 4px 12px -2px rgb(9 10 13 / 0.176), 0 2px 4px -2px rgb(9 10 13 / 0.132) |
| `--dl-shadow-lg` | 0 16px 40px -8px rgb(9 10 13 / 0.14), 0 6px 12px -6px rgb(9 10 13 / 0.08) | 0 16px 40px -8px rgb(9 10 13 / 0.308), 0 6px 12px -6px rgb(9 10 13 / 0.176) |

## Shapes

Radios en px (variables `--dl-radius-*`); `full` es una píldora.

| Token | Valor |
| --- | --- |
| `--dl-radius-sm` | 8px |
| `--dl-radius-md` | 12px |
| `--dl-radius-lg` | 16px |
| `--dl-radius-xl` | 24px |
| `--dl-radius-full` | 9999px |

- Grosor de borde: 1px (`--dl-border-width`)

## Components

Tokens de componente compilados desde la receta y sus ajustes. Úsalos en lugar de valores literales.

| Componente | Propiedad | Valor | Variable |
| --- | --- | --- | --- |
| Button | radius | 9999px (radius.full) | `--dl-button-radius` |
| Button | height sm / md / lg | 32 / 40 / 48px | `--dl-button-h-sm/-md/-lg` |
| Button | padding-x | 24px (space.5) | `--dl-button-px` |
| Button | font-weight | 500 | `--dl-button-weight` |
| Button | shadow | none | `--dl-button-shadow` |
| Card | radius | 16px (radius.lg) | `--dl-card-radius` |
| Card | padding | 24px (space.5) | `--dl-card-padding` |
| Card | shadow | --dl-shadow-md | `--dl-card-shadow` |
| Card | border | 1px solid --border | `--dl-card-border` |
| Input | radius | 12px (radius.md) | `--dl-input-radius` |
| Input | height | 40px | `--dl-input-h` |
| Badge | radius | 9999px (radius.full) | `--dl-badge-radius` |
| Nav | height | 64px | `--dl-nav-h` |
| Table | row height | 48px | `--dl-table-row-h` |
| Sidebar | width | 256px | `--dl-sidebar-w` |

## Motion

Tier «Estándar». Respeta siempre `prefers-reduced-motion` (sustituye por fundidos o nada).

| Token | Valor |
| --- | --- |
| `--dl-duration-fast` | 200ms |
| `--dl-duration-base` | 440ms |
| `--dl-duration-slow` | 600ms |
| `--dl-ease` | cubic-bezier(0.215, 0.61, 0.355, 1) |

## Páginas

### Inicio (Layout propio)

- Barra de navegación (`landing.navbar`) — variant: "simple"
   links: "Producto"; "Panel"
- Hero (`landing.hero`) — variant: "split" · title: "Lanza más rápido" · subtitle: "Despliega en segundos"
- Funcionalidades (`landing.features`)
   items: "Rápido"; "Seguro"; "Simple"
- Calendario (`ui.calendar`) — variant: "week" · title: "Agenda"
- Lista (`ui.list`) — title: "Próximos eventos"
- Llamada a la acción (`landing.cta`) — variant: "banner" · title: "Empieza hoy"
- Pie de página (`landing.footer`) — oculta

### Dashboard (Layout propio)

- Shell (sidebar y topbar) (`app.shell`)
  - Fila de KPIs (`app.kpiRow`)
     items: "MRR — 12k"
  - Gráfica (`app.chartCard`) — variant: "area" · title: "Ingresos"
  - Actividad (`app.activity`) — title: "Actividad"
  - Tabla de datos (`app.dataTable`) — title: "Clientes"
  - Tarjetas (`ui.cards`)
     items: "Plan"; "Equipo"
  - Texto (`ui.text`) — title: "Notas"
  - Lista (`ui.list`) — title: "Tareas"

### Ajustes (Layout propio)

- Shell (sidebar y topbar) (`app.shell`)
  - Formulario de ajustes (`app.settingsForm`) — variant: "stacked" · title: "Ajustes"
  - Formulario (`ui.form`) — title: "Contraseña"

### Guía de estilo (`brand-board`)

- Portada (`brand.cover`)
- 01 Identidad (`brand.identity`)
- 02 Paleta (`brand.palette`)
- 03 Tipografía (`brand.type`)
- 04 Formas (`brand.shape`)
- 05 Componentes (`brand.components`)
- 06 Dirección de arte (`brand.artDirection`)

## Diseño con IA

Claude diseñó el interior de estos bloques con los tokens de la marca. El layout (pantallas, bloques, orden y posición) es del usuario.

### Dirección de arte

Dirección elegida: «editorial».

| Eje | Valor |
| --- | --- |
| composition | editorial |
| typeVoice | humanist |
| decoration | rules-and-grids |
| imagery | framed-screens |
| colorStrategy | neutral-with-pops |
| rhythm | airy |

Movimientos de diseño:

- Títulos alineados a la izquierda con regla fina
- Cards con borde y sin sombra

Por qué: Una voz editorial y sobria: el producto se lee como una revista técnica.

### Bloques de IA por pantalla

**Inicio** (`/`)

- Barra de navegación (`navbar`): diseño base
- Hero (`hero`): «Lanza más rápido & mejor» · claude-haiku-5-5 · 2026-10-10
- Captura (`media`): diseño base
- Características (`features`): «Sin título, con backticks dentro» · claude-haiku-5-5 · 2026-10-10
- Calendario (`calendar`): diseño base
- Próximos (`list`): diseño base
- Llamada (`cta`): diseño base

**Dashboard** (`/dashboard`)

Sin bloques de IA.

**Ajustes** (`/ajustes`)

Sin bloques de IA.

## Do's and Don'ts

- **Haz:** Usa las variables CSS (`var(--primary)`, `var(--dl-radius-md)`, `var(--dl-space-4)`) en lugar de valores literales.
- **Haz:** Usa `--primary-text` para texto con el color de marca sobre background o card.
- **Haz:** Reserva `--cta` para la acción principal de cada vista.
- **Haz:** Mantén la jerarquía con la escala tipográfica: un solo display por vista.
- **Evita:** No uses `--brand` para texto: es decorativo y no garantiza contraste.
- **Evita:** No inventes colores, radios ni sombras fuera de la escala.
- **Evita:** No uses `--accent` como color de CTA: en shadcn es la superficie de hover.
- **Evita:** No animes con GSAP ni superes la duración `slow`; no ignores reduced motion.
