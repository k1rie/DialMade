"use client";

import { useEffect, useMemo, useState } from "react";
import { compileCssOffThread } from "@/lib/ai/render/worker";

/** Class tokens of sanitized AI HTML (canonical: double-quoted `class`, see @dialmade/ai-render's serializer). */
export function classTokens(html: string): string[] {
  const out: string[] = [];
  for (const match of html.matchAll(/\sclass="([^"]*)"/g)) out.push(...match[1]!.split(/\s+/).filter(Boolean));
  return out;
}

const MAX_ENTRIES = 8;
const compiled = new Map<string, Promise<string>>();

/** The CSS of a set of class tokens, compiled once in the worker and kept for the last few sets. */
function cssFor(key: string): Promise<string> {
  let css = compiled.get(key);
  if (css) {
    compiled.delete(key);
    compiled.set(key, css);
    return css;
  }
  css = compileCssOffThread(key ? key.split(" ") : []);
  css.catch(() => compiled.delete(key));
  compiled.set(key, css);
  if (compiled.size > MAX_ENTRIES) compiled.delete(compiled.keys().next().value as string);
  return css;
}

export type AiCss = {
  css: string;
  /** Tokens the CSS covers: an island waits until all of its tokens are in (no unstyled flash). */
  covers: (tokens: readonly string[]) => boolean;
};

/**
 * Tailwind's `compile()` for the AI blocks of one screen, off the main thread (spec §2.2 [C1]): one stylesheet for
 * every island of the screen. While a new block's CSS compiles, the islands already shown keep the previous one.
 */
export function useAiCss(tokens: readonly string[]): AiCss | null {
  const key = useMemo(() => [...new Set(tokens)].sort().join(" "), [tokens]);
  const [state, setState] = useState<{ key: string; css: string; set: ReadonlySet<string> } | null>(null);
  useEffect(() => {
    let alive = true;
    cssFor(key).then(
      (css) => {
        if (alive) setState({ key, css, set: new Set(key.split(" ")) });
      },
      () => {},
    );
    return () => {
      alive = false;
    };
  }, [key]);
  return useMemo(() => (state ? { css: state.css, covers: (list) => list.every((token) => state.set.has(token)) } : null), [state]);
}
