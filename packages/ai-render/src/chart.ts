// Charts of AI blocks: `<img data-chart="bar|line|area|spark|donut" data-values="12,18,9;7,10,5" alt="…">`. The model
// never draws a chart with divs (percentage heights collapse in cells without a definite height, and `<svg>` is not
// in the vocabulary): it states the numbers, and the preview runtime and the HTML/TSX export draw them as inline SVG
// painted with the theme's `--chart-1…5` tokens, so palette and dark mode repaint them. No dependencies: the
// runtime's second wall imports this file too.

export const CHART_KINDS = ["bar", "line", "area", "spark", "donut"] as const;
export type ChartKind = (typeof CHART_KINDS)[number];
const KINDS: ReadonlySet<string> = new Set(CHART_KINDS);
export const isChartKind = (value: string): value is ChartKind => KINDS.has(value);

export const CHART_LIMITS = { series: 3, points: 24, minPoints: 2, maxValue: 1_000_000 } as const;

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

/** Canonical text of parsed series (what the sanitizer stores). */
export const canonicalChartValues = (series: readonly (readonly number[])[]): string => series.map((s) => s.join(",")).join(";");

const escape = (value: string) => value.replace(/&/g, "&amp;").replace(/"/g, "&quot;").replace(/</g, "&lt;").replace(/>/g, "&gt;");
const n = (value: number) => String(Math.round(value * 10) / 10);

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

const W = 480;
const H = 200;
const PAD = { left: 6, right: 6, top: 10, bottom: 6 };

/**
 * The chart as SVG markup. `bar`, `line`, `area` and `spark` stretch to the box of the `<img>` (`preserveAspectRatio`
 * none, strokes with `vector-effect`), so the model sets the size with classes (`h-40 w-full`); `donut` keeps its
 * proportions. `label` becomes the accessible name.
 */
export function chartSvg(kind: ChartKind, series: readonly (readonly number[])[], label = ""): string {
  const title = label ? `<title>${escape(label)}</title>` : "";
  const open = (viewBox: string, aspect: string) =>
    `<svg xmlns="http://www.w3.org/2000/svg" role="img" viewBox="${viewBox}" preserveAspectRatio="${aspect}">${title}`;

  if (kind === "donut") {
    const values = series[0]!.slice(0, 8);
    const total = values.reduce((a, b) => a + b, 0) || 1;
    const r = 44;
    const c = 2 * Math.PI * r;
    let offset = 0;
    const segments = values.map((value, i) => {
      const len = Math.max((value / total) * c - 1.5, 0.5);
      const segment = `<circle cx="60" cy="60" r="${r}" fill="none" stroke-width="16" stroke-dasharray="${n(len)} ${n(c - len)}" stroke-dashoffset="${n(-offset)}" transform="rotate(-90 60 60)" style="stroke:${color(i)}"/>`;
      offset += (value / total) * c;
      return segment;
    });
    return `${open("0 0 120 120", "xMidYMid meet")}<circle cx="60" cy="60" r="${r}" fill="none" stroke-width="16" style="stroke:var(--muted, #eee)"/>${segments.join("")}</svg>`;
  }

  const plotW = W - PAD.left - PAD.right;
  const plotH = H - PAD.top - PAD.bottom;
  const max = Math.max(...series.flat(), 1) * 1.08;
  const y = (value: number) => PAD.top + plotH - (value / max) * plotH;
  const grid =
    kind === "spark"
      ? ""
      : [0.25, 0.5, 0.75]
          .map((f) => `<line x1="${PAD.left}" x2="${W - PAD.right}" y1="${n(PAD.top + plotH * f)}" y2="${n(PAD.top + plotH * f)}" stroke-width="1" vector-effect="non-scaling-stroke" style="stroke:var(--border, #ddd)"/>`)
          .join("");
  const baseline = `<line x1="${PAD.left}" x2="${W - PAD.right}" y1="${n(PAD.top + plotH)}" y2="${n(PAD.top + plotH)}" stroke-width="1" vector-effect="non-scaling-stroke" style="stroke:var(--border, #ddd)"/>`;
  const head = open(`0 0 ${W} ${H}`, "none");

  if (kind === "bar") {
    const count = Math.max(...series.map((s) => s.length));
    const slot = plotW / count;
    const group = slot * (series.length > 1 ? 0.78 : 0.6);
    const barW = group / series.length;
    const bars = series.flatMap((values, s) =>
      values.map((value, i) => {
        const height = Math.max(PAD.top + plotH - y(value), value > 0 ? 2 : 0);
        const x = PAD.left + i * slot + (slot - group) / 2 + s * barW;
        return `<rect x="${n(x)}" y="${n(PAD.top + plotH - height)}" width="${n(Math.max(barW - (series.length > 1 ? 2 : 0), 1))}" height="${n(height)}" rx="3" style="fill:${color(s)}"/>`;
      }),
    );
    return `${head}${grid}${baseline}${bars.join("")}</svg>`;
  }

  // line · area · spark
  const paths = series.map((values) => {
    const step = plotW / (values.length - 1);
    return values.map((value, i) => `${n(PAD.left + i * step)},${n(y(value))}`);
  });
  const id = `dlc${hash(`${kind}:${canonicalChartValues(series)}`)}`;
  const defs =
    kind === "line"
      ? ""
      : `<defs>${series
          .map((_, i) => `<linearGradient id="${id}-${i}" x1="0" y1="0" x2="0" y2="1"><stop offset="0" style="stop-color:${color(i)};stop-opacity:.32"/><stop offset="1" style="stop-color:${color(i)};stop-opacity:0"/></linearGradient>`)
          .join("")}</defs>`;
  const strokeWidth = kind === "spark" ? 2 : 2.5;
  const shapes = paths.map((points, i) => {
    const line = `<polyline points="${points.join(" ")}" fill="none" stroke-width="${strokeWidth}" stroke-linecap="round" stroke-linejoin="round" vector-effect="non-scaling-stroke" style="stroke:${color(i)}"/>`;
    if (kind === "line") return line;
    const first = points[0]!.split(",")[0]!;
    const last = points[points.length - 1]!.split(",")[0]!;
    const area = `<polygon points="${first},${n(PAD.top + plotH)} ${points.join(" ")} ${last},${n(PAD.top + plotH)}" style="fill:url(#${id}-${i})"/>`;
    return `${area}${line}`;
  });
  return `${head}${defs}${grid}${kind === "spark" ? "" : baseline}${shapes.join("")}</svg>`;
}
