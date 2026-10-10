# Revisión de «Trae tu marca»: 8 problemas por prioridad

Comprobé la spec contra el código de `packages/palette`, `packages/catalog` y `apps/web`, contra los docs del proyecto y contra fuentes oficiales.

---

### 1. [Alta] La IA de la v1.1 no es gratis y la regla de CLAUDE.md no se puede dar por decidida

**Problema**
- **Créditos y Vercel Hobby.** §5 cobra la visión con créditos del usuario. Las Fair Use Guidelines de Vercel dicen que Hobby es solo para uso personal no comercial. Ponen como ejemplo «Any method of requesting or processing payment from visitors of the site» (comprobado hoy). El INFORME §15.1 monta toda la infra en Hobby.
- **La regla sigue vigente.** `/Users/diegoguerrero/Desktop/designApp/CLAUDE.md:31` dice «No se usan servicios de pago ni IA pagada por el proyecto», y el INFORME §15 dice «La IA nunca la pagas tú». La spec lo mete en «Lo que decido por defecto», pero es una decisión tuya y de ella depende `/api/ai/fingerprint`.
- **Lo único que pagaría el proyecto sobra.** Es la IA que asigna roles a nombres ambiguos, y eso ya lo cubren el vocabulario de `roles/` y los huecos de rol.
- **Tamaño de la petición.** Cuatro PNG de 1280×800 en base64 pueden pasar de los 4,5 MB que admite una función de Vercel (comprobado). Además, la API solo acepta JPEG, PNG, GIF y WebP: un AVIF hay que recodificarlo.
- **Haiku 5.5 no tiene fallback en el servidor.** Si se cambia a Haiku, `fallbacks: "default"` sobra.

**Corrección** (sustituye «Quién paga» de §5 y la última viñeta de «Lo que decido por defecto»):
> **Presupuesto.** La v1 cuesta $0: todo corre en el navegador y no hay pagos. La IA de la v1.1 necesita antes una decisión tuya, y hay que reflejarla en CLAUDE.md (línea 31) y en el INFORME §15.
> - **Sin créditos:** solo BYOK desde el navegador (INFORME §5) y «Analizar con mi Claude». No existe `/api/ai/fingerprint` y el proyecto sigue en Vercel Hobby.
> - **Con créditos:** el proyecto pasa a Vercel Pro antes de cobrar nada, porque Hobby no permite pedir ni procesar pagos.
> - Los roles de nombres ambiguos no usan IA. Se resuelven con el vocabulario de `roles/` y los huecos de rol (arrastre, menú «Usar como…» o teclado).
> - Imágenes que se mandan a la IA: JPEG con calidad 0,85, 1280 px de lado como máximo, 900 KB por imagen y 3,5 MB de base64 por petición. Si no caben, se bajan a 1024 px. Los tokens se cuentan con `count_tokens`, que acepta imágenes; la fórmula ya no hace falta.
> - Con Haiku 5.5 se quita `fallbacks`, porque no tiene fallback en el servidor.

---

### 2. [Alta] El parser de CSS rompe el caso de la demo (un `globals.css` de shadcn)

**Problema**
- **Se pierde el alfa.** `parseColor` devuelve `#rrggbb` y descarta el alfa. Lo probé con culori 4.0.2: `oklch(1 0 0 / 10%)` da `#ffffff` y `transparent` da `#000000`.
- **El caso real.** El shadcn actual trae en `.dark` `--border: oklch(1 0 0 / 10%)` y `--input: oklch(1 0 0 / 15%)` (comprobado hoy en ui.shadcn.com). Entrarían como blanco opaco, con confianza «Exacta» y bloqueados, y el E2E los exportaría así.
- **El motor no guarda alfa.** `ThemeRoles` solo guarda hex y el exportador fija `alpha: 1` (`/Users/diegoguerrero/Desktop/designApp/packages/palette/src/exporters.ts:161`).
- **Valores que culori no entiende.** No devuelve nada con `222.2 84% 4.9%` (el formato antiguo de shadcn), `color-mix()`, `light-dark()`, `oklch(from …)` ni `var()`. Además, la escala de radios de shadcn se calcula a partir de `var(--radius)`.

**Corrección** (fila CSS de §2 y `parsers/css/`):
> - Los colores se leen con `parse()` de culori, no con `parseColor`, y se conserva `alpha`.
> - En `@dialmade/palette`, cada rol acepta `#rrggbbaa`:
>   - el contraste se mide después de componer el color sobre el fondo del par;
>   - el CSS exportado usa `oklch(L C H / a)`;
>   - DTCG y Figma reciben el `alpha` real.
> - `transparent`, `currentColor`, `inherit` e `initial` no se importan; dan el aviso `non-color`.
> - `var()` se resuelve dentro del lote (`:root`, `.dark`, `@theme`, `@theme inline`), con su valor de reserva `var(--x, y)`, hasta 32 saltos y con detección de ciclos.
> - `calc()` solo se evalúa en dimensiones: `px`, y `rem` con base de 16 px marcada como «supuesto».
> - Los canales HSL sueltos se envuelven en `hsl()` solo cuando el formato es `shadcn-hsl`.
> - `color-mix()`, `light-dark()` y los colores relativos van a `unresolved`, con su motivo.
> - **Fixtures obligatorios:**
>   - el tema por defecto actual de shadcn;
>   - `/Users/diegoguerrero/Desktop/designApp/apps/web/src/app/globals.css`, que en las líneas 56–72 tiene `oklch(1 0 0 / 0.08)` y otros colores con alfa.
> - **Test:** el `--border` oscuro importado sale con alfa 0,1 en el `globals.css` exportado.

---

### 3. [Alta] El modelo de datos duplica al DesignDoc que se está construyendo

**Problema**
- **Tokens que ya existen.** El DesignDoc ya tiene `tokens: { color, typography, radius, space, elevation, border, motion }` y `system` por componente (`docs/design/output-type-step.md`).
- **Campos nuevos que repiten datos.** La spec añade `DesignDoc.imported`, `brief.customPairing`, `typographyId: "custom"` y `system.recipe {id: "custom"}`. Un mismo valor acabaría en tres sitios (`imported`, `tokens` y `provenance`) y podría divergir.
- **Datos que se pierden.** `spacing` y `typeScale` se extraen, pero ninguna fila de la tabla dice adónde van.
- **Candados con dos significados.** `brief.locks` son los candados de slot del mazo («Barajar» con la tecla S, INFORME §3 paso 3a). La spec los usa por rol de color y no define el formato.
- **Es el momento.** `packages/doc` todavía no existe, así que cambiarlo ahora evita un `version: 2`.

**Corrección** (sustituye la frase «En el DesignDoc solo se guarda…» de §4 y la tabla):
```ts
DesignDoc v1 {
  …,
  brief: { …, styleId /* siempre receta del catálogo: nearestRecipe() */,
           typographyId?: TypographyPairingId /* ausente = familias propias en tokens.typography */,
           locks: string[] /* JSON Pointer: "/tokens/color/light/primary", "/tokens/radius/md", "/brief/styleId" */ },
  tokens: { …, space, typography: { heading, body, mono?, scale? } },
  references: { id, kind: "upload" | "url" | "mobbin-link", origin?: "screenshot" | "pdf-page",
                ownership: "own" | "third-party", contentHash?, sourceUrl?, fingerprint?, usedFor: string[] }[],
  provenance: { …, imports?: { sourceId, kind, format, fileName, sha256, bytes, parser, ownership, rightsConfirmedAt?,
                               fields: { path, locator, confidence, method }[], dismissed: string[] }[] },
}
```
> - `applyImport` escribe los valores aceptados en `tokens.*` y añade a `brief.locks` los punteros con confianza Exacta o Alta.
> - `applyPatch` rechaza cualquier operación sobre un puntero bloqueado, salvo que el usuario pulse «Desbloquear». Los estilos de paleta, «Barajar» y la IA pasan por la misma comprobación.
> - Espaciado, escala tipográfica, radio, sombras y borde van a `tokens.*` y pisan a la receta al compilar `system`.
> - Desaparecen `DesignDoc.imported`, `brief.customPairing` y `system.recipe.custom`.

---

### 4. [Alta] `pinned` no dice qué pasa con los estilos de paleta ni con la garantía AA

**Problema**
- **La escala sale de otro color.** La escala `brand` y los roles que dependen de ella (ring, charts, primaryText) salen de `styledSeedHex(styleId, primaryHex)` (`/Users/diegoguerrero/Desktop/designApp/packages/palette/src/theme.ts:360`). Con el primario fijado y el estilo «pastel», el primario se mantiene, pero la escala y lo que deriva de ella salen de otro color.
- **La garantía AA deja de cumplirse.** El JSDoc (`theme.ts:347`) y los tests prometen que todos los pares de `CONTRAST_PAIRS` cumplen AA. Con valores fijados eso ya no es verdad.
- **Parte del cambio ya existe.** `ExtractOptions.maxSwatches` ya está en `extract.ts:33`. Para el perfil `screenshot` solo falta la cobertura mínima, que hoy es la constante `MIN_COVERAGE`.

**Corrección** (sustituye «Cambios necesarios en `@dialmade/palette`»):
> - `GenerateThemeInput.pinned?: { light?: Partial<ThemeRoles>; dark?: Partial<ThemeRoles>; scales?: { brand?: ScaleStep[]; accent?: ScaleStep[] } }`.
> - **Primario fijado:** la escala `brand` se ancla a él sin `applyStyle`. El estilo de paleta solo cambia neutros, estados, charts y los roles no fijados.
> - **Escala importada:** con `pinned.scales.brand` se usa tal cual, y `anchors.brand` es el paso con menor ΔEok respecto al primario.
> - **Contraste:** `enforceContrast` no toca los valores fijados. Ajusta su pareja si no está fijada y rellena `primaryText` y `borderStrong`.
> - **Origen del fallo:** `ContrastCheck.source: "imported" | "generated"`. El JSDoc pasa a decir: «todo par con al menos un rol generado cumple AA; los pares 100 % importados se informan».
> - **Extracción:** `ExtractOptions.minCoverage?: number` (0.015 por defecto) y `keepChromaticBackground?: boolean`, en lugar de un `profile`.
> - **Tests:**
>   - primario fijado con «pastel»: `light.primary` sale idéntico y la escala queda anclada a él;
>   - par importado que falla: `pass: false`, `source: "imported"` y el valor sin tocar.

---

### 5. [Alta] En Inicio, los listeners globales se quedan con los archivos del panel

**Problema**
- **Solo pasa un archivo, y no es donde dice la spec.** `useWindowFileDrop` escucha en `window` y solo pasa `files[0]` (`/Users/diegoguerrero/Desktop/designApp/apps/web/src/components/HomeHero/useWindowFileDrop.ts:50`). La spec culpa a `HomeHero.onDrop`, que solo maneja las muestras.
- **Un CSS nunca abre el panel.** `submit` rechaza todo lo que no es imagen con el toast `unsupportedType` (`HomeHero.tsx:60-61`).
- **Pegar una captura lanza el recorte.** `useLogoPaste` coge las imágenes del portapapeles antes de comprobar si el foco está en un campo (`useLogoPaste.ts:41` y `:47`). Un Cmd+V de una captura en «Pegar colores o código» acabaría en el recorte del logo.
- **Siguen activos con el panel abierto.** Los dos hooks se registran sin `enabled` (`HomeHero.tsx:74-75`).

**Corrección:**
> - `useWindowFileDrop(onFiles: (files: File[]) => void, enabled)` pasa `Array.from(event.dataTransfer.files)`.
> - `HomeHero.route(files)`:
>   - un solo archivo que cumple `isHomeLogo` → `submit` (recorte, como hoy);
>   - cualquier otro caso → `setPanel("import")` con los archivos.
> - Con `panel === "import"`, se llama a `useWindowFileDrop(route, false)` y `useLogoPaste(…, false)`. `ImportDropzone` hace `preventDefault()` y `stopPropagation()` en `drop`.
> - `onUrl` sigue abriendo `UrlPanel` hasta la v1.1.
> - El cliente del worker va en `src/hooks/useImportWorker.ts`, igual que `usePaletteWorker.ts`, y no en `lib/import-client.ts`.
> - **Test de `HomeHero`:** con el panel abierto, soltar `globals.css` y pegar un PNG no llaman a `onFile`.

---

### 6. [Media] Con un proyecto típico de Next y shadcn nunca sale la «Guía completa»

**Problema**
- **La fuente real no está en el CSS.** `next/font` define la familia en `layout.tsx`, y el CSS solo trae `var(--font-…)`. El propio proyecto es un ejemplo (`/Users/diegoguerrero/Desktop/designApp/apps/web/src/app/globals.css:129`):
  - `-apple-system, BlinkMacSystemFont, "SF Pro Display", "SF Pro Text", var(--font-inter), system-ui, sans-serif`.
  - Un matcher que se quede con el primer nombre acaba en SF Pro, que solo existe en Apple, o en nada.
- **Sin fuentes, siempre «Parcial».** La «Guía completa» exige fuentes, así que los usuarios con este tipo de proyecto (justo el público objetivo) nunca la ven.
- **Falta la escala tipográfica.** No se lee la de `@theme` v4: `--text-h1`, `--text-h1--line-height`, `--text-h1--font-weight` y el resto (mismo archivo, líneas 95–125).

**Corrección** (fila «Fuentes por nombre» de §2 y carpeta `fonts/`):
> - Se recorre toda la pila de fuentes, no solo el primer nombre.
> - Los genéricos y las fuentes del sistema van a `fallbackStack` con `match.kind: "system"`: `-apple-system`, `BlinkMacSystemFont`, `system-ui`, `ui-sans-serif`, `ui-monospace`, `sans-serif`, `serif`, `monospace`, `Segoe UI`, `SF Pro*` y `SF Mono`.
> - Un `var(--font-x)` que no está definido en el lote se deduce de su nombre:
>   - se quita `--font-` y los sufijos `-sans`, `-serif`, `-mono`, `-display`, `-heading` y `-body`, y se busca en el índice;
>   - así, `--font-inter` da Inter, `--font-geist-mono` da Geist Mono y `--font-geist-sans` da Geist (las tres están en el CSV);
>   - entra con confianza Media y sin candado.
> - Opcional: pegar `layout.tsx` y leer con una regex `import { … } from "next/font/google"` (`Geist_Mono` → «Geist Mono»), sin ejecutar nada.
> - Del CSS sale también `typeScale`: `--text-<n>` con `--line-height`, `--letter-spacing` y `--font-weight`, más `--tracking-*` y `--leading-*`.
> - **Fixture:** el `globals.css` y el `layout.tsx` de la app. Resultado esperado: body Inter (`source: google`), mono Geist Mono y la pila de SF como `fallbackStack`.

---

### 7. [Media] El corte no tiene sitio en el plan y hay formatos de más y de menos

**Problema**
- **Encaje en el plan.**
  - La v1 (unos 33 días) más la v1.1 (unos 25) suman unas 11–12 semanas, mientras que el MVP completo está estimado en 12–15 (`docs/design/que-quieres-crear.md`).
  - El corte de unas 3,6 semanas no aparece en el plan M1/Beta (`docs/design/output-type-step.md` §5).
  - Además incluye cosas que la demo «suelto mi globals.css» no usa: el perfil `screenshot` (paso 2), el enrutado de varios archivos del hero (paso 4) y el spike de Figma (paso 0).
- **`figma-rest` sobra en la v1.** La API REST de variables exige plan Enterprise con Full seat (`round1-digest.md`, sección web:figma), así que casi nadie tendrá ese JSON.
- **Huecos en el resolver DTCG 2025.10** (comprobado hoy):
  - el `.resolver.json` es estable y apunta con `$ref` a otros archivos por ruta relativa;
  - la regla «se ignoran los `$ref` remotos» deja en duda si un resolver repartido en 3 archivos funciona;
  - el estándar también define `$extends` (§6.4) y `$ref` hacia sub-valores, y la spec no los menciona.
- **`tailwind.config.ts` con acorn.** Suele llevar `import type` y `satisfies`, que acorn no parsea. Además, «@babel/parser 7.29.x» no es una versión exacta (la última publicada es la 8.0.7).
- **Versión de dembrandt.** La 0.38.0 es del 2026-10-03 y la 0.37.0 del 2026-09-29: las dos tienen menos de las 2 semanas que exige tu propia regla.

**Corrección** (§8 y tablas de §2):
> - **Corte** (unas 3 semanas, estimación mía): pegar colores, CSS (shadcn en oklch y HSL, `@theme`), fuentes por nombre con la regla de `var(--font-*)`, pantalla de revisión y candados.
>   - Se entra por «Ya tengo marca o app» y por el botón «Importar» del Palette Lab.
>   - El perfil `screenshot` y el spike de Figma pasan al paso 5, y el enrutado del hero al paso 7.
>   - El corte va como primer bloque de la Beta, después de M1, salvo que decidas retrasar M1.
> - Sale `figma-rest`. Se mantiene la importación del export nativo de Figma.
> - **`tokens/resolver`:**
>   - los `$ref` relativos se resuelven por nombre de archivo dentro del lote, sin red, y los que falten van a `unresolved`;
>   - los `modifiers` con contextos `light`/`dark` pasan a modos; si los contextos tienen otros nombres, elige el usuario;
>   - se soportan `$extends`, `$deprecated` y `$ref` a sub-valores (`#/…/$value/components/0`).
> - DESIGN.md resuelve las referencias `{colors.primary}` con el mismo resolver de alias.
> - `tailwind-config` usa @babel/parser 7.29.9 con el plugin `typescript`, tanto para `.ts` como para `.js`. Acorn sale.
> - dembrandt se usa como `npx dembrandt@0.36.0`, y su salida entra por los parsers de DTCG y DESIGN.md, sin parser propio.

---

### 8. [Media] La casilla de derechos solo cubre las capturas de otras apps

**Problema**
- **Riesgo con archivos de otra marca.** La casilla solo aparece en «Referencia de otra app». Pero un `globals.css`, unos tokens o un brand book en PDF también pueden ser de otra marca. Con candados y «tu guía manda», la app reproduciría colores, fuentes y logo de un tercero: es el riesgo de trade dress y de diseño de interfaz protegido en la UE que señala el INFORME §8.
- **Columnas del CSV con licencia dudosa.** `google-fonts.csv` trae `Popularity Rank` y `Trending Rank`. El INFORME §7 manda quitarlas, y la spec no lo aplica en `build-font-index.ts`.
- **Falta un aviso de licencia.** `defaults/` copia el tema por defecto de Tailwind y la base de shadcn, ambos MIT, así que sus avisos tienen que ir en el NOTICE.

**Corrección** (§3, punto 3, y §7):
> - Una sola declaración por lote para «Mi logo», «Mi guía/tokens» y «Captura de mi app»: «Es mi marca o tengo permiso de su titular». Se guarda en `provenance.imports[].ownership` y `rightsConfirmedAt`.
> - Un archivo de guía marcado como «de otra marca» entra como referencia: solo atributos (radio, densidad, clase tipográfica y modo), sin candados de color, sin fuentes y sin logo.
> - El PDF (fase B) nunca extrae logos ni imágenes del brand book.
> - `build-font-index.ts` descarta `Popularity Rank` y `Trending Rank`, y la búsqueda difusa desempata por nombre, no por popularidad.
> - El NOTICE añade Tailwind CSS (MIT) y shadcn/ui (MIT), por lo copiado en `defaults/`.
> - El export real de Figma del spike usa la marca ficticia de los fixtures (CLAUDE.md: nada de logos reales).

---

**Lo que la spec ya tiene bien (comprobado):**
- **Precios:** Opus 5.5 cuesta $4 por millón de tokens de entrada, $20 de salida y $0,20 de lectura de caché; Haiku 5.5, $0,10 y $0,50.
- **Opus 5.5:** el thinking no se puede desactivar y el effort por defecto es `medium`; `fallbacks: "default"` con la beta `server-side-fallback-2026-07-01` es válido.
- **Structured outputs:** no admite `minimum`, `maximum`, `minLength` ni `maxLength`, y el schema compilado queda en caché 24 h.
- **Imágenes:** aproximadamente un token por cada parche de 28×28 px.
- **Límite de Vercel:** 4,5 MB por petición.
- **Fuentes:** las 6 alternativas con métricas compatibles y «Source Sans 3» están en el CSV.
- **shadcn:** el tema actual no trae `--destructive-foreground`.
- **Versiones fijadas:** postcss 8.5.28, acorn 8.18.0 y pdfjs-dist 6.3.289 son correctas, porque las últimas salieron entre el 3 y el 5 de octubre.
- **Licencia de `@google/design.md` 0.4.0:** su package.json no declara ninguna, como ya dice la spec.
- **Estructura:** se cumple la regla de un folder por componente.

**Sin verificar:**
- Cómo es el archivo que genera «Export modes» de Figma (lo resuelve el spike).
- Que el export de Figma ponga unidades a los números.

**Fuentes:**
- https://vercel.com/docs/limits/fair-use-guidelines
- https://vercel.com/docs/functions/limitations
- https://ui.shadcn.com/docs/theming
- https://www.designtokens.org/tr/2025.10/format/
- https://www.designtokens.org/tr/2025.10/resolver/
- La skill claude-api (datos de 2026-10-06), el registro de npm y culori 4.0.2 probado en local.