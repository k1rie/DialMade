---
version: "alpha"
name: "Noir"
description: "Precisión técnica · Herramienta para desarrolladores o IDE"
colors:
  background: "#0a0a0a"
  foreground: "#fafafa"
  card: "#171717"
  card-foreground: "#fafafa"
  popover: "#171717"
  popover-foreground: "#fafafa"
  primary: "#e5e5e5"
  primary-foreground: "#0a0a0a"
  secondary: "#262626"
  secondary-foreground: "#fafafa"
  muted: "#262626"
  muted-foreground: "#a1a1a1"
  accent: "#262626"
  accent-foreground: "#fafafa"
  destructive: "#ff8174"
  destructive-foreground: "#4b100d"
  border: "#262626"
  input: "#646464"
  ring: "#a1a1a1"
  chart-1: "#e5e5e5"
  chart-2: "#ca88d5"
  chart-3: "#ea846d"
  chart-4: "#b0a93b"
  chart-5: "#13bfa5"
  brand: "#171717"
  cta: "#e5e5e5"
  cta-foreground: "#0a0a0a"
  primary-text: "#f5f5f5"
  border-strong: "#646464"
  success: "#5fd07e"
  success-foreground: "#063115"
  warning: "#efa200"
  warning-foreground: "#392300"
  info: "#5abdfe"
  info-foreground: "#062b42"
  brand-50: "#fafafa"
  brand-100: "#f5f5f5"
  brand-200: "#e5e5e5"
  brand-300: "#d4d4d4"
  brand-400: "#a1a1a1"
  brand-500: "#737373"
  brand-600: "#525252"
  brand-700: "#404040"
  brand-800: "#262626"
  brand-900: "#171717"
  brand-950: "#0a0a0a"
  neutral-50: "#fafafa"
  neutral-100: "#f5f5f5"
  neutral-200: "#e5e5e5"
  neutral-300: "#d4d4d4"
  neutral-400: "#a1a1a1"
  neutral-500: "#737373"
  neutral-600: "#525252"
  neutral-700: "#404040"
  neutral-800: "#262626"
  neutral-900: "#171717"
  neutral-950: "#0a0a0a"
  success-50: "#f1fbf2"
  success-100: "#dff7e3"
  success-200: "#c2efca"
  success-300: "#96e4a7"
  success-400: "#5fd07e"
  success-500: "#36bd63"
  success-600: "#0fa44d"
  success-700: "#00853c"
  success-800: "#0c6b31"
  success-900: "#16582b"
  success-950: "#063115"
  warning-50: "#fef6ec"
  warning-100: "#feecd4"
  warning-200: "#fedbad"
  warning-300: "#fbc271"
  warning-400: "#efa200"
  warning-500: "#d18d00"
  warning-600: "#af7500"
  warning-700: "#8e5f00"
  warning-800: "#744c00"
  warning-900: "#613f00"
  warning-950: "#392300"
  error-50: "#fff5f3"
  error-100: "#ffe8e5"
  error-200: "#ffd3cd"
  error-300: "#ffb2a8"
  error-400: "#ff8174"
  error-500: "#ff4a43"
  error-600: "#df2225"
  error-700: "#b8171b"
  error-800: "#961b1a"
  error-900: "#7a1e1b"
  error-950: "#4b100d"
  info-50: "#f1f9ff"
  info-100: "#e0f2ff"
  info-200: "#c5e6ff"
  info-300: "#9bd5ff"
  info-400: "#5abdfe"
  info-500: "#2fa8ee"
  info-600: "#008fd2"
  info-700: "#0073ab"
  info-800: "#075d8a"
  info-900: "#134d70"
  info-950: "#062b42"
typography:
  display:
    fontFamily: "JetBrains Mono"
    fontSize: "56px"
    fontWeight: 700
    lineHeight: 1.15
    letterSpacing: "-0.025em"
  h1:
    fontFamily: "JetBrains Mono"
    fontSize: "39px"
    fontWeight: 700
    lineHeight: 1.15
    letterSpacing: "-0.025em"
  h2:
    fontFamily: "JetBrains Mono"
    fontSize: "31px"
    fontWeight: 700
    lineHeight: 1.15
    letterSpacing: "-0.025em"
  h3:
    fontFamily: "JetBrains Mono"
    fontSize: "25px"
    fontWeight: 700
    lineHeight: 1.15
    letterSpacing: "-0.025em"
  body:
    fontFamily: "IBM Plex Sans"
    fontSize: "16px"
    fontWeight: 400
    lineHeight: 1.6
  small:
    fontFamily: "IBM Plex Sans"
    fontSize: "14px"
    fontWeight: 400
    lineHeight: 1.6
  caption:
    fontFamily: "IBM Plex Sans"
    fontSize: "12px"
    fontWeight: 400
    lineHeight: 1.6
  button:
    fontFamily: "IBM Plex Sans"
    fontSize: "16px"
    fontWeight: 500
    lineHeight: 1
rounded:
  sm: "4px"
  md: "6px"
  lg: "8px"
  xl: "12px"
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
    rounded: "{rounded.md}"
    padding: "{spacing.md}"
    height: "40px"
  button-secondary:
    backgroundColor: "{colors.secondary}"
    textColor: "{colors.secondary-foreground}"
    typography: "{typography.button}"
    rounded: "{rounded.md}"
    padding: "{spacing.md}"
    height: "40px"
  button-cta:
    backgroundColor: "{colors.cta}"
    textColor: "{colors.cta-foreground}"
    typography: "{typography.button}"
    rounded: "{rounded.md}"
    padding: "{spacing.md}"
    height: "40px"
  button-sm:
    height: "32px"
  button-lg:
    height: "48px"
  card:
    backgroundColor: "{colors.card}"
    textColor: "{colors.card-foreground}"
    rounded: "{rounded.lg}"
    padding: "{spacing.md}"
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

# Noir

## Overview

Precisión técnica: Superficies oscuras por capas, bordes de 1 px y brillos sutiles. Denso y preciso, como una consola moderna.

- Producto: Herramienta para desarrolladores o IDE
- Foco: Dashboard y componentes
- Estilo de paleta: brand
- Diales: variance 5/10 · motion 5/10 · density 5/10
- Modo por defecto: Oscuro

Generado por Dialmade desde un DesignDoc v2. Los valores son exactos: no los aproximes.

## Colors

Todos los pares de texto y UI cumplen WCAG 2.2 AA en los dos modos. Los nombres coinciden con las variables CSS (`--primary`) y con shadcn/ui.

| Rol | Claro | Oscuro | Uso |
| --- | --- | --- | --- |
| `background` | #ffffff | #0a0a0a | Fondo de página |
| `foreground` | #0a0a0a | #fafafa | Texto principal |
| `card` | #ffffff | #171717 | Superficie de tarjetas, popovers y sidebar |
| `card-foreground` | #0a0a0a | #fafafa |  |
| `popover` | #ffffff | #171717 |  |
| `popover-foreground` | #0a0a0a | #fafafa |  |
| `primary` | #171717 | #e5e5e5 | Acciones principales (botón primario, enlaces activos) |
| `primary-foreground` | #ffffff | #0a0a0a | Texto sobre primary |
| `secondary` | #f5f5f5 | #262626 | Botón secundario y chips |
| `secondary-foreground` | #171717 | #fafafa |  |
| `muted` | #f5f5f5 | #262626 | Fondos discretos |
| `muted-foreground` | #707070 | #a1a1a1 | Texto secundario (AA sobre background, card y muted) |
| `accent` | #f5f5f5 | #262626 | Superficie de hover (convención shadcn), no es el CTA |
| `accent-foreground` | #171717 | #fafafa |  |
| `destructive` | #df2225 | #ff8174 | Errores y acciones destructivas |
| `destructive-foreground` | #ffffff | #4b100d |  |
| `border` | #e5e5e5 | #262626 | Divisores decorativos |
| `input` | #949494 | #646464 | Borde de campos (3:1) |
| `ring` | #737373 | #a1a1a1 | Anillo de foco (3:1) |
| `chart-1` | #171717 | #e5e5e5 |  |
| `chart-2` | #aa6ab4 | #ca88d5 |  |
| `chart-3` | #c8664f | #ea846d |  |
| `chart-4` | #918a09 | #b0a93b |  |
| `chart-5` | #009c86 | #13bfa5 |  |
| `brand` | #171717 | #171717 | Color exacto de la marca. Decorativo: sin garantía de contraste |
| `cta` | #171717 | #e5e5e5 | Llamada a la acción principal |
| `cta-foreground` | #ffffff | #0a0a0a |  |
| `primary-text` | #171717 | #f5f5f5 | Texto con color de marca (4.5:1 sobre background y card) |
| `border-strong` | #949494 | #646464 | Borde de UI que cumple 3:1 |
| `success` | #00853c | #5fd07e | Éxito |
| `success-foreground` | #ffffff | #063115 |  |
| `warning` | #8e5f00 | #efa200 | Aviso |
| `warning-foreground` | #ffffff | #392300 |  |
| `info` | #0073ab | #5abdfe | Información |
| `info-foreground` | #ffffff | #062b42 |  |

Escalas 50–950 disponibles como `--color-<escala>-<paso>`: brand, neutral, success, warning, error, info.

## Typography

Títulos en **JetBrains Mono** y texto en **IBM Plex Sans** (Google Fonts: https://fonts.googleapis.com/css2?family=IBM+Plex+Sans:wght@400;500;600&family=JetBrains+Mono:wght@500;700&display=swap). Display y h1 son fluidos entre 375 px y 1280 px; la tabla muestra el máximo.

| Token | Tamaño | Interlineado | Peso | Tracking |
| --- | --- | --- | --- | --- |
| `display` (`--dl-fs-display`) | 34–56px | 1.15 | 700 | -0.025em |
| `h1` (`--dl-fs-h1`) | 31–39px | 1.15 | 700 | -0.025em |
| `h2` (`--dl-fs-h2`) | 31px | 1.15 | 700 | -0.025em |
| `h3` (`--dl-fs-h3`) | 25px | 1.15 | 700 | -0.025em |
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

## Elevation & Depth

Sombras «glow» sobre superficies «layered».

| Token | Claro | Oscuro |
| --- | --- | --- |
| `--dl-shadow-sm` | 0 0 0 1px rgb(23 23 23 / 0.2), 0 0 12px -2px rgb(23 23 23 / 0.25) | 0 0 0 1px rgb(229 229 229 / 0.28), 0 0 12px -2px rgb(229 229 229 / 0.35) |
| `--dl-shadow-md` | 0 0 0 1px rgb(23 23 23 / 0.25), 0 0 24px -4px rgb(23 23 23 / 0.35) | 0 0 0 1px rgb(229 229 229 / 0.35), 0 0 24px -4px rgb(229 229 229 / 0.49) |
| `--dl-shadow-lg` | 0 0 0 1px rgb(23 23 23 / 0.3), 0 0 48px -8px rgb(23 23 23 / 0.45) | 0 0 0 1px rgb(229 229 229 / 0.42), 0 0 48px -8px rgb(229 229 229 / 0.63) |

## Shapes

Radios en px (variables `--dl-radius-*`); `full` es una píldora.

| Token | Valor |
| --- | --- |
| `--dl-radius-sm` | 4px |
| `--dl-radius-md` | 6px |
| `--dl-radius-lg` | 8px |
| `--dl-radius-xl` | 12px |
| `--dl-radius-full` | 9999px |

- Grosor de borde: 1px (`--dl-border-width`)

## Components

Tokens de componente compilados desde la receta y sus ajustes. Úsalos en lugar de valores literales.

| Componente | Propiedad | Valor | Variable |
| --- | --- | --- | --- |
| Button | radius | 6px (radius.md) | `--dl-button-radius` |
| Button | height sm / md / lg | 32 / 40 / 48px | `--dl-button-h-sm/-md/-lg` |
| Button | padding-x | 16px (space.4) | `--dl-button-px` |
| Button | font-weight | 500 | `--dl-button-weight` |
| Button | shadow | none | `--dl-button-shadow` |
| Card | radius | 8px (radius.lg) | `--dl-card-radius` |
| Card | padding | 16px (space.4) | `--dl-card-padding` |
| Card | shadow | --dl-shadow-sm | `--dl-card-shadow` |
| Card | border | 1px solid --border | `--dl-card-border` |
| Input | radius | 6px (radius.md) | `--dl-input-radius` |
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

## Do's and Don'ts

- **Haz:** Usa las variables CSS (`var(--primary)`, `var(--dl-radius-md)`, `var(--dl-space-4)`) en lugar de valores literales.
- **Haz:** Usa `--primary-text` para texto con el color de marca sobre background o card.
- **Haz:** Reserva `--cta` para la acción principal de cada vista.
- **Haz:** Mantén la jerarquía con la escala tipográfica: un solo display por vista.
- **Evita:** No uses `--brand` para texto: es decorativo y no garantiza contraste.
- **Evita:** No inventes colores, radios ni sombras fuera de la escala.
- **Evita:** No uses `--accent` como color de CTA: en shadcn es la superficie de hover.
- **Evita:** No animes con GSAP ni superes la duración `slow`; no ignores reduced motion.
