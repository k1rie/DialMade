import { describe, expect, it } from "vitest";
import { IslandMessageSchema, ParentMessageSchema } from "./protocol";

const render = { type: "render", v: 1, blockId: "b-hero", html: "<section></section>", css: "", vars: { "--primary": "oklch(0.5 0.2 260)" }, mode: "light", fontsHref: null, editable: true, lang: "es" };

describe("island protocol", () => {
  it("accepts well-formed messages", () => {
    expect(ParentMessageSchema.safeParse(render).success).toBe(true);
    expect(IslandMessageSchema.safeParse({ type: "textEdit", blockId: "b-hero", t: 2, text: "Hola" }).success).toBe(true);
    expect(IslandMessageSchema.safeParse({ type: "size", blockId: "b-hero", height: 480 }).success).toBe(true);
  });

  it("rejects extra members, bad ids, CSS injection in vars and foreign font URLs", () => {
    expect(ParentMessageSchema.safeParse({ ...render, key: "sk-ant-…" }).success).toBe(false);
    expect(ParentMessageSchema.safeParse({ ...render, blockId: "../x" }).success).toBe(false);
    expect(ParentMessageSchema.safeParse({ ...render, vars: { "--primary": "red;}body{background:url(//evil)" } }).success).toBe(false);
    expect(ParentMessageSchema.safeParse({ ...render, fontsHref: "https://evil.example/f.css" }).success).toBe(false);
    expect(IslandMessageSchema.safeParse({ type: "size", blockId: "b", height: 99_999 }).success).toBe(false);
    expect(IslandMessageSchema.safeParse({ type: "eval", code: "x" }).success).toBe(false);
  });

  it("gate 5: measure at up to 3 widths, answered with the height", () => {
    expect(ParentMessageSchema.safeParse({ type: "measure", v: 1 }).success).toBe(true);
    expect(ParentMessageSchema.safeParse({ type: "measure", v: 1, widths: [1440, 768, 390] }).success).toBe(true);
    expect(ParentMessageSchema.safeParse({ type: "measure", v: 1, widths: [1, 2, 3, 4] }).success).toBe(false);
    expect(ParentMessageSchema.safeParse({ type: "measure", v: 1, widths: [100_000] }).success).toBe(false);
    expect(IslandMessageSchema.safeParse({ type: "measure", blockId: "b", width: 390, overflowX: true, smallTargets: 1, clipped: 0, height: 812 }).success).toBe(true);
  });
});
