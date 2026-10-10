# Revisión de la spec «Diseño con IA»: 21 problemas por prioridad

Es una pasada adversarial sobre `diseno-con-ia-spec.md` en seguridad, coste, accesibilidad, editabilidad y alcance. Los arreglos ya están aplicados en la spec y llevan la marca **[Cn]**. Al final hay una tabla con el estado de cada uno.

**Comprobé estas afirmaciones de la spec contra el código y coinciden. No hace falta tocarlas:**
- Los precios de `apps/web/src/lib/ai/pricing.ts` (Haiku 5.5: $0,10 / $0,50 / lectura de caché $0,01 / escritura $0,125; Opus 5.5: $4 / $20 / $0,20 / $5) coinciden con la referencia actual de la API.
- El mínimo cacheable de Haiku 5.5 y Opus 5.5 es de 512 tokens. El `system` del probe (2279) lo pasa: la llamada 2 leyó 2279 de caché.
- `AI_GENERATE_TIMEOUT_MS` = 45 s y `maxDuration` = 60 en `/api/ai/copy`. `withAiBudget` hace una reserva por petición (`AiLedger.reserve/settle/release`).
- `NEXT_PUBLIC_PREVIEW_ORIGIN` solo existe en `.env.example` («planned»). No hay ningún iframe en `apps/web/src`.
- El contrato del DOM de `@dialmade/layout` tiene un elemento por bloque con `data-dl-id` (`modo-layout-decisiones.md`, n.º 15). Los ids de bloque son los ids de elemento de `screen.page`.
- `tailwindcss` 4.3.3 es dependencia de `apps/web`, y `ICONS` de `@dialmade/ui` tiene 39 iconos propios.
- Haiku 5.5 y Opus 5.5 rechazan `temperature` distinta de la de por defecto (400). La variedad no puede venir del muestreo.

---

### 1. Crítico: Ajustar pinta en el DOM de la app, no en un iframe (C21)

**El problema**
- `Composer/Canvas/PagePreview` y `CanvasViewport` pintan las secciones con React **en el DOM de la app**. Ahí funcionan la selección, el texto inline y los knobs.
- La spec manda pintar el HTML de la IA «solo en un iframe del origen de preview», pero no dice cómo convive ese iframe con los bloques base de la misma pantalla.
- Meter toda la pantalla en un iframe obligaría a rehacer la selección, la edición inline y los overlays del Composer por `postMessage`. Son semanas de trabajo, y además rompería los bloques base.

**Corrección (§6.1, §8 y §12)**
> - **«Una isla por bloque».** En Ajustar, cada bloque de IA se pinta en **su propio iframe sandbox** del origen de preview, dentro de su celda de la rejilla en el DOM de la app. Los bloques base siguen como hoy.
> - Medidas de la isla:
>   - el ancho del iframe es el de la celda, así que las container queries funcionan;
>   - el alto lo informa el runtime con `ResizeObserver` → `postMessage`, con un tope de 4000 px;
>   - el iframe lleva 24 px de margen interior compensado, para que no recorte sombras.
> - El tema (variables y claro/oscuro) llega por mensaje a todas las islas.
> - La página pública y la medición de las puertas usan un único iframe de página completa. El export no usa iframe: es un archivo.
> - Coste: 6–8 iframes por pantalla. Las fuentes salen de la caché HTTP (mismo origen de preview).

### 2. Crítico: cancelar en el free tier no puede liquidar «el `usage` parcial» (C8)

**El problema**
- El `usage` final llega en `message_delta`, al terminar.
- Si el cliente corta el SSE y el servidor aborta la llamada a Anthropic, el servidor no sabe cuánto se cobró. Tendría que liquidar el peor caso o adivinar.
- `access.ts` ya fijó una política: «once the paid call starts it runs to the end and is settled at its real cost».

**Corrección (§5.3)**
> - **Free tier:** «Cancelar» cierra la vista del cliente. El servidor termina la llamada (≤45 s), liquida el coste real y descarta el resultado. El texto dice «Ya se pagó esta pantalla; no gasta otra de tu sesión».
> - **BYOK:** se aborta de verdad. Es dinero del usuario, y Anthropic cobra lo generado.

### 3. Alto: el HTML libre revierte INFORME §15.2 sin decirlo (C1)

**El problema**
- §15.2 decidió: «el modelo devuelve solo un JSON Patch… No hay HTML libre».
- La spec cambia eso en silencio.
- Además, compilar Tailwind **dentro** del iframe (CDN `@tailwindcss/browser`) exigiría `script-src` externo y procesaría clases sin validar.

**Corrección (resumen y §2.2)**
> - La reversión se nombra y pasa a ser la decisión 1 del usuario, limitada al interior del bloque.
> - Se valida la gramática de clases **antes** de compilar.
> - `compile()` corre en un worker de la app, y al iframe llega CSS ya compilado.
> - Sin CDN y sin `script-src` externo.

### 4. Alto: un uso por petición hace inútil «Pedir cambio» en el free tier (C7)

**El problema**
- Con 5 usos al mes, un «Generar con IA» y 4 cambios agotan el mes.
- Contar el render de 3 pantallas como un uso, sin decir cómo se coordinan varias peticiones, deja huecos para el abuso: llamar a `/api/ai/render` sin una reserva.

**Corrección (§5.2)**
> - «Sesión de diseño»: un uso = 1 Generar (≤3 pantallas) + 10 acciones de bloque en 24 h.
> - `sessionId` firmado con el secreto del dispositivo, y una sola reserva extensible (`extend`, migración SQL).
> - Las pantallas que fallan se reintentan sin gastar.
> - Pasa a la lista de decisiones del usuario (2).

### 5. Alto: el presupuesto de $5 se agota en el pico del lanzamiento (C7-b)

**El problema**
- Una sesión completa con Haiku cuesta ≈ $0,023 y reserva ≈ $0,022 de peor caso. $5 dan para unas 215 sesiones, compartidas con copy y visión.
- Un post con tracción lo agota en horas, y a partir de ahí la feature estrella «no funciona» para todos.

**Corrección (§5.5, §13 y decisión 3)**
> - Se pide al usuario que decida el presupuesto del mes del lanzamiento.
> - El diálogo de agotado ofrece BYOK y «mi Claude» al primer clic.
> - El diseño base sigue funcionando.

### 6. Alto: el contraste no se comprobaba en hover, foco ni degradados (C10)

**El problema**
- El probe 2 hizo `from-primary to-accent` con `text-primary-foreground`. Con paletas tipo shadcn, `accent` es claro, así que hay texto blanco sobre claro.
- Un chequeo de «color de texto frente a `background-color`» no ve los degradados.
- Las dos salidas usaron `hover:bg-cta-600` (escala), que en modo oscuro puede no contrastar.
- El anillo de foco no se comprobaba.

**Corrección (§2.2 y §7, puerta 4)**
> - Los tokens de estado (`*-hover`) entran en el vocabulario.
> - Los degradados se muestrean en sus extremos.
> - El anillo de foco se comprueba contra su fondo.
> - Se comprueba en claro y en oscuro.
> - El arreglo es una regla a nivel de token, nunca un cambio de paleta.

### 7. Alto: la prosa de una guía importada es un vector de inyección (C5)

**El problema**
- Un DESIGN.md de terceros (por ejemplo, descargado de un repo) puede traer instrucciones.
- La spec enviaba «la guía importada» sin decir qué parte.

**Corrección (§3.1 y §6.3)**
> - Solo se envía la huella estructurada: receta cercana, densidad, radios, sombras y clase tipográfica.
> - La prosa no se envía.
> - Los textos nuevos con URLs o contactos dan aviso (puerta 7).

### 8. Alto: el MVP era demasiado grande para el lanzamiento (C14)

**El problema**
- Origen de preview, Tailwind en un worker, sanitizador, 8 puertas, 3 caminos, dirección de arte, edición, estados pendiente y aceptado, TSX completo y Figma por DOM walk.
- Todo eso son 8–10 semanas de 1 dev.

**Corrección (§8.2 y §12)**
> - Fuera del MVP:
>   - el estado «pendiente/aceptar»: un bloque de IA está activo hasta «Usar diseño base»;
>   - «Pedir cambio» sobre un subárbol;
>   - el TSX de página completa;
>   - el `figma-plan`;
>   - axe-core.
> - El responsive se limita a desbordes y objetivos táctiles.
> - Los contenedores solo llevan `surfaceClasses`.
> - Hay un spike con criterio de salida.

### 9. Medio: los contenedores con hijos rompen «una raíz por bloque» (C15)

**El problema**
- Un Contenedor o un Modal tiene bloques hijos en sus propias celdas.
- Si la IA devuelve el HTML completo del contenedor, o pinta los hijos dentro (duplicados) o necesita un hueco que el contrato no define.

**Corrección (§1)**
> - MVP: el contenedor recibe solo `surfaceClasses` validadas.
> - v1.1: un hueco `data-slot="children"`.

### 10. Medio: un bloque puede salirse de su celda (C17)

**El problema**
- `absolute` con `-top-20`, `fixed` o `z-50` pueden tapar a los vecinos.
- La puerta de estructura comprobaba ids, pero no la colocación visual.

**Corrección (§2.2 y §7)**
> - `fixed`, `sticky`, los márgenes negativos y `z-*` > 10 están prohibidos.
> - Con la isla por bloque (problema 1), el iframe ya contiene el bloque.
> - En la página completa y en el export, la celda lleva `contain: layout paint` y `overflow: clip` con margen de 24 px.

### 11. Medio: varios h1 y saltos de nivel entre bloques (C11)

**El problema:** cada bloque se genera con su propio criterio, así que dos heroes o un «Features» con h1 rompen el esquema de encabezados (WCAG 1.3.1).

**Corrección (§7, puerta 6):** arreglo automático de niveles por pantalla, con aviso.

### 12. Medio: aria-live por bloque satura el lector de pantalla (C9)

**El problema:** 6 bloques × 3 pantallas son 18 anuncios en unos 30 s.

**Corrección (§10.2):** un anuncio por pantalla terminada, con el resumen.

### 13. Medio: protocolo `postMessage` sin validar (C6)

**El problema**
- Con islas por bloque hay muchos iframes y muchos mensajes.
- Sin comprobar `source` y `origin`, otra ventana podría inyectar mensajes `textEdit` y escribir en el documento.

**Corrección (§6.1)**
> - Se comprueba `event.source` contra el iframe esperado, y `event.origin` en el runtime.
> - Cada mensaje pasa por Zod, con un `blockId` que debe coincidir con la isla que lo envía.

### 14. Medio: los links públicos pueden servir mocks de login creíbles (C3)

**El problema**
- Una pantalla Login de IA, publicada en un link compartido, parece real.
- No puede enviar nada (CSP), pero sirve para phishing por captura.

**Corrección (§6.5):** pie fijo de la app («Diseño de ejemplo…»), `autocomplete="off"`, y el link público pinta en el origen de preview, no en el de la app.

### 15. Medio: la variedad no se medía y podía bajar la calidad (C16)

**El problema**
- «Cada diseño será muy diferente» no tenía métrica.
- Además, sortear ejes sin control produce combinaciones feas: `tech-precision` con `soft-shapes`.

**Corrección (§4.2 y §4.4)**
> - Tabla de compatibilidad entre ejes y receta.
> - Eval de variedad con una métrica sin color (tema en grises), línea base determinista y ruido de la misma marca.
> - Panel ciego de calidad con 3–5 devs.
> - Va en el criterio de salida del spike.

### 16. Medio: un historial con HTML pesado (C13)

**El problema:** zundo guarda instantáneas. Un documento de 1 MB con 50 pasos son 50 MB si se copian las cadenas.

**Corrección (§8.3):** actualizaciones inmutables (solo cambia el bloque tocado, el resto se comparte por referencia) y tope de 1 MB de `aiRender`.

### 17. Medio: el copy editado en base se pierde al volver a la IA (C12)

**El problema:** si el usuario pasa un bloque a base, edita el texto y vuelve a «Usar IA otra vez», el HTML de la IA tiene el texto viejo.

**Corrección (§8.3 y §8.4):** `basis` incluye el hash del copy de entrada. Al volver sale «Desactualizado · Rehacer con IA».

### 18. Bajo: el fallback `srcdoc` en desarrollo puede colarse en producción (C4)

**El problema:** los fallbacks «solo de desarrollo» acaban en producción.

**Estado:** la spec ya lo cubre. En producción, sin origen de preview, la opción no aparece. Hay que añadir un test que lo compruebe con `NODE_ENV=production`. *Sin cambio de texto.*

### 19. Bajo: `input type=password` en el HTML de la IA (C2)

**Estado:** se mantiene, porque Login lo necesita. Sin `form`, con `form-action 'none'` y con `connect-src 'none'`, no hay salida. *Sin cambio.*

### 20. Bajo: el probe es pequeño (C19)

**El problema:** n=2 (un hero y un cambio), solo Haiku, una sola prueba de inyección, sin medir la variedad ni Opus.

**Corrección (§11):** la spec ya lo dice en «Sin medir». La eval de variedad y una pantalla `app` con Opus pasan al spike.

### 21. Bajo: `maxDuration` en Vercel Hobby (C20)

**El problema:** el diseño supone 60 s por función y SSE a través de un route handler de Next. El límite del plan Hobby no se verificó hoy.

**Corrección:** tarea del spike: verificar el límite y el streaming en el proyecto real. Con unos 25 s por pantalla hay margen incluso con 60 s.

---

## Estado de los arreglos

| Id | Severidad | Aplicado en la spec |
|---|---|---|
| C21 | Crítico | §6.1, §8.1, §12: isla por bloque |
| C8 | Crítico | §5.3: cancelar en el free tier |
| C1 | Alto | Resumen, §2.2 |
| C7 | Alto | §5.2, §14 (decisiones 2 y 3) |
| C10 | Alto | §2.2, §7 |
| C5 | Alto | §3.1, §6.3 |
| C14 | Alto | §8.2, §12 |
| C15 | Medio | §1 |
| C17 | Medio | §2.2, §7 |
| C11 | Medio | §7 |
| C9 | Medio | §10.2 |
| C6 | Medio | §6.1 |
| C3 | Medio | §6.5 |
| C16 | Medio | §4.2, §4.4 |
| C13 | Medio | §8.3 |
| C12 | Medio | §8.3, §8.4 |
| C4, C2 | Bajo | Sin cambio (ya cubierto) |
| C19, C20 | Bajo | §11; tareas del spike |
