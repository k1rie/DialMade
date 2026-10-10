# Acme Cloud: llevarlo a Figma con Claude Code

## Antes de empezar

- Necesitas Claude Code con el servidor MCP de Figma conectado y acceso de edición al archivo. `generate_figma_design` solo funciona desde Claude Code o un IDE (no desde Claude Desktop) y `use_figma` está en beta. Para escribir fuera de drafts hace falta un seat Full.
- Sin Claude: arrastra `figma-light.tokens.json` y `figma-dark.tokens.json` al panel Variables (una colección con dos modos; en Starter, dos colecciones).

Recrea en Figma la dirección de diseño de Acme Cloud: primero las variables y luego «Landing page» como capas editables.

## Pasos

1. Variables: con `use_figma`, crea la colección «Acme Cloud» con los modos Light y Dark. Añade una variable de color por rol (`color/primary`…) desde `figma-light.tokens.json` y `figma-dark.tokens.json`, y las variables numéricas de `figma-numbers.tokens.json` (`radius/*`, `space/*`, `component/button/radius`…) con los scopes de `com.figma.scopes`.
2. Pon a cada variable su code syntax web con el nombre CSS (`var(--primary)`, `var(--dl-radius-md)`).
3. Capas: sirve el pack HTML en local (`npx serve .` en la carpeta del pack) y usa `generate_figma_design` sobre `http://localhost:3000` para capturar «Landing page» como capas en una página nueva.
4. Enlaza las capas capturadas con las variables cuando coincidan: rellenos a `color/*`, radios a `radius/*` y gaps a `space/*`.
5. Crea una página «Style Guide» con los text styles de la escala y los effect styles de las sombras de abajo. Las sombras y las curvas de motion no pueden ser variables.

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

### Páginas

**Landing page** (`minimal`)

1. Barra de navegación (`landing.navbar`)
2. Hero (`landing.hero`)
3. Funcionalidades (`landing.features`)
4. Llamada a la acción (`landing.cta`)
5. Pie de página (`landing.footer`)

**Guía de estilo** (`brand-board`)

1. Portada (`brand.cover`)
2. 01 Identidad (`brand.identity`)
3. 02 Paleta (`brand.palette`)
4. 03 Tipografía (`brand.type`)
5. 04 Formas (`brand.shape`)
6. 05 Componentes (`brand.components`)
7. 06 Dirección de arte (`brand.artDirection`)

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
