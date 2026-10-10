export { iconSvg, placeholderSvg } from "./assets";
export { contrastIssues, fixContrast, themeColorsFromVars, type ContrastIssue, type ContrastMode, type ContrastResult, type ThemeColors } from "./contrast";
export {
  AXIS_GLOSSARY,
  CHIP_AXES,
  MOVES,
  RECIPE_EXCLUSIONS,
  defaultPick,
  directionCandidates,
  hash32,
  newSeed,
  prng,
  type DirectionCandidates,
} from "./direction";
export {
  APP_HEIGHT_TOLERANCE,
  DEVICES,
  StructureTracker,
  extraGateWarnings,
  fixHeadings,
  foreignScript,
  missingFocusIndicators,
  newContacts,
  offDirection,
  responsiveGate,
  snippet,
  structureGate,
  styleFingerprint,
  warning,
  type Device,
  type DeviceMeasure,
  type StructureVerdict,
} from "./gates";
export {
  CONTAINER_TYPES,
  KIT_TYPES,
  blockInput,
  brandInput,
  draftTexts,
  h1BlockOf,
  renderableBlocks,
  screenInput,
  type ScreenInputOptions,
} from "./input";
export { MAX_DROPPED_CLASS_RATIO, blockBasis, processBlock, type BlockContext, type ProcessedBlock } from "./pipeline";
export {
  AI_RENDER_PROMPT_VERSION,
  AI_RENDER_SYSTEM_PROMPT,
  BLOCK_MAX_TOKENS,
  DIRECTION_MAX_TOKENS,
  MAX_SCREEN_BYTES,
  SCREEN_MAX_TOKENS,
  artDirectionText,
  axesLine,
  blockMessage,
  directionMessage,
  directionSchema,
  jsonData,
  manualPrompt,
  screenMessage,
  type BlockActionInput,
  type DirectionForPrompt,
  type MessageContent,
  type RenderBlockInput,
  type RenderBrandInput,
  type RenderScreenInput,
} from "./prompt";
export {
  ALLOWED_TAGS,
  BLOCK_LIMITS,
  FALLBACK_ICON,
  PLACEHOLDER_KINDS,
  ROOT_TAGS,
  droppedClassRatio,
  sanitizeBlock,
  sanitizeSurfaceClasses,
  type SanitizeContext,
  type SanitizeFailure,
  type SanitizeReport,
  type SanitizeResult,
} from "./sanitize";
export { BlockStreamParser, blockIdOfTag, splitBlocks, type StreamBlock } from "./stream";
export { exportThemeCss, themeBlock } from "./theme";
export { attr, elements, parseSanitized, serialize, textOf, type AiElement, type AiNode, type AiText } from "./tree";
export { checkClass, colorOfClass, splitClass, type ClassCheck, type ClassRejection } from "./vocabulary";
export { exportBlockHtml, inlineAssets, provenanceComment, type ExportBlockOptions, type InlineAssetsOptions } from "./export";
export { blockToTsx, componentName, tsxAssetsModule, type TsxOptions } from "./tsx";
