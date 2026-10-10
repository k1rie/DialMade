import { isPlainObject } from "./json";

/** An RFC 6901 JSON Pointer into the DesignDoc, e.g. `/tokens/color/light/primary`. */
export type DocPointer = `/${string}`;

export const JSON_POINTER = /^(?:\/(?:[^~/]|~[01])*)*$/;

export const isJsonPointer = (value: string): boolean => JSON_POINTER.test(value);

const unescape = (segment: string) => segment.replace(/~1/g, "/").replace(/~0/g, "~");
const escape = (segment: string) => segment.replace(/~/g, "~0").replace(/\//g, "~1");

/** `"/tokens/color/light/primary"` → `["tokens", "color", "light", "primary"]`. */
export function pointerSegments(pointer: string): string[] {
  return pointer === "" ? [] : pointer.slice(1).split("/").map(unescape);
}

/** `["tokens", "space", "4"]` → `"/tokens/space/4"`. */
export function toPointer(segments: readonly (string | number)[]): string {
  return segments.map((segment) => `/${escape(String(segment))}`).join("");
}

/** `ancestor` is `pointer` itself or one of its parents (`/tokens/color` covers `/tokens/color/light/primary`). */
export function coversPointer(ancestor: string, pointer: string): boolean {
  return pointer === ancestor || pointer.startsWith(`${ancestor}/`) || ancestor === "";
}

/** One of the two contains the other: changing either may change both. */
export const pointersOverlap = (a: string, b: string): boolean => coversPointer(a, b) || coversPointer(b, a);

/** The value at `pointer` (own members only), or `undefined` when the path does not exist. */
export function valueAtPointer(root: unknown, pointer: string): unknown {
  let current = root;
  for (const segment of pointerSegments(pointer)) {
    if (Array.isArray(current)) {
      if (!/^(0|[1-9]\d*)$/.test(segment)) return undefined;
      current = current[Number(segment)];
    } else if (isPlainObject(current) && Object.hasOwn(current, segment)) {
      current = current[segment];
    } else {
      return undefined;
    }
  }
  return current;
}

/** `"/tokens/radius/md"` → `"/tokens/radius"`; the root has no parent (`""`). */
export const parentPointer = (pointer: string): string => pointer.slice(0, Math.max(0, pointer.lastIndexOf("/")));

/** Ancestors of `pointer` (shallowest first, root excluded) that do not exist in `root`. */
export function missingAncestors(root: unknown, pointer: string): string[] {
  const segments = pointerSegments(pointer);
  const out: string[] = [];
  for (let i = 1; i < segments.length; i++) {
    const ancestor = toPointer(segments.slice(0, i));
    if (valueAtPointer(root, ancestor) === undefined) out.push(ancestor);
  }
  return out;
}
