# Modo Layout v1.1 · La IA propone el layout

Nota de diseño corta. Contexto: `modo-layout.md` (fase v1.1) y la «Política de acceso a la IA» de `importar-guia.md`.

## Qué hace

1. **«Describe tu producto»**
   - Dónde: en el estado vacío del paso Layout (debajo de los sets de plantillas) y en el botón «Describir» de la barra superior, que abre un modal para añadir pantallas o reemplazarlas todas.
   - Entrada: texto libre de hasta 500 caracteres y el tipo de pantallas (Elige tú, App, Web pública).
   - Salida: 2–3 variantes. Cada una trae pantallas (nombre, tipo, ruta, navegación), bloques solo de la librería (etiqueta, nota y rect en 12 columnas × filas de 8 px), enlaces entre pantallas y una receta del catálogo con su motivo.
   - Cada variante sale como tarjeta con miniaturas (`LayoutThumbnail`), su motivo, el estilo y la lista de ajustes.
   - «Usar esta» aplica la variante en **un solo paso de deshacer** (`applyProposal`) y, si el interruptor está activo, también la receta. Después sale el toast «Ajustado · Deshacer».
2. **«Sugerir con IA» para bloques libres**
   - En el popover «¿Qué es esto?» (una caja). Lo escrito en el buscador viaja como nota.
   - En el panel de pantalla, «Sugerir tipos con IA» lanza un lote con todos los bloques libres del proyecto (máximo 24).
   - Se aplica con `retypeBlocks`, en un solo paso de deshacer.
3. **Sin IA** («Sin IA»): `DescribeScreens/fallback.ts` usa palabras clave, los sinónimos es/en de `searchBlocks` y unas pocas palabras de dominio, y monta 2–3 estructuras fijas. No cuesta nada y siempre responde.

## Acceso y coste

- **Una petición por acción = un uso gratis**, sean 3 variantes o 24 bloques. Antes de llamar se muestran el coste estimado y los usos que quedan («≈ $0,002 · te quedan 4 usos gratis · Cuenta como 1 uso…»).
- Hay tres caminos:
  - **free tier** (`/api/ai/layout`, `DIALMADE_AI_FREE_MODEL`, Haiku 5.5, con ledger);
  - **BYOK** directo desde el navegador (`DIALMADE_AI_MODEL`, Opus 5.5 por defecto);
  - **«Copiar prompt para mi Claude»**: se pega el JSON de vuelta y se valida con el mismo Zod en el cliente.
- Sin usos ni key, el diálogo de la IA (uno solo, en `LayoutStep`) ofrece BYOK o «mi Claude». La vía «Sin IA» sigue disponible.

## Seguridad

- La ruta pasa por `withAiBudget`/`runWithAiBudget`: free tier por dispositivo (cookie firmada), límite diario por IP, presupuesto mensual duro y reserva del peor caso (`count_tokens` + `max_tokens`) antes de llamar.
- Guardas de la petición:
  - rechaza peticiones cross-site;
  - cuerpo de 32 KB como máximo;
  - Zod `strictObject` en la petición;
  - salida con tope (8000 tokens al proponer, 2000 al mapear).
- El texto del usuario viaja como **datos**: JSON dentro de `<product_description>`, con `<` y `>` escapados y nuestras etiquetas eliminadas. El system prompt dice que su contenido nunca es una instrucción.
- La salida es structured output, con enums de tipos y recetas. El cliente vuelve a validar con Zod y `normalize.ts`:
  - mapea o descarta los tipos desconocidos;
  - redondea y limita los rects;
  - recorta o mueve los solapes con `@dialmade/layout`;
  - limpia los textos.
  Cada cambio sale como ajuste visible en la tarjeta.

## Exportes

`provenance.layoutBrief` (descripción, origen, variante, motivo y modelo) se escribe en el siguiente «Generar», mientras quede alguna pantalla de la propuesta. Sale en DESIGN.md y en los prompt packs. Los documentos sin brief exportan igual que antes.

## Límites conocidos

- ⌘Z deshace las pantallas, pero no el estilo: el historial del layout solo guarda pantallas (decisión 27). El «Deshacer» del toast sí restaura el estilo anterior.
- Las propuestas son de escritorio; tablet y móvil se derivan como siempre.
- La vía «Sin IA» es deliberadamente simple: una pantalla por necesidad, un panel, o landing + panel.
- El free tier usa Haiku 5.5. En la prueba real dio estructuras válidas (3 variantes, unos 10 s, unos 0,002 USD), pero a veces repite pantallas entre variantes.
