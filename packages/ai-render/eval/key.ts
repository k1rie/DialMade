// The eval reads the server's key from apps/web/.env.local by code. It is never printed or written anywhere.
import { readFile } from "node:fs/promises";
import { join } from "node:path";

export async function apiKey(): Promise<string> {
  const env = await readFile(join(import.meta.dirname, "../../../apps/web/.env.local"), "utf8");
  const line = env.split("\n").find((l) => l.startsWith("ANTHROPIC_API_KEY="));
  const key = line?.slice("ANTHROPIC_API_KEY=".length).trim().replace(/^["']|["']$/g, "");
  if (!key) throw new Error("ANTHROPIC_API_KEY missing in apps/web/.env.local");
  return key;
}
