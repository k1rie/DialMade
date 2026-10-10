import { readFileSync } from "node:fs";
import { detectFormat, fileExtension } from "../../detect";
import { IMPORT_LIMITS, type ImportLimits } from "../../limits";
import type { BatchFile, Parser, ParserContext, ParserInput, SniffedFile } from "../../registry";
import { utf8 } from "../../testing/fakes";
import type { ParseOutput } from "../../types";

// Test helpers shared by the tokens and DESIGN.md parser tests (not exported by the package).

export const fixture = (dir: URL, rel: string): string => readFileSync(new URL(`./fixtures/${rel}`, dir), "utf8");

export function sniff(text: string, name: string): SniffedFile {
  const bytes = utf8(text);
  return { name, extension: fileExtension(name), bytes, text, detected: detectFormat(bytes, name), pasted: false };
}

/** Runs one parser over a batch of text files (every file sees the others), like `importBatch` does. */
export async function parseBatch(parser: Parser, files: readonly { name: string; text: string }[], limits: ImportLimits = IMPORT_LIMITS): Promise<Map<string, ParseOutput>> {
  const sniffed = files.map((f) => sniff(f.text, f.name));
  const batch: BatchFile[] = sniffed.map((s, i) => ({
    name: s.name,
    sourceId: `${parser.kind}-${i}`,
    format: parser.detect(s)?.format ?? s.detected.format,
    parserId: s.detected.parserId ?? parser.id,
    text: s.text!,
  }));
  const ctx: ParserContext = { limits, batch };
  const out = new Map<string, ParseOutput>();
  for (const [i, s] of sniffed.entries()) {
    const input: ParserInput = { ...s, sourceId: batch[i]!.sourceId, format: batch[i]!.format, ownership: "own" };
    out.set(s.name, await parser.parse(input, ctx));
  }
  return out;
}

export async function parseOne(parser: Parser, name: string, text: string, limits?: ImportLimits): Promise<ParseOutput> {
  return (await parseBatch(parser, [{ name, text }], limits)).get(name)!;
}
