# Modo Layout v1.1 · La IA propone el layout

Nota de diseño corta. Contexto: `modo-layout.md` (fase v1.1) y la «Política de acceso a la IA» de `importar-guia.md`.

## Qué hace

1. **«Describe tu producto»**, en dos pantallas cuando el proyecto está vacío (decisión del usuario, 2026-10-10):
   - **«¿Qué vas a construir?»** es lo único que se ve al abrir Layout sin pantallas. Trae:
     - un textarea grande y 4 ejemplos es/en que lo rellenan;
     - «Proponer con IA» y «Sin IA», con la línea de coste («≈ $0,002 · te quedan 4 usos gratis · 1 uso = 3 variantes»);
     - «Usar mi propia key» y «Copiar prompt para mi Claude», más discretos;
     - el bloque «Detalles» plegado: nombre, tagline y tipo de producto.
     Debajo están «o usa una plantilla» (los sets y «Una pantalla» en su propia vista; Volver o Esc regresa) y «empieza vacío».
   - **«Elige una»** muestra 2–3 tarjetas grandes con miniaturas por pantalla, nombre y motivo, estilo, ajustes y «Usar esta». Además trae:
     - el interruptor «Aplicar también el estilo recomendado»;
     - «Volver a describir» (o Esc), que conserva el texto;
     - «Proponer otras», que vuelve a mostrar el coste.
   - Las transiciones usan `motion` (200 ms; con movimiento reducido, solo fundido). Cada pantalla lleva el foco a su título.
   - Con pantallas en el proyecto, «Describir» en la barra superior abre el modal para añadir pantallas o reemplazarlas todas, con las variantes debajo del formulario.
   - Variantes: pantallas (nombre, tipo, ruta, navegación), bloques solo de la librería (rect en 12 columnas × filas de 8 px), enlaces y una receta del catálogo con su motivo.
   - «Usar esta» aplica la variante en **un solo paso de deshacer** (`applyProposal`) y, si el interruptor está activo, también la receta. Después sale «Ajustado · Deshacer».
   - **«Detalles» inferidos:**
     - la respuesta trae `details` (`brandName`, `tagline`, `productType` de los chips). El cambio es aditivo: el esquema laxo acepta respuestas sin `details`;
     - «Sin IA» deduce el tipo de producto por palabras clave;
     - solo se rellenan los campos que el usuario no ha tocado (nombre por defecto, tagline vacía, tipo «Otro»), en un paso de deshacer del documento;
     - se corrigen en «Detalles», y «Elige una» los resume con «Corregir».
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
