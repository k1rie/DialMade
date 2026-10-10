import type { CSSProperties } from "react";
// Relative imports only: the glyph test renders this module in vitest without the `@/` alias.
import { PREVIEW_SCALE } from "../constants";

/*
 * Drawing kit of the style previews: design-px units (`--u`), the recipe's surfaces (card, frosted glass,
 * frame) as theme-variable styles, accents and the atoms every glyph is drawn with. Spans only: the
 * preview lives inside a <button>.
 */

/* ------------------------------------------------------------------------------------------------ */
/* Units and skins                                                                                  */
/* ------------------------------------------------------------------------------------------------ */

/** `n` design px. */
export const u = (n: number) => `calc(var(--u, 0.18px) * ${n})`;
/** `n` design px, never thinner than `min` screen px (a narrow preview still shows the line). */
export const ul = (n: number, min = 1.5) => `max(${min}px, ${u(n)})`;
export const shrink = (variable: string, fallback: string) => `calc(var(${variable}, ${fallback}) * ${PREVIEW_SCALE})`;
export const clampInt = (value: number, min: number, max: number) => Math.max(min, Math.min(max, Math.floor(value)));

export const CARD_RADIUS = shrink("--dl-card-radius", "8px");
export const BUTTON_RADIUS = shrink("--dl-button-radius", "8px");
export const INPUT_RADIUS = shrink("--dl-input-radius", "6px");
export const SMALL_RADIUS = shrink("--dl-radius-md", "6px");
export const LINE = "var(--dl-border-width, 1px) solid var(--border)";

export const ROOT: CSSProperties = {
  position: "absolute",
  display: "flex",
  flexDirection: "column",
  overflow: "hidden",
  boxSizing: "border-box",
  minWidth: 0,
};

export const CARD: CSSProperties = {
  background: "var(--card)",
  color: "var(--card-foreground)",
  border: "var(--dl-card-border, 1px solid var(--border))",
  boxShadow: "var(--dl-card-shadow, none)",
  borderRadius: CARD_RADIUS,
};
export const FROSTED: CSSProperties = {
  background: "color-mix(in oklab, var(--card) 55%, transparent)",
  backdropFilter: "blur(6px)",
  WebkitBackdropFilter: "blur(6px)",
};
export const GLASS_CARD: CSSProperties = { ...CARD, ...FROSTED };
/** Transparent band on the page background (collections paint their items as cards). */
export const BAND: CSSProperties = { color: "var(--foreground)" };
/** «Contenedor»: a soft grouping panel; its children are painted on top. */
export const GROUP: CSSProperties = { background: "color-mix(in oklab, var(--muted) 55%, transparent)", borderRadius: CARD_RADIUS };
/** Media blocks: an image area in the card's shape. */
export const MEDIA: CSSProperties = { ...CARD, background: "var(--muted)" };

export const FRAME_SIDE: CSSProperties = {
  background: "var(--sidebar, var(--card))",
  color: "var(--sidebar-foreground, var(--card-foreground))",
  borderInlineEnd: "var(--dl-border-width, 1px) solid var(--sidebar-border, var(--border))",
};
export const FRAME_TOP: CSSProperties = {
  background: "var(--sidebar, var(--card))",
  color: "var(--sidebar-foreground, var(--card-foreground))",
  borderBlockEnd: "var(--dl-border-width, 1px) solid var(--sidebar-border, var(--border))",
};

export type ChartTone = 1 | 2 | 3 | 4 | 5;
export type Tone = "fg" | "muted" | "faint" | "primary" | "soft" | ChartTone;

export const TONES: Record<Tone, CSSProperties> = {
  fg: { background: "currentColor", opacity: 0.85 },
  muted: { background: "var(--muted-foreground)", opacity: 0.45 },
  faint: { background: "var(--muted-foreground)", opacity: 0.25 },
  primary: { background: "var(--primary)" },
  soft: { background: "var(--muted)" },
  1: { background: "var(--chart-1)" },
  2: { background: "var(--chart-2)" },
  3: { background: "var(--chart-3)" },
  4: { background: "var(--chart-4)" },
  5: { background: "var(--chart-5)" },
};
export const CHART_TONES = [1, 2, 3, 4, 5] as const;
export const chartTone = (index: number): ChartTone => CHART_TONES[index % CHART_TONES.length] ?? 1;
export const tint = (tone: ChartTone | "primary", amount = 20): CSSProperties => ({
  background: `color-mix(in oklab, ${tone === "primary" ? "var(--primary)" : `var(--chart-${tone})`} ${amount}%, transparent)`,
});

/* ------------------------------------------------------------------------------------------------ */
/* Atoms                                                                                            */
/* ------------------------------------------------------------------------------------------------ */

export type Length = number | string;
export const len = (value: Length) => (typeof value === "number" ? u(value) : value);

/** A line of text or a bar: `w` design px or a CSS length («60%»), `h` design px. */
export function Bar({ w, h, tone = "muted", style }: { w: Length; h: number; tone?: Tone; style?: CSSProperties }) {
  return <span style={{ display: "block", flexShrink: 0, width: len(w), maxWidth: "100%", height: ul(h), borderRadius: 999, ...TONES[tone], ...style }} />;
}

export function Dot({ d, tone = "soft", style }: { d: number; tone?: Tone; style?: CSSProperties }) {
  return <span style={{ display: "block", flexShrink: 0, width: ul(d, 2), height: ul(d, 2), borderRadius: "50%", ...TONES[tone], ...style }} />;
}

/** Primary button (or outline) with the recipe's button radius and shadow. */
export function Button({ w, h = 40, outline = false, style }: { w: Length; h?: number; outline?: boolean; style?: CSSProperties }) {
  return (
    <span
      style={{
        display: "block",
        flexShrink: 0,
        width: len(w),
        maxWidth: "100%",
        height: ul(h, 2),
        borderRadius: BUTTON_RADIUS,
        ...(outline
          ? { border: "var(--dl-border-width, 1px) solid var(--border-strong)" }
          : { background: "var(--primary)", boxShadow: "var(--dl-button-shadow, none)" }),
        ...style,
      }}
    />
  );
}

export function Input({ h = 40, style }: { h?: number; style?: CSSProperties }) {
  return <span style={{ display: "block", flexShrink: 0, width: "100%", height: ul(h, 2), borderRadius: INPUT_RADIUS, border: LINE, ...style }} />;
}

export const row = (gap: number, style?: CSSProperties): CSSProperties => ({ display: "flex", alignItems: "center", gap: u(gap), minWidth: 0, ...style });
export const col = (gap: number, style?: CSSProperties): CSSProperties => ({ display: "flex", flexDirection: "column", gap: u(gap), minWidth: 0, ...style });
export const pad = (y: number, x = y): CSSProperties => ({ padding: `${u(y)} ${u(x)}` });
export const FILL: CSSProperties = { flex: 1, minHeight: 0, minWidth: 0 };

export const range = (n: number) => Array.from({ length: n }, (_, index) => index);

/** Heading of a landing section (centered title + subtitle), when the block is tall enough. */
export function SectionTitle() {
  return (
    <span style={col(12, { alignItems: "center", flexShrink: 0 })}>
      <Bar w="32%" h={28} tone="fg" />
      <Bar w="44%" h={12} />
    </span>
  );
}
