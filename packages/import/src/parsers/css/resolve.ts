import valueParser from "postcss-value-parser";
import type { Mode } from "../../types";
import type { Sheet, VarDef } from "./sheet";

export interface Resolution {
  text: string;
  /** Why it could not be resolved (`undefined variable --x`, `var() cycle`). */
  error?: string;
  /** Modes of the definitions used (`neutral` for `@theme`). */
  modes: Set<Mode | "neutral">;
  /** The value is a single `var()` that resolved through this definition. */
  aliasOf?: VarDef;
}

export interface ResolverOptions {
  /** `var()` hops (32). */
  maxHops: number;
  /** For font stacks: an undefined variable is left as written (or replaced) instead of failing. */
  keepUndefined?: (name: string, raw: string) => string;
}

const MAX_LENGTH = 4000;

/**
 * The definition of `--name` that applies in `mode`, CSS-cascade style: the same mode first (the last
 * one, `!important` before others), then a mode-neutral one (`@theme`), then one that applies everywhere
 * (`:root`, even when it declares `color-scheme: dark`). A `.dark` value never leaks into light.
 */
export function lookup(sheets: Iterable<Sheet>, name: string, mode: Mode | undefined): VarDef | undefined {
  for (const sheet of sheets) {
    const defs = sheet.defs.get(name);
    if (!defs) continue;
    const pick = (filter: (d: VarDef) => boolean) => {
      let best: VarDef | undefined;
      for (const d of defs) if (filter(d) && (!best || (d.important && !best.important) || d.important === best.important)) best = d;
      return best;
    };
    const found =
      (mode && pick((d) => d.mode === mode)) ?? pick((d) => d.mode === undefined) ?? pick((d) => !d.conditional) ?? (mode === undefined ? pick(() => true) : undefined);
    if (found) return found;
  }
  return undefined;
}

/** The file's own sheet first, then the other CSS files of the batch (read only when a name is missing). */
export function* sheetsOf(own: Sheet, others: () => readonly Sheet[]): Generator<Sheet> {
  yield own;
  yield* others();
}

/**
 * `var()` substitution within the batch, with `var(--x, fallback)`, cycle detection and a hop limit.
 * Linear: each `(name, mode)` resolves once.
 */
export function createResolver(own: Sheet, others: () => readonly Sheet[], options: ResolverOptions) {
  const memo = new Map<string, Resolution>();
  const sheets = { [Symbol.iterator]: () => sheetsOf(own, others) };

  function resolveValue(value: string, mode: Mode | undefined, stack: string[]): Resolution {
    const modes = new Set<Mode | "neutral">();
    if (!value.includes("var(")) return { text: value, modes };
    let error: string | undefined;
    let aliasOf: VarDef | undefined;
    const root = valueParser(value);
    const top = root.nodes.filter((n) => n.type !== "space" && n.type !== "comment");
    const single = top.length === 1 && top[0]!.type === "function" && top[0]!.value.toLowerCase() === "var";

    const substitute = (node: valueParser.FunctionNode): string => {
      const args = node.nodes.filter((n) => n.type !== "space" && n.type !== "comment");
      const name = args[0]?.type === "word" ? args[0].value : "";
      const comma = node.nodes.findIndex((n) => n.type === "div" && n.value === ",");
      const fallback = comma >= 0 ? valueParser.stringify(node.nodes.slice(comma + 1)).trim() : undefined;
      if (!name.startsWith("--")) {
        error ??= "invalid var()";
        return "";
      }
      if (stack.includes(name)) {
        error ??= `var() cycle: ${[...stack, name].join(" → ")}`;
        return "";
      }
      if (stack.length >= options.maxHops) {
        error ??= `more than ${options.maxHops} var() hops`;
        return "";
      }
      const def = lookup(sheets, name, mode);
      if (def) {
        const key = `${name}|${mode ?? ""}`;
        let inner = memo.get(key);
        if (!inner) {
          inner = resolveValue(def.value, mode, [...stack, name]);
          inner.modes.add(def.mode ?? "neutral");
          if (!inner.error || !inner.error.startsWith("var() cycle")) memo.set(key, inner);
        }
        for (const m of inner.modes) modes.add(m);
        if (inner.error) error ??= inner.error;
        if (single) aliasOf = def;
        return inner.text;
      }
      if (options.keepUndefined && fallback === undefined) return options.keepUndefined(name, valueParser.stringify(node));
      if (fallback !== undefined) {
        if (options.keepUndefined) return options.keepUndefined(name, valueParser.stringify(node));
        const inner = resolveValue(fallback, mode, [...stack, name]);
        for (const m of inner.modes) modes.add(m);
        if (inner.error) error ??= inner.error;
        return inner.text;
      }
      error ??= `undefined variable ${name}`;
      return "";
    };

    root.walk((node) => {
      if (node.type !== "function" || node.value.toLowerCase() !== "var") return undefined;
      const replacement = substitute(node);
      (node as unknown as valueParser.WordNode).type = "word";
      node.value = replacement;
      return false;
    });
    const text = root.toString();
    if (text.length > MAX_LENGTH) return { text: "", error: "value too long after var()", modes };
    return { text, modes, ...(error && { error }), ...(aliasOf && { aliasOf }) };
  }

  return {
    /** Resolves the `var()`s of a value as seen in `mode`. */
    resolve: (value: string, mode: Mode | undefined, self?: string): Resolution => resolveValue(value, mode, self ? [self] : []),
  };
}
