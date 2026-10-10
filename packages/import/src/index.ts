export const IMPORT_VERSION = "0.1.0";

export type * from "./types";

export { IMPORT_LIMITS, resolveLimits, type ByteLimitKey, type ImportLimits, type ImportLimitsInput } from "./limits";

export {
  ImportAbortedError,
  importBatch,
  normalizeOutput,
  resolveFonts,
  type ImportBatchOptions,
  type ImportFile,
  type ImportProgress,
  type NormalizedOutput,
} from "./batch";

export {
  createRegistry,
  detectedBy,
  notImplemented,
  type AbortSignalLike,
  type BatchFile,
  type DecodeImageRequest,
  type DecodedImage,
  type FileRole,
  type ImageDecoder,
  type Parser,
  type ParserContext,
  type ParserInput,
  type ParserMatch,
  type ParserRegistry,
  type SniffedFile,
} from "./registry";
export {
  aggregateScreenshots,
  cssParser,
  defaultParsers,
  designMdParser,
  fontsParser,
  pasteParser,
  screenshotParser,
  tokensParser,
  type ScreenshotConsensus,
  type ScreenshotVote,
} from "./parsers";

export {
  applyImport,
  defaultSelection,
  editedFont,
  fontToken,
  typeStepFor,
  type ApplyImportOptions,
  type DetectionEdit,
  type ImportPatchResult,
  type ImportSelection,
  type SkipReason,
  type SkippedDetection,
} from "./apply";

export {
  bmpSize,
  detectFormat,
  fileExtension,
  gifSize,
  ispeSize,
  jpegSize,
  pngSize,
  sniffText,
  webpSize,
  type DetectOptions,
  type DetectedFormat,
  type FormatCategory,
  type ImageSize,
  type UnsupportedReason,
} from "./detect";

export {
  cleanMultiline,
  cleanName,
  cleanText,
  clampLines,
  decodeText,
  isDangerousKey,
  isJsonObject,
  jsonDepth,
  jsonPointerLocator,
  lineAt,
  looksBinary,
  nullRecord,
  own,
  parseJsonSafe,
  splitLines,
  toIdentifier,
  toSafeJson,
  walkJson,
  type ClampedText,
  type Cleaned,
  type DecodedText,
  type JsonIssue,
  type JsonObject,
  type JsonPath,
  type JsonValue,
  type SafeJsonOptions,
  type SafeJsonResult,
} from "./sanitize";

export {
  detectVocabulary,
  mapRoleName,
  modeFromName,
  modeFromSelector,
  normalizeTokenName,
  parseScaleName,
  scaleSystem,
  type RoleContext,
  type RoleMatch,
  type ScaleSystem,
  type TokenName,
  type Vocabulary,
} from "./roles";

export { unresolvedCode } from "./batch/normalize";

export {
  DEFAULT_MATCH_DELTA_E,
  SHADCN_BASE,
  SHADCN_BASE_COLORS,
  TAILWIND_THEME_VARS,
  TAILWIND_VERSION,
  frameworkDefaultWarnings,
  isFrameworkDefault,
  isShadcnDefault,
  isTailwindDefaultVar,
  matchTailwindColor,
  shadcnBaseRefs,
  tailwindDefaultColor,
  type DefaultCandidate,
  type ShadcnBaseColor,
} from "./defaults";

export {
  AI_RANK,
  CONFLICT_DELTA_E,
  KIND_RANK,
  MERGE_DELTA_E,
  effectiveMode,
  findLogoConflicts,
  guideColor,
  mergeColors,
  mergeFonts,
  mergeFragments,
  worseConfidence,
  type MergedBrand,
  type SourceFragment,
} from "./merge";

export { DENSITY_DIAL, attachFingerprint, detachFingerprint, type AiFingerprint } from "./fingerprint";

export { RECIPE_CLOSE_DISTANCE, classifyShadow, featuresFromBrand, nearestRecipe, type RecipeFeatures } from "./recipe";

export {
  GENERIC_FAMILIES,
  familyKey,
  isPlatformFamily,
  isSystemFamily,
  loadFontMatcher,
  readNextFonts,
  splitFontStack,
  type FontMatcher,
  type NextFontDeclaration,
  type ResolvedFontStack,
} from "./fonts";

export {
  ACHROMATIC_CHROMA,
  deltaE,
  hueDelta,
  normalizeColor,
  oklabOf,
  tokenColor,
  type ColorProblem,
  type NormalizeResult,
  type NormalizedColor,
} from "./color";

export { sha256Hex, sha256HexSync } from "./hash";
