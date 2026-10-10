import { IMPORT_LIMITS, detectFormat, type DetectedFormat } from "@dialmade/import";
import { describe, expect, it } from "vitest";
import { MAX_FILES, MAX_IMAGES, PASTE_MAX_BYTES } from "./constants";
import { defaultRole, entryProblems, roleCounts, rolesFor, type ImportEntry } from "./entries";

const PNG_HEADER = new Uint8Array([0x89, 0x50, 0x4e, 0x47, 0x0d, 0x0a, 0x1a, 0x0a, 0, 0, 0, 13, 0x49, 0x48, 0x44, 0x52, 0, 0, 5, 0, 0, 0, 3, 32, 8, 6, 0, 0, 0]);

let next = 0;
function entry(name: string, bytes: Uint8Array, overrides: Partial<ImportEntry> = {}): ImportEntry {
  const detected: DetectedFormat = detectFormat(bytes, name);
  const file = new File([bytes as BlobPart], name, { type: detected.mime ?? "text/plain" });
  return {
    id: `e${++next}`,
    file,
    name,
    size: bytes.length,
    pasted: false,
    role: defaultRole(detected, name),
    roleTouched: false,
    status: "ready",
    detected,
    maxBytes: IMPORT_LIMITS.bytes[detected.limit],
    ...overrides,
  };
}

const css = (name = "globals.css") => entry(name, new TextEncoder().encode(":root { --primary: oklch(0.62 0.19 264); }"));

describe("import panel entries", () => {
  it("keeps the panel caps in step with @dialmade/import", () => {
    expect(MAX_FILES).toBe(IMPORT_LIMITS.maxFiles);
    expect(MAX_IMAGES).toBe(IMPORT_LIMITS.maxImages);
    expect(PASTE_MAX_BYTES).toBe(IMPORT_LIMITS.bytes.paste);
  });

  it("guesses each file's type", () => {
    expect(css().role).toBe("guide");
    expect(entry("captura-app.png", PNG_HEADER).role).toBe("screenshot");
    expect(entry("brisa-logo.png", PNG_HEADER).role).toBe("logo");
    expect(rolesFor(entry("captura.png", PNG_HEADER))).toEqual(["logo", "screenshot", "reference"]);
    expect(rolesFor(css())).toEqual(["guide", "font", "reference"]);
  });

  it("flags problems per file without blocking the rest", () => {
    const big = css("big.css");
    big.size = big.maxBytes! + 1;
    const pdf = entry("brand-book.pdf", new TextEncoder().encode("%PDF-1.7\n"));
    const shots = Array.from({ length: MAX_IMAGES + 1 }, (_, i) => entry(`app-${i}.png`, PNG_HEADER));
    const list = [css(), big, pdf, ...shots];
    const problems = entryProblems(list);
    expect(problems.has(list[0]!.id)).toBe(false);
    expect(problems.get(big.id)?.code).toBe("too-large");
    expect(problems.get(pdf.id)).toEqual({ code: "later", format: "pdf" });
    expect(problems.get(shots[MAX_IMAGES]!.id)?.code).toBe("too-many-images");
    expect(roleCounts(list, problems)).toEqual({ guide: 1, screenshot: MAX_IMAGES });
  });

  it("allows one logo per batch and only images as logos", () => {
    const first = entry("brisa-logo.png", PNG_HEADER);
    const second = entry("otro-logo.png", PNG_HEADER);
    const text = css();
    text.role = "logo";
    const problems = entryProblems([first, second, text]);
    expect(problems.has(first.id)).toBe(false);
    expect(problems.get(second.id)?.code).toBe("one-logo");
    expect(problems.get(text.id)?.code).toBe("not-logo");
  });

  it("waits for detection and reports when it failed", () => {
    const detecting = css();
    detecting.status = "detecting";
    const failed = css();
    delete failed.detected;
    const problems = entryProblems([detecting, failed]);
    expect(problems.has(detecting.id)).toBe(false);
    expect(problems.get(failed.id)?.code).toBe("detect-failed");
  });
});
