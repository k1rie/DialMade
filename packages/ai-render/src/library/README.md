# Biblioteca de bloques de referencia («Diseño con IA»)

Bloques escritos a mano con el vocabulario de solo tokens. El modelo **adapta** uno o dos de ellos por bloque en vez de
inventar la composición desde cero: es lo que sube el piso del resultado (`docs/design/diseno-con-ia-calidad.md`).

## Reglas (las comprueba `library.test.ts`)

1. **Original.** Cada entrada captura un *patrón* (estructura, jerarquía, proporciones) y se escribe desde cero. Nunca
   el copy, las imágenes, los logos ni la marca de otro producto. Los nombres de marcas reales no van en el código, los
   ids, los `pattern` ni el HTML (el test lo comprueba).
2. **Solo tokens.** Sin hex, `rgb()`, `style`, valores arbitrarios ni escalas fijas como fondo con texto de tema.
3. **Limpia.** Pasa `processBlock` en 4 paletas, en claro y oscuro, sin clases descartadas, sin arreglos de contraste y
   sin avisos. Los tintes (`bg-primary/10`, `bg-accent/20`) llevan `text-foreground`, nunca `text-muted-foreground`.
4. **Copy de muestra de dominios sin relación con el software** (panadería, biblioteca, huerto…). Si el ejemplo hablara
   de finanzas, una marca de finanzas lo copiaría palabra por palabra (medido: 45–60 % de los textos). Con dominios
   ajenos el modelo tiene que transponer (1–17 % de coincidencias, casi todo etiquetas de interfaz).
5. **Neutra en el idioma:** inglés. El modelo escribe en el idioma de la pantalla.
6. **Sin scripts ni red.** Gráficos con `<img data-chart>`, iconos con `<i data-icon>`, imágenes con `data-placeholder`.
7. **Máx. 6 KB** por entrada (≈ 2,5 k tokens): cada pantalla lleva hasta 30 KB de referencias.

## Cómo se elige

`selectReferences(LIBRARY, tipoDeBloque, superficie, ejesDeLaDirección, idDelBloque, { seed })`:

- mismo tipo de bloque y misma superficie (`landing` / `app`);
- puntuación por ejes de la dirección de arte: `composition` 3, `typeVoice` 2, `decoration` 2, `imagery` 2,
  `colorStrategy` 1, `rhythm` 1;
- desempate con una semilla que sale de rasgos estructurados (tipo de producto, receta, tono), **nunca** del texto libre
  de la marca;
- una referencia ya usada por otro bloque de la pantalla baja de puntuación.

## Cómo se ve

```bash
DIALMADE_EVAL_OUT=/tmp/lib corepack pnpm --filter @dialmade/ai-render eval:library
```

Genera `library/<tipo>-<marca>-<modo>.png` y `report.json` (clases descartadas, avisos, qué cambió el arreglador).

## Cómo se añade una entrada

1. Escribe el HTML en el archivo de su familia (`heroes.ts`, `features.ts`, `proof.ts`, `conversion.ts`, `app.ts`).
2. `fits`: los valores de los ejes (de `AI_AXES`) en los que la composición luce; un eje que no listas es neutral.
3. `pattern`: una línea que diga **por qué funciona** (viaja en el prompt).
4. `corepack pnpm --filter @dialmade/ai-render test` y la galería: nada marcado.
