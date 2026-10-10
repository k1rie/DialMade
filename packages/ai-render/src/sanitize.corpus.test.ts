// The XSS corpus (PortSwigger cheat sheet, mXSS, Dialmade-specific) and seeded fuzzing against the sanitizer: whatever
// goes in, what comes out parses (like a browser would) into allowlisted elements and attributes only, and
// sanitizing it again changes nothing (no mutation between our serialization and the next parse).
import { describe, expect, it } from "vitest";
import { sanitizeBlock } from "./sanitize";
import { XSS_CORPUS, auditSanitized, fuzzHtml } from "./testing/xss";

const ctx = { blockId: "b-hero", screenIds: ["s-pricing"] };
const wrap = (inner: string) => `<section data-block-id="b-hero" class="@container p-6"><p>ok</p>${inner}</section>`;

/** Sanitizes, audits and re-sanitizes; returns the problems (empty when safe). A failed block is safe too. */
function check(raw: string): string[] {
  const first = sanitizeBlock(raw, ctx);
  if (!first.ok) return [];
  const problems = auditSanitized(first.html, ctx.screenIds);
  const second = sanitizeBlock(first.html, ctx);
  if (!second.ok) problems.push(`re-sanitize failed: ${second.failure}`);
  else if (second.html !== first.html) problems.push(`not idempotent:\n${first.html}\n${second.html}`);
  else if (second.report.hostile > 0) problems.push("hostile after sanitizing");
  return problems;
}

describe("XSS corpus (spec §6.2)", () => {
  it("has the expected size", () => {
    expect(XSS_CORPUS.length).toBeGreaterThanOrEqual(150);
  });

  it.each(XSS_CORPUS.map((entry) => [entry.group, entry.payload] as const))("%s: %s", (_group, payload) => {
    expect(check(wrap(payload))).toEqual([]);
    // As the root itself, and as raw text around the root.
    expect(check(`<section data-block-id="b-hero">${payload}</section>${payload}`)).toEqual([]);
    expect(check(`${payload}<section data-block-id="b-hero"><p>x</p></section>`)).toEqual([]);
  });

  it("scripts, frames and foreign content fail the block (hostile), they are never kept", () => {
    for (const payload of ["<script>alert(1)</script>", "<svg onload=alert(1)>", "<iframe></iframe>", "<math><mi>x</mi></math>"]) {
      expect(sanitizeBlock(wrap(payload), ctx).report.hostile).toBeGreaterThan(0);
    }
  });

  it("DOM clobbering: `name` only on form controls", () => {
    const result = sanitizeBlock(wrap('<img name="importNode" alt="x"><input name="email"><select name="plan"></select>'), ctx);
    expect(result.ok && result.html).not.toContain('name="importNode"');
    expect(result.ok && result.html).toContain('name="email"');
    expect(result.ok && result.html).toContain('name="plan"');
  });
});

describe("fuzzing with a seeded PRNG", () => {
  // 3 seeds × 700 documents: deterministic, so a failure always reproduces with its seed and index.
  for (const seed of [0x5eed, 0xd1a1, 20261010]) {
    it(`seed ${seed}: every output is allowlisted and stable`, () => {
      for (let i = 0; i < 700; i++) {
        const raw = fuzzHtml(seed + i, 10 + (i % 40));
        const asRoot = check(wrap(raw));
        expect(asRoot, `seed ${seed + i}: ${raw}`).toEqual([]);
        const asWhole = check(`<div data-block-id="b-hero">${raw}`);
        expect(asWhole, `seed ${seed + i} (whole): ${raw}`).toEqual([]);
      }
    });
  }
});
