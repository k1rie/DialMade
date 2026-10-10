// Static HTML of AI blocks (spec §9): the export has no scripts, so the icons and placeholders the preview runtime
// draws are inlined here as SVG. Works on CANONICAL html (what ./tree serializes after ./sanitize): attributes are
// always double-quoted and escaped, so the patterns below cannot be fooled by the model's own text.
import { iconSvg, placeholderSvg } from "./assets";

const ATTR = (name: string) => new RegExp(`\\s${name}="([^"]*)"`);
const attrOf = (tag: string, name: string) => ATTR(name).exec(tag)?.[1];
const unescape = (value: string) => value.replace(/&quot;/g, '"').replace(/&lt;/g, "<").replace(/&gt;/g, ">").replace(/&amp;/g, "&");
const escape = (value: string) => value.replace(/&/g, "&amp;").replace(/"/g, "&quot;").replace(/</g, "&lt;").replace(/>/g, "&gt;");

export type InlineAssetsOptions = {
  /** URL of the brand logo for `<img data-asset="logo">` (else a placeholder logo is drawn). */
  logoUrl?: string;
};

/** `<i data-icon>` → the icon's SVG inside it; `<img data-placeholder>` → inline SVG art with the image's classes. */
export function inlineAssets(html: string, options: InlineAssetsOptions = {}): string {
  return html
    .replace(/<i(\s[^>]*?\sdata-icon="([a-z0-9-]+)"[^>]*)><\/i>/g, (_match, attrs: string, name: string) => `<i${attrs}>${iconSvg(name)}</i>`)
    .replace(/<img(\s[^>]*)>/g, (_match, attrs: string) => {
      const alt = unescape(attrOf(attrs, "alt") ?? "");
      const className = attrOf(attrs, "class");
      if (attrOf(attrs, "data-asset") === "logo" && options.logoUrl) {
        return `<img src="${escape(options.logoUrl)}" alt="${escape(alt)}"${className ? ` class="${className}"` : ""}>`;
      }
      const kind = attrOf(attrs, "data-asset") === "logo" ? "logo" : (attrOf(attrs, "data-placeholder") ?? "photo");
      const svg = placeholderSvg(kind, alt);
      const extra = `${className ? ` class="${className}"` : ""}${alt ? ` aria-label="${escape(alt)}"` : ' aria-hidden="true"'} data-placeholder="${escape(kind)}"`;
      return svg.replace("<svg ", `<svg${extra} `);
    });
}

/** Provenance comment before an AI block in the export («ai: claude-haiku-5-5 · 2026-10-10»). */
export const provenanceComment = (model: string | undefined, createdAt: string): string =>
  `<!-- Dialmade «Diseño con IA»: ${(model ?? "unknown").replace(/--/g, "")} · ${createdAt.slice(0, 10)} -->`;
