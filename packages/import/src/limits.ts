const MB = 1024 * 1024;
const KB = 1024;

/** Hard limits of an import (docs/design/importar-guia.md). Everything runs in a worker with these caps. */
export interface ImportLimits {
  /** Files per batch. */
  maxFiles: number;
  /** Images per batch. */
  maxImages: number;
  /** Maximum bytes per input kind. Anything pasted is capped at `paste`. */
  bytes: {
    tokens: number;
    css: number;
    paste: number;
    designMd: number;
    config: number;
    palette: number;
    image: number;
    pdf: number;
    font: number;
    /** Any other text the detector cannot place. */
    text: number;
  };
  /** Read from the image header before decoding. */
  maxMegapixels: number;
  /** Long side screenshots are reduced to before extracting color. */
  imageDownscalePx: number;
  tokens: {
    maxTokens: number;
    maxDepth: number;
    maxAliasHops: number;
  };
  /** JSON nodes a parse may build (bounds memory before token counting). */
  maxJsonNodes: number;
  /** `var()` hops inside a batch. */
  maxVarHops: number;
  maxPaletteColors: number;
  yamlMaxAliasCount: number;
  /** Lines are cut to this before any regex runs. */
  maxLineLength: number;
  /** Names (files, variables, families) are cut to this after removing control and bidi characters. */
  maxNameLength: number;
  timeoutMs: number;
  pdfTimeoutMs: number;
  /** What may be sent to the vision AI. */
  ai: {
    maxImages: number;
    maxSidePx: number;
    fallbackSidePx: number;
    maxImageBytes: number;
    maxRequestBytes: number;
    jpegQuality: number;
  };
}

export const IMPORT_LIMITS: Readonly<ImportLimits> = Object.freeze({
  maxFiles: 20,
  maxImages: 12,
  bytes: Object.freeze({
    tokens: 5 * MB,
    css: 5 * MB,
    paste: 1 * MB,
    designMd: 1 * MB,
    config: 256 * KB,
    palette: 2 * MB,
    image: 10 * MB,
    pdf: 50 * MB,
    font: 10 * MB,
    text: 1 * MB,
  }),
  maxMegapixels: 50,
  imageDownscalePx: 1600,
  tokens: Object.freeze({ maxTokens: 20_000, maxDepth: 64, maxAliasHops: 32 }),
  maxJsonNodes: 200_000,
  maxVarHops: 32,
  maxPaletteColors: 2000,
  yamlMaxAliasCount: 50,
  maxLineLength: 10_000,
  maxNameLength: 64,
  timeoutMs: 15_000,
  pdfTimeoutMs: 60_000,
  ai: Object.freeze({
    maxImages: 4,
    maxSidePx: 1280,
    fallbackSidePx: 1024,
    maxImageBytes: 900 * KB,
    maxRequestBytes: 3.5 * MB,
    jpegQuality: 0.85,
  }),
});

export type ImportLimitsInput = Partial<Omit<ImportLimits, "bytes" | "tokens" | "ai">> & {
  bytes?: Partial<ImportLimits["bytes"]>;
  tokens?: Partial<ImportLimits["tokens"]>;
  ai?: Partial<ImportLimits["ai"]>;
};

/** Defaults with overrides (tests and tighter hosts). */
export function resolveLimits(overrides: ImportLimitsInput = {}): ImportLimits {
  return {
    ...IMPORT_LIMITS,
    ...overrides,
    bytes: { ...IMPORT_LIMITS.bytes, ...overrides.bytes },
    tokens: { ...IMPORT_LIMITS.tokens, ...overrides.tokens },
    ai: { ...IMPORT_LIMITS.ai, ...overrides.ai },
  };
}

export type ByteLimitKey = keyof ImportLimits["bytes"];
