export function initialsOf(name: string): string {
  const words = name.trim().split(/\s+/).filter(Boolean);
  const first = words[0]?.[0] ?? "";
  const last = words.length > 1 ? (words[words.length - 1]?.[0] ?? "") : (words[0]?.[1] ?? "");
  return (first + last).toUpperCase();
}

/** Color estable (1–5) por nombre, para que cada persona tenga siempre el mismo tono. */
export function colorIndexOf(name: string): 1 | 2 | 3 | 4 | 5 {
  let hash = 0;
  for (const char of name) hash = (hash * 31 + char.charCodeAt(0)) >>> 0;
  return ((hash % 5) + 1) as 1 | 2 | 3 | 4 | 5;
}
