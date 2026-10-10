export type YamlValue = string | number | boolean | YamlMap;

export interface YamlMap {
  [key: string]: YamlValue | undefined;
}

const key = (name: string) => (/^[A-Za-z_][\w-]*$/.test(name) ? name : JSON.stringify(name));

const scalar = (value: string | number | boolean) => (typeof value === "string" ? JSON.stringify(value) : String(value));

/** Minimal YAML for nested maps of scalars. Strings are always double-quoted (JSON escapes are valid YAML). */
export function toYaml(map: YamlMap, indent = 0): string {
  const pad = "  ".repeat(indent);
  const lines: string[] = [];
  for (const [name, value] of Object.entries(map)) {
    if (value === undefined) continue;
    if (typeof value === "object") {
      lines.push(`${pad}${key(name)}:`);
      lines.push(toYaml(value, indent + 1));
    } else {
      lines.push(`${pad}${key(name)}: ${scalar(value)}`);
    }
  }
  return lines.filter((line) => line !== "").join("\n");
}
