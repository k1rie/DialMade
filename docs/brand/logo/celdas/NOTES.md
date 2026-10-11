# Celdas: una D hecha de celdas

Rejilla común: `viewBox 0 0 48`, módulo 12, medianil 3 y margen 3. Cada 3 unidades caen en un píxel entero a 16 px, así que Una, Selección y Cuadrante salen nítidas en el favicon. Las curvas también tienen coordenadas limpias: cada pieza usa su propio círculo, desplazado lo que mide el medianil, y Dial usa el triángulo 3-4-5.

## Conceptos

1. **Una** (`celdas-1`): el fuste son tres celdas de layout y toda la panza es una sola pieza. Gesto: el contraste entre tres bloques y una curva entera, que cuenta «bloques → diseño».
2. **Selección** (`celdas-2`): la misma construcción con el bloque central en violeta, como un bloque seleccionado en el modo Layout. Gesto: una sola celda de acento.
3. **Cuadrante** (`celdas-3`): la D partida en una rejilla de 2×2 por un medianil ancho en cruz. Gesto: el hueco es la rejilla. Las cuatro piezas son rectas o cuartos de anillo, sin esquinas suavizadas.
4. **Dial** (`celdas-4`): el fuste es cartesiano y la panza son tres celdas polares. La del centro, en violeta, hace de aguja del dial. Gesto: la rejilla se dobla en un dial (Dial-made).
5. **Secciones** (`celdas-5`): la D como una página de tres secciones apiladas (cabecera, contenido, pie), con el contraforma como hueco de contenido. Gesto: dos cortes horizontales sobre una silueta perfecta.
6. **Rejilla** (`celdas-6`): seis celdas sobre la misma rejilla de 3 filas que recorta un solo círculo. Es la versión más literal de «D con cuadrículas» y la más débil a 16 px, porque ahí se lee como teclado.

Descartados: el anillo de 3×3 con esquinas redondeadas y la D de píxel con esquina o punto se leían como teclado o como «E·». Las rayas de 5 filas parecían un icono de menú. Con bento o con columnas sueltas salía «HD» o «ED». La regla que salió de todo esto: los cortes pueden caer en el fuste, pero la curva tiene que ser grande y continua o partirse una sola vez.

## Top 2

1. **Una / Selección** (1 y 2): es la D más clara en todos los tamaños y explica el producto sin texto: bloques que se vuelven diseño. La 2 es la versión de la app, con el acento en un solo bloque, y la 1 es la monocroma para todo lo demás. Riesgo a vigilar: «anillo + cuadrados» recuerda un poco a DigitalOcean. Aquí los cuadrados forman un fuste recto e igual, no una cola.
2. **Cuadrante** (3): es la más segura y gráfica, perfecta en píxel a 16 px y funciona en un solo color en cualquier sitio. La cruz es literalmente la rejilla del Layout. Comodín: **Dial**, por cómo conecta con el nombre, pero a 16 px los cortes diagonales se suavizan.

## En el vídeo promo

- **Una / Selección**: las tres celdas aparecen una a una (escala de 0.6 a 1, unos 150 ms cada una, con 70 ms de desfase). Después la panza barre desde el brazo superior hasta cerrarse (unos 500 ms). Encaja con la dirección v3 (Layout + cursor): el cursor hace clic en la celda central y esta pasa a violeta. Ese es el cierre.
- **Cuadrante**: empieza como 4 cuadrados de 2×2. Las dos piezas de la derecha «suben el radio» hasta ser cuartos de anillo y el medianil se abre a su ancho final. El momento firma dura ≤900 ms.
- **Dial**: la celda violeta gira hasta su sitio como una aguja que encaja.
- **Secciones**: las tres franjas se apilan desde abajo, como al añadir secciones en Layout.
- **Rejilla**: aparece una rejilla de 3×3, la celda central cae y un círculo recorta la derecha.
- Con `reducedMotion`, se muestra directamente la marca final.

Previews en `previews/`: oscuro y claro a 512/32/16 px, ampliaciones `-nn` (vecino más cercano) e icono de app de 180 px. Hoja de contacto: `celdas-sheet.png`.
