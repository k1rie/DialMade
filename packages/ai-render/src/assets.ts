// Icons and placeholders of AI blocks as SVG markup: the preview runtime swaps `<i data-icon>` and
// `<img data-placeholder>` for them, and the HTML export inlines them (no scripts there). Only our own icon set
// (@dialmade/ui, no brand logos) and token-colored placeholder art.
import { ICONS } from "@dialmade/ui/icons";

const escape = (value: string) => value.replace(/&/g, "&amp;").replace(/"/g, "&quot;").replace(/</g, "&lt;").replace(/>/g, "&gt;");

/** `<svg>` of an icon of the set (a small dot for an unknown name), `currentColor` stroke. */
export function iconSvg(name: string): string {
  const paths = (ICONS as Record<string, readonly string[]>)[name];
  const body = paths ? paths.map((d) => `<path d="${escape(d)}"/>`).join("") : `<circle cx="12" cy="12" r="2.5" fill="currentColor"/>`;
  return `<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.75" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true" focusable="false">${body}</svg>`;
}

const VIEW: Record<string, { w: number; h: number }> = {
  photo: { w: 480, h: 320 },
  avatar: { w: 96, h: 96 },
  logo: { w: 160, h: 48 },
  screenshot: { w: 640, h: 400 },
  chart: { w: 480, h: 240 },
  illustration: { w: 480, h: 360 },
};

/**
 * Placeholder art for `kind`, painted with theme variables (`fill:var(--muted)`…) so it follows the palette and dark
 * mode. Inline SVG markup (an `<img>` could not read the page's variables): the runtime and the HTML export put it
 * where the `<img data-placeholder>` was, with `role="img"` and its alt text.
 */
export function placeholderSvg(kind: string, label = ""): string {
  const { w, h } = VIEW[kind] ?? VIEW.photo!;
  const title = label ? `<title>${escape(label)}</title>` : "";
  const bg = `<rect width="${w}" height="${h}" style="fill:var(--muted, #eee)"/>`;
  let art: string;
  switch (kind) {
    case "avatar":
      art = `<rect width="96" height="96" style="fill:var(--secondary, #ddd)"/><circle cx="48" cy="38" r="17" style="fill:var(--muted-foreground, #999)" opacity=".55"/><path d="M16 92c4-20 18-30 32-30s28 10 32 30" style="fill:var(--muted-foreground, #999)" opacity=".55"/>`;
      return `<svg xmlns="http://www.w3.org/2000/svg" role="img" viewBox="0 0 ${w} ${h}">${title}${art}</svg>`;
    case "logo":
      art = `<rect x="4" y="12" width="24" height="24" rx="6" style="fill:var(--primary, #555)"/><rect x="36" y="18" width="110" height="12" rx="6" style="fill:var(--foreground, #333)" opacity=".75"/>`;
      return `<svg xmlns="http://www.w3.org/2000/svg" role="img" viewBox="0 0 ${w} ${h}">${title}${art}</svg>`;
    case "screenshot":
      art = `<rect width="${w}" height="34" style="fill:var(--card, #f6f6f6)"/><circle cx="20" cy="17" r="5" style="fill:var(--border, #ccc)"/><circle cx="38" cy="17" r="5" style="fill:var(--border, #ccc)"/><circle cx="56" cy="17" r="5" style="fill:var(--border, #ccc)"/>
<rect x="20" y="58" width="140" height="${h - 78}" rx="10" style="fill:var(--card, #fff)"/><rect x="180" y="58" width="${w - 200}" height="90" rx="10" style="fill:var(--primary, #555)" opacity=".85"/>
<rect x="180" y="166" width="${(w - 216) / 2}" height="${h - 186}" rx="10" style="fill:var(--card, #fff)"/><rect x="${196 + (w - 216) / 2}" y="166" width="${(w - 216) / 2}" height="${h - 186}" rx="10" style="fill:var(--card, #fff)"/>`;
      break;
    case "chart":
      art = Array.from({ length: 12 }, (_, i) => {
        const bar = 40 + ((i * 53) % 140);
        return `<rect x="${24 + i * 37}" y="${h - 24 - bar}" width="24" height="${bar}" rx="4" style="fill:var(--chart-${(i % 5) + 1}, #888)"/>`;
      }).join("");
      break;
    case "illustration":
      art = `<circle cx="${w * 0.38}" cy="${h * 0.45}" r="${h * 0.28}" style="fill:var(--primary, #555)" opacity=".18"/><rect x="${w * 0.42}" y="${h * 0.3}" width="${w * 0.32}" height="${h * 0.42}" rx="18" style="fill:var(--primary, #555)" opacity=".7"/><circle cx="${w * 0.7}" cy="${h * 0.32}" r="${h * 0.08}" style="fill:var(--accent, #aaa)"/>`;
      break;
    default:
      art = `<path d="M0 ${h * 0.78} L${w * 0.3} ${h * 0.5} L${w * 0.5} ${h * 0.68} L${w * 0.72} ${h * 0.42} L${w} ${h * 0.7} V${h} H0Z" style="fill:var(--muted-foreground, #999)" opacity=".28"/><circle cx="${w * 0.72}" cy="${h * 0.26}" r="${h * 0.08}" style="fill:var(--muted-foreground, #999)" opacity=".35"/>`;
  }
  return `<svg xmlns="http://www.w3.org/2000/svg" role="img" viewBox="0 0 ${w} ${h}" preserveAspectRatio="xMidYMid slice">${title}${bg}${art}</svg>`;
}
