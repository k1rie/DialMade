// CSS of AI blocks: Tailwind v4's `compile()` over the vocabulary theme (./theme), fed ONLY with class tokens that
// passed the grammar (./vocabulary). Runs in a worker of the app and in the export (spec §2.2 [C1]); the iframe never
// runs Tailwind. A separate entry (`@dialmade/ai-render/css`) so the rest of the package does not load Tailwind.
import { compile } from "tailwindcss";
import { PREFLIGHT_CSS } from "./preflight";
import { AI_TAILWIND_INPUT } from "./theme";
import { checkClass } from "./vocabulary";

/**
 * A fresh compiler per call: Tailwind's `build()` is incremental (it keeps every candidate it has seen), so a shared
 * compiler would leak the classes of earlier blocks into later CSS. `compile()` of this small theme takes ~20 ms.
 */
function newCompiler() {
  return compile(AI_TAILWIND_INPUT, {
    base: "/",
    loadStylesheet: async (id) => {
      throw new Error(`AI CSS imports nothing (asked for ${id})`);
    },
    loadModule: async (id) => {
      throw new Error(`AI CSS loads no plugins (asked for ${id})`);
    },
  });
}

/** Base rules under the utilities: the doc's fonts as the default, and the island's own box. */
export const AI_BASE_CSS = `:root{--default-font-family:var(--dl-font-body);--default-mono-font-family:var(--dl-font-mono)}
body{background:transparent;color:var(--foreground);font-family:var(--dl-font-body);-webkit-font-smoothing:antialiased}
:where([data-icon]){display:inline-block;width:1em;height:1em;flex-shrink:0;vertical-align:-0.125em}
:where([data-icon]) svg{display:block;width:100%;height:100%}
:where(svg[data-placeholder]){display:block;width:100%;height:auto;max-width:100%}
`;

/** In a page with base sections: the AI root fills its cell, and a container's surface sits under its children. */
const SCOPED_EXTRA_CSS = `[data-dl-ai-block]{display:block;width:100%;height:100%}[data-dl-ai-block]>*{min-height:100%}
.dl-el:has(>[data-dl-ai-surface]){position:relative;isolation:isolate}[data-dl-ai-surface]{position:absolute;inset:0;z-index:-1}
`;

export type CompileAiCssOptions = {
  /** Prepend Tailwind's preflight and `AI_BASE_CSS` (default true: what the iframe and the export need). */
  base?: boolean;
  /**
   * Scope preflight and the base rules to AI blocks (`[data-dl-ai-block]`, `[data-dl-ai-surface]`): the HTML export
   * mixes them with base sections, which must keep the kit's own styles. The iframe needs no scope.
   */
  scoped?: boolean;
};

/** Elements that wrap AI HTML in a page that also has base sections. */
export const AI_SCOPE = "[data-dl-ai-block],[data-dl-ai-surface]";

/** Rewrites the selectors of plain CSS (rules and `@supports`/`@media` blocks) under `:where(scope)`. */
export function scopeCss(css: string, scope: string = AI_SCOPE): string {
  const root = `:where(${scope})`;
  const scopeSelector = (selector: string) => {
    const s = selector.trim();
    if (!s) return s;
    if (s === "html" || s === ":host" || s === ":root" || s === "body") return root;
    if (s === "*") return `${root},${root} *`;
    if (s.startsWith("::") || s.startsWith(":-")) return `${root} *${s},${root}${s}`;
    return `${root} ${s}`;
  };
  let out = "";
  let i = 0;
  while (i < css.length) {
    const open = css.indexOf("{", i);
    if (open < 0) break;
    const head = css.slice(i, open).trim();
    if (head.startsWith("@")) {
      // Block at-rule: scope what is inside it.
      let depth = 1;
      let j = open + 1;
      while (j < css.length && depth > 0) {
        if (css[j] === "{") depth++;
        else if (css[j] === "}") depth--;
        j++;
      }
      out += `${head}{${scopeCss(css.slice(open + 1, j - 1), scope)}}`;
      i = j;
      continue;
    }
    const close = css.indexOf("}", open);
    out += `${[...new Set(head.split(",").map(scopeSelector))].join(",")}{${css.slice(open + 1, close)}}`;
    i = close + 1;
  }
  return out;
}

/**
 * CSS for `classes` (any iterable of class tokens, repeated or not). Tokens outside the vocabulary are skipped
 * here too: the grammar is the gate, the theme is the second wall.
 */
export async function compileAiCss(classes: Iterable<string>, options: CompileAiCssOptions = {}): Promise<string> {
  const candidates = new Set<string>();
  for (const token of classes) if (checkClass(token).ok) candidates.add(token);
  const utilities = (await newCompiler()).build([...candidates].sort());
  if (options.base === false) return utilities;
  if (options.scoped) return `${scopeCss(PREFLIGHT_CSS)}${scopeCss(AI_BASE_CSS)}${SCOPED_EXTRA_CSS}${utilities}`;
  return `${PREFLIGHT_CSS}${AI_BASE_CSS}${utilities}`;
}

/** Every class token of sanitized HTML (`class="…"` attributes; the sanitizer re-serializes them double-quoted). */
export function classTokensOf(html: string): string[] {
  const tokens: string[] = [];
  for (const match of html.matchAll(/\sclass="([^"]*)"/g)) tokens.push(...match[1]!.split(/\s+/).filter(Boolean));
  return tokens;
}
