// Conversión de colores CSS (hex, rgb, hsl, oklch) a hex de 6 dígitos sRGB, sin dependencias.
// Los temas de daisyUI vienen en oklch() y los de tweakcn mezclan hex, hsl, rgb y oklch.

const clamp01 = (value) => Math.min(1, Math.max(0, value));

const toHex = (r, g, b) =>
  `#${[r, g, b]
    .map((channel) =>
      Math.round(clamp01(channel) * 255)
        .toString(16)
        .padStart(2, "0"),
    )
    .join("")}`;

const gammaEncode = (linear) => (linear <= 0.0031308 ? 12.92 * linear : 1.055 * Math.pow(linear, 1 / 2.4) - 0.055);
const gammaDecode = (encoded) => (encoded <= 0.04045 ? encoded / 12.92 : Math.pow((encoded + 0.055) / 1.055, 2.4));

function oklabToLinearRgb(L, a, b) {
  const l = (L + 0.3963377774 * a + 0.2158037573 * b) ** 3;
  const m = (L - 0.1055613458 * a - 0.0638541728 * b) ** 3;
  const s = (L - 0.0894841775 * a - 1.291485548 * b) ** 3;
  return [
    4.0767416621 * l - 3.3077115913 * m + 0.2309699292 * s,
    -1.2684380046 * l + 2.6097574011 * m - 0.3413193965 * s,
    -0.0041960863 * l - 0.7034186147 * m + 1.707614701 * s,
  ];
}

const EPSILON = 0.0005;
const inGamut = (rgb) => rgb.every((channel) => channel >= -EPSILON && channel <= 1 + EPSILON);

/** oklch → hex. Si el color cae fuera de sRGB se baja el croma (no se recorta, para no mover el tono). */
export function oklchToHex(L, C, hueDegrees) {
  const hue = (hueDegrees * Math.PI) / 180;
  const at = (chroma) => oklabToLinearRgb(L, chroma * Math.cos(hue), chroma * Math.sin(hue));

  let chroma = C;
  if (!inGamut(at(chroma))) {
    let low = 0;
    let high = C;
    for (let step = 0; step < 24; step += 1) {
      const middle = (low + high) / 2;
      if (inGamut(at(middle))) low = middle;
      else high = middle;
    }
    chroma = low;
  }
  const [r, g, b] = at(chroma).map(gammaEncode);
  return toHex(r, g, b);
}

function hslToHex(h, s, l) {
  const hue = (((h % 360) + 360) % 360) / 360;
  if (s === 0) return toHex(l, l, l);
  const q = l < 0.5 ? l * (1 + s) : l + s - l * s;
  const p = 2 * l - q;
  const channel = (t) => {
    const x = (t + 1) % 1;
    if (x < 1 / 6) return p + (q - p) * 6 * x;
    if (x < 1 / 2) return q;
    if (x < 2 / 3) return p + (q - p) * (2 / 3 - x) * 6;
    return p;
  };
  return toHex(channel(hue + 1 / 3), channel(hue), channel(hue - 1 / 3));
}

const NAMED = { black: "#000000", white: "#ffffff" };

function numbers(body) {
  return body
    .split(/[\s,/]+/)
    .filter(Boolean)
    .map((token) => {
      const value = Number.parseFloat(token);
      if (!Number.isFinite(value)) throw new Error(`componente de color no numérico: «${token}»`);
      return { value, percent: token.endsWith("%") };
    });
}

/** Devuelve `#rrggbb` o lanza si el formato no se conoce (el ETL debe fallar a la vista, no inventar). */
export function toHex6(input) {
  const text = String(input).trim().toLowerCase();
  if (NAMED[text]) return NAMED[text];

  const hex = /^#([0-9a-f]{3,8})$/.exec(text);
  if (hex) {
    const digits = hex[1];
    if (digits.length === 3 || digits.length === 4) {
      return `#${[...digits.slice(0, 3)].map((digit) => digit + digit).join("")}`;
    }
    if (digits.length === 6 || digits.length === 8) return `#${digits.slice(0, 6)}`;
  }

  const fn = /^([a-z]+)\((.*)\)$/.exec(text);
  if (fn) {
    const [name, body] = [fn[1], fn[2]];
    const parts = numbers(body);
    if ((name === "rgb" || name === "rgba") && parts.length >= 3) {
      const [r, g, b] = parts.map((part) => (part.percent ? part.value / 100 : part.value / 255));
      return toHex(r, g, b);
    }
    if ((name === "hsl" || name === "hsla") && parts.length >= 3) {
      return hslToHex(parts[0].value, parts[1].value / 100, parts[2].value / 100);
    }
    if (name === "oklch" && parts.length >= 3) {
      const L = parts[0].percent ? parts[0].value / 100 : parts[0].value;
      return oklchToHex(L, parts[1].value, parts[2].value);
    }
  }
  throw new Error(`formato de color no soportado: «${input}»`);
}

/** Mezcla `amount` (0–1) de `b` sobre `a`, en sRGB lineal. */
export function mixHex(a, b, amount) {
  const read = (hex) => [1, 3, 5].map((index) => gammaDecode(Number.parseInt(hex.slice(index, index + 2), 16) / 255));
  const [ar, ag, ab] = read(a);
  const [br, bg, bb] = read(b);
  const lerp = (x, y) => gammaEncode(x + (y - x) * amount);
  return toHex(lerp(ar, br), lerp(ag, bg), lerp(ab, bb));
}
