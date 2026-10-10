// Fixtures for the tests of src/lib/ai/vision (no network: the SDK client is a mock).
import type { VisionPromptImage } from "./prompt";
import type { VisionRef } from "./schema";

export const SWATCHES = ["#ffffff", "#0f172a", "#564cd3", "#f1f5f9", "#e2e8f0", "#64748b", "#22c55e", "#f59e0b", "#ef4444", "#0ea5e9", "#a855f7", "#111827"];

/** A tiny but valid JPEG header (SOI + APP0) followed by filler: enough for the magic-byte check. */
export function jpegBytes(size = 64): Uint8Array {
  const bytes = new Uint8Array(size);
  bytes.set([0xff, 0xd8, 0xff, 0xe0]);
  return bytes;
}

export const toBase64 = (bytes: Uint8Array) => Buffer.from(bytes).toString("base64");

export function promptImage(overrides: Partial<VisionPromptImage> = {}): VisionPromptImage {
  return { mediaType: "image/jpeg", data: toBase64(jpegBytes()), swatches: SWATCHES, ...overrides };
}

export const sampleRef = (overrides: Partial<VisionRef> = {}): VisionRef => ({
  refIndex: 0,
  mode: "light",
  density: "balanced",
  radius: "md",
  elevation: "soft",
  surface: "layered",
  headingClass: "grotesque",
  bodyClass: "grotesque",
  recipeId: "soft-ui",
  pairingId: "inter-neo-grotesque",
  layoutId: "app-shell",
  colorRoles: [
    { swatchIndex: 0, role: "background" },
    { swatchIndex: 1, role: "foreground" },
    { swatchIndex: 2, role: "primary" },
  ],
  confidence: "high",
  ...overrides,
});
