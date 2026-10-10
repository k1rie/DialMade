export type Point = readonly [number, number];

const n = (value: number) => Math.round(value * 100) / 100;

export function linearPath(points: readonly Point[]): string {
  return points.map(([x, y], i) => `${i === 0 ? "M" : "L"}${n(x)},${n(y)}`).join("");
}

/** Curva cúbica monótona en x: no inventa picos ni valles entre puntos. */
export function monotonePath(points: readonly Point[]): string {
  if (points.length < 3) return linearPath(points);
  const count = points.length;
  const dx: number[] = [];
  const slope: number[] = [];
  for (let i = 0; i < count - 1; i++) {
    const [x0, y0] = points[i] as Point;
    const [x1, y1] = points[i + 1] as Point;
    dx.push(x1 - x0);
    slope.push(x1 === x0 ? 0 : (y1 - y0) / (x1 - x0));
  }
  const tangent: number[] = [slope[0] ?? 0];
  for (let i = 1; i < count - 1; i++) {
    const m0 = slope[i - 1] ?? 0;
    const m1 = slope[i] ?? 0;
    const h0 = dx[i - 1] ?? 0;
    const h1 = dx[i] ?? 0;
    tangent.push(m0 * m1 <= 0 ? 0 : (3 * (h0 + h1)) / ((2 * h1 + h0) / m0 + (h1 + 2 * h0) / m1));
  }
  tangent.push(slope[count - 2] ?? 0);

  const [startX, startY] = points[0] as Point;
  let d = `M${n(startX)},${n(startY)}`;
  for (let i = 0; i < count - 1; i++) {
    const [x0, y0] = points[i] as Point;
    const [x1, y1] = points[i + 1] as Point;
    const h = (dx[i] ?? 0) / 3;
    const t0 = tangent[i] ?? 0;
    const t1 = tangent[i + 1] ?? 0;
    d += `C${n(x0 + h)},${n(y0 + t0 * h)} ${n(x1 - h)},${n(y1 - t1 * h)} ${n(x1)},${n(y1)}`;
  }
  return d;
}

/** Cierra una línea contra la base para pintar el área. */
export function areaPath(line: string, points: readonly Point[], baseline: number): string {
  const first = points[0];
  const last = points[points.length - 1];
  if (!first || !last) return "";
  return `${line}L${n(last[0])},${n(baseline)}L${n(first[0])},${n(baseline)}Z`;
}

/** Barra con las esquinas del extremo redondeadas (arriba si es positiva, abajo si es negativa). */
export function barPath(x: number, width: number, base: number, value: number, radius: number): string {
  const top = Math.min(base, value);
  const bottom = Math.max(base, value);
  const r = Math.max(0, Math.min(radius, width / 2, bottom - top));
  const right = x + width;
  if (value <= base) {
    return `M${n(x)},${n(bottom)}V${n(top + r)}Q${n(x)},${n(top)} ${n(x + r)},${n(top)}H${n(right - r)}Q${n(right)},${n(top)} ${n(right)},${n(top + r)}V${n(bottom)}Z`;
  }
  return `M${n(x)},${n(top)}V${n(bottom - r)}Q${n(x)},${n(bottom)} ${n(x + r)},${n(bottom)}H${n(right - r)}Q${n(right)},${n(bottom)} ${n(right)},${n(bottom - r)}V${n(top)}Z`;
}
