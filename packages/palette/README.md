# @dialmade/palette

Motor de color determinista en OKLCH para Dialmade. Es TypeScript puro y no usa el DOM, así que corre igual en un Web Worker, en el navegador o en Node.

Hace todo el recorrido: logo → swatches → semillas → escalas 50–950 → roles shadcn en claro y oscuro (WCAG 2.2 AA) → exportes.

```ts
import { parseSvgColors, extractFromPixels, generateTheme, toCssVars, toFigmaTokens } from "@dialmade/palette";

// En el worker: ImageData de un OffscreenCanvas (~256 px)
const { seeds, achromatic } = extractFromPixels(imageData.data, width, height, {
  declaredColors: svgText ? parseSvgColors(svgText) : undefined,
});
const theme = generateTheme({ primary: seeds.primary.hex, secondary: seeds.secondary?.hex, achromatic, style: "brand" });
toCssVars(theme); // :root + .dark
toFigmaTokens(theme, "light"); // figma-light.tokens.json
```

## API

| Función | Qué hace |
|---|---|
| `parseSvgColors(svg)` | Lee los colores declarados en el SVG: `fill`, `stroke`, `stop-color`, `flood-color`, `lighting-color` y `color`. Los busca en atributos, `style`, reglas `<style>` y custom properties. Solo cuenta colores opacos, devueltos como `#rrggbb` y sin repetir |
| `extractFromPixels(data, w, h, opts?)` | Saca swatches, semillas, fondo y `method` (`histogram`, `kmeans` o `none`). Opciones: `declaredColors`, `maxSwatches`, `minCoverage` y `keepChromaticBackground` |
| `buildScale(hex, opts?)` | Escala 50–950. El hex aparece **exacto** en `anchorStep` |
| `generateTheme(input)` | Devuelve el `Theme`: roles light/dark, escalas, `contrast[]` (con `source`), `defaultMode` y `anchors`. Con `input.pinned` respeta los valores importados |
| `parseColorWithAlpha(css)` | Como `parseColor`, pero conserva el alfa: `oklch(1 0 0 / 10%)` → `#ffffff1a` |
| `splitAlpha(color)` / `compositeOver(fg, bg)` | Separa `#rrggbbaa` en hex y alfa / pinta un color translúcido sobre un fondo (mezcla sRGB, como el navegador) |
| `toCssVars(theme, { format? })` | Variables shadcn más `--brand`, `--cta`, `--cta-foreground`, `--primary-text`, `--border-strong`, estados, alias de sidebar y `--color-brand-*` / `--color-cta-*` |
| `toCssVarRecord(theme, mode, { format? })` | Las mismas variables de un modo como objeto `{ "--primary": … }` (para `style` o `setProperty`), con todas las escalas (`--color-neutral-*`, `--color-success-*`…) |
| `toTailwindTheme(theme)` | Bloque `@theme inline` de Tailwind v4 |
| `toGlobalsCss(theme)` | Un `globals.css` completo: Tailwind + variante dark + variables + base |
| `toDTCG(theme)` | DTCG 2025.10 con colores en oklch + hex |
| `toFigmaTokens(theme, mode)` | DTCG en sRGB para el import nativo de Variables de Figma |

## Algoritmo y decisiones

### Extracción

- Ignora los píxeles con alpha < 128.
- Si la imagen pasa de unos 262k píxeles, la muestrea en rejilla.
- **Fondo.** Busca el color mayoritario en un borde de 2 px. Cuenta como fondo si al menos el 60 % del borde está a ΔEok < 0.03 de ese color. Si el fondo es acromático, se descartan los píxeles a ΔEok < 0.03 de él.
  - **Mejora:** si el fondo es cromático (por ejemplo, el icono de una app con el glifo blanco sobre el color de marca), **se conserva**, porque ese fondo *es* la marca.
- **¿Logo plano o no?** Es plano cuando sus 16 colores exactos más frecuentes cubren al menos el 60 % del primer plano.
  - **Plano:** histograma de 5 bits por canal y agrupado por líder con ΔEok < 0.04. Cada grupo se queda con su color exacto más frecuente.
  - **Degradado o foto:** k-means ponderado en OKLab (k = 8). La siembra es determinista, por el punto más lejano. Si el color exacto más frecuente del clúster está a menos de 0.03 del centroide, se usa ese color en vez del centroide.
  - Usé un k-means propio en vez de colorthief porque colorthief necesita una imagen o un canvas, y aquí solo llegan píxeles. Además, así el resultado es reproducible en los tests.
- **Limpieza.** Se fusionan los colores a menos de ΔEok 0.04 y se descartan los que cubren menos de `minCoverage` (1.5 % por defecto). Después, cada uno se ajusta al color declarado del SVG si está a ΔEok < 0.05.
- **Capturas.** Con `minCoverage: 0.002` sobrevive un CTA pequeño (conviene subir también `maxSwatches`). `keepChromaticBackground: false` quita un fondo de color igual que uno acromático; `background` lo sigue informando.
- **Semillas.**
  - Cuentan como cromáticos los colores con C ≥ 0.04. Su puntuación es `cobertura^0.7 · min(C, 0.2)/0.2`.
  - El secundario es el siguiente que difiera del primario en ΔH ≥ 30° o en ΔEok ≥ 0.12.
  - Si no hay ningún color cromático, `achromatic = true` y el primario es el casi negro del logo (o `#171717`, el de shadcn).

### Escalas

- Las curvas están medidas en `tailwindcss@4.3.3/theme.css`:
  - L media por paso de las 17 familias cromáticas.
  - Croma relativo al pico de cada familia (la «campana»).
  - L de la familia `neutral`, que coincide con la de shadcn.
- Las semillas grises usan la curva neutral y las cromáticas la cromática; entre C 0.02 y 0.06 se mezclan. Por eso `buildScale("#171717")` reproduce exactamente el `neutral` de Tailwind.
- **Anclaje.** La semilla va al paso de L más cercana. La curva se estira a ambos lados para que L baje de forma estricta (con un hueco mínimo de 0.006 después de redondear a hex).
- **Croma.** Sigue la campana, con un tope de 1.15× el croma de la semilla.
- **Tono.** Es constante, salvo en los amarillos: sus pasos oscuros derivan hasta 12° hacia el naranja, como en Tailwind, para no volverse oliva. `maxHueDrift` controla esa deriva.
- **Gamut.** Uso `culori.toGamut('rgb', 'oklch', null)`, es decir, reducción pura de croma. Desactivé el «casi en gamut + recorte» del algoritmo CSS porque el recorte puede mover el tono varios grados, y aquí manda la identidad de marca.

### Estilos de paleta

Son transformaciones OKLCH de la semilla. El presupuesto de tono es de **13°** entre el giro del estilo y la deriva de la escala, 2° menos que el límite de ±15° para absorber el redondeo a hex.

| Estilo | Transformación | Neutros | Notas |
|---|---|---|---|
| `brand` | Identidad (hex exacto) | Tono de marca, C 0.005–0.012 | — |
| `vibrant` | C ×1.25 (mínimo 0.15, hasta el gamut); L un 30 % hacia 0.62 | — | — |
| `pastel` | L un 75 % hacia 0.86; C ×0.45 (máximo 0.09) | — | Fondo claro tintado |
| `mono` | Un solo tono | C 0.018 | El CTA es el mismo tono con 3 pasos de diferencia en L |
| `dark-luxury` | C ×0.7; L un 40 % hacia 0.55 | — | Fondo oscuro con L 0.17 y C ≤ 0.01. Acento dorado (h 85) armonizado ≤15° hacia la marca. Oscuro por defecto |
| `earthy` | C ×0.6 (máximo 0.12); tono un 35 % hacia 60° (tope de 13°) | Cálidos (h 65) | — |
| `neon` | L hacia la **cúspide del gamut** del tono (entre 0.68 y 0.88); C al máximo en sRGB | — | Fondo con L 0.12. Oscuro por defecto |
| `corporate` | C ×0.85 (máximo 0.17); L un 40 % hacia 0.5 | Fríos (h 250) | — |

En `neon`, la investigación fijaba L en 0.8 para todos los tonos. **Mejora:** apuntar a la cúspide del gamut de cada tono. Con 0.8 fijo el rojo salía coral; con la cúspide sale un rojo neón de verdad.

**Logos acromáticos.** El primario no se transforma. El acento sale del `secondary` que elija el usuario. Si no hay, sale del estilo: `neon` → cian, `earthy` → terracota, `dark-luxury` → dorado.

### Roles y contraste (WCAG 2.2 AA)

**Claro**
- `background`: blanco o neutral-50 tintado. `card`: blanco. `foreground`: neutral-950.
- `primary`: el paso ancla, o el más cercano que cumpla 3:1 sobre `background` y `card`.
- `primaryForeground`: blanco si llega a 4.5:1. Si no, brand-950, neutral-950 o negro, el primero que llegue.
- `primaryText`: el paso más cercano al ancla que cumpla 4.5:1.

**Oscuro**
- `background`: neutral-950 (o el del estilo). `card`: neutral-900.
- `primary`: el ancla si está entre 50 y 600; si no, desde el 500. En ambos casos se busca hacia los pasos más claros hasta cumplir 3:1.
- En una marca acromática, `primary` es brand-200, como en shadcn.

**En los dos modos**
- `cta`: el secundario, con la misma regla que `primary`.
- `destructive`, `success`, `warning` e `info`: tonos fijos (27°, 150°, 75° y 240°) armonizados hasta 15° hacia la marca. Se toma el paso 600 (claro) o 400 (oscuro) más cercano que cumpla 4.5:1 como texto.
- `border` es decorativo. `input` y `borderStrong` cumplen 3:1.
- `ring`: brand-500 (claro) o brand-400 (oscuro), ajustado a 3:1.
- `chart1..5`: rotaciones de 72° con L y C constantes, a 3:1.

Todos los pares de `CONTRAST_PAIRS` se comprueban en los dos modos y quedan en `theme.contrast`. Si alguno falla, se mueve la L del color de primer plano (mismo tono) hasta que cumple. `brand` es el hex exacto y decorativo: no tiene garantía de contraste.

Cada comprobación lleva `source`. Todo par con al menos un rol generado cumple AA (`generated`); los 100 % importados se informan (`imported`) con su `pass` real. Sin `pinned`, todo es `generated`.

### Valores fijados (`pinned`) y alfa

`generateTheme({ …, pinned: { light?, dark?, scales?: { brand?, accent? } } })` recibe lo que trae la guía del usuario. Los roles aceptan cualquier color CSS y conservan el alfa.

- **Nunca se tocan.** Salen idénticos en `theme.light` / `theme.dark`.
- **Primario fijado** (el claro o, si no, el oscuro): la escala `brand` se ancla a él **sin** el estilo de paleta. El estilo solo cambia neutros, estados, charts y los roles no fijados. Un `cta` fijado hace lo mismo con la escala del acento.
- **Escala importada:** se usa tal cual. Los pasos que falten se rellenan (interpolación OKLab entre vecinos o la curva de Tailwind en los extremos) y `anchors` apunta al paso dado con menor ΔEok respecto al primario (o al CTA / secundario).
- **Contraste:** si un par falla, se mueve su lado generado (el primer plano o, bajo un texto fijado, el relleno generado). `primaryText` y `borderStrong` se rellenan siempre, así que el texto de marca y el borde fuerte cumplen aunque `primary` o `input` fijados no lleguen.
- **Qué cuenta como `imported`:** los pares con los dos roles fijados; un color fijado sobre una superficie generada (`background`, `card`, `popover`, `muted`), porque mover la página para salvarlo cambiaría todo el tema; y los pares que los valores fijados dejan sin solución (un fondo blanco fijado junto a una tarjeta negra fijada).
- **Alfa:** un rol fijado puede ser `#rrggbbaa` (el `--border: oklch(1 0 0 / 10%)` del shadcn oscuro entra como `#ffffff1a`). El contraste se mide pintándolo sobre el fondo del par; un fondo translúcido se pinta antes sobre `background` (y este sobre blanco en claro o negro en oscuro). Los roles generados son siempre opacos.

### Exportes

- **DTCG: modos en un solo documento.** El `$value` de cada token semántico es el valor claro. Los dos modos completos van en `$extensions["design.dialmade"].modes = { light, dark }`. Los primitivos (`brand`, `cta`, `neutral`, `success`, `warning`, `error`, `info`) no cambian entre modos.
  - Lo elegí así porque un solo archivo es la fuente canónica más fácil de versionar y de pasarle a un agente. Las herramientas que necesitan un archivo por modo, como Figma, usan `toFigmaTokens`.
- **Figma: un archivo por modo.** Todo cuelga de `color`, así que al importar queda `color/primary`, `color/primary-foreground`, `color/brand-500`… Coincide con `--color-primary` y `--color-brand-500` de Tailwind (la opción (a) del spike de Figma).
- **Nombre del acento.** `theme.scales.accent` se exporta como `cta`, porque en shadcn `accent` es la superficie de hover.
- **CSS.** Por defecto usa `oklch()` con la precisión mínima que reconvierte al **mismo hex**; `{ format: "hex" }` lo cambia a hex. Todo está ajustado a sRGB. Más adelante se podría emitir P3.
- **Alfa.** Un rol translúcido sale como `oklch(L C H / a)` (o `#rrggbbaa` con `format: "hex"`). En DTCG lleva `alpha` (solo cuando es menor que 1) y `hex` opaco; en Figma, el `alpha` real.

## Añadidos al contrato

Todo es aditivo: no cambié ninguna firma pedida.

- **`ExtractResult.method`.**
- **`ThemeRoles`:** `borderStrong`, `success`, `successForeground`, `warning`, `warningForeground`, `info`, `infoForeground` y `chart1..5`.
- **`Theme`:** `achromatic`, `defaultMode` y `anchors`.
- **Parámetros opcionales:** `buildScale(hex, { maxHueDrift })`, `toCssVars(theme, { format })`, `GenerateThemeInput.pinned` y `ExtractOptions.minCoverage` / `keepChromaticBackground`.
- **`ContrastCheck.source`** (`imported` | `generated`). `ContrastCheck.bg` es el fondo opaco medido (el propio rol, salvo que sea translúcido).
- **Roles con alfa:** `ThemeRoles` acepta `#rrggbbaa` en los valores fijados. `contrastRatio` y `formatOklch` los entienden; `parseColor` sigue quitando el alfa.
- **Exports extra:**
  - Funciones: `toGlobalsCss`, `buildNeutralScale`, `contrastRatio`, `parseColor`, `parseColorWithAlpha`, `splitAlpha`, `compositeOver`, `formatOklch`, `oklchToHex`, `maxChroma`, `deltaEOK`, `hexToOklch`, `cssVarName` y `scaleGroups`.
  - Tipos: `ThemePins` y `ContrastSource`.
  - Constantes: `CONTRAST_PAIRS`, `ROLE_KEYS`, `SCALE_STEPS`, `PALETTE_STYLE_IDS`, `TEXT_CONTRAST`, `UI_CONTRAST` y `DTCG_EXTENSION`.

## Tests

`pnpm --filter @dialmade/palette test` corre 268 tests (unos 2 s):

- **Extracción:** logos generados por código (plano sobre blanco y sobre transparente, degradado, negro, acento pequeño, ruido tipo foto, tile de app y snap a colores SVG).
- **`parseSvgColors`.**
- **Escalas:** 164 semillas.
- **`generateTheme`:** 200 semillas pseudoaleatorias × 8 estilos. Comprueba que todos los pares pasan en claro y oscuro, que |ΔH| ≤ 15° y que no aparece ningún NaN.
- **Valores fijados:** primario fijado con cada estilo (sale idéntico y ancla la escala; todo par `generated` pasa), par importado que falla (`pass: false`, `source: "imported"`, sin tocar), pareja generada que se ajusta, escala importada incompleta y CTA fijado.
- **Exportes:** forma de DTCG 2025.10 y de Figma (sRGB con componentes entre 0 y 1), y alfa de ida y vuelta (CSS, DTCG, Figma y reimportación del CSS exportado).
