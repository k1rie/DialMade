import { parseColorWithAlpha } from "@dialmade/palette";
import type { ByteLimitKey } from "../limits";
import { clampLines, decodeText } from "../sanitize";
import type { ImportSourceKind, KnownFormat, ParserId } from "../types";
import { bmpSize, ftypBrands, gifSize, ispeSize, jpegSize, pngSize, startsWith, webpSize, type ImageSize } from "./magic";

export type FormatCategory = "text" | "image" | "font" | "document" | "archive" | "palette" | "empty" | "binary";

/** Why a recognized file has no parser: later versions, the logo flow, or never. */
export type UnsupportedReason = "v1.1" | "v2" | "logo" | "never";

export interface DetectedFormat {
  category: FormatCategory;
  format: KnownFormat;
  /** The import source kind it becomes. */
  kind?: ImportSourceKind;
  /** The parser that reads it; absent when unsupported. */
  parserId?: ParserId;
  /** 0–1: magic bytes 1, a file extension plus content ~0.9, content heuristics lower. */
  confidence: number;
  mime?: string;
  unsupported?: UnsupportedReason;
  /** Image size from the header, read before any decoding. */
  image?: ImageSize;
  /** The byte limit that applies (`IMPORT_LIMITS.bytes[limit]`). */
  limit: ByteLimitKey;
}

export interface DetectOptions {
  /** Text pasted in «Pegar colores o código» (the paste limit applies). */
  pasted?: boolean;
  /** Bytes of text the content sniffing reads. Default 256 KB. */
  sniffBytes?: number;
}

const SNIFF_BYTES = 256 * 1024;

/** `"Tokens.Resolver.JSON"` → `"json"`; `"resolver.json"` for the compound one we care about. */
export function fileExtension(name: string): string {
  const lower = name.toLowerCase();
  if (lower.endsWith(".resolver.json")) return "resolver.json";
  const dot = lower.lastIndexOf(".");
  return dot > 0 && dot >= lower.length - 11 ? lower.slice(dot + 1) : "";
}

const image = (format: KnownFormat, mime: string, size: ImageSize | undefined, parser = true): DetectedFormat => ({
  category: "image",
  format,
  mime,
  confidence: 1,
  limit: "image",
  ...(parser ? { kind: "screenshot" as const, parserId: "screenshot" as const } : { unsupported: "never" as const }),
  ...(size && { image: size }),
});

const later = (category: FormatCategory, format: KnownFormat, limit: ByteLimitKey, unsupported: UnsupportedReason, kind?: ImportSourceKind, confidence = 1): DetectedFormat => ({
  category,
  format,
  limit,
  unsupported,
  confidence,
  ...(kind && { kind }),
});

function sniffBinary(bytes: Uint8Array, ext: string): DetectedFormat | undefined {
  if (bytes.length >= 8 && bytes[0] === 0x89 && startsWith(bytes, "PNG\r\n\u001a\n", 1)) return image("png", "image/png", pngSize(bytes));
  if (bytes.length >= 3 && bytes[0] === 0xff && bytes[1] === 0xd8 && bytes[2] === 0xff) return image("jpeg", "image/jpeg", jpegSize(bytes));
  if (startsWith(bytes, "GIF87a") || startsWith(bytes, "GIF89a")) return image("gif", "image/gif", gifSize(bytes));
  if (startsWith(bytes, "RIFF") && startsWith(bytes, "WEBP", 8)) return image("webp", "image/webp", webpSize(bytes));
  const brands = ftypBrands(bytes);
  if (brands.includes("avif") || brands.includes("avis")) return image("avif", "image/avif", ispeSize(bytes));
  if (brands.some((b) => ["heic", "heix", "hevc", "heim", "heis", "mif1", "msf1"].includes(b))) {
    return image("heic", "image/heic", ispeSize(bytes), false);
  }
  if (startsWith(bytes, "BM") && ext === "bmp") return image("bmp", "image/bmp", bmpSize(bytes), false);
  if (startsWith(bytes, "%PDF-")) return later("document", "pdf", "pdf", "v1.1", "pdf");
  if (startsWith(bytes, "ASEF")) return later("palette", "ase", "palette", "v1.1", "palette-file");
  if (startsWith(bytes, "wOF2")) return later("font", "woff2", "font", "v1.1", "font-file");
  if (startsWith(bytes, "wOFF")) return later("font", "woff", "font", "v1.1", "font-file");
  if (startsWith(bytes, "OTTO")) return later("font", "otf", "font", "v1.1", "font-file");
  if (startsWith(bytes, "\u0000\u0001\u0000\u0000") || startsWith(bytes, "true") || startsWith(bytes, "ttcf")) {
    if (["ttf", "otf", "ttc", "woff", "woff2"].includes(ext) || startsWith(bytes, "\u0000\u0001\u0000\u0000")) {
      return later("font", "ttf", "font", "v1.1", "font-file");
    }
  }
  if (startsWith(bytes, "PK\u0003\u0004")) return later("archive", "zip", "pdf", "v2");
  if (ext === "aco" && bytes.length >= 2 && bytes[0] === 0 && (bytes[1] === 1 || bytes[1] === 2)) {
    return later("palette", "aco", "palette", "v1.1", "palette-file");
  }
  return undefined;
}

// Content markers. Single-pass, no nested quantifiers; they run on lines already cut to 10,000 chars.
const RE = {
  frontMatter: /^---[ \t]*\r?\n/,
  designMdKey: /^(?:colors|typography|rounded|spacing|components)[ \t]*:/m,
  resolver: /"resolutionOrder"\s*:/,
  figmaNative: /"com\.figma[\w.-]*"\s*:/,
  figmaRest: /"variableCollections"\s*:/,
  studio: /"\$themes"\s*:|"\$metadata"\s*:|"studio\.tokens"/,
  dtcgValue: /"\$value"\s*:/,
  dtcgColorSpace: /"colorSpace"\s*:/,
  legacyValue: /"value"\s*:/,
  nextFont: /from\s*["']next\/font\/(?:google|local)["']/,
  configName: /^tailwind\.config\.(?:js|cjs|mjs|ts|cts|mts)$/,
  configExport: /\bmodule\.exports\b|\bexport\s+default\b/,
  configTheme: /\btheme\s*:/,
  satisfiesConfig: /\bsatisfies\s+Config\b/,
  scssVar: /^[ \t]*\$[\w-]+[ \t]*:/m,
  gpl: /^GIMP Palette\b/,
  cssTheme: /@theme\b/,
  cssCustomProp: /(?:^|[\s{;])--[\w-]+\s*:/m,
  cssRoot: /:root\b|@tailwind\b|@import\s+["']tailwindcss/,
  compiledTailwind: /\/\*!\s*tailwindcss\s+v\d/,
  shadcnPopover: /--popover\s*:/,
  shadcnCardFg: /--card-foreground\s*:/,
  hslChannels: /(?:^|[\s{;])--[\w-]+\s*:\s*-?\d+(?:\.\d+)?(?:deg)?\s+\d+(?:\.\d+)?%\s+\d+(?:\.\d+)?%\s*[;}]/m,
  coolors: /coolors\.co\//i,
  colorToken: /#[0-9a-f]{3,8}\b|\b(?:rgba?|hsla?|hwb|lab|lch|oklab|oklch|color)\(/i,
  fontNameLine: /^["']?[\p{L}][\p{L}\p{N} '"_.,&+-]{0,120}$/u,
  fontLabel: /^(?:t[ií]tulos?|titulares?|encabezados?|headings?|headline|display|titles?|body|text|texto|cuerpo|p[aá]rrafos?|copy|ui|sans|mono|monospace|code|c[oó]digo|fuentes?|fonts?|tipograf[ií]a)\s*[:=–—]\s*/iu,
};

const text = (format: KnownFormat, parserId: ParserId, kind: ImportSourceKind, limit: ByteLimitKey, confidence: number): DetectedFormat => ({
  category: "text",
  format,
  parserId,
  kind,
  limit,
  confidence,
});

function sniffJson(sample: string, ext: string): DetectedFormat {
  const tokens = (format: KnownFormat, confidence: number) => text(format, "tokens", "tokens", "tokens", confidence);
  if (ext === "resolver.json" || RE.resolver.test(sample)) return tokens("dtcg-resolver", 0.95);
  if (RE.figmaRest.test(sample)) return later("text", "figma-rest", "tokens", "never", "tokens", 0.9);
  if (RE.figmaNative.test(sample)) return tokens("figma-native", 0.9);
  if (RE.studio.test(sample)) return tokens("tokens-studio", 0.9);
  if (RE.dtcgValue.test(sample)) return tokens(RE.dtcgColorSpace.test(sample) ? "dtcg-2025.10" : "dtcg", 0.9);
  if (RE.legacyValue.test(sample)) return tokens("style-dictionary", 0.7);
  return tokens("json", 0.3);
}

function sniffCss(sample: string): DetectedFormat {
  const css = (format: KnownFormat, confidence: number) => text(format, "css", "css", "css", confidence);
  if (RE.compiledTailwind.test(sample)) return css("css-compiled", 0.9);
  if (RE.shadcnPopover.test(sample) && RE.shadcnCardFg.test(sample)) {
    return css(RE.hslChannels.test(sample) ? "shadcn-hsl" : "shadcn-oklch", 0.95);
  }
  if (RE.cssTheme.test(sample)) return css("tailwind-v4", 0.9);
  return css("css", 0.8);
}

/** `<svg`, after an optional XML declaration, doctype and comments (scanned with indexOf, no regex). */
function isSvg(head: string): boolean {
  let rest = head;
  for (let guard = 0; guard < 64; guard++) {
    rest = rest.trimStart();
    if (rest.startsWith("<?") || rest.startsWith("<!DOCTYPE") || rest.startsWith("<!doctype")) {
      const end = rest.indexOf(">");
      if (end < 0) return false;
      rest = rest.slice(end + 1);
    } else if (rest.startsWith("<!--")) {
      const end = rest.indexOf("-->");
      if (end < 0) return false;
      rest = rest.slice(end + 3);
    } else {
      return /^<svg[\s>/]/i.test(rest);
    }
  }
  return false;
}

/** culori reads `bad`, `fade` or `600` as hex without `#`: a bare hex word is never a color. */
const BARE_HEX = /^[0-9a-f]+$/i;

/** A line that is a whole CSS color (`red`, `rgb(…)`); words that only look like hex do not count. */
function isColorLine(line: string): boolean {
  const value = line.trim();
  return value.length > 0 && value.length <= 256 && !BARE_HEX.test(value) && parseColorWithAlpha(value) !== null;
}

function looksLikeFontList(lines: string[]): boolean {
  const filled = lines.map((line) => line.trim()).filter(Boolean);
  if (filled.length === 0 || filled.length > 20) return false;
  return filled.every((line) => {
    const name = line.replace(RE.fontLabel, "");
    return RE.fontNameLine.test(name) && !name.split(",").some(isColorLine);
  });
}

/** Classifies decoded text (the file name and extension help but never override clear content). */
export function sniffText(sample: string, name: string, options: DetectOptions = {}): DetectedFormat {
  const ext = fileExtension(name);
  const lower = name.toLowerCase();
  const body = clampLines(sample).text;
  const head = body.trimStart();
  if (head.length === 0) return { category: "empty", format: "empty", confidence: 1, limit: "text" };

  if (ext === "json" || ext === "resolver.json" || head.startsWith("{") || head.startsWith("[")) return sniffJson(head, ext);
  if (RE.frontMatter.test(head) || ext === "md" || ext === "markdown") {
    const designMd = RE.frontMatter.test(head) && RE.designMdKey.test(head);
    return text(designMd ? "design-md" : "markdown", "design-md", "design-md", "designMd", designMd ? 0.95 : 0.5);
  }
  if (RE.gpl.test(head)) return later("palette", "gpl", "palette", "v1.1", "palette-file");
  if (isSvg(head)) return { category: "image", format: "svg", mime: "image/svg+xml", confidence: 0.95, limit: "image", unsupported: "logo" };
  if (RE.nextFont.test(body)) return text("next-font", "fonts", "font-name", "paste", 0.9);
  if (RE.configName.test(lower) || RE.satisfiesConfig.test(body) || (RE.configExport.test(body) && RE.configTheme.test(body))) {
    return later("text", "tailwind-config", "config", "v1.1", "tailwind-config", 0.9);
  }
  if (["scss", "sass", "less"].includes(ext) || (ext !== "css" && RE.scssVar.test(body) && !RE.cssCustomProp.test(body))) {
    return later("text", "scss", "css", "v1.1", "scss", 0.8);
  }
  if (ext === "css" || RE.cssTheme.test(body) || RE.cssCustomProp.test(body) || RE.cssRoot.test(body)) return sniffCss(body);

  const paste = (format: KnownFormat, confidence: number) => text(format, "paste", "paste", options.pasted ? "paste" : "text", confidence);
  if (RE.coolors.test(body)) return paste("coolors", 0.95);
  if (RE.colorToken.test(body)) return paste("color-list", 0.85);
  const lines = body.split(/\r?\n/, 21);
  if (lines.some(isColorLine)) return paste("color-list", 0.7);
  if (looksLikeFontList(lines)) return text("font-names", "fonts", "font-name", options.pasted ? "paste" : "text", 0.5);
  return paste("text", 0.2);
}

/**
 * What a file is, from its magic bytes first and its content second (docs/design/importar-guia-spec.md
 * §6). Never throws. Text is only sniffed from the first 256 KB.
 */
export function detectFormat(bytes: Uint8Array, name: string, options: DetectOptions = {}): DetectedFormat {
  if (bytes.length === 0) return { category: "empty", format: "empty", confidence: 1, limit: "text" };
  const ext = fileExtension(name);
  const binary = sniffBinary(bytes, ext);
  if (binary) return binary;
  const sample = decodeText(bytes.subarray(0, options.sniffBytes ?? SNIFF_BYTES));
  if (!sample) return { category: "binary", format: "binary", confidence: 0.5, limit: "text", unsupported: "never" };
  const detected = sniffText(sample.text, name, options);
  return options.pasted ? { ...detected, limit: "paste" } : detected;
}
