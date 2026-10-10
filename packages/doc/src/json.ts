export function isPlainObject(value: unknown): value is Record<string, unknown> {
  if (typeof value !== "object" || value === null || Array.isArray(value)) return false;
  const proto = Object.getPrototypeOf(value);
  return proto === Object.prototype || proto === null;
}

/**
 * JSON-compatible value check (`undefined` members are tolerated because JSON drops them).
 * Returns the JSON path of the first offending value, or `null` when everything is serializable.
 */
export function findNonJsonValue(value: unknown, path: (string | number)[] = []): (string | number)[] | null {
  if (value === null || typeof value === "string" || typeof value === "boolean") return null;
  if (typeof value === "number") return Number.isFinite(value) ? null : path;
  if (Array.isArray(value)) {
    for (let i = 0; i < value.length; i++) {
      if (value[i] === undefined) return [...path, i];
      const bad = findNonJsonValue(value[i], [...path, i]);
      if (bad) return bad;
    }
    return null;
  }
  if (isPlainObject(value)) {
    for (const [key, child] of Object.entries(value)) {
      if (child === undefined) continue;
      const bad = findNonJsonValue(child, [...path, key]);
      if (bad) return bad;
    }
    return null;
  }
  return path;
}

export function cloneJson<T>(value: T): T {
  return JSON.parse(JSON.stringify(value)) as T;
}
