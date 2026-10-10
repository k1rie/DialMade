// «Copiar prompt para mi Claude» for the style fingerprint (useAiVision). Client-safe.
import { extractJsonAnswer, type ManualJob } from "../manual";
import { buildVisionManualPrompt, promptFileName } from "./prompt";
import { normalizeFingerprintAnswer, type NormalizedFingerprint } from "./schema";

export type VisionManualScreenshot = { fileName?: string; swatches: readonly string[] };

/** «mi Claude» for the style fingerprint of `screenshots` (the same ones, in the same order, as an API request). */
export function visionManualJob(screenshots: readonly VisionManualScreenshot[]): ManualJob<NormalizedFingerprint> {
  return {
    prompt: buildVisionManualPrompt(screenshots),
    attachments: screenshots.map((shot, i) => promptFileName(shot.fileName ?? `screenshot-${i + 1}`)),
    parse(text) {
      const json = extractJsonAnswer(text);
      if (!json.ok) return json;
      const normalized = normalizeFingerprintAnswer(
        json.value,
        screenshots.map((shot) => shot.swatches.length),
      );
      if (!normalized.ok) {
        return { ok: false, error: normalized.problem === "no-refs" ? "no-result" : "invalid-schema", ...(normalized.detail && { detail: normalized.detail }) };
      }
      return { ok: true, value: { answer: normalized.answer, fingerprints: normalized.fingerprints, dropped: normalized.dropped }, dropped: normalized.dropped };
    },
  };
}
