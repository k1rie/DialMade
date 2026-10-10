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

Glass: Translucent, blurred layers over colourful backgrounds. Depth without weight.

- Product: SaaS (General)
- Focus: Landing page
- Pages: Inicio, Dashboard, Ajustes, Style guide
- Palette style: brand
- Dials: variance 5/10 · motion 5/10 · density 5/10
- Default mode: Light

Generated by Dialmade from a DesignDoc v2. Values are exact: do not approximate them.

## Colors

Every text and UI pair meets WCAG 2.2 AA in both modes. Names match the CSS variables (`--primary`) and shadcn/ui.

| Role | Light | Dark | Use |
| --- | --- | --- | --- |
| `background` | #ffffff | #090a0d | Page background |
| `foreground` | #090a0d | #f9fafd | Body text |
| `card` | #ffffff | #15171b | Cards, popovers and sidebar surface |
| `card-foreground` | #090a0d | #f9fafd |  |
| `popover` | #ffffff | #15171b |  |
| `popover-foreground` | #090a0d | #f9fafd |  |
| `primary` | #3a5bd9 | #6f94ff | Primary actions (primary button, active links) |
| `primary-foreground` | #ffffff | #152355 | Text on primary |
| `secondary` | #f3f5f9 | #24262b | Secondary button and chips |
| `secondary-foreground` | #15171b | #f9fafd |  |
| `muted` | #f3f5f9 | #24262b | Quiet backgrounds |
| `muted-foreground` | #6e7077 | #9ea1a8 | Secondary text (AA on background, card and muted) |
| `accent` | #e8efff | #152355 | Hover surface (shadcn convention), not the CTA |
| `accent-foreground` | #29408c | #e8efff |  |
| `destructive` | #dd1b57 | #ff7d91 | Errors and destructive actions |
| `destructive-foreground` | #ffffff | #4b0e1c |  |
| `border` | #e3e5ea | #24262b | Decorative dividers |
| `input` | #92959b | #60646b | Field borders (3:1) |
| `ring` | #6b90fa | #8eadff | Focus ring (3:1) |
| `chart-1` | #3a5bd9 | #6f94ff |  |
| `chart-2` | #c656a6 | #e875c6 |  |
| `chart-3` | #ce6400 | #f58029 |  |
| `chart-4` | #749400 | #8fb51e |  |
| `chart-5` | #00999b | #00bcbd |  |
| `brand` | #3a5bd9 | #3a5bd9 | Exact brand color. Decorative: no contrast guarantee |
| `cta` | #b37200 | #f0a024 | Main call to action |
| `cta-foreground` | #090a0d | #3c2100 |  |
| `primary-text` | #3a5bd9 | #6f94ff | Brand-colored text (4.5:1 on background and card) |
| `border-strong` | #92959b | #60646b | UI border that meets 3:1 |
| `success` | #00835e | #5dcea2 | Success |
| `success-foreground` | #ffffff | #053122 |  |
| `warning` | #9c5500 | #ff972f | Warning |
| `warning-foreground` | #ffffff | #3f1f00 |  |
| `info` | #1f6dbf | #7bb7ff | Info |
| `info-foreground` | #ffffff | #0c2949 |  |

50–950 scales available as `--color-<scale>-<step>`: brand, cta, neutral, success, warning, error, info.

## Typography

Headings in **Inter**, text in **Inter** (Google Fonts: https://fonts.googleapis.com/css2?family=Inter:wght@400;500;600;700&display=swap). Display and h1 are fluid between 375px and 1280px; the table shows the maximum.

| Token | Size | Line height | Weight | Tracking |
| --- | --- | --- | --- | --- |
| `display` (`--dl-fs-display`) | 34–56px | 1.15 | 600 | -0.02em |
| `h1` (`--dl-fs-h1`) | 31–39px | 1.15 | 600 | -0.02em |
| `h2` (`--dl-fs-h2`) | 31px | 1.15 | 600 | -0.02em |
| `h3` (`--dl-fs-h3`) | 25px | 1.15 | 600 | -0.02em |
| `body` (`--dl-fs-body`) | 16px | 1.6 | 400 | 0 |
| `small` (`--dl-fs-small`) | 14px | 1.6 | 400 | 0 |
| `caption` (`--dl-fs-caption`) | 12px | 1.6 | 400 | 0 |

## Layout

A 10-step scale on a 4px base, tuned to density 5/10 (denser means less air). Variables `--dl-space-1`…`--dl-space-10`.

| Token | Value | Variable |
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

- Container max width: 1200px (`--dl-container`)
- Section vertical padding: 96px (`--dl-section-py`)

### Screens and flow

One route per screen, in this order. Each screen is a 12-column grid (8px rows); its wireframe and its reading order share the same numbers.

In the code pack, each screen carries its `layout.css` (the grid; load it after the kit CSS) and its `layout.json` (blocks, reading order, tablet and phone rules and links) next to its `index.html`.

1. Inicio (`/`) · Public website
2. Dashboard (`/dashboard`) · App screen · navigation: Sidebar · with page header
3. Ajustes (`/ajustes`) · App screen · navigation: Sidebar · without page header

Links:

- Inicio → "Dashboard" (from "Barra de navegación") · "Ajustes" (from "Llamada")
- Dashboard → "Ajustes" (from "Tarjetas")
- The Sidebar navigation links the app screens: Dashboard, Ajustes.

### Inicio (`/`)

Public website.

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

Reading order (DOM, focus and phone):

1. Barra de navegación → `landing.navbar@simple` → links to "Dashboard"
2. Hero → `landing.hero@split` (with "Captura" inside) — note: "con captura del producto"
3. Características → `landing.features` ×3
4. Calendario → `ui.calendar@week` — note: "calendario 'semanal'"
5. Próximos → `ui.list`
6. Llamada → `landing.cta@banner` → links to "Ajustes"

Hidden: "Pie".

- Tablet (8 columns, under 64rem): "Calendario" and "Próximos" wrap onto several lines.
- Phone (4 columns, under 40rem): everything in one full-width column, in reading order; "Barra de navegación" → hamburger menu; "Hero" → text first; "Características" → one column; "Calendario" → agenda; hidden: "Próximos".

### Dashboard (`/dashboard`)

App screen · navigation: Sidebar · with page header.

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

Reading order (DOM, focus and phone):

1. KPIs → `app.kpiRow` ×4
2. Gráfica → `app.chartCard@area`
3. Actividad → `app.activity`
4. Tabla → `app.dataTable`
5. Tarjetas → `ui.cards` ×2 → links to "Ajustes"
6. Texto → `ui.text`
7. Lista → `ui.list`

- Tablet (8 columns, under 64rem): "Gráfica", "Actividad", "Tabla", "Tarjetas", "Texto" and "Lista" stack; the sidebar navigation becomes a rail.
- Phone (4 columns, under 40rem): everything in one full-width column, in reading order; the navigation becomes a top bar; "KPIs" → 2×2 grid; "Tabla" → card list; "Tarjetas" → one column.
- Grid without a clean cut: `grid-template-areas: "b-a b-a b-b b-b" "b-a b-a b-c b-d" "b-e b-f b-f b-d"` (b-a = 2. Gráfica · b-b = 3. Actividad · b-c = 4. Tabla · b-d = 5. Tarjetas · b-e = 6. Texto · b-f = 7. Lista).

### Ajustes (`/ajustes`)

App screen · navigation: Sidebar · without page header.

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

Reading order (DOM, focus and phone):

1. Ajustes → `app.settingsForm@stacked`
2. Formulario → `ui.form` — note: "cambiar contraseña"

- Tablet (8 columns, under 64rem): "Ajustes" and "Formulario" wrap onto several lines; the sidebar navigation becomes a rail.
- Phone (4 columns, under 40rem): everything in one full-width column, in reading order; the navigation becomes a top bar.

## Elevation & Depth

"soft" shadows on "glass" surfaces.

| Token | Light | Dark |
| --- | --- | --- |
| `--dl-shadow-sm` | 0 1px 2px 0 rgb(9 10 13 / 0.05), 0 1px 3px 0 rgb(9 10 13 / 0.08) | 0 1px 2px 0 rgb(9 10 13 / 0.11), 0 1px 3px 0 rgb(9 10 13 / 0.176) |
| `--dl-shadow-md` | 0 4px 12px -2px rgb(9 10 13 / 0.08), 0 2px 4px -2px rgb(9 10 13 / 0.06) | 0 4px 12px -2px rgb(9 10 13 / 0.176), 0 2px 4px -2px rgb(9 10 13 / 0.132) |
| `--dl-shadow-lg` | 0 16px 40px -8px rgb(9 10 13 / 0.14), 0 6px 12px -6px rgb(9 10 13 / 0.08) | 0 16px 40px -8px rgb(9 10 13 / 0.308), 0 6px 12px -6px rgb(9 10 13 / 0.176) |

## Shapes

Radii in px (`--dl-radius-*` variables); `full` is a pill.

| Token | Value |
| --- | --- |
| `--dl-radius-sm` | 8px |
| `--dl-radius-md` | 12px |
| `--dl-radius-lg` | 16px |
| `--dl-radius-xl` | 24px |
| `--dl-radius-full` | 9999px |

- Border width: 1px (`--dl-border-width`)

## Components

Component tokens compiled from the recipe and its overrides. Use them instead of literal values.

| Component | Property | Value | Variable |
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

"Standard" tier. Always honour `prefers-reduced-motion` (swap for fades or nothing).

| Token | Value |
| --- | --- |
| `--dl-duration-fast` | 200ms |
| `--dl-duration-base` | 440ms |
| `--dl-duration-slow` | 600ms |
| `--dl-ease` | cubic-bezier(0.215, 0.61, 0.355, 1) |

## Pages

### Inicio (Custom layout)

- Navigation bar (`landing.navbar`) — variant: "simple"
   links: "Producto"; "Panel"
- Hero (`landing.hero`) — variant: "split" · title: "Lanza más rápido" · subtitle: "Despliega en segundos"
- Features (`landing.features`)
   items: "Rápido"; "Seguro"; "Simple"
- Calendar (`ui.calendar`) — variant: "week" · title: "Agenda"
- List (`ui.list`) — title: "Próximos eventos"
- Call to action (`landing.cta`) — variant: "banner" · title: "Empieza hoy"
- Footer (`landing.footer`) — hidden

### Dashboard (Custom layout)

- Shell (sidebar and top bar) (`app.shell`)
  - KPI row (`app.kpiRow`)
     items: "MRR — 12k"
  - Chart card (`app.chartCard`) — variant: "area" · title: "Ingresos"
  - Activity (`app.activity`) — title: "Actividad"
  - Data table (`app.dataTable`) — title: "Clientes"
  - Cards (`ui.cards`)
     items: "Plan"; "Equipo"
  - Text (`ui.text`) — title: "Notas"
  - List (`ui.list`) — title: "Tareas"

### Ajustes (Custom layout)

- Shell (sidebar and top bar) (`app.shell`)
  - Settings form (`app.settingsForm`) — variant: "stacked" · title: "Ajustes"
  - Form (`ui.form`) — title: "Contraseña"

### Style guide (`brand-board`)

- Cover (`brand.cover`)
- 01 Identity (`brand.identity`)
- 02 Palette (`brand.palette`)
- 03 Typography (`brand.type`)
- 04 Shapes (`brand.shape`)
- 05 Components (`brand.components`)
- 06 Art direction (`brand.artDirection`)

## Do's and Don'ts

- **Do:** Use the CSS variables (`var(--primary)`, `var(--dl-radius-md)`, `var(--dl-space-4)`) instead of literal values.
- **Do:** Use `--primary-text` for brand-colored text on background or card.
- **Do:** Keep `--cta` for the main action of each view.
- **Do:** Keep hierarchy with the type scale: one display per view.
- **Don't:** Don't use `--brand` for text: it is decorative and has no contrast guarantee.
- **Don't:** Don't invent colors, radii or shadows outside the scale.
- **Don't:** Don't use `--accent` as the CTA color: in shadcn it is the hover surface.
- **Don't:** Don't animate with GSAP or beyond the `slow` duration; don't ignore reduced motion.
