export const ENGINE_VERSION = "0.1.0";

export {
  compositeOver,
  contrastRatio,
  deltaEOK,
  formatOklch,
  hexToOklch,
  maxChroma,
  oklchToHex,
  parseColor,
  parseColorWithAlpha,
  splitAlpha,
  type Oklab,
  type Oklch,
} from "./color";
export { parseSvgColors } from "./svg";
export {
  extractFromPixels,
  type ExtractMethod,
  type ExtractOptions,
  type ExtractResult,
  type Swatch,
} from "./extract";
export {
  SCALE_STEPS,
  buildNeutralScale,
  buildScale,
  type BuildScaleOptions,
  type ScaleStep,
  type ScaleStepNumber,
} from "./scale";
export {
  PALETTE_STYLES,
  PALETTE_STYLE_IDS,
  type ColorMode,
  type LocalizedText,
  type PaletteStyle,
  type PaletteStyleId,
} from "./styles";
export {
  CONTRAST_PAIRS,
  TEXT_CONTRAST,
  UI_CONTRAST,
  generateTheme,
  type ContrastCheck,
  type ContrastSource,
  type GenerateThemeInput,
  type RoleKey,
  type Theme,
  type ThemePins,
  type ThemeRoles,
  type ThemeScales,
} from "./theme";
export {
  DTCG_EXTENSION,
  ROLE_KEYS,
  cssVarName,
  scaleGroups,
  toCssVarRecord,
  toCssVars,
  toDTCG,
  toFigmaTokens,
  toGlobalsCss,
  toTailwindTheme,
  type CssColorFormat,
  type DtcgColorToken,
  type DtcgDocument,
  type DtcgOklchValue,
  type DtcgSrgbValue,
  type FigmaTokensDocument,
} from "./exporters";
