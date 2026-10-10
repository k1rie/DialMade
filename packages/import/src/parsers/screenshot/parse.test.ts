import { createDesignDoc } from "@dialmade/doc";
import { generateTheme, hexToOklch } from "@dialmade/palette";
import { describe, expect, it } from "vitest";
import { applyImport, defaultSelection } from "../../apply";
import { importBatch } from "../../batch";
import { deltaE } from "../../color";
import { detectFormat } from "../../detect";
import { IMPORT_LIMITS, resolveLimits } from "../../limits";
import type { BatchFile, DecodeImageRequest, ImageDecoder, ParserContext, ParserInput, SniffedFile } from "../../registry";
import { pngHeader, utf8 } from "../../testing/fakes";
import type { ParseOutput } from "../../types";
import { analyzeScreenshot } from "./analyze";
import { brandBackgroundApp, darkApp, GRAY, lightApp, NIMBO, SLATE } from "./fixtures/apps";
import { canvas, countColor, frame, rect, textLines, windowCapture, withNoise, type Pixels } from "./fixtures/canvas";
import { screenshotParser } from "./index";
import { parse } from "./parse";

const NOW = "2026-10-10T09:00:00.000Z";

const sniff = (bytes: Uint8Array, name: string): SniffedFile => ({ name, extension: name.split(".").pop() ?? "", bytes, detected: detectFormat(bytes, name), pasted: false });

/** PNG header bytes (for detection and the size) plus a tag byte so every fixture hashes differently. */
const pngFor = (p: Pixels, tag: number) => new Uint8Array([...pngHeader(p.width, p.height), tag]);

function decoderOf(images: readonly Pixels[], seen: DecodeImageRequest[] = []): ImageDecoder {
  return async (request) => {
    seen.push(request);
    const p = images[request.bytes[request.bytes.length - 1]!];
    if (!p) throw new Error("unknown image");
    return { data: p.data, width: p.width, height: p.height };
  };
}

function inputFor(p: Pixels, tag = 0, extra: Partial<ParserInput> = {}): ParserInput {
  const bytes = pngFor(p, tag);
  const file = sniff(bytes, extra.name ?? "app.png");
  return { ...file, sourceId: `screenshot-000000000${tag}`, format: file.detected.format, ownership: "own", ...extra };
}

const ctxFor = (decodeImage?: ImageDecoder, extra: Partial<ParserContext> = {}): ParserContext => ({ limits: IMPORT_LIMITS, batch: [], ...(decodeImage && { decodeImage }), ...extra });

async function parsePixels(p: Pixels, name = "app.png"): Promise<ParseOutput> {
  return parse(inputFor(p, 0, { name }), ctxFor(decoderOf([p])));
}

const roleOf = (out: ParseOutput, role: string) => out.colors?.find((c) => c.role === role);

// Registration contract.
describe("screenshot parser", () => {
  it("claims its format and nothing else", () => {
    expect(screenshotParser.id).toBe("screenshot");
    expect(screenshotParser.version).toBe("1.0.0");
    expect(screenshotParser.detect(sniff(pngHeader(1280, 800), "app.png"))).toMatchObject({ format: "png" });
    const claimed = [utf8("%PDF-1.7"), pngHeader(10, 10), utf8(":root{--a:#fff}"), utf8('{"a":{"$value":"#fff"}}'), utf8("Inter\nGeist Mono")].filter((bytes) => screenshotParser.detect(sniff(bytes, "x")) !== null);
    expect(claimed.length).toBeLessThanOrEqual(1);
  });

  it("loads its parse step lazily and never throws on empty input", async () => {
    const file = sniff(utf8(" "), "empty.txt");
    const output = await screenshotParser.parse({ ...file, sourceId: "s-1", format: "x", ownership: "own" }, { limits: {} as never, batch: [] });
    expect(output).toBeTypeOf("object");
  });
});

describe("screenshot parser · fixtures", () => {
  it("light app: white page, slate text, and a 1 % CTA that wins the accent over a more saturated 0.1 % dot", async () => {
    const p = lightApp();
    expect(countColor(p, NIMBO.violet) / (p.width * p.height)).toBeCloseTo(0.0098, 4);
    expect(hexToOklch(NIMBO.dot)!.c).toBeGreaterThan(hexToOklch(NIMBO.violet)!.c);

    const a = analyzeScreenshot(p.data, p.width, p.height)!;
    expect(a).toMatchObject({ mode: "light", backgroundFrom: "border", photo: false });
    expect(a.background.hex).toBe("#ffffff");
    expect(a.foreground?.hex).toBe(SLATE[900]);
    expect(a.accent).toMatchObject({ hex: NIMBO.violet, share: expect.closeTo(0.0098, 3) });
    expect(a.swatches.map((s) => s.hex)).not.toContain(NIMBO.dot);
    expect(a.neutralTint.h).toBeGreaterThan(235);
    expect(a.neutralTint.h).toBeLessThan(275);
    expect(a.neutralTint.c).toBeGreaterThan(0.005);
    expect(a.vibrancy.c).toBeCloseTo(0.2, 1);

    const out = await parsePixels(p);
    expect(out.screenshot).toMatchObject({ width: 400, height: 250, mode: "light", accentCandidate: NIMBO.violet });
    expect(out.screenshot!.swatches[0]).toBe("#ffffff");
    expect(out.screenshot!.swatches.length).toBeLessThanOrEqual(12);
    expect(roleOf(out, "background")).toMatchObject({ value: "#ffffff", mode: "light", confidence: "low", method: "pixel" });
    expect(roleOf(out, "foreground")).toMatchObject({ value: SLATE[900], mode: "light" });
    expect(roleOf(out, "primary")).toMatchObject({ value: NIMBO.violet, mode: "light", locator: expect.stringMatching(/^app\.png · pixel #\d+$/) });
    expect(out.colors!.every((c) => c.confidence === "low" && c.method === "pixel")).toBe(true);
    expect(out.colors!.map((c) => c.value)).toEqual(out.screenshot!.swatches);
    expect(out.warnings).toBeUndefined();
  });

  it("dark app: near-black page, light text, emerald accent and pure-gray neutrals", async () => {
    const p = darkApp();
    const a = analyzeScreenshot(p.data, p.width, p.height)!;
    expect(a).toMatchObject({ mode: "dark", neutralTint: { h: 0, c: 0 } });
    expect(a.background.hex).toBe(GRAY[950]);
    expect(a.foreground?.hex).toBe(GRAY[50]);
    expect(a.accent?.hex).toBe(NIMBO.emerald);
    expect(a.shares.dark).toBeGreaterThan(0.9);

    const out = await parsePixels(p);
    expect(roleOf(out, "background")).toMatchObject({ value: GRAY[950], mode: "dark" });
    expect(roleOf(out, "foreground")).toMatchObject({ value: GRAY[50], mode: "dark" });
    expect(roleOf(out, "primary")).toMatchObject({ value: NIMBO.emerald, mode: "dark" });
    expect(out.colors!.every((c) => c.mode === "dark")).toBe(true);
  });

  it("brand-colored background: kept as a swatch, read as the brand (primary) with the yellow CTA; mode ambiguous", async () => {
    const p = brandBackgroundApp();
    const a = analyzeScreenshot(p.data, p.width, p.height)!;
    expect(a).toMatchObject({ mode: "ambiguous", backgroundFrom: "border" });
    expect(a.background.hex).toBe(NIMBO.violet);
    expect(a.background.share).toBeGreaterThan(0.7);
    expect(a.accent?.hex).toBe(NIMBO.yellow);
    expect(a.neutralTint.h).toBeGreaterThan(270);
    expect(a.neutralTint.h).toBeLessThan(300);

    const out = await parsePixels(p);
    expect(out.screenshot).toMatchObject({ mode: "ambiguous", accentCandidate: NIMBO.yellow });
    expect(out.screenshot!.swatches).toContain(NIMBO.violet);
    expect(roleOf(out, "primary")).toMatchObject({ value: NIMBO.violet, confidence: "low" });
    expect(roleOf(out, "cta")).toMatchObject({ value: NIMBO.yellow, confidence: "low" });
    expect(roleOf(out, "background")).toBeUndefined();
    expect(roleOf(out, "foreground")).toBeUndefined();
    expect(out.colors!.some((c) => c.mode)).toBe(false);
  });

  it("a brand-colored frame around a light app: light by pixel majority, the frame is the brand, not the page", async () => {
    const p = canvas(400, 250, NIMBO.violet);
    rect(p, 16, 16, 368, 218, "#ffffff");
    textLines(p, 40, 40, [220, 200, 236, 180, 210], SLATE[900]);
    const out = await parsePixels(p, "framed.png");
    expect(out.screenshot?.mode).toBe("light");
    expect(roleOf(out, "primary")).toMatchObject({ value: NIMBO.violet, mode: "light" });
    expect(roleOf(out, "background")).toBeUndefined();
    expect(roleOf(out, "foreground")).toBeUndefined();
  });
});

describe("screenshot parser · real-world pixels", () => {
  it("survives JPEG-like noise", () => {
    const a = analyzeScreenshot(withNoise(lightApp(), 2).data, 400, 250)!;
    expect(a.mode).toBe("light");
    expect(deltaE(a.background.hex, "#ffffff")).toBeLessThan(0.02);
    expect(a.accent && deltaE(a.accent.hex, NIMBO.violet)).toBeLessThan(0.03);
    expect(a.foreground && deltaE(a.foreground.hex, SLATE[900])).toBeLessThan(0.03);
  });

  it("crops a window capture's transparent margin and ignores its shadow", () => {
    const p = windowCapture(lightApp(), 24);
    const a = analyzeScreenshot(p.data, p.width, p.height)!;
    expect(a.region).toEqual({ x: 24, y: 24, width: 400, height: 250 });
    expect(a).toMatchObject({ mode: "light", backgroundFrom: "border" });
    expect(a.background.hex).toBe("#ffffff");
    expect(a.accent?.hex).toBe(NIMBO.violet);
    expect(a.swatches.every((s) => s.oklch.l > 0.15)).toBe(true);
  });

  it("accepts Uint8Array pixels and flags photo-like images", async () => {
    const p = lightApp();
    expect(analyzeScreenshot(new Uint8Array(p.data.buffer), p.width, p.height)!.accent?.hex).toBe(NIMBO.violet);
    const photo = withNoise(canvas(200, 120, "#808080"), 40);
    const out = await parsePixels(photo, "photo.png");
    expect(out.warnings).toContainEqual({ code: "screenshot-photo", detail: expect.stringMatching(/^top16 /) });
  });

  it("splits a half-light, half-dark capture as ambiguous", () => {
    const p = canvas(400, 250, "#ffffff");
    rect(p, 0, 0, 190, 250, GRAY[950]);
    textLines(p, 220, 30, [120, 140, 100], SLATE[900]);
    textLines(p, 20, 30, [120, 140, 100], GRAY[50]);
    expect(analyzeScreenshot(p.data, p.width, p.height)!.mode).toBe("ambiguous");
  });

  it("round-trips a theme from our engine: painted roles come back as the same roles (ΔEok < 0.001)", async () => {
    const theme = generateTheme({ primary: NIMBO.violet });
    for (const mode of ["light", "dark"] as const) {
      const roles = theme[mode];
      const p = canvas(400, 250, roles.background);
      rect(p, 0, 0, 72, 250, roles.card);
      frame(p, 96, 30, 280, 170, roles.border);
      textLines(p, 112, 48, [220, 200, 236, 180, 210, 224, 190, 236, 160, 200], roles.foreground);
      rect(p, 300, 212, 52, 20, roles.primary);
      rect(p, 312, 221, 28, 2, roles.primaryForeground);
      const out = await parsePixels(p, `${mode}.png`);
      expect(out.screenshot?.mode).toBe(mode);
      for (const role of ["background", "foreground", "primary"] as const) {
        const got = roleOf(out, role);
        expect(got, `${mode} ${role}`).toMatchObject({ mode, confidence: "low" });
        expect(deltaE(got!.value, roles[role])).toBeLessThan(0.001);
      }
    }
  });
});

describe("screenshot parser · failures are warnings", () => {
  it("asks the host for a decoder at 1600 px / 50 MP with the file's mime", async () => {
    const seen: DecodeImageRequest[] = [];
    await parse(inputFor(lightApp()), ctxFor(decoderOf([lightApp()], seen)));
    expect(seen).toHaveLength(1);
    expect(seen[0]).toMatchObject({ mime: "image/png", maxSide: 1600, maxPixels: 50e6 });
  });

  it("reports a missing decoder, a failed decode, a bad buffer, an oversized result and a transparent image", async () => {
    const p = lightApp();
    expect(await parse(inputFor(p), ctxFor())).toEqual({ warnings: [{ code: "image-decoder-missing" }] });
    const boom: ImageDecoder = async () => {
      throw new TypeError("not an image");
    };
    expect(await parse(inputFor(p), ctxFor(boom))).toEqual({ warnings: [{ code: "image-decode-failed", detail: "TypeError: not an image" }] });
    const short: ImageDecoder = async () => ({ data: new Uint8ClampedArray(16), width: 400, height: 250 });
    expect((await parse(inputFor(p), ctxFor(short))).warnings).toEqual([{ code: "image-decode-failed", detail: "invalid pixel buffer" }]);
    const tight = ctxFor(decoderOf([p]), { limits: resolveLimits({ maxMegapixels: 0.01 }) });
    expect((await parse(inputFor(p), tight)).warnings).toEqual([{ code: "image-too-large", detail: "400×250" }]);
    const clear = canvas(40, 40);
    expect(await parse(inputFor(clear), ctxFor(decoderOf([clear])))).toEqual({ warnings: [{ code: "screenshot-transparent" }] });
  });

  it("stops before decoding when the batch is cancelled", async () => {
    const seen: DecodeImageRequest[] = [];
    expect(await parse(inputFor(lightApp()), ctxFor(decoderOf([lightApp()], seen), { signal: { aborted: true } }))).toEqual({});
    expect(seen).toHaveLength(0);
  });
});

describe("screenshot parser · several screenshots", () => {
  const images = [lightApp(), darkApp(), brandBackgroundApp(), withNoise(lightApp(), 1)];
  const files = (tags: number[], role?: "reference") => tags.map((tag, i) => ({ name: `captura-${i + 1}.png`, bytes: pngFor(images[tag]!, tag), ...(role && i === tags.length - 1 && { role }) }));

  it("imports each screenshot and the last one reports where they disagree", async () => {
    const brand = await importBatch(files([0, 1, 2]), { ownership: "own", rightsConfirmedAt: NOW, parsers: [screenshotParser], decodeImage: decoderOf(images) });
    expect(brand.files.map((f) => f.status)).toEqual(["parsed", "parsed", "parsed"]);
    expect(brand.sources.every((s) => s.parser === "screenshot@1.0.0")).toBe(true);
    expect(brand.screenshots?.map((s) => s.mode)).toEqual(["light", "dark", "ambiguous"]);
    const last = brand.sources[2]!.id;
    const accentMixed = brand.warnings.filter((w) => w.code === "screenshots-accent-mixed");
    expect(accentMixed).toEqual([{ sourceId: last, code: "screenshots-accent-mixed", detail: `${NIMBO.violet} ×1 · ${NIMBO.emerald} ×1 · ${NIMBO.yellow} ×1` }]);
    expect(brand.warnings).toContainEqual({ sourceId: last, code: "screenshots-mode-mixed", detail: "light ×1 · dark ×1" });
    expect(brand.colors.every((c) => c.confidence === "low" && c.method === "pixel")).toBe(true);
  });

  it("stays quiet when the captures agree, and references never vote", async () => {
    const agree = await importBatch(files([0, 3]), { ownership: "own", parsers: [screenshotParser], decodeImage: decoderOf(images) });
    expect(agree.warnings.filter((w) => w.code.startsWith("screenshots-"))).toEqual([]);
    const withReference = await importBatch(files([0, 1], "reference"), { ownership: "own", parsers: [screenshotParser], decodeImage: decoderOf(images) });
    expect(withReference.sources[1]!.ownership).toBe("third-party");
    expect(withReference.warnings.filter((w) => w.code.startsWith("screenshots-"))).toEqual([]);
  });

  it("pixel roles are suggestions: never pre-selected, never locked when accepted", async () => {
    const brand = await importBatch(files([0]), { ownership: "own", rightsConfirmedAt: NOW, parsers: [screenshotParser], decodeImage: decoderOf(images) });
    const selection = defaultSelection(brand);
    expect(selection.accept).toEqual([]);
    expect(selection.references).toEqual([brand.sources[0]!.id]);
    const primary = brand.colors.find((c) => c.role === "primary")!;
    const doc = createDesignDoc({ brand: { name: "Nimbo", seeds: { primary: "#e11d48" } }, brief: { productType: "saas-general", focus: "landing", locale: "es" }, provenance: { createdAt: NOW } });
    const result = applyImport(doc, brand, { ...selection, accept: [primary.id] }, { ownership: "own", rightsConfirmedAt: NOW });
    if (!result.ok) throw new Error(result.error.message);
    expect(result.doc.tokens.color?.light?.primary).toBe(NIMBO.violet);
    expect(result.locks).toEqual([]);
    expect(result.doc.references[0]).toMatchObject({ origin: "screenshot", fingerprint: { method: "pixel", mode: "light", colors: brand.screenshots![0]!.swatches } });
  });

  it("ignores votes from parse calls outside a batch", async () => {
    const batch: BatchFile[] = [{ name: "a.png", sourceId: "screenshot-a", format: "png", parserId: "screenshot" }];
    const out = await parse(inputFor(lightApp(), 0, { sourceId: "screenshot-b" }), ctxFor(decoderOf([lightApp()]), { batch }));
    expect(out.warnings).toBeUndefined();
  });
});
