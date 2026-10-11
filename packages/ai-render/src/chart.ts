// Charts of AI blocks: `<img data-chart="bar|line|area|spark|donut" data-values="12,18,9;7,10,5" alt="…">`. The model
// never draws a chart with divs (percentage heights collapse in cells without a definite height, and `<svg>` is not
// in the vocabulary): it states the numbers, and the preview runtime and the HTML/TSX export draw them as inline SVG
// painted with the theme's `--chart-1…5` tokens, so palette and dark mode repaint them. No dependencies: the
// runtime's second wall imports this file too.
//
// The details are drawn here too, from optional attributes: `data-labels` (the x axis: dates, weeks, names; or the
// segments of a donut), `data-series` (legend names) and `data-unit` (`€`, `%`, `h`…). A bar/line chart is one outer
// `<svg>` that is NOT scaled (its box comes from the image's classes) holding an inner `<svg>` stretched to the plot
// (shapes only) and, on top, text and dots placed by percentage with sizes in px, so letters never stretch.

export const CHART_KINDS = ["bar", "line", "area", "spark", "donut"] as const;
export type ChartKind = (typeof CHART_KINDS)[number];
const KINDS: ReadonlySet<string> = new Set(CHART_KINDS);
export const isChartKind = (value: string): value is ChartKind => KINDS.has(value);

export const CHART_LIMITS = { series: 3, points: 24, minPoints: 2, maxValue: 1_000_000, labelLength: 16 } as const;

/**
 * `"12,18,9;7,10,5"` → `[[12, 18, 9], [7, 10, 5]]`. Series are separated by `;`, values by `,`; every value is a
 * finite number in 0…1 000 000 and each series has 2–24 of them (at most 3 series). Anything else is `null`.
 */
export function parseChartValues(raw: string): number[][] | null {
  if (raw.length > 400) return null;
  const series = raw.split(";").map((part) => part.trim());
  if (series.length === 0 || series.length > CHART_LIMITS.series) return null;
  const out: number[][] = [];
  for (const part of series) {
    const values = part.split(",").map((value) => value.trim());
    if (values.length < CHART_LIMITS.minPoints || values.length > CHART_LIMITS.points) return null;
    const numbers: number[] = [];
    for (const value of values) {
      if (!/^\d{1,7}(?:\.\d{1,3})?$/.test(value)) return null;
      const n = Number(value);
      if (!Number.isFinite(n) || n < 0 || n > CHART_LIMITS.maxValue) return null;
      numbers.push(n);
    }
    out.push(numbers);
  }
  return out;
}

/** `data-highlight="7"`: the index (0…23) of the bar or point to stress. `null` when it is not a plain small integer. */
export function parseChartHighlight(raw: string): number | null {
  if (!/^\d{1,2}$/.test(raw.trim())) return null;
  const index = Number(raw);
  return index < CHART_LIMITS.points ? index : null;
}

/** One label: letters, digits and a few signs (no commas, no markup), 1–16 characters. */
const LABEL = /^[\p{L}\p{N}][\p{L}\p{N} .'’/%€$£¥+\-:·&]{0,15}$/u;

/**
 * `data-labels="Jan,Feb,Mar"` (the x axis, or a donut's segments) and `data-series="In,Out"` (legend names): `min`–`max`
 * comma-separated labels, each one `LABEL`. Anything else is `null`.
 */
export function parseChartLabels(raw: string, min: number = CHART_LIMITS.minPoints, max: number = CHART_LIMITS.points): string[] | null {
  if (raw.length > 400) return null;
  const labels = raw.split(",").map((label) => label.trim().replace(/\s+/g, " "));
  if (labels.length < min || labels.length > max) return null;
  return labels.every((label) => LABEL.test(label)) ? labels : null;
}

/** `data-unit`: a currency sign (`€ $ £ ¥`), `%`, or a short word (`h`, `min`, `kg`, `pts`). */
export function parseChartUnit(raw: string): string | null {
  const unit = raw.trim();
  return /^(?:[€$£¥%]|\p{L}{1,4})$/u.test(unit) ? unit : null;
}

/** Canonical text of parsed series (what the sanitizer stores). */
export const canonicalChartValues = (series: readonly (readonly number[])[]): string => series.map((s) => s.join(",")).join(";");

const escape = (value: string) => value.replace(/&/g, "&amp;").replace(/"/g, "&quot;").replace(/</g, "&lt;").replace(/>/g, "&gt;");
const n = (value: number) => String(Math.round(value * 10) / 10);
const pct = (value: number) => `${Math.round(value * 100) / 100}%`;

/** FNV-1a, for gradient ids: the same chart gets the same id, two different ones never share it. */
function hash(text: string): string {
  let h = 0x811c9dc5;
  for (let i = 0; i < text.length; i++) {
    h ^= text.charCodeAt(i);
    h = Math.imul(h, 0x01000193);
  }
  return (h >>> 0).toString(36);
}

const color = (index: number) => `var(--chart-${(index % 5) + 1}, #888)`;

/**
 * A value as people read it on a chart: grouped digits, `18.5k` / `1.2M` from 10 000 up, the unit where the
 * locale puts it (`€1.2k` in English, `1,2k €` in Spanish; `%` glued; words after a space).
 */
export function formatChartValue(value: number, unit: string | null = null, locale = "en"): string {
  const es = locale.toLowerCase().startsWith("es");
  const format = (v: number, digits: number) => new Intl.NumberFormat(es ? "es-ES" : "en-US", { maximumFractionDigits: digits }).format(v);
  const abs = Math.abs(value);
  const text = abs >= 1e6 ? `${format(value / 1e6, 1)}M` : abs >= 1e4 ? `${format(value / 1e3, 1)}k` : format(value, abs < 10 ? 1 : 0);
  if (!unit) return text;
  if (unit === "%") return `${text}%`;
  if (/^[€$£¥]$/.test(unit)) return es ? `${text} ${unit}` : `${unit}${text}`;
  return `${text} ${unit}`;
}

/** A «nice» step for 4 grid lines (1, 1.2, 1.5, 2, 2.5, 3, 4, 5, 6 or 8 × 10ⁿ): round ticks with little empty headroom. */
function niceStep(max: number): number {
  const raw = Math.max(max, 1) / 4;
  const power = 10 ** Math.floor(Math.log10(raw));
  const step = [1, 1.2, 1.5, 2, 2.5, 3, 4, 5, 6, 8, 10].find((m) => m * power >= raw - 1e-9)! * power;
  return step;
}

/**
 * Monotone cubic path through the points (Fritsch–Carlson): smooth, and it never overshoots the data, so a curve
 * never dips below zero or above a peak that did not happen.
 */
function smoothPath(points: readonly (readonly [number, number])[]): string {
  if (points.length < 3) return `M${points.map(([x, y]) => `${n(x)},${n(y)}`).join("L")}`;
  const dx = points.slice(1).map((p, i) => p[0] - points[i]![0]);
  const slope = points.slice(1).map((p, i) => (p[1] - points[i]![1]) / dx[i]!);
  const tangent = points.map((_, i) => {
    if (i === 0) return slope[0]!;
    if (i === points.length - 1) return slope[i - 1]!;
    const a = slope[i - 1]!;
    const b = slope[i]!;
    return a * b <= 0 ? 0 : (3 * (dx[i - 1]! + dx[i]!)) / ((2 * dx[i]! + dx[i - 1]!) / a + (dx[i]! + 2 * dx[i - 1]!) / b);
  });
  let d = `M${n(points[0]![0])},${n(points[0]![1])}`;
  for (let i = 0; i < points.length - 1; i++) {
    const [x0, y0] = points[i]!;
    const [x1, y1] = points[i + 1]!;
    const h = dx[i]! / 3;
    d += `C${n(x0 + h)},${n(y0 + tangent[i]! * h)} ${n(x1 - h)},${n(y1 - tangent[i + 1]! * h)} ${n(x1)},${n(y1)}`;
  }
  return d;
}

export type ChartExtras = {
  /** The x axis (one label per point or bar) or a donut's segment names. */
  labels?: readonly string[] | null;
  /** Legend names, one per series. */
  names?: readonly string[] | null;
  unit?: string | null;
  /** The page's language, for number formatting (`en` by default). */
  locale?: string;
};

const W = 480;
const H = 200;
/** Text of the overlay: the image's own text color (it follows the card or the dark panel it sits on). */
const TEXT = 'fill="currentColor" style="font-variant-numeric:tabular-nums"';

/**
 * The chart as SVG markup. `bar`, `line`, `area` and `spark` fill the box of the `<img>` (the model sets the size with
 * classes, `h-40 w-full`); `donut` keeps its proportions. `label` becomes the accessible name. `highlight` (an index)
 * stresses one bar or segment (the others dim) or marks one point of a line, with its value in a bubble: the «this is
 * the number» of an annotated chart. `extras` add the x axis, the legend and the unit.
 */
export function chartSvg(kind: ChartKind, series: readonly (readonly number[])[], label = "", highlight: number | null = null, extras: ChartExtras = {}): string {
  const title = label ? `<title>${escape(label)}</title>` : "";
  const locale = extras.locale ?? "en";
  const unit = extras.unit ?? null;
  const fmt = (value: number) => escape(formatChartValue(value, unit, locale));

  if (kind === "donut") {
    const values = series[0]!.slice(0, 8);
    const total = values.reduce((a, b) => a + b, 0) || 1;
    const r = 44;
    const c = 2 * Math.PI * r;
    let offset = 0;
    const segments = values.map((value, i) => {
      const len = Math.max((value / total) * c - 1.5, 0.5);
      const dim = highlight !== null && highlight !== i ? ' opacity=".3"' : "";
      const segment = `<circle cx="60" cy="60" r="${r}" fill="none" stroke-width="16" stroke-dasharray="${n(len)} ${n(c - len)}" stroke-dashoffset="${n(-offset)}" transform="rotate(-90 60 60)"${dim} style="stroke:${color(i)}"/>`;
      offset += (value / total) * c;
      return segment;
    });
    // The center says what the ring adds up to, or the stressed segment's share and name.
    const stressed = highlight !== null && highlight < values.length ? highlight : null;
    const big = stressed === null ? fmt(total) : `${Math.round((values[stressed]! / total) * 100)}%`;
    const small = stressed === null ? "" : (extras.labels?.[stressed] ?? "");
    const center = `<text x="60" y="${small ? 60 : 64}" text-anchor="middle" font-size="15" font-weight="600" ${TEXT}>${big}</text>${small ? `<text x="60" y="73" text-anchor="middle" font-size="8" opacity=".7" ${TEXT}>${escape(small)}</text>` : ""}`;
    return `<svg xmlns="http://www.w3.org/2000/svg" role="img" viewBox="0 0 120 120" preserveAspectRatio="xMidYMid meet">${title}<circle cx="60" cy="60" r="${r}" fill="none" stroke-width="16" style="stroke:var(--muted, #eee)"/>${segments.join("")}${center}</svg>`;
  }

  const spark = kind === "spark";
  const count = Math.max(...series.map((s) => s.length));
  const labels = !spark && extras.labels && extras.labels.length === count ? extras.labels : null;
  const names = !spark && extras.names && extras.names.length === series.length ? extras.names : null;
  // The plot's share of the box: a band on top for the legend (or for a bubble above the highest point) and one at
  // the bottom for the x axis.
  const top = spark ? 6 : names ? 16 : 10;
  const bottom = spark ? 6 : labels ? 14 : 3;
  const plotShare = 100 - top - bottom;
  const outerY = (y: number) => top + (y / H) * plotShare;
  const outerX = (x: number) => (x / W) * 100;

  const step = niceStep(Math.max(...series.flat()));
  const max = spark ? Math.max(...series.flat(), 1) * 1.08 : step * 4;
  const y = (value: number) => H - (value / max) * H;
  const grid = spark
    ? ""
    : [1, 2, 3, 4]
        .map((k) => `<line x1="0" x2="${W}" y1="${n(y(step * k))}" y2="${n(y(step * k))}" stroke-width="1" vector-effect="non-scaling-stroke" style="stroke:var(--border, #ddd)"/>`)
        .join("");
  const baseline = spark ? "" : `<line x1="0" x2="${W}" y1="${H}" y2="${H}" stroke-width="1" vector-effect="non-scaling-stroke" style="stroke:var(--border, #ddd)"/>`;

  let shapes = "";
  let defs = "";
  /** The x of each point or bar center, in plot units. */
  let xOf: (i: number) => number;
  if (kind === "bar") {
    // A left gutter for the y ticks, so no tick sits on the first bar.
    const gutter = 34;
    const slot = (W - gutter) / count;
    const group = slot * (series.length > 1 ? 0.78 : 0.62);
    const barW = group / series.length;
    xOf = (i) => gutter + i * slot + slot / 2;
    shapes = series
      .flatMap((values, s) =>
        values.map((value, i) => {
          const height = Math.max(H - y(value), value > 0 ? 2 : 0);
          const x = gutter + i * slot + (slot - group) / 2 + s * barW;
          const dim = highlight !== null && highlight !== i ? ' opacity=".32"' : "";
          return `<rect x="${n(x)}" y="${n(H - height)}" width="${n(Math.max(barW - (series.length > 1 ? 2 : 0), 1))}" height="${n(height)}" rx="3"${dim} style="fill:${color(s)}"/>`;
        }),
      )
      .join("");
  } else {
    const inset = spark ? 3 : 0;
    const span = W - inset * 2;
    xOf = (i) => inset + (count > 1 ? (i * span) / (count - 1) : span / 2);
    const id = `dlc${hash(`${kind}:${canonicalChartValues(series)}`)}`;
    if (kind !== "line") {
      defs = `<defs>${series
        .map((_, i) => `<linearGradient id="${id}-${i}" x1="0" y1="0" x2="0" y2="1"><stop offset="0" style="stop-color:${color(i)};stop-opacity:.32"/><stop offset="1" style="stop-color:${color(i)};stop-opacity:0"/></linearGradient>`)
        .join("")}</defs>`;
    }
    shapes = series
      .map((values, i) => {
        const points = values.map((value, j) => [xOf(j), y(value)] as const);
        const d = smoothPath(points);
        const line = `<path d="${d}" fill="none" stroke-width="${spark ? 2 : 2.5}" stroke-linecap="round" stroke-linejoin="round" vector-effect="non-scaling-stroke" style="stroke:${color(i)}"/>`;
        if (kind === "line") return line;
        const area = `<path d="${d}L${n(points[points.length - 1]![0])},${H}L${n(points[0]![0])},${H}Z" style="fill:url(#${id}-${i})"/>`;
        return `${area}${line}`;
      })
      .join("");
    if (highlight !== null && highlight < count && !spark) {
      shapes += `<line x1="${n(xOf(highlight))}" x2="${n(xOf(highlight))}" y1="0" y2="${H}" stroke-width="1.5" stroke-dasharray="4 4" vector-effect="non-scaling-stroke" style="stroke:var(--foreground, #333)"/>`;
    }
  }
  const plot = `<svg x="0" y="${pct(top)}" width="100%" height="${pct(plotShare)}" viewBox="0 0 ${W} ${H}" preserveAspectRatio="none" overflow="visible">${defs}${grid}${baseline}${shapes}</svg>`;

  // Overlay: text and dots in px at percentage positions.
  const overlay: string[] = [];
  const at = (xPct: number, yPct: number, inner: string) => `<svg x="${pct(xPct)}" y="${pct(yPct)}" overflow="visible">${inner}</svg>`;
  if (!spark) {
    // Two y ticks (the middle and the top grid line), small, above their line.
    for (const k of [2, 4]) overlay.push(`<text x="0" y="${pct(outerY(y(step * k)))}" dx="4" dy="-4" font-size="10" opacity=".6" ${TEXT}>${fmt(step * k)}</text>`);
  }
  if (labels) {
    // At most ~6 x labels, always the last one; on a line the ends hug the edges.
    const every = Math.ceil(count / 6);
    labels.forEach((text, i) => {
      if (i % every !== 0 && i !== count - 1) return;
      if (i !== count - 1 && count - 1 - i < every && i !== 0) return;
      const anchor = kind === "bar" ? "middle" : i === 0 ? "start" : i === count - 1 ? "end" : "middle";
      const dx = anchor === "start" ? ' dx="4"' : anchor === "end" ? ' dx="-4"' : "";
      overlay.push(`<text x="${pct(outerX(xOf(i)))}" y="100%"${dx} dy="-2" text-anchor="${anchor}" font-size="10" opacity=".6" ${TEXT}>${escape(text)}</text>`);
    });
  }
  if (names) {
    let offset = 0;
    const items = names.map((name, i) => {
      const item = `<rect x="${offset}" y="-8" width="8" height="8" rx="2" style="fill:${color(i)}"/><text x="${offset + 12}" y="0" font-size="11" ${TEXT}>${escape(name)}</text>`;
      offset += 12 + name.length * 6.4 + 14;
      return item;
    });
    overlay.push(at(0, 0, `<g transform="translate(0 12)">${items.join("")}</g>`));
  }
  const single = series.length === 1;
  if (kind === "bar" && single && count <= 8) {
    // Every bar says its value, except the stressed one (it gets the bubble) and its neighbours (the bubble is wider
    // than a bar and would cover theirs).
    series[0]!.forEach((value, i) => {
      if (highlight !== null && Math.abs(i - highlight) <= 1) return;
      overlay.push(`<text x="${pct(outerX(xOf(i)))}" y="${pct(outerY(y(value)))}" dy="-5" text-anchor="middle" font-size="10" opacity="${highlight === null ? ".8" : ".55"}" ${TEXT}>${fmt(value)}</text>`);
    });
  }
  const bubble = (xPct: number, yPct: number, text: string) => {
    const width = Math.round(text.length * 6.6 + 16);
    const below = yPct < top + 14;
    const yRect = below ? 10 : -30;
    return at(xPct, yPct, `<rect x="${-width / 2}" y="${yRect}" width="${width}" height="20" rx="10" style="fill:var(--foreground, #111)"/><text x="0" y="${yRect + 14}" text-anchor="middle" font-size="11" font-weight="600" style="fill:var(--background, #fff);font-variant-numeric:tabular-nums">${escape(text)}</text>`);
  };
  if (highlight !== null && highlight < count && !spark) {
    const stressed = series[0]![highlight] ?? series[0]![series[0]!.length - 1]!;
    const text = `${labels ? `${labels[highlight]} · ` : ""}${formatChartValue(stressed, unit, locale)}`;
    const xPct = outerX(xOf(highlight));
    const yPct = outerY(y(stressed));
    if (kind !== "bar") overlay.push(at(xPct, yPct, `<circle r="4.5" stroke-width="2" style="fill:${color(0)};stroke:var(--background, #fff)"/>`));
    overlay.push(bubble(Math.min(Math.max(xPct, 6), 94), yPct, text));
  } else if (kind !== "bar") {
    // No stressed point: a dot where each line ends, the «now» of the series.
    series.forEach((values, i) => {
      const last = values.length - 1;
      overlay.push(at(outerX(xOf(last)), outerY(y(values[last]!)), `<circle r="${spark ? 2.5 : 3.5}" stroke-width="1.5" style="fill:${color(i)};stroke:var(--background, #fff)"/>`));
    });
  }

  return `<svg xmlns="http://www.w3.org/2000/svg" role="img" overflow="visible">${title}${plot}${overlay.join("")}</svg>`;
}

/**
 * Every chart attribute of an `<img>` read and validated again (the runtime's second wall and the exports use it):
 * the markup to draw, or `null` when the image is not a valid chart. Optional attributes that do not fit the data
 * (labels for another number of points, names for another number of series) are ignored, not fatal.
 */
export function chartFromAttributes(read: (name: string) => string | null | undefined, alt: string, locale?: string): string | null {
  const kind = read("data-chart") ?? "";
  if (!isChartKind(kind)) return null;
  const series = parseChartValues(read("data-values") ?? "");
  if (!series) return null;
  const count = kind === "donut" ? series[0]!.length : Math.max(...series.map((s) => s.length));
  const labels = parseChartLabels(read("data-labels") ?? "");
  const names = parseChartLabels(read("data-series") ?? "", 1, CHART_LIMITS.series);
  return chartSvg(kind, series, alt, parseChartHighlight(read("data-highlight") ?? ""), {
    labels: labels && labels.length === count ? labels : null,
    names: names && names.length === series.length ? names : null,
    unit: parseChartUnit(read("data-unit") ?? ""),
    ...(locale && { locale }),
  });
}
