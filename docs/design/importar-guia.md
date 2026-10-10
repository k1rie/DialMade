# «Trae tu marca»: importar guía, app y referencias (propuesta consolidada)

**Fecha:** 2026-10-09.

**Origen:** la idea es del usuario. Este documento reúne la spec (`importar-guia-spec.md`) con las correcciones de la crítica (`importar-guia-critique.md`) ya aplicadas. La investigación completa está en `importar-guia-research.json`.

## Qué es

El usuario suelta lo que ya tiene:
- su `globals.css`;
- sus tokens o el export de variables de Figma;
- su DESIGN.md;
- capturas de su app;
- colores o fuentes sueltos.

Todo se procesa **en su navegador** y él lo revisa en la pantalla «Esto detectamos». Después entra al DesignDoc **bloqueado**: su guía manda y el motor solo completa lo que falta. Si su guía no pasa contraste AA, se le **avisa** y se le ofrece «Ajustar a AA», nunca se cambia en silencio.

## Entradas

| Fase | Formatos |
|---|---|
| **v1 (sin IA, $0)** | <ul><li>Pegar colores (hex, `rgb`, `hsl`, `oklch`, URL de Coolors)</li><li>CSS: shadcn en oklch y en el formato antiguo de canales HSL, `@theme` de Tailwind v4, CSS compilado. **Con alfa**: el `--border` de shadcn oscuro es `oklch(1 0 0 / 10%)`</li><li>JSON de tokens: DTCG 2025.10 con resolver y `$ref` locales, export nativo de Figma, Tokens Studio y Style Dictionary</li><li>DESIGN.md</li><li>Capturas (extracción de color con cobertura mínima configurable para no perder los CTA)</li><li>Fuentes por nombre, contra las 1934 de Google Fonts, más alias y alternativas libres (Arial→Arimo, etc.). La regla `var(--font-inter)` da Inter, y la pila de SF pasa a fallback</li></ul> |
| **v1.1** | <ul><li>`tailwind.config` v3/TS, solo por AST con @babel/parser y **nunca ejecutado**</li><li>SCSS</li><li>`.ase`, `.aco`, `.gpl`</li><li>Brand book en PDF (pdfjs-dist ≥4.2.67)</li><li>Fuente subida (alternativa libre por métricas)</li><li>URL ligera</li><li>**IA de visión** (huella de estilo: receta, densidad, radios, sombras y clase tipográfica, **nunca hex**), dentro del mismo presupuesto duro mensual o con BYOK</li></ul> |
| **v2** | <ul><li>URL con navegador (dembrandt hospedado)</li><li>OCR de guías en imagen</li><li>ZIP</li><li>`colors.xml` y `.colorset` de apps móviles</li></ul> |

## Flujo

- **Por dónde se entra:**
  - en **Inicio**, el enlace secundario «Ya tengo marca o app»;
  - soltar varios archivos, o uno que no sea imagen, abre el panel;
  - en el **Palette Lab**, el botón «Importar».
- **Panel «Trae tu marca»** (ref. 1B): drop multiarchivo, «Pegar colores o código», el tipo de cada archivo y **una sola declaración de derechos por lote**: «Es mi marca o tengo permiso».
  - Lo que sea de otra marca entra solo como **referencia de atributos**: sin colores bloqueados, sin fuentes y sin logo.
- **«Esto detectamos»** (ref. 2D + 2A):
  - grupos Colores, Tipografía, Formas, Modo y Referencias, con ≤5 chips visibles por grupo;
  - en cada chip: confianza en texto, de dónde sale (p. ej. `globals.css:12 --primary`) y las acciones Editar · Descartar · Bloquear;
  - huecos de rol que se llenan arrastrando, con el menú o con el teclado;
  - tarjetas de conflicto (logo frente a guía).
- **Salida:**
  - si la guía está completa, «Usar mi guía → Crear»;
  - si es parcial, «Completar en Palette Lab →».

## Modelo de datos (sin duplicar el DesignDoc)

- Lo aceptado se escribe en `tokens.*` (color light/dark, `typography`, `space`, `radius`, `elevation`, `border`).
- `brief.locks` pasa a ser `string[]` de JSON Pointers: `/tokens/color/light/primary`, `/tokens/radius/md`, `/brief/styleId`.
  - `applyPatch` rechaza cualquier cambio sobre un puntero bloqueado.
  - Los estilos de paleta, «Barajar» y la IA respetan los candados.
- `provenance.imports[]` guarda `{sourceId, format, fileName, sha256, parser, ownership, rightsConfirmedAt, fields[{path, locator, confidence, method}], dismissed}`. **El archivo original nunca se guarda.**
- `references[]` lleva `ownership: own | third-party` y no guarda bytes ni miniaturas.
- En `@dialmade/palette`:
  - `generateTheme({pinned})`: el primario fijado ancla la escala, y el estilo de paleta solo afecta lo que no está fijado;
  - roles con alfa (`#rrggbbaa`);
  - `ContrastCheck.source: imported | generated`;
  - `extractFromPixels({minCoverage, keepChromaticBackground})`.

## Seguridad y privacidad

- **Todo corre en un worker:**
  - con timeout y botón Cancelar;
  - sin `eval` ni `new Function`;
  - sin `url()`, `@import` ni `$ref` remotos;
  - valores re-serializados con `style.setProperty`;
  - claves `__proto__` rechazadas;
  - regex lineales;
  - YAML con `maxAliasCount: 50`.
- **Límites:**

  | Entrada | Límite |
  |---|---|
  | JSON de tokens | 5 MB · 20.000 tokens · 64 niveles |
  | CSS | 5 MB |
  | Imágenes | 10 MB · 50 MP · 12 por lote |
  | PDF | 50 MB |
  | Lote | 20 archivos |

- **IA:** pide consentimiento y muestra el coste antes de llamar. Cada imagen va en JPEG, con un máximo de 1280 px y 900 KB, y ≤3,5 MB en total por petición (Vercel admite 4,5 MB).
- **Mobbin:** un link se guarda como tarjeta sin imagen y sin IA.

## Plan

**Estimación propia, sin validar**, para 1 dev. Con agentes será bastante más rápido.

| Bloque | Contenido | Tiempo |
|---|---|---|
| **Corte demostrable** | Pegar colores, CSS (shadcn y `@theme`), fuentes por nombre, revisión y candados | ~3 semanas |
| **v1 completa** | El corte más JSON de tokens, DESIGN.md, capturas, receta más cercana, conflictos y E2E | ~7 semanas |
| **v1.1** | Lo de la tabla de entradas, incluida la IA de visión | ~5 semanas |

Requisito previo: el feature «¿Qué quieres crear?», que está en construcción.

## Decisión del usuario (2026-10-09)

**Alcance elegido: «v1 + IA».** Entra la v1 completa (sin IA) y además la **IA de visión** sobre capturas. La IA se paga con el presupuesto duro mensual del proyecto o con la key del usuario (BYOK).

El resto de la v1.1 queda para después: PDF, `tailwind.config`, SCSS, `.ase/.aco/.gpl`, fuente subida y URL.

Se construye cuando termine el feature «¿Qué quieres crear?».

## Política de acceso a la IA (decisión del usuario, 2026-10-09)

Aplica a toda la IA de la app: copy y visión. Se construye junto con este feature.

1. **Free tier pequeño**, pagado con el presupuesto del proyecto:
   - **5 usos de IA por persona al mes**; un uso es una generación de copy o un análisis de capturas;
   - como máximo **10 al día por IP**;
   - tope global duro de `DIALMADE_AI_MONTHLY_BUDGET_USD` (5 USD al empezar).
   - Mientras no haya login, «persona» es un **ID de dispositivo anónimo firmado** (cookie httpOnly). Con Supabase Auth pasa a ser la cuenta.
2. **Después: BYOK.**
   - Un modal «Usar mi propia key»; la key solo vive en la memoria de la pestaña y las llamadas van del navegador a Anthropic.
   - Alternativa gratis: «Copiar prompt para mi Claude», que funciona con su suscripción.
3. **Visibilidad:** un contador «3 de 5 usos gratis este mes», y el coste se muestra antes de cada llamada.
4. **Sin cuota ni key**, la app funciona igual: el copy por defecto y la extracción de color no usan IA.
5. **Modelo:** `DIALMADE_AI_MODEL` (por defecto `claude-opus-5-5`). Opcionalmente, `DIALMADE_AI_FREE_MODEL` para el free tier; por defecto es el mismo modelo, y cambiarlo lo decide el usuario.
