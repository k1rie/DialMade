import type { Parser } from "../registry";
import { cssParser } from "./css";
import { designMdParser } from "./design-md";
import { fontsParser } from "./fonts";
import { pasteParser } from "./paste";
import { screenshotParser } from "./screenshot";
import { tokensParser } from "./tokens";

export { cssParser, designMdParser, fontsParser, pasteParser, screenshotParser, tokensParser };
export { aggregateScreenshots, type ScreenshotConsensus, type ScreenshotVote } from "./screenshot";

/** The v1 parsers, in registration order (ties go to the earlier one). */
export const defaultParsers: readonly Parser[] = [tokensParser, cssParser, designMdParser, pasteParser, fontsParser, screenshotParser];
