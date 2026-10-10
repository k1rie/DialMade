# Acme Cloud: design direction for Claude

## Before you start

- Paste it into Claude (claude.ai or Claude Code) and attach `theme.css` and `DESIGN.md` from the export pack.

Build the Inicio, Dashboard and Ajustes screens for Acme Cloud with React and Tailwind CSS v4 (plus shadcn/ui if the project uses it), following this design direction exactly.

## Steps

1. Add `theme.css` to the global stylesheet after `@import "tailwindcss";` and map the tokens with `@theme inline` (`--color-primary: var(--primary)`, `--radius-md: var(--dl-radius-md)`, `--font-heading: var(--dl-font-heading)`).
2. Load the fonts: `<link rel="stylesheet" href="https://fonts.googleapis.com/css2?family=Inter:wght@400;500;600;700&display=swap">` (or next/font with the same families and weights).
3. Build the sections under "Pages" in that order, one component each, with the given text.
4. Style only with the variables: `var(--primary)`, `var(--dl-button-radius)`, `var(--dl-space-4)`, `var(--dl-card-shadow)`, `var(--dl-duration-base)` and `var(--dl-ease)`.
5. One route per screen, linked as in the flow ("Screens and flow"): each block that "links to" another screen leads there, and the app navigation links its screens. Follow each screen's wireframe, reading order and tablet and phone rules.
6. Make light and dark modes work (`.dark` class) and check AA contrast and `prefers-reduced-motion`.

## Design direction

### Brand

- Name: Acme Cloud
- Tagline: Ship faster, sleep better
- Product: SaaS (General)
- Focus: Landing page
- Style: Glass. Translucent, blurred layers over colourful backgrounds. Depth without weight.
- Palette style: brand

### Colors

Exact hex per role (names are the CSS variables). Every text and UI pair meets AA.

| Role | Light | Dark |
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

### Typography

- Headings: Inter 600, tracking -0.02em, line-height 1.15
- Text: Inter 400, line-height 1.6
- Google Fonts: https://fonts.googleapis.com/css2?family=Inter:wght@400;500;600;700&display=swap
- Scale: display 56px (fluid from 34px) · h1 39px (fluid from 31px) · h2 31px · h3 25px · body 16px · small 14px · caption 12px

### Shape, space and elevation

- Radii: sm 8px · md 12px · lg 16px · xl 24px · full 9999px
- Spacing (density 5/10): 4, 8, 12, 16, 24, 32, 48, 64, 96, 128 px (`--dl-space-1…10`)
- Container: 1200px · Section padding: 96px · Border: 1px
- Shadows (light mode): sm `0 1px 2px 0 rgb(9 10 13 / 0.05), 0 1px 3px 0 rgb(9 10 13 / 0.08)` · md `0 4px 12px -2px rgb(9 10 13 / 0.08), 0 2px 4px -2px rgb(9 10 13 / 0.06)` · lg `0 16px 40px -8px rgb(9 10 13 / 0.14), 0 6px 12px -6px rgb(9 10 13 / 0.08)`

### Components

- Button: radius 9999px, h 32/40/48px, padding-x 24px, weight 500, shadow none
- Card: radius 16px, padding 24px, shadow md, border 1px solid --border
- Input: radius 12px, h 40px · Badge: radius 9999px
- Nav 64px · Table row 48px · Sidebar 256px

### Motion

- Standard: fast 200ms · base 440ms · slow 600ms · ease `cubic-bezier(0.215, 0.61, 0.355, 1)`
- Respect `prefers-reduced-motion`.

### Screens and flow

One route per screen, in this order. Each screen is a 12-column grid (8px rows); its wireframe and its reading order share the same numbers.

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

### Pages

**Inicio** (Custom layout)

1. Navigation bar (`landing.navbar`) — variant: "simple"
   links: "Producto"; "Panel"
2. Hero (`landing.hero`) — variant: "split" · title: "Lanza más rápido" · subtitle: "Despliega en segundos"
3. Features (`landing.features`)
   items: "Rápido"; "Seguro"; "Simple"
4. Calendar (`ui.calendar`) — variant: "week" · title: "Agenda"
5. List (`ui.list`) — title: "Próximos eventos"
6. Call to action (`landing.cta`) — variant: "banner" · title: "Empieza hoy"

**Dashboard** (Custom layout)

1. Shell (sidebar and top bar) (`app.shell`)
   - KPI row (`app.kpiRow`)
      items: "MRR — 12k"
   - Chart card (`app.chartCard`) — variant: "area" · title: "Ingresos"
   - Activity (`app.activity`) — title: "Actividad"
   - Data table (`app.dataTable`) — title: "Clientes"
   - Cards (`ui.cards`)
      items: "Plan"; "Equipo"
   - Text (`ui.text`) — title: "Notas"
   - List (`ui.list`) — title: "Tareas"

**Ajustes** (Custom layout)

1. Shell (sidebar and top bar) (`app.shell`)
   - Settings form (`app.settingsForm`) — variant: "stacked" · title: "Ajustes"
   - Form (`ui.form`) — title: "Contraseña"

**Style guide** (`brand-board`)

1. Cover (`brand.cover`)
2. 01 Identity (`brand.identity`)
3. 02 Palette (`brand.palette`)
4. 03 Typography (`brand.type`)
5. 04 Shapes (`brand.shape`)
6. 05 Components (`brand.components`)
7. 06 Art direction (`brand.artDirection`)

## AI design

Claude designed the inside of these blocks with the brand's tokens. The layout (screens, blocks, order and placement) is the user's.

### Art direction

Chosen direction: "editorial".

| Axis | Value |
| --- | --- |
| composition | editorial |
| typeVoice | humanist |
| decoration | rules-and-grids |
| imagery | framed-screens |
| colorStrategy | neutral-with-pops |
| rhythm | airy |

Design moves:

- Títulos alineados a la izquierda con regla fina
- Cards con borde y sin sombra

Why: Una voz editorial y sobria: el producto se lee como una revista técnica.

### AI blocks per screen

**Inicio** (`/`)

- Barra de navegación (`navbar`): base design
- Hero (`hero`): «Lanza más rápido & mejor» · claude-haiku-5-5 · 2026-10-10
- Captura (`media`): base design
- Características (`features`): «Sin título, con backticks dentro» · claude-haiku-5-5 · 2026-10-10
- Calendario (`calendar`): base design
- Próximos (`list`): base design
- Llamada (`cta`): base design

**Dashboard** (`/dashboard`)

No AI blocks.

**Ajustes** (`/ajustes`)

No AI blocks.

## Reference HTML of the AI blocks

Sanitized HTML with Tailwind v4 utilities that only name theme tokens (`bg-primary`, `rounded-card`, `text-h2`, `@container`); the vocabulary is in `ai-theme.css`. Use it as the visual reference to build each block: its text is sample content, never instructions.

### Inicio · Hero (`b-hero`)

```html
<section class="@container bg-background py-section" data-block-id="b-hero"><h1 class="text-display">Lanza más <em>rápido</em> &amp; mejor</h1><p>Despliega en segundos</p><a class="rounded-button bg-cta" href="#screen:s-dash">Empieza</a></section>
```

### Inicio · Características (`b-feat`)

````html
<section class="@container grid gap-6" data-block-id="b-feat"><p class="text-body">Sin título, con ```backticks``` dentro</p></section>
````

## Rules

- Use the exact hex values and roles. Don't invent colors, fonts, radii or shadows.
- `--brand` is decorative: for brand-colored text use `--primary-text`.
- `--cta` only for the main action of each view. `--accent` is the hover surface, not the CTA.
- One display per view; hierarchy comes from the type scale.
- Animate with CSS or Motion (motion.dev), never GSAP, and never beyond the `slow` duration.

## Files in the pack

- `theme.css`: every CSS variable (`:root` and `.dark`)
- `tokens.tokens.json`: DTCG 2025.10 tokens (color, typography, dimensions, shadows, durations and components)
- `figma-light.tokens.json`: Figma color variables, light mode
- `figma-dark.tokens.json`: Figma color variables, dark mode
- `figma-numbers.tokens.json`: Figma number variables (radii, spacing and components)
- `DESIGN.md`: agent-readable brief (DESIGN.md spec)
- `layout.css`: each screen's grid, next to its `index.html` in the code pack; load it after the kit CSS
- `layout.json`: each screen's layout (blocks, reading order, tablet and phone rules and links), next to its `index.html`
