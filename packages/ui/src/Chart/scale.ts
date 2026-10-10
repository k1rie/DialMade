export interface Domain {
  min: number;
  max: number;
  ticks: number[];
}

/** Paso «bonito» (1, 2, 2.5, 5 × 10ⁿ) para repartir `span` en unas `count` divisiones. */
export function niceStep(span: number, count: number): number {
  const raw = span / Math.max(1, count);
  const power = 10 ** Math.floor(Math.log10(raw));
  const fraction = raw / power;
  const nice = fraction <= 1 ? 1 : fraction <= 2 ? 2 : fraction <= 2.5 ? 2.5 : fraction <= 5 ? 5 : 10;
  return nice * power;
}

/** Dominio que siempre incluye el 0, redondeado a pasos bonitos, con sus marcas. */
export function niceDomain(values: readonly number[], count = 4): Domain {
  const finite = values.filter(Number.isFinite);
  let low = Math.min(0, ...finite);
  let high = Math.max(0, ...finite);
  if (low === high) high = low + 1;
  const step = niceStep(high - low, count);
  low = Math.floor(low / step) * step;
  high = Math.ceil(high / step) * step;
  const decimals = Math.max(0, -Math.floor(Math.log10(step)) + 1);
  const ticks: number[] = [];
  for (let value = low; value <= high + step / 2; value += step) ticks.push(Number(value.toFixed(decimals)));
  return { min: ticks[0] ?? low, max: ticks[ticks.length - 1] ?? high, ticks };
}

export function linearScale(domain: readonly [number, number], range: readonly [number, number]) {
  const [d0, d1] = domain;
  const [r0, r1] = range;
  const span = d1 - d0 || 1;
  return (value: number) => r0 + ((value - d0) / span) * (r1 - r0);
}
