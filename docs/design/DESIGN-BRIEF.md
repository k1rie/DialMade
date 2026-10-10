# Design brief de la app (Dialmade)

**Fuente:** decisiones del usuario del 2026-10-09. Este archivo es la fuente de verdad visual de la **app**. Los temas que la app genera para los usuarios son otra cosa y salen de `@dialmade/palette`.

## 1. Dirección

| Aspecto | Decisión |
|---|---|
| Modo | **Dark** (solo oscuro en la app) |
| Luz | **Glow blanco** como luz principal y **algunos glows morados** de acento. Pocos y grandes, nunca neón por todas partes |
| Estilo | **SaaS de tecnología, tipo Railway**: superficies oscuras con capas, bordes finos translúcidos, grid de puntos sutil, precisión y mucho aire |
| Tipografía | **Tipo Apple**: SF Pro en dispositivos Apple e Inter en el resto (ver §3) |
| Motion | **Smooth**: springs suaves, nada brusco, todo interrumpible |
| Interacción | **Mucho drag and drop**, siempre con una alternativa por clic y teclado |

**Qué evitar:**
- La «cara de IA»: azul `#2563EB`, pills por defecto, gradientes arcoíris y fondos crema.
- Copiar Railway literalmente: es inspiración de tono, no de marca.

## 2. Tokens de color de la app (CSS vars `--app-*`)

Van en OKLCH, con el hex aproximado entre paréntesis.

| Token | Valor | Uso |
|---|---|---|
| `--app-bg` | `oklch(0.13 0.012 285)` (≈ #0B0A10) | Fondo base, negro con un tinte violeta mínimo |
| `--app-bg-elevated` | `oklch(0.165 0.014 285)` (≈ #121118) | Sidebar y barras |
| `--app-surface` | `oklch(0.195 0.016 285)` (≈ #18171F) | Cards y paneles |
| `--app-surface-hover` | `oklch(0.23 0.018 285)` | Hover y estado activo |
| `--app-border` | `oklch(1 0 0 / 0.08)` | Bordes finos |
| `--app-border-strong` | `oklch(1 0 0 / 0.14)` | Inputs y separadores |
| `--app-text` | `oklch(0.97 0.004 285)` | Texto principal |
| `--app-text-muted` | `oklch(0.72 0.012 285)` | Texto secundario (≥4.5:1 sobre surface) |
| `--app-text-subtle` | `oklch(0.56 0.014 285)` | Metadatos. Solo texto ≥14 px semibold o decorativo |
| `--app-accent` | `oklch(0.68 0.2 296)` (≈ #9D72FF) | Morado de acento: foco, selección, drop válido |
| `--app-accent-strong` | `oklch(0.6 0.22 296)` | Botón primario de acento, siempre con texto blanco que pase AA |
| `--app-glow-white` | `oklch(1 0 0 / 0.10)` | Halo blanco |
| `--app-glow-purple` | `oklch(0.62 0.24 300 / 0.30)` | Halo morado |
| `--app-success` / `--app-warning` / `--app-danger` | `oklch(0.75 0.17 155)` / `oklch(0.82 0.16 80)` / `oklch(0.68 0.2 25)` | Estados |

**Glows (utilidades CSS):**
- `.glow-white`: `box-shadow: 0 0 0 1px var(--app-border-strong), 0 0 40px -8px var(--app-glow-white)`.
- `.glow-purple`: `box-shadow: 0 0 0 1px oklch(0.68 0.2 296 / 0.5), 0 0 32px -6px var(--app-glow-purple)`. Se usa en el elemento seleccionado, en el drop target válido y en el CTA principal.

**Fondo de página:**
- Grid de puntos de 1 px en blanco al 5 %, cada 24 px, con máscara radial que se desvanece hacia los bordes.
- 2 o 3 «orbes» grandes y difuminados (`blur(120px)`): uno blanco arriba al centro (8–10 %) y uno o dos morados en esquinas opuestas (15–25 %).
- **Estáticos**: solo se animan unos 1,5 s cuando cambia la marca (WCAG 2.2.2).

**Radios:** 8 px en chips, 10 px en controles, 14 px en cards, 20 px en paneles y modales, y full solo en avatares.

**Sombras:** `0 1px 0 0 oklch(1 0 0 / 0.04) inset` (borde de luz superior) más `0 12px 40px -12px oklch(0 0 0 / 0.6)`.

## 3. Tipografía «tipo Apple»

La licencia de SF Pro solo permite usarla en plataformas Apple, así que no se puede servir como webfont. Por eso usamos la fuente del sistema, que en Apple es SF, con Inter como fallback para el resto (OFL, se sirve con `next/font`).

```css
--font-sans: -apple-system, BlinkMacSystemFont, "SF Pro Display", "SF Pro Text", var(--font-inter), system-ui, sans-serif;
--font-mono: ui-monospace, "SF Mono", var(--font-geist-mono), "JetBrains Mono", monospace;
```

| Rol | Tamaño / alto de línea | Peso | Tracking |
|---|---|---|---|
| Display | 56 / 60 | 600 | −0.035em |
| H1 | 40 / 44 | 600 | −0.03em |
| H2 | 28 / 34 | 600 | −0.02em |
| H3 | 20 / 26 | 600 | −0.01em |
| Body | 15 / 24 | 400 | −0.005em |
| Small | 13 / 18 | 450 | 0 |
| Caption / labels | 12 / 16 | 500 | +0.01em (sin mayúsculas forzadas) |
| Mono (hex, tokens) | 12–13 | 450 | 0 |

`font-feature-settings: "ss01", "cv11"` solo con Inter. `-webkit-font-smoothing: antialiased`.

## 4. Motion «smooth»

| Preset | Spring | Uso |
|---|---|---|
| `snappy` | stiffness 520, damping 34 | Imantado al soltar, toggles |
| `smooth` | stiffness 260, damping 30 | Paneles, reordenar, layout |
| `gentle` | stiffness 140, damping 22 | Momentos firma (logo → swatches) |

- La curva por defecto es `cubic-bezier(0.22, 1, 0.36, 1)`, un ease-out tipo Apple.
- **Duraciones:** feedback ≤200 ms, cambios de estado ≤400 ms, momentos firma ≤900 ms y saltables.
- Solo se animan `transform`, `opacity`, `filter` y los colores vía `@property`.
- `<MotionConfig reducedMotion="user">`: con reduced motion, todo pasa a fades de 150 ms.
- Los cambios de color del preview se interpolan en OKLCH.

## 5. Drag and drop (patrón común)

| Momento | Comportamiento |
|---|---|
| Al coger | `scale 1.03`, rotación según velocidad (±6°), sombra más profunda y `glow-purple` suave. Cursor `grabbing` |
| Destino válido | Borde y fondo con `glow-purple` y un pulso suave al entrar. Los destinos inválidos bajan a 40 % de opacidad |
| Al soltar | Spring `snappy` hacia el slot con `layoutId`, más un destello blanco breve (≤200 ms) |
| Alternativas | Clic para colocar o menú «Mover a…». Teclado con Space/Enter para coger y soltar, flechas para mover y Esc para cancelar |
| Accesibilidad | `aria-live` anuncia lo que se movió y adónde |

Motor: `@dnd-kit/react` decide las colisiones; `motion` anima.

## 6. Especificación por vista

Basada en las referencias elegidas (`referencias-mobbin.md`).

### 1. Inicio (ref. Higgsfield + recorte)

1. **Hero centrado** sobre el fondo con glows. Un área de drop grande con borde punteado translúcido, y en el centro una muestra visual (logo de ejemplo flotando). Título corto, una línea de descripción y **un solo CTA**: «Subir logo». Debajo, enlaces secundarios: «Pegar URL» · «No tengo logo» · logos de ejemplo.
2. **Arrastrar sobre el área:** el borde pasa a `glow-purple` y el área «respira» (escala 1.01).
3. **Recortar el logo** (paso nuevo):
   - Se abre un panel con la imagen y un **rectángulo de recorte arrastrable y redimensionable**, con 8 handles y las flechas del teclado. El fondo fuera del recorte queda atenuado.
   - Proporción libre o cuadrada.
   - Botones «Usar recorte» y «Usar imagen completa».
   - Un zoom con slider o rueda es opcional.
   - El recorte se hace en canvas antes de extraer la paleta.
4. Al confirmar empieza el **momento firma**: el logo se rompe en swatches que vuelan al panel de paleta.

### 2. Palette Lab (ref. Recraft + preview tipo Klaviyo)

**Panel izquierdo** (estilo popover de Recraft, como panel fijo):
- **«Colores del logo»:** una grilla de swatches cuadrados redondeados, con la cobertura al hover. Clic para hacerlo primary o secondary, y arrastrable a los slots «Primario» y «Secundario».
- **«Estilos de paleta»:** filas horizontales de tiras de color (vibrant, pastel, mono, dark-luxury, earthy, neon, corporate). Cada fila es arrastrable al slot «Estilo», y también se aplica con clic.
- **Picker:** al hacer clic en un swatch se abre un picker flotante (`react-colorful`), con el hex editable en mono y RGB.
- Escala 50–950 con el marcador del paso ancla.
- Tabla de contraste compacta con badges AA.

**Panel derecho:**
- **Preview en vivo**: una mini landing con nav, hero, botones, input, card y badge, pintada con el tema generado. Toggle claro/oscuro.
- Los cambios se interpolan suavemente.

**Barra inferior:**
- Exportar: CSS, Tailwind, DTCG y Figma (light/dark).
- Barra de estado: «Logo ✓ · Paleta ✓ · AA ✓ · Siguiente: exportar».

### 3. Composer (ref. Buffer + Replit). Más adelante

- **Izquierda** (Replit): controles y brief, con dials variance, motion y density.
- **Centro:** página en vivo.
- **Derecha** (Buffer): grilla de **cartas de tema** arrastrables, color de botón y packs de fuentes.

### 4. Exportar / Compartir (ref. Mistral AI)

Modal con:
- una **tarjeta preview** de la dirección arriba, teñida con la marca;
- el toggle «Link accesible para cualquiera»;
- la URL en un campo readonly;
- el botón «Copiar link»;
- «Compartir en» con iconos;
- debajo, cartas de destino: Figma, Claude Design, Framer y Código.

### 5. Link público / Style guide (ref. Cofounder)

Brand board con secciones numeradas:
- 01 Identidad
- 02 Paleta
- 03 Tipografía
- 04 Lenguaje de formas
- 05 Componentes
- 06 Dirección de arte

Todo en una grilla editorial.

### 6. Referencias (ref. Variant). Más adelante

Tablero oscuro con:
- título y meta («3 referencias»);
- acciones «Añadir referencia» y «Compartir estilo»;
- cards de distinto tamaño;
- una barra de prompt abajo.

### 7. Direcciones (ref. Higgsfield). Más adelante

Panel oscuro con:
- una fila de cartas de estilo seleccionables (la elegida con `glow-purple`);
- cartas de tema;
- el CTA «Generar» con glow.

### 8. Modo edición (ref. Replit + MagicPath). Más adelante

- **Izquierda:** árbol de capas (MagicPath).
- **Centro:** página con el elemento seleccionado, contorno morado y badge de medida.
- **Derecha:** inspector (Replit) con tipografía, layout, espaciado y color.
- **Abajo:** barra de herramientas flotante: Seleccionar · Editar texto · Comentar · Generar.

### 9. Login (ref. Devin + MagicPath)

- `/login` es una página mínima centrada: logo, «Bienvenido», botones con GitHub y Google, separador, email y «Enviar magic link».
- Si se pide login desde otra sección, se muestra el mismo formulario **como modal** sobre la vista actual difuminada.

### 10. Mis diseños (ref. Magnific + Replit). Más adelante

- Sidebar.
- «Recientes»: una tarjeta «Nuevo diseño» más tarjetas con un gradiente de la paleta de cada diseño.
- Debajo, una grilla limpia con búsqueda, filtros y toggle grid/lista.
