import { detectFormat, fileExtension, type DetectedFormat } from "../detect";
import { frameworkDefaultWarnings, isFrameworkDefault } from "../defaults";
import { loadFontMatcher, type FontMatcher } from "../fonts";
import { sha256Hex } from "../hash";
import { resolveLimits, type ImportLimits, type ImportLimitsInput } from "../limits";
import { effectiveMode, findLogoConflicts, mergeFragments, type SourceFragment } from "../merge";
import { defaultParsers } from "../parsers";
import { featuresFromBrand, nearestRecipe } from "../recipe";
import {
  createRegistry,
  type AbortSignalLike,
  type BatchFile,
  type FileRole,
  type ImageDecoder,
  type Parser,
  type ParserContext,
  type ParserRegistry,
} from "../registry";
import { cleanName, cleanText, decodeText } from "../sanitize";
import type { FontCandidate, ImportedBrand, ImportFileReport, ImportSource, ImportWarning, Ownership, ParseOutput, WarningCode } from "../types";
import { normalizeOutput, resolveFonts } from "./normalize";

export interface ImportFile {
  name: string;
  bytes: Uint8Array;
  /** What the user said it is (the editable chip in the panel). `logo` files are left to the logo flow. */
  role?: FileRole;
  /** Overrides the batch ownership for this file. A `reference` is always third-party. */
  ownership?: Ownership;
  /** Text from «Pegar colores o código» (1 MB limit). */
  pasted?: boolean;
}

export interface ImportProgress {
  index: number;
  total: number;
  name: string;
  phase: "parsing" | "parsed" | "skipped" | "failed";
}

export interface ImportBatchOptions {
  /**
   * The batch's rights declaration. `own` only after «Es mi marca o tengo permiso de su titular»;
   * default `third-party` (attributes only: no locked colors, no fonts, no logo).
   */
  ownership?: Ownership;
  /** ISO date-time (UTC, `Z`) of that declaration; kept on own sources. */
  rightsConfirmedAt?: string;
  /** Parsers or a registry; default: the v1 parsers. */
  parsers?: readonly Parser[] | ParserRegistry;
  limits?: ImportLimitsInput;
  /** Checked between files; the host also terminates the worker on timeout. */
  signal?: AbortSignalLike;
  /** Needed by the screenshot parser (the worker passes createImageBitmap + OffscreenCanvas). */
  decodeImage?: ImageDecoder;
  /** Default: `loadFontMatcher()`, loaded only when a parser returns fonts. */
  fonts?: FontMatcher;
  /** The logo's seeds, to raise conflict cards against the imported guide. */
  logo?: { primary: string; secondary?: string };
  onProgress?: (event: ImportProgress) => void;
}

/** Thrown when `signal.aborted` turns true («Cancelar»). */
export class ImportAbortedError extends Error {
  constructor() {
    super("Import cancelled");
    this.name = "AbortError";
  }
}

const ISO_UTC = /^\d{4}-\d{2}-\d{2}T\d{2}:\d{2}:\d{2}(?:\.\d{1,9})?Z$/;

interface Intake {
  index: number;
  name: string;
  bytes: Uint8Array;
  text?: string;
  detected: DetectedFormat;
  parser: Parser;
  format: string;
  sha256: string;
  sourceId: string;
  ownership: Ownership;
  role?: FileRole;
  pasted: boolean;
}

const isRegistry = (value: ImportBatchOptions["parsers"]): value is ParserRegistry =>
  value !== undefined && !Array.isArray(value) && typeof (value as ParserRegistry).pick === "function";

function registryOf(parsers: ImportBatchOptions["parsers"]): ParserRegistry {
  if (isRegistry(parsers)) return parsers;
  return createRegistry((parsers as readonly Parser[] | undefined) ?? defaultParsers);
}

function byteLimit(limits: ImportLimits, detected: DetectedFormat, pasted: boolean): number {
  const limit = limits.bytes[detected.limit];
  return pasted ? Math.min(limit, limits.bytes.paste) : limit;
}

const errorDetail = (error: unknown) => cleanText(error instanceof Error ? `${error.name}: ${error.message}` : String(error), 200);

/**
 * Detects, parses and merges a batch of files into one `ImportedBrand` for «Esto detectamos». Pure
 * TypeScript (worker or Node); nothing is applied to the DesignDoc. Each file is checked against the
 * limits, hashed (SHA-256) and handed to the parser that claims it; a file that is too large,
 * unsupported or fails to parse gets its line in `files` and never blocks the rest.
 */
export async function importBatch(files: readonly ImportFile[], options: ImportBatchOptions = {}): Promise<ImportedBrand> {
  const limits = resolveLimits(options.limits);
  const registry = registryOf(options.parsers);
  const total = files.length;
  const reports: ImportFileReport[] = [];
  const warnings: ImportWarning[] = [];
  const intakes: Intake[] = [];
  const seen = new Map<string, string>();
  const rightsConfirmedAt = options.rightsConfirmedAt && ISO_UTC.test(options.rightsConfirmedAt) ? options.rightsConfirmedAt : undefined;
  let images = 0;

  const abortCheck = () => {
    if (options.signal?.aborted) throw new ImportAbortedError();
  };
  const progress = (index: number, name: string, phase: ImportProgress["phase"]) => options.onProgress?.({ index, total, name, phase });
  const skip = (index: number, name: string, sourceId: string, format: string, code: WarningCode, detail?: string, status: "skipped" | "failed" = "skipped") => {
    reports.push({ index, name, sourceId, status, format, code, ...(detail && { detail }) });
    progress(index, name, status);
  };

  if (total > limits.maxFiles) warnings.push({ sourceId: "batch", code: "too-many-files", detail: `${total}/${limits.maxFiles}` });

  for (let index = 0; index < total; index++) {
    abortCheck();
    const file = files[index]!;
    const pasted = file.pasted === true;
    const named = cleanName(typeof file.name === "string" ? file.name : "");
    const name = named.value || (pasted ? "paste" : "file");
    const fallbackId = `file-${index + 1}`;
    if (index >= limits.maxFiles) {
      skip(index, name, fallbackId, "unknown", "too-many-files");
      continue;
    }
    const bytes = file.bytes instanceof Uint8Array ? file.bytes : new Uint8Array(0);
    const detected = detectFormat(bytes, name, { pasted });
    if (detected.category === "empty") {
      skip(index, name, fallbackId, "empty", "empty-file");
      continue;
    }
    const max = byteLimit(limits, detected, pasted);
    if (bytes.length > max) {
      skip(index, name, fallbackId, detected.format, "file-too-large", `${bytes.length} > ${max}`);
      continue;
    }
    if (file.role === "logo" || detected.unsupported === "logo") {
      skip(index, name, fallbackId, detected.format, "logo-file");
      continue;
    }
    const isImage = detected.category === "image";
    if (isImage && !detected.unsupported && !detected.image) {
      // Without a size in the header the megapixel cap cannot run before decoding: never decode it.
      skip(index, name, fallbackId, detected.format, "unsupported-format", "no-size");
      continue;
    }
    if (isImage && detected.image && (detected.image.width * detected.image.height) / 1e6 > limits.maxMegapixels) {
      skip(index, name, fallbackId, detected.format, "image-too-large", `${detected.image.width}×${detected.image.height}`);
      continue;
    }

    let text: string | undefined;
    if (detected.category === "text") {
      const decoded = decodeText(bytes);
      if (!decoded) {
        skip(index, name, fallbackId, detected.format, "unsupported-format", "binary");
        continue;
      }
      text = decoded.text;
      if (decoded.invalid) warnings.push({ sourceId: fallbackId, code: "invalid-utf8", detail: name });
    }

    const sniffed = { name, extension: fileExtension(name), bytes, detected, pasted, ...(text !== undefined && { text }), ...(file.role && { role: file.role }) };
    const picked = detected.unsupported ? null : registry.pick(sniffed);
    if (!picked) {
      skip(index, name, fallbackId, detected.format, "unsupported-format", detected.unsupported ?? detected.format);
      continue;
    }
    if (isImage && ++images > limits.maxImages) {
      skip(index, name, fallbackId, detected.format, "too-many-images", `${limits.maxImages}`);
      continue;
    }

    const sha256 = await sha256Hex(bytes);
    const sourceId = `${picked.parser.kind}-${sha256.slice(0, 10)}`;
    const duplicate = seen.get(sha256);
    if (duplicate) {
      skip(index, name, sourceId, detected.format, "duplicate-file", duplicate);
      continue;
    }
    seen.set(sha256, name);
    const ownership: Ownership = file.role === "reference" ? "third-party" : (file.ownership ?? options.ownership ?? "third-party");
    if (named.truncated) warnings.push({ sourceId, code: "name-truncated", detail: name });
    intakes.push({
      index,
      name,
      bytes,
      detected,
      parser: picked.parser,
      format: picked.match.format,
      sha256,
      sourceId,
      ownership,
      pasted,
      ...(text !== undefined && { text }),
      ...(file.role && { role: file.role }),
    });
  }

  const batch: BatchFile[] = intakes.map((i) => ({
    name: i.name,
    sourceId: i.sourceId,
    format: i.format,
    parserId: i.parser.id,
    ...(i.text !== undefined && { text: i.text }),
  }));
  const ctx: ParserContext = {
    limits,
    batch,
    ...(options.signal && { signal: options.signal }),
    ...(options.decodeImage && { decodeImage: options.decodeImage }),
  };

  const parsed: { intake: Intake; fragment: SourceFragment; fonts: FontCandidate[] }[] = [];
  for (const intake of intakes) {
    abortCheck();
    progress(intake.index, intake.name, "parsing");
    let output: ParseOutput;
    try {
      output = await intake.parser.parse(
        {
          name: intake.name,
          extension: fileExtension(intake.name),
          bytes: intake.bytes,
          detected: intake.detected,
          pasted: intake.pasted,
          sourceId: intake.sourceId,
          format: intake.format,
          ownership: intake.ownership,
          ...(intake.text !== undefined && { text: intake.text }),
          ...(intake.role && { role: intake.role }),
        },
        ctx,
      );
    } catch (error) {
      abortCheck();
      skip(intake.index, intake.name, intake.sourceId, intake.format, "parse-error", errorDetail(error), "failed");
      continue;
    }
    const source: ImportSource = {
      id: intake.sourceId,
      kind: intake.parser.kind,
      format: intake.format,
      fileName: intake.name,
      sha256: intake.sha256,
      bytes: intake.bytes.length,
      parser: `${intake.parser.id}@${intake.parser.version}`,
      ownership: intake.ownership,
      ...(intake.ownership === "own" && rightsConfirmedAt && { rightsConfirmedAt }),
    };
    const normalized = normalizeOutput(output ?? {}, source, limits);
    if (normalized.format) source.format = normalized.format;
    parsed.push({ intake, fragment: normalized.fragment, fonts: normalized.fonts });
    reports.push({ index: intake.index, name: intake.name, sourceId: intake.sourceId, status: "parsed", format: source.format, parserId: intake.parser.id });
    progress(intake.index, intake.name, "parsed");
  }

  if (parsed.some((p) => p.fonts.length > 0)) {
    const matcher = options.fonts ?? (await loadFontMatcher());
    for (const p of parsed) p.fragment.fonts = resolveFonts(p.fragment.source.id, p.fragment.source.fileName, p.fonts, matcher);
  }

  const merged = mergeFragments(parsed.map((p) => p.fragment));
  // Only a stylesheet can be an untouched shadcn/Tailwind theme; the same white in the user's tokens or DESIGN.md is theirs.
  const stylesheets = new Set(merged.sources.filter((s) => s.kind === "css").map((s) => s.id));
  const colors = merged.colors.map((c) => (stylesheets.has(c.sourceId) && isFrameworkDefault(c) ? { ...c, isFrameworkDefault: true } : c));
  const roles = colors.filter((c) => c.role && !c.overriddenBy);
  if (roles.length > 0 && !roles.some((c) => effectiveMode(c) === "dark")) warnings.push({ sourceId: "batch", code: "mode-generated", detail: "dark" });
  warnings.push(...frameworkDefaultWarnings(colors));

  const recipe = nearestRecipe(featuresFromBrand({ ...merged, colors }));
  return {
    version: 1,
    ...merged,
    files: reports.sort((a, b) => a.index - b.index),
    colors,
    warnings: [...warnings, ...merged.warnings],
    conflicts: options.logo ? findLogoConflicts(colors.filter((c) => !c.isFrameworkDefault), options.logo) : [],
    ...(recipe && { recipe }),
  };
}
