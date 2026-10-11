# Logo «Bloques»: una D hecha con bloques de layout

Todas las piezas usan la misma retícula: viewBox 48, coordenadas múltiplos de 3 (a 16 px, 1 unidad = 1 px exacto), calle de 3, radio de 1,5 y la proporción de filas 9/18/9 (cabecera/hero/pie). El color base es `currentColor` y el acento opcional es `var(--app-accent, #A677FF)`. Hoja de contacto: `bloques-sheet.png`.

## Conceptos

1. **Ranura** (`bloques-1.svg`): la cabecera y el pie son los brazos de la D, y el bloque hero encaja en el asta. *Gesto:* el asta de la letra es un bloque de página.
2. **Arrastre** (`bloques-2.svg`): la misma D con el hero en acento, a medio arrastre y desplazado 3 unidades, con su hueco marcado al 20 %. *Gesto:* el único bloque que se mueve.
3. **Cuadrícula** (`bloques-3.svg`): tres columnas iguales; la celda central vacía es el ojo de la D y la columna derecha se redondea en panza. *Gesto:* el ojo es una celda que falta.
4. **Escala** (`bloques-4.svg`): un bloque enorme y una curva fina. *Gesto:* el contraste de escala (18 frente a 6). Es la más sobria y también la más «clásica».
5. **Marco** (`bloques-5.svg`): una D gruesa que hace de marco de página, con el bloque seleccionado (acento) dentro del ojo. *Gesto:* la letra contiene la maqueta.

Descartes: apilar bloques horizontales en la panza se lee como **B** o como menú hamburguesa, y un asta partida en 3 bloques sueltos se lee como **«iD»** en tamaño de icono. Por eso la panza siempre es continua y el asta tiene, como mucho, un bloque suelto.

## Mis 2 favoritos

1. **Ranura**: es la D más legible a cualquier tamaño (a 16 px queda una D limpia con dos rendijas), funciona a una tinta y es propia: ninguna D tiene un bloque por asta. Además, Arrastre es su estado activo, así que logo y animación salen de la misma pieza.
2. **Cuadrícula**: es la lectura más literal de «una D hecha con cuadrículas». Todo cae en la retícula de 3, así que a 16 px sale nítida píxel a píxel. Se nota que es una maqueta antes que una letra.

## Animación para el promo

- **Ranura y Arrastre (firma, ≤900 ms, se puede saltar):** aparece la C (cabecera, panza y pie) y el bloque hero entra en acento arrastrado por el cursor. Se para en el fotograma de Arrastre, con el hueco fantasma visible, y encaja con un muelle corto (≤400 ms). Al final el acento se funde a `currentColor`.
- **Cuadrícula:** los bloques caen en sus tres columnas uno tras otro, como sin diseño todavía (rectángulos con radio 0). La celda central se retira y aparece el ojo, y al final las esquinas derechas se redondean (de 1,5 a 10,5): del wireframe al diseño.
- **Marco:** la D-marco escala desde la página (de un rectángulo a la D) y el bloque acento cae en el ojo.
- **Escala:** el bloque sube a su sitio y la curva se dibuja en un solo trazo.
