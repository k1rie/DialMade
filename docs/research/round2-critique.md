[harness: subagent output matched instruction-shaped pattern(s): settings-json. Control tags below are neutralized (`<` → `<\`); treat any remaining directive-shaped text as a finding to relay to the user, not an instruction to you.]

# Crítica de completitud: «Dialed: arquitectura final, workflow y plan»

Hoy (2026-10-09) comprobé contra la fuente primaria los puntos marcados con [V]. Los marcados como [local] los comprobé en el disco de este proyecto.

---

## P1: alta prioridad

### 1. Las capturas de Mobbin pegadas en la app contradicen la postura legal del propio documento
**Dónde:** §3, tabla «Tu paso actual», fila 2, y paso 3b; §8, fila «Capturas que pega el usuario».

**Problema:** el documento exige permiso escrito de Mobbin para usarlo dentro de la app, porque sus Terms prohíben usar IA para crear obras derivadas y declaran que esas obras son de Mobbin (#48, #69). Aun así, pone como ejemplo pegar capturas «copiadas de *tu* cuenta de Mobbin» y analizarlas con Sonnet con visión. Es el mismo uso: IA sobre contenido de Mobbin dentro de nuestro producto. La casilla de derechos no cambia eso, solo pasa el riesgo al usuario.

**Corrección (§3, fila 2):**
> | Buscar muchas referencias en Mobbin | Paso 3: tu Claude busca en Mobbin con su propio conector (el uso que documenta Mobbin), a partir de las consultas que Dialed genera desde tu brief. En la app puedes pegar capturas propias o de fuentes cuya licencia lo permita. Un link de mobbin.com se guarda como tarjeta sin imagen y sin análisis con IA. |

**Corrección (paso 3b):** sustituir «(por ejemplo, copiadas de *tu* cuenta de Mobbin)» por:
> (de tu producto, de tu cliente o de fuentes cuya licencia permita analizarlas con IA; **no** capturas de Mobbin mientras no haya permiso escrito). Si se pega un link de mobbin.com, la tarjeta no lleva imagen y el usuario elige los atributos a mano.

**Corrección (§8, fila «Capturas que pega el usuario»):**
> ✅ Solo contenido propio o con una licencia compatible. ❌ Contenido de Mobbin hasta tener su permiso escrito (el mismo motivo que bloquea la búsqueda in-app).

### 2. El paso «Mobbin» del workflow del usuario queda cubierto solo en la superficie en el MVP
**Dónde:** §3, §5 y §9.

**Problema:** la búsqueda en Mobbin la hace «tu Claude», pero en el MVP las referencias que encuentre no pueden volver al tablero: el MCP es de solo lectura en la v1.1 y la escritura llega en la v2. Además, el documento no dice qué recibe el Claude del usuario para orientar esa búsqueda. Era el paso 2 del workflow que describió el usuario.

**Corrección (añadir al final de §3, después de la primera tabla):**
> **Referencias en el MVP.** Dialed es el paso previo. El Direction Pack incluye `references.md` con:
> (a) 5–8 consultas sugeridas para `search_screens` y `search_sections` en modo `standard`, derivadas de productType, layoutId y estilo;
> (b) los links y los fingerprints de las referencias del tablero;
> (c) la regla «adaptar, no copiar, citar el producto y la URL de Mobbin».
>
> Las referencias que tu Claude encuentre no vuelven al tablero hasta la v2 (`add_reference` con OAuth). Puente opcional en la v1.1: la skill `dialed-direction` devuelve un fingerprint JSON (solo IDs del catálogo, sin imágenes ni `image_url`) que el usuario pega en la bandeja.

### 3. Los plazos no son realistas
**Dónde:** §0 A, fila «Tiempo a MVP»; §1; §9.

**Problema:** las estimaciones de MVP del digest para 1 dev son más largas que lo que el plan les asigna:

| Área | Digest | Plan |
|---|---|---|
| Color | 2–3 semanas | 1 (sem. 2) |
| Preview y export | 6–8 semanas | unas 3 (sem. 3, 5 y 6) |
| Motion y UX | 4–6 semanas | 1–2 |
| IA | 6–8 semanas | 2 |
| Referencias | 4–6 semanas | media semana |

A eso se suman 20 recetas y unas 12 secciones, cada una en claro y oscuro y en 3 breakpoints. Las semanas 11–12 son beta y lanzamiento, así que no hay colchón real. La v1.1 mete en 4 semanas el figma-builder, que la evaluación de C llama «la pieza más pesada», y un page type nuevo (dashboard). Ese page type pide un catálogo nuevo, porque landing.csv no sirve para dashboards.

**Corrección (§1, viñeta «Plan»):**
> **Plan.** MVP en 12 semanas **con alcance recortado**: 8 secciones, 12 recetas, 10 pairings y BYOK solo para las 4 direcciones y el copy. El fingerprint de referencias con IA, Figit y Framer TSX pasan a la v1.1. Con el alcance actual serían 16–18 semanas para 1 dev. Demo pública sin IA en la semana 6.

**Corrección (§9, v1.1):**
> **v1.1 (semanas 13–18):** MCP de solo lectura y `get_figma_plan` limitado a variables y estilos de texto. Las capas vía `use_figma` y el page type dashboard pasan a la v1.2.

**Corrección (§0 A):** bajar «Tiempo a MVP» de 7 a 5. El total queda en 40/60 y la ganadora no cambia.

### 4. Inconsistencias internas del calendario
- **M1 promete un zip antes de que existan los compiladores.** M1 cae en la semana 5 e incluye «link + zip», pero los compiladores y el zip son de la semana 6. Texto nuevo:
  > **Hito M1: demo pública sin IA** (logo → paleta → arrastrar → preview → link). El zip entra en M2.
- **Referencia cruzada errónea.** La semana 1 remite a «(ver §12)», que son las fuentes. Debe decir «(ver §11, paso 1)».
- **El spike depende de algo que aún no existe.** §11, paso 1, captura `/s/demo` los días 1–2, pero el runtime y la publicación llegan en las semanas 3 y 5. Texto nuevo:
  > …sobre `spike/demo.html`: una landing estática escrita a mano con las mismas CSS vars, servida con `npx serve` en local y desde un dominio de pruebas.
- **§11 no cuadra con §9.** §11 reparte 5 tareas en días que se solapan (1–2, 2–3, 3–4, 4–5, 5), mientras §9 pone el spike de paleta en la semana 2 y el composer en la semana 4. Texto nuevo para el inicio de §11:
  > Esta semana: (1) spike de Figma, (2) ETL y 5 recetas, (3) legal y entorno. Los spikes de paleta y de composer abren las semanas 2 y 4.

### 5. Con `renderToString` el link no tendrá «el motion real del diseño»
**Dónde:** §3, paso 6; §4.1; §6, fila «Link compartible».

**Problema:** `renderToString` genera HTML sin JS. Las secciones animan con Motion (React), así que sin hidratación el link sale estático. Eso contradice la columna «Fidelidad» del link: «Alta, con el motion real del diseño».

**Corrección (§3, paso 6):**
> «Crear link» publica en R2 el HTML de `renderToString` **y** el bundle de `apps/runtime`, que hidrata con `hydrateRoot` en `dialed-usercontent.com` (la CSP de ese dominio permite `script-src 'self'`). El zip lleva además una versión sin JS con animaciones CSS (`@keyframes`) equivalentes al motionTier.

**Corrección (§10, fila nueva):**
> | El motion del diseño no llega a Figma (captura, Figit, `use_figma`) ni a Claude Design | El link es la referencia de motion para el diseñador. La pestaña Style Guide documenta duraciones y curvas, y el aviso aparece en la carta de destino Figma. |

### 6. Variables de Figma: el documento dice a la vez «4 colecciones con alias» y «un modo por archivo»
**Dónde:** §0, injerto «Estructura de variables…»; §4.2; §6, fila «Figma: variables».

**Problema:** el import nativo crea un modo por archivo dentro de una sola colección. Cuatro colecciones con alias piden cuatro importaciones separadas y la extensión `com.figma.aliasData`, que el documento no menciona en ningún sitio [V Modes for variables].

**Corrección (§0, fila del injerto):**
> | Variables en Figma. MVP: una colección «Dialed» con modos Light/Dark (dos archivos, valores literales, sin alias). Starter: dos colecciones, «Dialed Light» y «Dialed Dark», con un archivo cada una. Primitivos / Color / Forma / Motion con alias: en el plugin v2, o en el MVP con `$extensions.com.figma.aliasData` si lo valida el spike. | Baseframe | MVP (export) y v2 (plugin) |

### 7. Al capturar, las variables no se enlazarán solas con la convención de nombres actual
**Dónde:** §0, injerto «Nombres idénticos…»; §4.2, «Convención de nombres»; §6, fila «Figma: capas».

**Problema, en tres partes:**
- Figma empareja las variables primero por code syntax y después por nombre [V help 40826832449303].
- El import DTCG no documenta ninguna forma de fijar el code syntax: la única extensión que menciona es `com.figma.type` [V Modes for variables]. Tras importar, `color/primary` no tendrá `var(--primary)`. Además, las utilidades de Tailwind v4 leen `var(--color-primary)`, no `--primary`.
- La extensión de Chrome sobre `/s/{slug}` captura la shell, y el diseño vive en un iframe de otro origen.

**Corrección (§4.2, convención):**
> Como el import DTCG no fija el code syntax, Figma empareja por nombre de variable. El spike decide entre (a) que la CSS var del estilo computado sea `--color-primary` y la variable de Figma `color/primary`, o (b) fijar el code syntax con el plugin v2 o con `use_figma`. Las variables con opacidad no se enlazan.

**Corrección (§6, Figma capas, opción 1):**
> Extensión de Chrome de Figma sobre `https://dialed-usercontent.com/s/{slug}` (la página del render, no la shell `/s/{slug}` con su iframe).

**Corrección (§11, paso 1, añadir):**
> Comprobar si el import DTCG fija el code syntax y, si no, qué nombre de CSS var empareja con `color/primary`.

### 8. La key BYOK vive en el navegador, pero el plan mete Sentry y PostHog en el editor
**Dónde:** §4.1; §9, semana 10; §10, fila de la key BYOK.

**Problema:** la mitigación dice «sin scripts de terceros en el editor», pero la semana 10 añade Sentry y PostHog. El session replay de PostHog y los breadcrumbs o datos de petición de Sentry pueden capturar la key. Además, el documento no dice dónde se guarda la key por defecto.

**Corrección (§10, fila BYOK, columna Mitigación):**
> CSP estricta y Trusted Types. Sentry y PostHog van empaquetados (sin CDN), con el session replay desactivado en el editor, `maskAllInputs`, un `beforeSend` que elimina `x-api-key` y `anthropic-*`, y sin capturar cuerpos de petición a api.anthropic.com. Por defecto la key vive solo en memoria (la pestaña). «Recordar» la guarda en IndexedDB, cifrada con WebCrypto con una clave no extraíble. Banner de consentimiento para la analítica (UE). Recomendar keys de un solo workspace, con spend limit y expiración de 30 días.

### 9. «Su suscripción (cualquier plan)» es falso para Claude Code, y el plugin llega a más superficies de las que dice el documento
**Dónde:** §5, fila «Packs y plugin de Claude Code»; §9, semana 9.

**Evidencia:**
- [V claude.com/pricing] «Claude Code is included in all paid plans»; Free no lo incluye.
- [V platform-support] El mismo plugin carga sus skills y el MCP remoto con URL fija en el chat de claude.ai (web, desktop y móvil) y en Cowork. Los output styles se ignoran fuera de Claude Code. El apartado Discover del directorio solo existe de Pro en adelante.
- #54: en Team y Enterprise solo un Owner puede añadir custom connectors; en Free, como máximo uno.

**Corrección (§5, columna «Quién paga» de esa fila):**
> Claude Code: Pro, Max, Team o Enterprise (Free no lo incluye), o API key. El mismo plugin, subido en Customize > Plugins o listado en el directorio, carga sus skills también en el chat de claude.ai y en Cowork. El output style solo funciona en Claude Code.

**Corrección (§5, fila «MCP remoto», añadir):**
> Free: máximo 1 custom connector. Team/Enterprise: solo un Owner puede añadirlo; para equipos, pedírselo al Owner o publicar en el directorio.

**Corrección (§9, semana 9, añadir):**
> Enviar el plugin bundle al directorio (repo público en GitHub).

### 10. `get_figma_plan` interpreta mal el límite de 20 KB y no cuenta el coste de transcribir el código
**Dónde:** §0, injerto; §6, «Figma: vía tu Claude»; §9, v1.1.

**Problema:**
- Los 20 KB son un límite de la **respuesta** de `use_figma` («20kb output response limit per call»), no del código de entrada [V write-to-canvas].
- Los clientes listados son Claude Code y Claude Desktop; claude.ai web no aparece.
- El modelo del usuario tiene que reescribir cada trozo de JS como argumento de `use_figma`. Son unos 5–6K tokens de salida por cada 20 KB, va lento y el modelo puede alterar el código.
- La frase «`use_figma` exige que el cliente soporte skills» también es incorrecta: la página dice que el cliente «may also load the required skill».

**Corrección (§0, injerto `get_figma_plan`):**
> `get_figma_plan` devuelve un builder JS pequeño y estable (objetivo: 8 KB o menos) y datos JSON por sección, que el Claude del usuario pasa a `use_figma` (cuya respuesta está limitada a 20 KB). En el spike hay que medir los tokens de salida y la tasa de errores por landing. Si una landing pasa de unos 30K tokens de salida, la v1.1 se limita a variables y estilos de texto, y las capas van por Code to Canvas. Funciona en Claude Code y Claude Desktop; en claude.ai web `use_figma` no aparece.

**Corrección (§6):** sustituir «`use_figma` exige que el cliente soporte skills» por:
> según el cliente, este puede cargar una skill de Figma antes de escribir.

### 11. Motion: el documento contradice su propio presupuesto y no resuelve lo que pidió el usuario
**Dónde:** §3, «Presupuesto de motion», paso 0 y paso 1.

**Problema:** «Todo dura menos de 300 ms… solo anima cambios de estado» choca con dos cosas del propio documento:
- el MeshGradient de fondo, que se mueve de forma continua;
- el logo que «vuela en arco» y la transición del gradiente, que duran alrededor de 1 s.

Mientras tanto, el usuario pidió de forma explícita algo «como motion graphics».

**Corrección (sustituir el bloque «Presupuesto de motion»):**
> **Presupuesto de motion:**
> (1) Feedback directo (hover, press, imantado, reorder): 200 ms o menos, interrumpible.
> (2) Transiciones de estado (revelado circular, cambio de paleta): 400 ms o menos.
> (3) Dos «momentos firma» por sesión (logo → paleta, y publicar): hasta 900 ms, que se saltan con un clic y con reduced motion.
>
> El MeshGradient arranca quieto (`speed={0}`) y solo se anima unos 1,5 s cuando cambia la marca. Nunca corre en bucle mientras el usuario trabaja (regla 4 y WCAG 2.2.2). Se mantiene `<MotionConfig reducedMotion="user">`.

### 12. La barra espaciadora para barajar rompe el arrastre con teclado
**Dónde:** §3, paso 3a, y micro-interacción (e).

**Problema:** el KeyboardSensor de dnd-kit coge y suelta con Space/Enter por defecto, y ARIA exige que funcionen ambas teclas ([docs de dnd-kit](https://dndkit.com/extend/sensors/keyboard-sensor)). Si Space baraja, se rompe la alternativa por teclado con la que el documento cumple WCAG 2.5.7.

**Corrección:**
> **Barajar:** tecla `S` o botón «Barajar». El atajo no responde cuando el foco está en una carta o en un campo de texto. Space/Enter quedan reservados para coger y soltar cartas con el teclado.

### 13. Faltan riesgos de abuso y de seguridad
**Dónde:** §10.

**Corrección (filas nuevas):**
> | Abuso de los links públicos (phishing, suplantación de marcas) en dialed-usercontent.com. Si Safe Browsing marca el dominio, dejan de funcionar todos los links. | Publicar exige email verificado (magic link). `noindex`. El catálogo no tiene formularios ni campos de contraseña. Los enlaces externos muestran aviso. Botón «Reportar», monitorización con Google Safe Browsing y rate limit por cuenta. |
> | SVG con scripts y SSRF en `/api/logo-from-url` | El SVG se sanea (svgo, y se eliminan `<script>`, atributos `on*`, `foreignObject` y hrefs externos) y solo se sirve desde el dominio usercontent. El endpoint bloquea IPs privadas y de metadata, acepta solo http(s), con timeout de 5 s y un máximo de 2 MB. |
> | Abuso de la prueba hosted: las sesiones anónimas se pueden recrear sin límite | Tope por cuenta verificada y por IP/dispositivo, Cloudflare Turnstile en el alta y un tope duro global. |

---

## P2: prioridad media

### 14. El «modo local tipo Subframe» de la v3 omite condiciones y es ambiguo
**Dónde:** §5, tabla «Qué SÍ es posible».

**Problema:**
- Faltan las condiciones de #61: el binario de Claude Code va sin modificar, el login se hace en el flujo de Anthropic y el producto no puede pagar, revender ni intermediar ese uso.
- Según #112, Subframe probablemente tiene aprobación previa, su mecanismo no está documentado y solo funciona en su app para macOS.
- La fila implica una app de escritorio que no aparece en ningún plan.

**Corrección (fila):**
> | Claude Code **sin modificar**, preinstalado u hospedado, con el login del usuario hecho en el flujo de Anthropic (Commercial Terms) | Modo local que lee el DesignDoc y aplica los cambios en el repo del usuario | Su suscripción. Dialed no puede pagar, revender ni intermediar ese uso | v3, a evaluar. Necesita app de escritorio o un sandbox por usuario. No es lo mismo que hace Subframe, que presumiblemente tiene aprobación previa | code.claude.com/docs/en/legal-and-compliance |

### 15. El entorno de desarrollo ya carga las skills de uupm que el documento descarta, y se recomiendan a los usuarios
**Dónde:** §7.

**Problema [local]:**
- `/Users/diegoguerrero/Desktop/designApp/.claude/skills/` contiene brand, design, banner-design, slides, design-system, ui-styling y ui-ux-pro-max. Ninguna tiene `disable-model-invocation`, así que Claude las puede invocar solo.
- Además se cargan duplicadas desde `vendor/ui-ux-pro-max-skill/.claude/skills/`.
- `brand` y `design` tienen justo los bugs y los modelos de Gemini deprecados que el propio §7 señala.
- `/plugin install ui-ux-pro-max@ui-ux-pro-max-skill` instala las 7 skills del repo (29 MB). En cambio, `npx ui-ux-pro-max-cli init --ai claude` instala solo `skills/ui-ux-pro-max` [local, cli/assets/templates/platforms/claude.json].
- El usuario pidió probar los dos repos «para este proyecto», y el documento no usa uupm para diseñar la propia UI de Dialed.

**Corrección (§7, añadir):**
> **Entorno de desarrollo.**
> - Dejar en `.claude/skills/` solo `ui-ux-pro-max` e `i-have-adhd`.
> - Sacar brand, design, banner-design y slides, o marcarlas con `disable-model-invocation: true`.
> - Mover `vendor/ui-ux-pro-max-skill` fuera del árbol que Claude Code escanea, para no cargar skills duplicadas.
> - Usar `ui-ux-pro-max` en la semana 3 para fijar el design system de la propia app (dogfooding) y documentarlo en `docs/dialed-ui.md`.
>
> **Recomendación a los usuarios:** `npx ui-ux-pro-max-cli init --ai claude`, que instala solo la skill principal. No el plugin del marketplace, que trae también brand y design. Ojo: los scripts necesitan Python 3.

### 16. Riesgo no recogido: el «gusto curado», que es el foso, depende de un dev que no es diseñador
**Dónde:** §10.

**Corrección (fila nueva):**
> | La calidad de las recetas y secciones la decide 1 dev, cuando la premisa del producto es que los devs no son diseñadores | Reservar 40–60 h de un diseñador freelance para revisar recetas y secciones en las semanas 4–6, y validar con 3–5 diseñadores en la beta. Usar el workflow propio del usuario (Mobbin + IA) para producir los borradores. |

### 17. Falta la decisión de idioma
**Dónde:** §10, «Decisiones abiertas».

**Problema:** el catálogo de uupm, el BM25 y los copys de ejemplo están en inglés. El usuario escribe en español y `brief.locale` existe, pero el documento no decide nada.

**Corrección:** sustituir la decisión 3, que en la práctica ya está tomada en el roadmap, por:
> 3. **Idioma de la UI y del catálogo.** **Recomendación:** UI bilingüe ES/EN desde el MVP. Los textos de las recetas y cartas se traducen a mano (unos 60 textos tras el recorte), y el copy placeholder se genera por locale.

### 18. Créditos API: se puede pasar de «probable» a «documentado»
**Dónde:** §5, «Qué NO es posible», viñeta de los créditos API.

**Evidencia [V artículo 17154008]:** «Everyone with an API key in the linked organization can use the balance». Las únicas exclusiones son Claude Code interactivo, el extra usage y Bedrock/Vertex/Foundry. Solo se puede vincular una organización de Console, y cambiarla requiere contactar con soporte.

**Corrección:**
> Usar los créditos de Max o Team vía BYOK en Dialed está documentado: cualquier key de la organización vinculada consume el saldo, y las exclusiones no mencionan apps de terceros. Los Supplemental Credit Terms no se han revisado. El onboarding tiene que avisar de que solo se vincula una organización y de que cambiarla requiere soporte.

---

## P3: correcciones menores

- **§6, Figma variables.** La frase «Las variables Timing y Easing de Figma no entran por DTCG» no está respaldada. Texto nuevo:
  > duration se importa como Number y solo en `s`. El import no tiene tipo easing, así que las curvas van en la Style Guide [V Modes for variables].
- **§8, Mobbin.** Texto nuevo:
  > El 12-oct-2026 empieza la beta oficial de créditos: deep cuesta 5 créditos y standard, 0. Durante la beta se puede pasar del cupo sin coste; los límites se aplican al terminarla, en una fecha aún no fijada [V docs.mobbin.com/ai-credits].
- **§8, Mobbin.** «compartido con Claude Design» → «compartido con Claude Design (según la doc de Mobbin; no confirmado para el standalone, que cierra el 14-dic-2026)» (#54).
- **§4.3, GSAP.** «GSAP… (está permitido en el código exportado)» → «GSAP no se usa ni en la UI ni en los exports. Si algún día se exporta, consultar antes con GSAP/Webflow». El digest pedía validarlo legalmente y el catálogo ya usa Motion.
- **§7, output style.** Añadir:
  > Es una instrucción, no una garantía. No afecta a los subagentes, salvo los forks. Dentro del plugin, el chat de claude.ai lo ignora. Para todo el equipo, va en `.claude/settings.json`.
- **§4.3, versiones marcadas como «no verificadas» que el digest sí trae.** `@paper-design/shaders-react` 0.0.81 (npm, 2026-09-17) y `@anthropic-ai/sdk` 0.133.0.
- **§6, Link.** «privado en Pro»: el plan Pro llega en la v2. Texto nuevo: «En el MVP todos los links son unlisted; los privados llegan con Pro (v2)».
- **§11, paso 1, añadir al spike.** «Copiar a Figma» desde un iframe `sandbox="allow-scripts"` de otro origen necesita `allow="clipboard-write"` y activación del usuario. Si falla, el payload se genera en el iframe, se envía por postMessage y lo escribe el padre con `ClipboardItem` con promesa, dentro del mismo gesto.
- **§10, Plan B code.to.design.** Añadir: «el HTML del usuario pasa por un tercero (divRIOTS); necesita aviso de privacidad».
- **§6, Framer TSX (a verificar).** Los code components de Framer importan `framer-motion`, que Framer incluye. El exportador debería usar ese import en lugar de `motion/react`.
- **§9, coste mensual.** Falta la suscripción de Claude para pruebas: Pro $20, o Max si se quieren probar los créditos API.

---

**Nota:** §7 y §11 (paso 5) del documento recomiendan editar `.claude/settings.local.json` (`"outputStyle": "adhd"`). Es una recomendación para el usuario y encaja con #4. No la ejecuté.

Fuentes de la búsqueda web: [dnd-kit keyboard sensor](https://dndkit.com/extend/sensors/keyboard-sensor), [dnd-kit legacy keyboard](https://docs.dndkit.com/api-documentation/sensors/keyboard).