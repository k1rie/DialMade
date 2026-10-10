# Plugin de Figma de Dialmade

Convierte el `figma-plan.json` que descargas en Dialmade (**Exportar → Figma → Descargar figma-plan**) en un archivo de Figma editable:

- **Variables**: la colección `Dialmade · Color` con los modos **Light** y **Dark** (los nombres coinciden con `figma-light/dark.tokens.json`) y `Dialmade · Tokens` con radios, espacios, tamaños de letra y tokens de componentes. Cada variable lleva su sintaxis CSS (`var(--primary)`).
- **Estilos**: estilos de texto `Dialmade/H1`, `Dialmade/Body`… (el tamaño ligado a su variable) y de sombra `Dialmade/Shadow sm|md|lg` según la receta.
- **Páginas**: una por pantalla y la **Guía de estilo** aparte. Cada pantalla es un frame de escritorio (1440 px) con **auto layout**: filas y columnas, gap, padding y hug/fill derivados del layout. Colores, espacios y radios quedan ligados a las variables.
- **Flujo (prototipo)**: si las pantallas se enlazan (`linkTo`), una página con todas ellas y sus enlaces de prototipo (Figma no enlaza entre páginas).
- Opcional: cada pantalla también en modo oscuro, al lado.

Sin dependencias de pago ni red: el plugin no hace peticiones (`networkAccess: none`). **No está publicado en Figma Community**: se instala en local desde su manifest.

## Instalar (Figma Desktop)

1. Consigue el plugin compilado:
   - desde la app: **Exportar → Figma → Cómo instalar el plugin → Descargar plugin**, y descomprime el ZIP; o
   - desde este repo: `corepack pnpm --filter @dialmade/figma-plugin build` (deja `dist/` con `manifest.json`, `code.js` y `ui.html`).
2. En Figma Desktop abre un archivo y ve a **Plugins → Development → Import plugin from manifest…** (en español: **Plugins → Desarrollo → Importar plugin desde manifiesto…**).
3. Elige el `manifest.json` (de la carpeta descomprimida o de `packages/figma-plugin/dist`).

Los plugins en desarrollo solo funcionan en **Figma Desktop**, no en el navegador.

## Usar

1. **Plugins → Development → Dialmade**.
2. Pega el contenido de `figma-plan.json` o suelta el archivo en la ventana. El plugin lo valida (esquema figma-plan v1) y te dice qué contiene.
3. Marca si quieres también el modo oscuro y la página de flujo, y pulsa **Crear en Figma**.
4. Al terminar verás un resumen: variables nuevas y actualizadas, estilos, páginas y enlaces.

**Fuentes que faltan.** Si una fuente del plan no está instalada en tu equipo, el plugin usa la de respaldo del estilo (Inter, o Roboto Mono para monoespaciada) y la lista en el resumen. No falla: instala la fuente y vuelve a ejecutarlo para corregirlo.

**Volver a ejecutarlo** sobre el mismo archivo actualiza las variables y los estilos por nombre y reemplaza los frames que creó antes (los suyos llevan plugin data `dialmade`). Lo que añadas tú en esas páginas se queda.

**Planes de Figma.** Si tu plan no permite un segundo modo de variables, el plugin crea solo los valores del primer modo y lo avisa.

## Desarrollo

```bash
corepack pnpm --filter @dialmade/figma-plugin build      # dist/
corepack pnpm --filter @dialmade/figma-plugin test       # fuentes y un doble de la Plugin API con un plan real
corepack pnpm --filter @dialmade/figma-plugin typecheck
```

- `src/code.ts`: hilo principal (Plugin API, sin DOM). `documentAccess: "dynamic-page"`: solo APIs asíncronas.
- `src/ui.ts` + `src/ui.html`: la ventana. Valida el plan con el esquema Zod de `@dialmade/handoff/figma-plan` antes de mandarlo al hilo principal.
- `src/testing/fakeFigma.ts`: doble de la Plugin API con las comprobaciones de Figma que más fallan (FILL fuera de auto layout, HUG sin auto layout, texto sin fuente cargada, enlaces de prototipo entre páginas).
- El esquema del plan y su generador viven en `packages/handoff` (`toFigmaPlan`).

Límites conocidos: las regiones bento del layout (sin corte limpio) se colocan con posiciones absolutas dentro de un frame fijo, porque el plan no usa la rejilla de auto layout de Figma; los degradados no van ligados a variables.
