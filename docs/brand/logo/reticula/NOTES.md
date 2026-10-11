# Retícula: conceptos de logo

La idea: la cuadrícula se ve y la D es lo que la cuadrícula revela. Todo está en un viewBox de 48 sobre una retícula de 3 u, donde 3 u equivalen a 1 px a 16 px y a 2 px a 32 px. Por eso los bordes rectos quedan nítidos. La forma principal usa `currentColor`. Hoja de contacto: `reticula-sheet.png`. Renders: `previews/`.

1. **Columnas** (`reticula-1`): la D cortada por las dos calles de una retícula de 3 columnas, y el asta es la primera columna. Gesto: el ritmo vertical de columnas iguales. Queda nítida a 16 y 32 px sin variante.
2. **Cuadrantes** (`reticula-2`, favicon `-16`): la D hecha con una cuadrícula 2×2, con dos celdas rectas y dos cuartos de anillo. Gesto: la cruz de calles que la parte en cuatro.
3. **Guías** (`reticula-3`, favicon `-16`): una D monolínea gruesa encajada en las guías de margen y de centro, que siguen como marcas de corte. Gesto: el contraste entre la guía fina y el trazo grueso. El punto violeta es el centro del compás del arco y conserva el eje del dial actual.
4. **Plantilla** (`reticula-4`, favicon `-16`): un icono de app con la D recortada como esténcil. Las dos líneas centrales de la loseta sostienen el contrapunzón. Gesto: la retícula es lo que mantiene la letra en pie. Su `-16` es el favicon más legible del grupo.
5. **Módulos** (`reticula-5`, favicon `-16`): el asta son tres celdas de la retícula y el cuenco es una sola curva continua. Gesto: el contraste de escala entre los bloques pequeños y el arco grande.
6. **Inversión** (`reticula-6`, favicon `-16`): una guía de columna cruza todo el lienzo. Fuera de la letra es línea y dentro es hueco. Gesto: la figura y el fondo se invierten en una sola línea.

## Mis 2 favoritos

1. **Inversión (6)**: tiene un solo gesto, propio y fácil de recordar. La guía del modo Layout cruza la letra y cambia de signo. Es la versión más directa de «la D es lo que revela la retícula». Funciona en una tinta y es nítida a 16 px.
2. **Módulos (5)**: cuenta el producto en una forma. A la izquierda todavía son bloques en la retícula («solo bloques») y a la derecha ya es diseño. Tiene contraste de escala y una lectura clara a 16 px.

Si hace falta una loseta de app, **Plantilla (4)** es la más sólida.

## Animación en el promo

- **Inversión**: una línea baja de arriba abajo con trim path. Al tocar la D, el asta y el cuenco aparecen a cada lado, la línea se vuelve hueco dentro de la letra y la D encaja con un rebote de 1 u.
- **Módulos**: los tres bloques caen en la columna como en Layout, escalonados unos 60 ms y con un snap. Después el arco barre 180° desde arriba y cierra la D. El bloque central puede llegar en violeta y pasar a blanco al encajar.
- **Cuadrantes y Columnas**: primero se dibujan las calles como líneas finas. Después las celdas se rellenan una a una y la D aparece.
- **Guías**: las 6 guías se trazan desde el centro hacia fuera y aparece el punto del compás. Desde ahí se traza el arco, y el trazo engorda de línea fina a grueso.
- **Plantilla**: entra la loseta, la D se recorta con un barrido y las dos líneas quedan como puentes.
- En la app, el mismo momento cabe en ≤900 ms y se puede saltar. Las versiones cortas, como el hover o la carga, son solo el encaje final (≤200 ms).
