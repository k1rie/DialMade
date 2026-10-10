# Noir: dirección de diseño para Claude

## Antes de empezar

- Pégalo en Claude (claude.ai o Claude Code) y adjunta `theme.css` y `DESIGN.md` del pack exportado.

Construye «Dashboard y componentes» para Noir con React y Tailwind CSS v4 (y shadcn/ui si el proyecto lo usa), siguiendo esta dirección de diseño al pie de la letra.

## Pasos

1. Añade `theme.css` a la hoja global, después de `@import "tailwindcss";`, y mapea los tokens con `@theme inline` (`--color-primary: var(--primary)`, `--radius-md: var(--dl-radius-md)`, `--font-heading: var(--dl-font-heading)`).
2. Carga las fuentes: `<link rel="stylesheet" href="https://fonts.googleapis.com/css2?family=IBM+Plex+Sans:wght@400;500;600&family=JetBrains+Mono:wght@500;700&display=swap">` (o next/font con las mismas familias y pesos).
3. Construye las secciones de «Páginas» en ese orden, una por componente, con los textos indicados.
4. Da estilo solo con las variables: `var(--primary)`, `var(--dl-button-radius)`, `var(--dl-space-4)`, `var(--dl-card-shadow)`, `var(--dl-duration-base)` y `var(--dl-ease)`.
5. Haz que funcionen el modo claro y el oscuro (clase `.dark`) y comprueba el contraste AA y `prefers-reduced-motion`.

## Dirección de diseño

### Marca

- Nombre: Noir
- Producto: Herramienta para desarrolladores o IDE
- Foco: Dashboard y componentes
- Estilo: Precisión técnica. Superficies oscuras por capas, bordes de 1 px y brillos sutiles. Denso y preciso, como una consola moderna.
- Estilo de paleta: brand

### Colores

Hex exactos por rol (los nombres son las variables CSS). Todos los pares de texto y UI cumplen AA.

| Rol | Claro | Oscuro |
| --- | --- | --- |
| `--background` | #ffffff | #0a0a0a |
| `--foreground` | #0a0a0a | #fafafa |
| `--card` | #ffffff | #171717 |
| `--card-foreground` | #0a0a0a | #fafafa |
| `--popover` | #ffffff | #171717 |
| `--popover-foreground` | #0a0a0a | #fafafa |
| `--primary` | #171717 | #e5e5e5 |
| `--primary-foreground` | #ffffff | #0a0a0a |
| `--secondary` | #f5f5f5 | #262626 |
| `--secondary-foreground` | #171717 | #fafafa |
| `--muted` | #f5f5f5 | #262626 |
| `--muted-foreground` | #707070 | #a1a1a1 |
| `--accent` | #f5f5f5 | #262626 |
| `--accent-foreground` | #171717 | #fafafa |
| `--destructive` | #df2225 | #ff8174 |
| `--destructive-foreground` | #ffffff | #4b100d |
| `--border` | #e5e5e5 | #262626 |
| `--input` | #949494 | #646464 |
| `--ring` | #737373 | #a1a1a1 |
| `--chart-1` | #171717 | #e5e5e5 |
| `--chart-2` | #aa6ab4 | #ca88d5 |
| `--chart-3` | #c8664f | #ea846d |
| `--chart-4` | #918a09 | #b0a93b |
| `--chart-5` | #009c86 | #13bfa5 |
| `--brand` | #171717 | #171717 |
| `--cta` | #171717 | #e5e5e5 |
| `--cta-foreground` | #ffffff | #0a0a0a |
| `--primary-text` | #171717 | #f5f5f5 |
| `--border-strong` | #949494 | #646464 |
| `--success` | #00853c | #5fd07e |
| `--success-foreground` | #ffffff | #063115 |
| `--warning` | #8e5f00 | #efa200 |
| `--warning-foreground` | #ffffff | #392300 |
| `--info` | #0073ab | #5abdfe |
| `--info-foreground` | #ffffff | #062b42 |

### Tipografía

- Títulos: JetBrains Mono 700, tracking -0.025em, line-height 1.15
- Texto: IBM Plex Sans 400, line-height 1.6
- Google Fonts: https://fonts.googleapis.com/css2?family=IBM+Plex+Sans:wght@400;500;600&family=JetBrains+Mono:wght@500;700&display=swap
- Escala: display 56px (fluido desde 34px) · h1 39px (fluido desde 31px) · h2 31px · h3 25px · body 16px · small 14px · caption 12px

### Forma, espacio y elevación

- Radios: sm 4px · md 6px · lg 8px · xl 12px · full 9999px
- Espaciado (densidad 5/10): 4, 8, 12, 16, 24, 32, 48, 64, 96, 128 px (`--dl-space-1…10`)
- Contenedor: 1200px · Padding de sección: 96px · Borde: 1px
- Sombras (modo claro): sm `0 0 0 1px rgb(23 23 23 / 0.2), 0 0 12px -2px rgb(23 23 23 / 0.25)` · md `0 0 0 1px rgb(23 23 23 / 0.25), 0 0 24px -4px rgb(23 23 23 / 0.35)` · lg `0 0 0 1px rgb(23 23 23 / 0.3), 0 0 48px -8px rgb(23 23 23 / 0.45)`

### Componentes

- Button: radius 6px, h 32/40/48px, padding-x 16px, weight 500, shadow none
- Card: radius 8px, padding 16px, shadow sm, border 1px solid --border
- Input: radius 6px, h 40px · Badge: radius 9999px
- Nav 64px · Table row 48px · Sidebar 256px

### Motion

- Estándar: fast 200ms · base 440ms · slow 600ms · ease `cubic-bezier(0.215, 0.61, 0.355, 1)`
- Respeta `prefers-reduced-motion`.

### Páginas

**Dashboard y componentes** (`app-dashboard`)

1. Shell (sidebar y topbar) (`app.shell`)
   - Fila de KPIs (`app.kpiRow`)
   - Gráfica (`app.chartCard`)
   - Actividad (`app.activity`)
   - Tabla de datos (`app.dataTable`)
   - Galería de componentes (`app.componentGallery`)

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
