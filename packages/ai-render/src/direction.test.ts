import { AI_AXES, AI_AXIS_NAMES, AI_DIRECTION_CHIPS, AiDirectionSchema } from "@dialmade/doc";
import { getThemeRecipe, styleRecipes } from "@dialmade/catalog";
import { describe, expect, it } from "vitest";
import { parseDirectionAnswer } from "./anthropic";
import { CHIP_AXES, MOVES, RECIPE_EXCLUSIONS, defaultPick, directionCandidates, hash32, prng, themeCandidates } from "./direction";
import { directionSchema } from "./prompt";

describe("art direction (spec §4)", () => {
  it("the same seed draws the same candidates; another seed, others", () => {
    expect(directionCandidates(42, "soft-ui")).toEqual(directionCandidates(42, "soft-ui"));
    const seeds = Array.from({ length: 20 }, (_, i) => JSON.stringify(directionCandidates(i, "soft-ui").axes));
    expect(new Set(seeds).size).toBeGreaterThan(10);
  });

  it("never offers a value the recipe excludes", () => {
    for (const recipe of styleRecipes) {
      for (let seed = 0; seed < 50; seed++) {
        const candidates = directionCandidates(seed, recipe.id);
        for (const axis of AI_AXIS_NAMES) {
          const excluded = (RECIPE_EXCLUSIONS[recipe.id]?.[axis] ?? []) as readonly string[];
          for (const value of candidates.axes[axis]) expect(excluded, `${recipe.id} ${axis}`).not.toContain(value);
        }
      }
    }
    expect(Object.keys(RECIPE_EXCLUSIONS).every((id) => styleRecipes.some((recipe) => recipe.id === id))).toBe(true);
  });

  it("a chip fixes its axes and leaves the others to the seed", () => {
    for (const chip of AI_DIRECTION_CHIPS) {
      const candidates = directionCandidates(7, "corporate-clean", chip);
      for (const [axis, value] of Object.entries(CHIP_AXES[chip])) expect(candidates.axes[axis as keyof typeof candidates.axes]).toEqual([value]);
    }
    const auto = directionCandidates(7, "corporate-clean", "auto");
    const technical = directionCandidates(7, "corporate-clean", "technical");
    expect(technical.axes.rhythm).toEqual(auto.axes.rhythm);
  });

  it("offers two candidates per free axis and five moves from the catalog", () => {
    const candidates = directionCandidates(hash32("x"), "bento");
    for (const axis of AI_AXIS_NAMES) {
      expect(candidates.axes[axis]).toHaveLength(2);
      for (const value of candidates.axes[axis]) expect(AI_AXES[axis] as readonly string[]).toContain(value);
    }
    expect(candidates.moves).toHaveLength(5);
    for (const move of candidates.moves) expect(MOVES.map((m) => m.text)).toContain(move);
  });

  it("the model's pick is checked against the candidates", () => {
    const candidates = directionCandidates(3, "playful");
    const pick = parseDirectionAnswer({ axes: { composition: "hacked", typeVoice: candidates.axes.typeVoice[1] }, moves: ["not a move", candidates.moves[2]], rationale: "x".repeat(400) }, candidates)!;
    expect(pick.axes.composition).toBe(candidates.axes.composition[0]);
    expect(pick.axes.typeVoice).toBe(candidates.axes.typeVoice[1]);
    expect(pick.moves).toEqual([candidates.moves[2]]);
    expect(pick.rationale).toHaveLength(280);
    expect(parseDirectionAnswer("nope", candidates)).toBeNull();
  });

  it("the note about the reference screenshots is kept, single-line and capped", () => {
    const candidates = directionCandidates(3, "playful");
    const pick = parseDirectionAnswer({ axes: {}, moves: [], rationale: "", references: `Big serif\n  headings ${"y".repeat(500)}` }, candidates)!;
    expect(pick.references).toMatch(/^Big serif headings y+$/);
    expect(pick.references).toHaveLength(400);
    expect(parseDirectionAnswer({ axes: {}, moves: [], rationale: "" }, candidates)).not.toHaveProperty("references");
  });

  it("offers the variants of the recipe as theme candidates, and only those", () => {
    const candidates = directionCandidates(5, "playful");
    expect(candidates.themes.length).toBeGreaterThan(0);
    for (const id of candidates.themes) expect(getThemeRecipe(id)?.archetypeId, id).toBe("playful");
    expect(candidates.themes).toEqual(themeCandidates("playful"));
    // A recipe nobody classified a theme under has no candidates, and then the answer has no theme.
    expect(directionCandidates(5, "bento").themes).toEqual([]);
    expect(directionCandidates(5, "no-such-recipe").themes).toEqual([]);
  });

  it("the structured output asks for a theme only when there are candidates, from \"none\" plus the candidates", () => {
    const withThemes = directionSchema(directionCandidates(5, "playful")) as unknown as { required: string[]; properties: Record<string, { enum?: string[] }> };
    expect(withThemes.required).toContain("theme");
    expect(withThemes.properties.theme?.enum).toEqual(["none", ...themeCandidates("playful")]);
    const without = directionSchema(directionCandidates(5, "bento")) as unknown as { required: string[]; properties: Record<string, unknown> };
    expect(without.required).not.toContain("theme");
    expect(without.properties).not.toHaveProperty("theme");
  });

  it("parseDirectionAnswer keeps a theme the code offered and drops \"none\", strangers and other recipes' themes", () => {
    const candidates = directionCandidates(3, "playful");
    const offered = candidates.themes[0]!;
    expect(parseDirectionAnswer({ axes: {}, moves: [], rationale: "", theme: offered }, candidates)).toMatchObject({ themeId: offered });
    for (const theme of ["none", "daisyui-no-such-theme", "tweakcn-neo-brutalism", 42, null]) {
      expect(parseDirectionAnswer({ axes: {}, moves: [], rationale: "", theme }, candidates), String(theme)).not.toHaveProperty("themeId");
    }
  });

  it("a stored direction accepts the picked theme and rejects a malformed one", () => {
    const base = {
      id: "dir-2",
      version: 1,
      seed: 4,
      chip: "auto",
      ...defaultPick(directionCandidates(4, "playful")),
      rationale: "",
      provenance: { kind: "direction", path: "free", createdAt: "2026-10-10T12:00:00.000Z", promptVersion: "ai-render/3", seed: 4 },
    };
    expect(AiDirectionSchema.safeParse({ ...base, themeId: "daisyui-cupcake" }).success).toBe(true);
    expect(AiDirectionSchema.safeParse({ ...base, themeId: "Not A Slug" }).success).toBe(false);
  });

  it("the default pick (no model) is a valid stored direction", () => {
    const candidates = directionCandidates(9, "glass");
    const pick = defaultPick(candidates);
    const parsed = AiDirectionSchema.safeParse({
      id: "dir-1",
      version: 1,
      seed: 9,
      chip: "auto",
      ...pick,
      rationale: "",
      provenance: { kind: "direction", path: "manual", createdAt: "2026-10-10T12:00:00.000Z", promptVersion: "ai-render/1", seed: 9 },
    });
    expect(parsed.success).toBe(true);
  });

  it("prng is uniform enough to draw candidates", () => {
    const random = prng(1);
    const values = Array.from({ length: 1000 }, random);
    expect(Math.min(...values)).toBeGreaterThanOrEqual(0);
    expect(Math.max(...values)).toBeLessThan(1);
    expect(values.reduce((a, b) => a + b) / values.length).toBeCloseTo(0.5, 1);
  });
});
