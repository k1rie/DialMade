import { IMPORT_LIMITS } from "../../limits";
import type { DecodedImage, ParserContext, ParserInput } from "../../registry";
import type { ParsedColor, ParseOutput, RoleKey } from "../../types";
import { analyzeScreenshot, distinctColors, type ScreenshotAnalysis } from "./analyze";
import { BRAND_BACKGROUND_C, DARK_L, LIGHT_L } from "./constants";
import { castBatchVote, type ScreenshotVote } from "./consensus";

type Warning = NonNullable<ParseOutput["warnings"]>[number];

const MIME: Readonly<Record<string, string>> = {
  png: "image/png",
  jpeg: "image/jpeg",
  webp: "image/webp",
  gif: "image/gif",
  avif: "image/avif",
  bmp: "image/bmp",
};

const positive = (n: unknown): n is number => typeof n === "number" && Number.isFinite(n) && n > 0;

const errorDetail = (error: unknown) => (error instanceof Error ? `${error.name}: ${error.message}` : String(error));

/**
 * Roles are suggestions (always `low`): when the background's lightness matches the mode, the
 * background, the text color and the accent as `primary`; with a mid-lightness colored background,
 * that color is the brand (`primary`) and a distinct accent the `cta`.
 */
function roleSuggestions(a: ScreenshotAnalysis): Map<string, RoleKey> {
  const roles = new Map<string, RoleKey>();
  const l = a.background.oklch.l;
  const pageBackground = (a.mode === "light" && l > LIGHT_L) || (a.mode === "dark" && l < DARK_L);
  const brandBackground = !pageBackground && a.background.oklch.c >= BRAND_BACKGROUND_C;
  if (pageBackground) {
    roles.set(a.background.hex, "background");
    if (a.foreground) roles.set(a.foreground.hex, "foreground");
  }
  if (brandBackground) roles.set(a.background.hex, "primary");
  if (a.accent && !roles.has(a.accent.hex)) {
    if (!brandBackground) roles.set(a.accent.hex, "primary");
    else if (distinctColors(a.background.oklch, a.accent.oklch)) roles.set(a.accent.hex, "cta");
  }
  return roles;
}

function validImage(image: DecodedImage | undefined): image is DecodedImage {
  return (
    image !== undefined &&
    Number.isInteger(image.width) &&
    Number.isInteger(image.height) &&
    image.width > 0 &&
    image.height > 0 &&
    (image.data instanceof Uint8ClampedArray || image.data instanceof Uint8Array) &&
    image.data.length >= image.width * image.height * 4
  );
}

async function read(input: ParserInput, ctx: ParserContext): Promise<{ output: ParseOutput; vote?: ScreenshotVote }> {
  if (ctx.signal?.aborted) return { output: {} };
  const decode = ctx.decodeImage;
  if (!decode) return { output: { warnings: [{ code: "image-decoder-missing" }] } };

  const maxSide = positive(ctx.limits?.imageDownscalePx) ? ctx.limits.imageDownscalePx : IMPORT_LIMITS.imageDownscalePx;
  const maxPixels = (positive(ctx.limits?.maxMegapixels) ? ctx.limits.maxMegapixels : IMPORT_LIMITS.maxMegapixels) * 1e6;
  const mime = input.detected.mime ?? MIME[input.format] ?? "application/octet-stream";

  let image: DecodedImage | undefined;
  try {
    image = await decode({ bytes: input.bytes, mime, maxSide, maxPixels });
  } catch (error) {
    return { output: { warnings: [{ code: "image-decode-failed", detail: errorDetail(error) }] } };
  }
  if (ctx.signal?.aborted) return { output: {} };
  if (!validImage(image)) return { output: { warnings: [{ code: "image-decode-failed", detail: "invalid pixel buffer" }] } };
  if (image.width * image.height > maxPixels) return { output: { warnings: [{ code: "image-too-large", detail: `${image.width}×${image.height}` }] } };

  const analysis = analyzeScreenshot(image.data, image.width, image.height);
  if (!analysis) return { output: { warnings: [{ code: "screenshot-transparent" }] } };

  const warnings: Warning[] = [];
  if (analysis.photo) warnings.push({ code: "screenshot-photo", detail: `top16 ${analysis.shares.top16}` });

  const mode = analysis.mode === "ambiguous" ? undefined : analysis.mode;
  const roles = roleSuggestions(analysis);
  const colors: ParsedColor[] = analysis.swatches.map((s, i) => {
    const role = roles.get(s.hex);
    return {
      value: s.hex,
      locator: `${input.name} · pixel #${i}`,
      confidence: "low",
      method: "pixel",
      ...(mode && { mode }),
      ...(role && { role }),
    };
  });

  const size = input.detected.image ?? { width: image.width, height: image.height };
  const summary = {
    width: size.width,
    height: size.height,
    mode: analysis.mode,
    neutralTint: analysis.neutralTint,
    vibrancy: analysis.vibrancy,
    swatches: analysis.swatches.map((s) => s.hex),
    ...(analysis.accent && { accentCandidate: analysis.accent.hex }),
  };
  return { output: { colors, screenshot: summary, ...(warnings.length > 0 && { warnings }) }, vote: summary };
}

/**
 * A screenshot of an interface → swatches (exact pixel colors, `method: "pixel"`, `confidence: "low"`),
 * role suggestions that are never pre-selected, and the summary for «Esto detectamos» (mode, gray
 * tint, vibrancy, accent candidate). Decoding is the host's (`ctx.decodeImage`, reduced to 1600 px).
 * When the batch has several screenshots, the last one to finish also reports how much they agree.
 * Never throws: problems come back as warnings.
 */
export async function parse(input: ParserInput, ctx: ParserContext): Promise<ParseOutput> {
  let result: { output: ParseOutput; vote?: ScreenshotVote };
  try {
    result = await read(input, ctx);
  } catch (error) {
    result = { output: { warnings: [{ code: "image-decode-failed", detail: errorDetail(error) }] } };
  }
  if (ctx.signal?.aborted) return result.output;
  const consensus = Array.isArray(ctx.batch) ? castBatchVote(ctx.batch, input.sourceId, { vote: result.vote ?? null, reference: input.role === "reference" }) : null;
  if (!consensus || consensus.warnings.length === 0) return result.output;
  return { ...result.output, warnings: [...(result.output.warnings ?? []), ...consensus.warnings] };
}
