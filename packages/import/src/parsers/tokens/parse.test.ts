import { describe, expect, it } from "vitest";
import { normalizeColor } from "../../color";
import { resolveLimits } from "../../limits";
import { pngHeader, utf8 } from "../../testing/fakes";
import type { ParsedColor, ParseOutput } from "../../types";
import { tokensParser } from "./index";
import { fixture, parseBatch, parseOne, sniff } from "./testing";

const read = (rel: string) => fixture(new URL(".", import.meta.url), rel);
const hexOf = (c: ParsedColor | undefined) => {
  const n = c && normalizeColor(c.value);
  return n?.ok ? `${n.color.hex}${n.color.alpha !== undefined ? `@${n.color.alpha}` : ""}` : undefined;
};
const role = (out: ParseOutput, r: string, mode?: string) => out.colors?.find((c) => c.role === r && c.mode === mode && !c.locator.includes("["));
const named = (out: ParseOutput, name: string) => out.colors?.filter((c) => c.name === name) ?? [];

describe("tokens parser: registration", () => {
  it("claims token JSON and nothing else", () => {
    expect(tokensParser).toMatchObject({ id: "tokens", kind: "tokens", version: "1.0.0" });
    expect(tokensParser.detect(sniff('{"color":{"$type":"color","brand":{"$value":{"colorSpace":"srgb","components":[0.2,0.4,0.8]}}}}', "tokens.json"))).toMatchObject({ format: "dtcg-2025.10" });
    const others = [sniff("%PDF-1.7", "x"), sniff(":root{--a:#fff}", "x"), sniff("Inter\nGeist Mono", "x")];
    expect(others.filter((f) => tokensParser.detect(f) !== null)).toHaveLength(0);
    const png = { ...sniff("", "a.png"), bytes: pngHeader(10, 10) };
    expect(tokensParser.detect({ ...png, detected: { ...png.detected, category: "image", format: "png", confidence: 1, limit: "image" } })).toBeNull();
  });

  it("recognizes Tokens Studio's multi-file sync, which has no $value", () => {
    expect(tokensParser.detect(sniff('[{"name":"Light","selectedTokenSets":{"core":"source"}}]', "$themes.json"))).toEqual({ format: "tokens-studio", score: 0.9 });
    expect(tokensParser.detect(sniff('{"tokenSetOrder":["core"]}', "$metadata.json"))).toEqual({ format: "tokens-studio", score: 0.9 });
  });

  it("never throws on empty or broken input", async () => {
    expect(await parseOne(tokensParser, "empty.json", " ")).toEqual({ warnings: [{ code: "empty-file" }] });
    expect((await parseOne(tokensParser, "bad.json", '{"a":')).warnings?.[0]?.code).toBe("invalid-json");
    const output = await tokensParser.parse({ ...sniff(" ", "empty.txt"), sourceId: "s-1", format: "x", ownership: "own" }, { limits: {} as never, batch: [] });
    expect(output).toBeTypeOf("object");
  });
});

describe("tokens parser: DTCG 2025.10", () => {
  it("reads every color space, alpha, hex fallbacks and references", async () => {
    const out = await parseOne(tokensParser, "brisa.tokens.json", read("brisa.tokens.json"));
    expect(out.format).toBe("dtcg-2025.10");
    expect(hexOf(role(out, "primary"))).toBe("#3464d5");
    expect(role(out, "primary")).toMatchObject({ name: "color.primary", locator: "brisa.tokens.json #/color/primary", confidence: "exact", method: "declared" });
    expect(hexOf(role(out, "primaryForeground"))).toBe("#ffffff");
    expect(hexOf(role(out, "cta"))).toBe(hexOf({ value: "hsl(12 85% 60%)" } as ParsedColor));
    expect(role(out, "cta")?.confidence).toBe("high");
    expect(hexOf(role(out, "background"))).toBe("#fcfcfc");
    expect(hexOf(role(out, "border"))).toBe("#000000@0.1");
    expect(hexOf(role(out, "ring"))).toBe(hexOf({ value: "color(srgb 0.4 0.55 0.93)" } as ParsedColor));
    expect(out.colors?.find((c) => c.name === "color.highlight-p3")?.value).toBe("color(display-p3 0.2 0.4 0.9)");
    expect(named(out, "color.print")[0]?.value).toBe("#abcdef");
    expect(named(out, "color.legacy-hex")[0]?.value).toBe("#ff8800");
  });

  it("keeps scale steps without roles and per-token modes", async () => {
    const out = await parseOne(tokensParser, "brisa.tokens.json", read("brisa.tokens.json"));
    const steps = out.colors?.filter((c) => c.scale?.group === "brisa").map((c) => c.scale!.step);
    expect(steps).toEqual([50, 100, 300, 400, 500, 700, 900]);
    expect(out.colors?.filter((c) => c.scale).every((c) => c.role === undefined && c.confidence === "exact")).toBe(true);
    expect(hexOf(role(out, "card", "light"))).toBe("#ffffff");
    expect(hexOf(role(out, "card", "dark"))).toBe(hexOf({ value: "oklch(0.28 0.09 266)" } as ParsedColor));
  });

  it("skips deprecated tokens and ignores motion", async () => {
    const out = await parseOne(tokensParser, "brisa.tokens.json", read("brisa.tokens.json"));
    expect(named(out, "color.old-primary")).toHaveLength(0);
    expect(out.warnings).toContainEqual({ code: "deprecated-skipped", detail: "1" });
    expect(JSON.stringify(out)).not.toContain("duration");
  });

  it("reads shape, spacing, fonts, weights and typography", async () => {
    const out = await parseOne(tokensParser, "brisa.tokens.json", read("brisa.tokens.json"));
    expect(out.shape?.radii).toMatchObject({ sm: { px: 4 }, md: { px: 8, unit: "rem", assumed: true }, lg: { px: 16 }, xl: { px: 16 }, full: { px: 9999 } });
    expect(out.shape?.borderWidth).toMatchObject({ px: 1, confidence: "exact" });
    expect(out.spacing?.scale).toMatchObject({ "1": { px: 4 }, "2": { px: 8 }, "4": { px: 16 }, "8": { px: 32 } });
    expect(out.shape?.shadows).toEqual([
      expect.objectContaining({ name: "sm", layers: [{ x: 0, y: 1, blur: 2, spread: 0, color: "color(srgb 0 0 0 / 0.05)", alpha: 1 }] }),
      expect.objectContaining({ name: "md", layers: [expect.objectContaining({ y: 4, spread: -1, color: "oklch(0.28 0.09 266)" }), expect.objectContaining({ y: 2 })] }),
    ]);
    expect(out.fonts).toEqual([
      expect.objectContaining({ role: "heading", stack: ["Brisa Grotesk", "Arial", "sans-serif"], weights: [600], confidence: "exact" }),
      expect.objectContaining({ role: "body", stack: "Inter, system-ui, sans-serif", weights: [400] }),
      expect.objectContaining({ role: "mono", stack: ["Geist Mono", "ui-monospace", "monospace"] }),
    ]);
    expect(out.typeScale).toEqual([
      expect.objectContaining({ name: "h1", fontSize: { value: 3, unit: "rem", px: 48, assumed: true }, lineHeight: 1.1, letterSpacing: -0.02, weight: 600, family: "Brisa Grotesk" }),
      expect.objectContaining({ name: "body", fontSize: { value: 16, unit: "px", px: 16 }, lineHeight: 1.5, letterSpacing: 0, weight: 400, family: "Inter" }),
    ]);
  });

  it("follows $ref into sub-values, $extends and $root", async () => {
    const out = await parseOne(
      tokensParser,
      "ext.tokens.json",
      JSON.stringify({
        color: {
          $type: "color",
          base: { surface: { $value: "#ffffff" }, text: { $value: "#111111" } },
          card: { $extends: "{color.base}", text: { $value: "#222222" } },
          accent: { $root: { $value: { colorSpace: "srgb", components: [0.9, 0.3, 0.1] } }, soft: { $value: "{color.accent.$root}" } },
          brand: { $value: { colorSpace: "srgb", components: [{ $ref: "#/color/accent/$root/$value/components/0" }, 0.5, 0.5] } },
        },
      }),
    );
    expect(named(out, "color.card.surface")[0]?.value).toBe("#ffffff");
    expect(named(out, "color.card.text")[0]?.value).toBe("#222222");
    expect(named(out, "color.accent.soft")[0]?.value).toBe("color(srgb 0.9 0.3 0.1)");
    expect(out.colors?.find((c) => c.name === "color.accent")).toMatchObject({ role: "cta" });
    expect(out.colors?.find((c) => c.role === "primary")?.value).toBe("color(srgb 0.9 0.5 0.5)");
  });

  it("reports missing tokens, cycles and long chains as unresolved", async () => {
    const chain: Record<string, unknown> = { $type: "color", c0: { $value: "#123456" } };
    for (let i = 1; i <= 40; i++) chain[`c${i}`] = { $value: `{x.c${i - 1}}` };
    const out = await parseOne(
      tokensParser,
      "loops.json",
      JSON.stringify({
        color: { $type: "color", a: { $value: "{color.b}" }, b: { $value: "{color.a}" }, lost: { $value: "{color.nowhere}" }, self: { $value: { $ref: "#/color/self/$value" } } },
        x: chain,
        far: { $type: "color", ref: { $value: { $ref: "https://example.com/tokens.json#/a" } } },
      }),
    );
    const reasons = out.unresolved?.map((u) => u.reason) ?? [];
    expect(reasons.some((r) => r.startsWith("alias cycle"))).toBe(true);
    expect(reasons).toContain("missing token {color.nowhere}");
    expect(reasons).toContain("alias chain longer than 32");
    expect(reasons.some((r) => r.startsWith("remote $ref ignored"))).toBe(true);
    expect(named(out, "x.c32")[0]?.value).toBe("#123456");
    expect(named(out, "x.c33")).toHaveLength(0);
  });

  it("evaluates references inside text and Tokens Studio math, never eval", async () => {
    const out = await parseOne(
      tokensParser,
      "math.json",
      JSON.stringify({
        size: { base: { $value: "4px" } },
        spacing: { sm: { $value: "{size.base} * 2" }, md: { $value: "calc({size.base} * (2 + 2))" }, bad: { $value: "{size.base} * alert(1)" } },
        color: { shade: { $value: "rgba({color.ink}, 0.5)" }, ink: { $value: "#102030" } },
      }),
    );
    expect(out.spacing?.scale).toMatchObject({ sm: { px: 8 }, md: { px: 16 } });
    expect(out.colors?.find((c) => c.name === "color.shade")?.value).toBe("#10203080");
    expect(out.warnings).toContainEqual({ code: "invalid-value", detail: "spacing.bad" });
    expect(Object.keys(out.spacing?.scale ?? {})).toEqual(["sm", "md"]);
  });
});

describe("tokens parser: legacy formats", () => {
  it("reads Style Dictionary (value, CTI paths, `.value` aliases, CSS shadows)", async () => {
    const out = await parseOne(tokensParser, "brisa.sd.json", read("style-dictionary/brisa.sd.json"));
    expect(out.format).toBe("style-dictionary");
    expect(hexOf(role(out, "background"))).toBe("#ffffff");
    expect(hexOf(role(out, "foreground"))).toBe("#111827");
    expect(hexOf(role(out, "primary"))).toBe("#3464d5");
    expect(hexOf(role(out, "destructive"))).toBe("#dc2626");
    expect(out.colors?.filter((c) => c.scale?.group === "brisa").map((c) => c.scale!.step)).toEqual([500, 700]);
    expect(out.typeScale?.map((t) => [t.name, t.fontSize?.px])).toEqual([
      ["small", 14],
      ["base", 16],
      ["h1", 48],
    ]);
    expect(out.shape?.radii?.md?.px).toBe(8);
    expect(out.spacing?.scale).toMatchObject({ sm: { px: 8 }, md: { px: 16 } });
    expect(out.fonts?.map((f) => [f.role, f.stack])).toEqual([
      ["heading", '"Brisa Grotesk", sans-serif'],
      ["body", "Inter, sans-serif"],
    ]);
    expect(out.shape?.shadows?.[0]).toMatchObject({ name: "md", layers: [{ x: 0, y: 4, blur: 6, spread: -1, color: "rgba(0, 0, 0, 0.1)" }, { y: 2, spread: -2 }] });
  });

  it("reads Tokens Studio themes: modes, source sets, math, rgba(hex) and modifiers", async () => {
    const out = await parseOne(tokensParser, "brisa.studio.json", read("studio/brisa.studio.json"));
    expect(out.format).toBe("tokens-studio");
    expect(hexOf(role(out, "background", "light"))).toBe("#ffffff");
    expect(hexOf(role(out, "background", "dark"))).toBe("#0a0a0d");
    expect(hexOf(role(out, "primary", "light"))).toBe("#3464d5");
    expect(hexOf(role(out, "primary", "dark"))).toBe("#f0f4ff");
    expect(hexOf(role(out, "border", "light"))).toBe("#000000@0.1");
    expect(out.unresolved).toContainEqual({ path: "brisa.studio.json #/light/ring", reason: 'Tokens Studio modifier "darken" is not evaluated' });
    expect(out.colors?.filter((c) => c.scale?.group === "brisa").map((c) => c.scale!.step)).toEqual([50, 500, 900]);
    expect(named(out, "colors.white")).toHaveLength(0);
    expect(out.spacing).toMatchObject({ base: { px: 4, assumed: true }, scale: { sm: { px: 8 }, md: { px: 16 } } });
    expect(out.shape?.radii?.md?.px).toBe(8);
    expect(out.typeScale?.[0]).toMatchObject({ name: "h1", fontSize: { px: 48 }, lineHeight: 1.1, letterSpacing: -0.02, weight: 600, family: "Brisa Grotesk" });
    expect(out.fonts?.map((f) => [f.role, f.stack, f.weights])).toEqual([
      ["heading", "Brisa Grotesk", [600]],
      ["body", "Inter", [400]],
    ]);
    expect(out.shape?.shadows?.[0]?.layers[0]).toMatchObject({ y: 4, blur: 6, spread: -1, color: "#0000001a" });
  });

  it("reads Tokens Studio's multi-file sync through $themes.json", async () => {
    const files = [
      { name: "$themes.json", text: JSON.stringify([{ name: "Light", selectedTokenSets: { "global/core": "source", light: "enabled" } }, { name: "Dark", selectedTokenSets: { "global/core": "source", dark: "enabled" } }]) },
      { name: "$metadata.json", text: JSON.stringify({ tokenSetOrder: ["global/core", "light", "dark"] }) },
      { name: "core.json", text: JSON.stringify({ blue: { "500": { value: "#3464d5", type: "color" } } }) },
      { name: "light.json", text: JSON.stringify({ primary: { value: "{blue.500}", type: "color" } }) },
      { name: "dark.json", text: JSON.stringify({ primary: { value: "#f0f4ff", type: "color" } }) },
    ];
    const outs = await parseBatch(tokensParser, files);
    const themes = outs.get("$themes.json")!;
    expect(hexOf(role(themes, "primary", "light"))).toBe("#3464d5");
    expect(hexOf(role(themes, "primary", "dark"))).toBe("#f0f4ff");
    for (const name of ["$metadata.json", "core.json", "light.json", "dark.json"]) {
      expect(outs.get(name)).toEqual({ warnings: [{ code: "read-through", detail: "$themes.json" }] });
    }
  });
});

describe("tokens parser: modes without a resolver", () => {
  it("splits Tokens Studio sets named light/dark when there are no themes", async () => {
    const out = await parseOne(
      tokensParser,
      "sets.json",
      JSON.stringify({
        base: { gray: { "900": { value: "#111827", type: "color" } } },
        light: { background: { value: "#ffffff", type: "color" }, foreground: { value: "{gray.900}", type: "color" } },
        dark: { background: { value: "{gray.900}", type: "color" } },
        $metadata: { tokenSetOrder: ["base", "light", "dark"] },
      }),
    );
    expect(hexOf(role(out, "background", "light"))).toBe("#ffffff");
    expect(hexOf(role(out, "foreground", "light"))).toBe("#111827");
    expect(hexOf(role(out, "background", "dark"))).toBe("#111827");
    expect(out.colors?.find((c) => c.scale)).toMatchObject({ scale: { group: "gray", step: 900 }, mode: "light" });
  });

  it("reads mode groups and mode words in paths", async () => {
    const out = await parseOne(
      tokensParser,
      "groups.json",
      JSON.stringify({ color: { $type: "color", light: { primary: { $value: "#3464d5" } }, dark: { primary: { $value: "{color.light.primary}" } } } }),
    );
    expect(hexOf(role(out, "primary", "light"))).toBe("#3464d5");
    expect(hexOf(role(out, "primary", "dark"))).toBe("#3464d5");
  });

  it("takes the mode from the file name and keeps scales in a dark-only file", async () => {
    const out = await parseOne(tokensParser, "brisa-dark.tokens.json", JSON.stringify({ color: { $type: "color", background: { $value: "#0a0a0d" }, brisa: { "500": { $value: "#3464d5" } } } }));
    expect(role(out, "background", "dark")).toBeDefined();
    expect(out.colors?.find((c) => c.scale)).toMatchObject({ mode: "dark", scale: { group: "brisa", step: 500 } });
  });

  it("reports $extends cycles and missing targets", async () => {
    const out = await parseOne(
      tokensParser,
      "ext.json",
      JSON.stringify({ a: { $extends: "{b}", x: { $type: "color", $value: "#111111" } }, b: { $extends: "{a}" }, c: { $extends: "#/missing" } }),
    );
    expect(out.unresolved?.map((u) => u.reason)).toEqual(expect.arrayContaining(["$extends cycle", "$extends target {missing} not found"]));
  });

  it("treats an unnamed default context next to dark as light", async () => {
    const outs = await parseBatch(tokensParser, [
      {
        name: "app.resolver.json",
        text: JSON.stringify({
          resolutionOrder: [{ type: "modifier", name: "scheme", default: "base", contexts: { base: [{ $ref: "base.json" }], dark: [{ $ref: "night.json" }] } }],
        }),
      },
      { name: "base.json", text: JSON.stringify({ background: { $type: "color", $value: "#ffffff" } }) },
      { name: "night.json", text: JSON.stringify({ background: { $type: "color", $value: "#000000" } }) },
    ]);
    const out = outs.get("app.resolver.json")!;
    expect(hexOf(role(out, "background", "light"))).toBe("#ffffff");
    expect(hexOf(role(out, "background", "dark"))).toBe("#000000");
    expect(out.warnings ?? []).toHaveLength(0);
  });

  it("reads the earlier resolver draft (values arrays of file names)", async () => {
    const outs = await parseBatch(tokensParser, [
      {
        name: "tokens.resolver.json",
        text: JSON.stringify({
          sets: [{ name: "base", values: ["base.json"] }],
          modifiers: [{ name: "theme", default: "light", values: [{ name: "light", values: [] }, { name: "dark", values: ["night.json"] }] }],
        }),
      },
      { name: "base.json", text: JSON.stringify({ background: { $type: "color", $value: "#ffffff" } }) },
      { name: "night.json", text: JSON.stringify({ background: { $type: "color", $value: "#000000" } }) },
    ]);
    const out = outs.get("tokens.resolver.json")!;
    expect(hexOf(role(out, "background", "light"))).toBe("#ffffff");
    expect(hexOf(role(out, "background", "dark"))).toBe("#000000");
  });
});

describe("tokens parser: DTCG resolver", () => {
  const files = () => [
    { name: "brisa.resolver.json", text: read("resolver/brisa.resolver.json") },
    { name: "foundation.tokens.json", text: read("resolver/foundation.tokens.json") },
    { name: "light.tokens.json", text: read("resolver/light.tokens.json") },
    { name: "dark.tokens.json", text: read("resolver/dark.tokens.json") },
    { name: "nocturna.tokens.json", text: read("resolver/nocturna.tokens.json") },
  ];

  it("turns light/dark contexts into modes and reads the sets through the resolver", async () => {
    const outs = await parseBatch(tokensParser, files());
    const out = outs.get("brisa.resolver.json")!;
    expect(out.format).toBe("dtcg-resolver");
    expect(hexOf(role(out, "background", "light"))).toBe("#ffffff");
    expect(hexOf(role(out, "background", "dark"))).toBe("#0a0a0d");
    expect(hexOf(role(out, "primary", "light"))).toBe("#3464d5");
    expect(hexOf(role(out, "primary", "dark"))).toBe("#f0f4ff");
    expect(hexOf(role(out, "border", "dark"))).toBe("#ffffff@0.1");
    expect(role(out, "primary", "dark")?.locator).toBe("dark.tokens.json #/color/primary");
    expect(out.colors?.filter((c) => c.scale?.group === "brisa").map((c) => [c.scale!.step, c.mode])).toEqual([
      [50, "light"],
      [500, "light"],
      [900, "light"],
    ]);
    expect(out.shape?.radii?.md?.px).toBe(10);
    for (const name of ["foundation.tokens.json", "light.tokens.json", "dark.tokens.json", "nocturna.tokens.json"]) {
      expect(outs.get(name)?.warnings).toEqual([{ code: "read-through", detail: "brisa.resolver.json" }]);
    }
  });

  it("offers other contexts as lower-confidence alternatives and never fetches remote refs", async () => {
    const out = (await parseBatch(tokensParser, files())).get("brisa.resolver.json")!;
    expect(out.warnings).toContainEqual({ code: "resolver-modifier", detail: "brand: brisa (default), nocturna" });
    const alt = out.colors?.filter((c) => c.locator.includes("[brand=nocturna]"));
    expect(alt).toEqual([expect.objectContaining({ role: "primary", mode: "light", confidence: "medium", value: "color(srgb 0.937 0.412 0.29)" })]);
    expect(out.unresolved).toContainEqual({ path: "$ref https://tokens.example.com/extra.json", reason: "remote $ref ignored" });
  });

  it("reports set files that are not in the batch", async () => {
    const out = (await parseBatch(tokensParser, files().filter((f) => f.name !== "dark.tokens.json"))).get("brisa.resolver.json")!;
    expect(out.unresolved).toContainEqual({ path: "$ref themes/dark.tokens.json", reason: "missing file dark.tokens.json" });
    expect(hexOf(role(out, "primary", "light"))).toBe("#3464d5");
  });
});

describe("tokens parser: Figma native export", () => {
  it("reads one file per mode, resolves aliases across collections and uses code syntax for roles", async () => {
    const outs = await parseBatch(tokensParser, [
      { name: "Primitives.tokens.json", text: read("figma/Primitives.tokens.json") },
      { name: "Light.tokens.json", text: read("figma/Light.tokens.json") },
      { name: "Dark.tokens.json", text: read("figma/Dark.tokens.json") },
    ]);
    const light = outs.get("Light.tokens.json")!;
    const dark = outs.get("Dark.tokens.json")!;
    expect(light.format).toBe("figma-native");
    expect(role(light, "background", "light")).toMatchObject({ value: "color(srgb 1 1 1)", confidence: "high" });
    expect(hexOf(role(light, "primary", "light"))).toBe("#3464d5");
    expect(hexOf(role(light, "primaryForeground", "light"))).toBe("#f0f4ff");
    expect(hexOf(role(dark, "background", "dark"))).toBe("#0a0a0d");
    expect(hexOf(role(dark, "primary", "dark"))).toBe("#f0f4ff");
    const primitives = outs.get("Primitives.tokens.json")!;
    expect(primitives.colors?.map((c) => c.scale)).toEqual([
      { group: "brisa", step: 50 },
      { group: "brisa", step: 500 },
    ]);
    expect(primitives.shape?.radii?.md).toMatchObject({ px: 10, unit: "px", confidence: "exact" });
    expect(primitives.shape?.radii?.md?.assumed).toBeUndefined();
    expect(primitives.spacing?.scale?.["4"]?.px).toBe(16);
  });

  it("reads a single file with every mode in com.figma.modes", async () => {
    const out = await parseOne(tokensParser, "Theme.tokens.json", read("figma/Theme.tokens.json"));
    expect(hexOf(role(out, "background", "light"))).toBe("#ffffff");
    expect(hexOf(role(out, "background", "dark"))).toBe("#0a0a0d");
  });

  it("refuses the REST API format (Enterprise only, out of v1)", async () => {
    const out = await parseOne(tokensParser, "rest.json", JSON.stringify({ status: 200, meta: { variables: {}, variableCollections: {} } }));
    expect(out).toMatchObject({ format: "figma-rest", warnings: [{ code: "unsupported-format", detail: "figma-rest" }] });
  });
});

describe("tokens parser: limits and hostile input", () => {
  it("rejects nesting deeper than 64 and keeps at most maxTokens", async () => {
    let deep = '{"$value":"#fff"}';
    for (let i = 0; i < 70; i++) deep = `{"g":${deep}}`;
    expect((await parseOne(tokensParser, "deep.json", deep)).warnings?.[0]?.code).toBe("too-deep");
    const many = Object.fromEntries(Array.from({ length: 30 }, (_, i) => [`c${i}`, { $type: "color", $value: "#123456" }]));
    const out = await parseOne(tokensParser, "many.json", JSON.stringify({ color: many }), resolveLimits({ tokens: { maxTokens: 10 } }));
    expect(out.colors).toHaveLength(10);
    expect(out.warnings).toContainEqual({ code: "too-many-tokens", detail: "kept 10" });
  });

  it("drops dangerous keys and survives alias bombs quickly", async () => {
    const bomb: Record<string, unknown> = { l0: { $value: ["#000000"] } };
    for (let i = 1; i < 40; i++) bomb[`l${i}`] = { $value: [`{bomb.l${i - 1}}`, `{bomb.l${i - 1}}`] };
    const start = performance.now();
    const out = await parseOne(tokensParser, "bomb.json", `{"__proto__":{"polluted":{"$value":"#fff"}},"bomb":${JSON.stringify(bomb)}}`);
    expect(performance.now() - start).toBeLessThan(2000);
    expect(out.warnings).toContainEqual({ code: "dangerous-key", detail: "/__proto__" });
    expect(({} as Record<string, unknown>).polluted).toBeUndefined();
  });

  it("cuts nothing it should not: a minified file on one long line still parses", async () => {
    const colors = Object.fromEntries(Array.from({ length: 800 }, (_, i) => [`c${i}`, { $value: `#${(i * 997).toString(16).padStart(6, "0").slice(-6)}` }]));
    const text = JSON.stringify({ color: { $type: "color", ...colors } });
    expect(text.length).toBeGreaterThan(10_000);
    expect((await parseOne(tokensParser, "min.json", text)).colors).toHaveLength(800);
  });

  it("ignores names and pointers it cannot place without failing the file", async () => {
    const out = await parseOne(tokensParser, "odd.json", JSON.stringify({ a: { $type: "gradient", $value: [] }, b: { $value: true }, c: { $value: null }, d: { $type: "color", $value: 42 } }));
    expect(out.colors ?? []).toHaveLength(0);
    expect(out.warnings).toContainEqual({ code: "invalid-color", detail: "d" });
    expect(utf8("ok")).toHaveLength(2);
  });
});
