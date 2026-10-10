import { inferStructure, validateLayout } from "@dialmade/layout";
import { describe, expect, it } from "vitest";
import { LAYOUT_MAX_BLOCKS, LAYOUT_MAX_SCREENS, PROPOSAL_MAX_HEIGHT, PROPOSAL_MAX_ROW } from "./constants";
import { normalizeDetails, normalizeMapAnswer, normalizeProposals, slugOf, type LayoutProposal, type ProposalWarning } from "./normalize";
import { MAP_JSON_SCHEMA, PROPOSAL_JSON_SCHEMA, parseMapAnswer, parseProposalAnswer, type ProposalAnswer } from "./schema";
import { barberAnswer, block, screen, variant } from "./testing";

const parse = (raw: unknown): ProposalAnswer => {
  const parsed = parseProposalAnswer(raw);
  if (!parsed.ok) throw new Error(parsed.problem);
  return parsed.answer;
};
const codes = (proposal: LayoutProposal) => proposal.warnings.map((warning) => warning.code);
const blocksOf = (proposal: LayoutProposal, index = 0) => Object.values(proposal.screens[index]!.layout.blocks);

describe("structured output schemas", () => {
  it("name only library blocks and catalog recipes, without numeric bounds", () => {
    const text = JSON.stringify(PROPOSAL_JSON_SCHEMA);
    expect(text).toContain('"calendar"');
    expect(text).toContain('"tech-precision"');
    expect(text).not.toContain('"free"');
    expect(text).not.toContain('"container"');
    expect(text).not.toMatch(/"(minimum|maximum)"/);
    expect(PROPOSAL_JSON_SCHEMA).toMatchObject({ type: "object", additionalProperties: false, required: ["variants", "details"] });
    expect(text).toContain('"saas-general"');
    expect(JSON.stringify(MAP_JSON_SCHEMA)).toContain('"free"');
  });
});

describe("parseProposalAnswer", () => {
  it("accepts a valid answer and bounds it", () => {
    const tooMany = {
      variants: Array.from({ length: 5 }, (_, v) =>
        variant(`V${v}`, Array.from({ length: LAYOUT_MAX_SCREENS + 2 }, (_, s) => screen(`S${s}`, "app", Array.from({ length: LAYOUT_MAX_BLOCKS + 3 }, () => block("text", 0, 0, 12, 10))))),
      ),
    };
    const parsed = parseProposalAnswer(tooMany);
    expect(parsed.ok).toBe(true);
    if (!parsed.ok) return;
    expect(parsed.answer.variants).toHaveLength(3);
    expect(parsed.answer.variants[0]!.screens).toHaveLength(LAYOUT_MAX_SCREENS);
    expect(parsed.answer.variants[0]!.screens[0]!.blocks).toHaveLength(LAYOUT_MAX_BLOCKS);
    expect(parsed.dropped).toBe(2 + 3 * 2 + 3 * LAYOUT_MAX_SCREENS * 3);
  });

  it("fills optional fields of a pasted answer and rejects what is not an answer", () => {
    const pasted = parseProposalAnswer({ variants: [{ screens: [{ blocks: [{ type: "hero" }] }] }] });
    expect(pasted.ok).toBe(true);
    if (pasted.ok) expect(pasted.answer.variants[0]!.screens[0]).toMatchObject({ name: "", kind: "app", nav: "sidebar", blocks: [{ type: "hero", linkTo: -1 }] });
    expect(parseProposalAnswer({ edits: [] })).toMatchObject({ ok: false, problem: "invalid-schema" });
    expect(parseProposalAnswer("hola")).toMatchObject({ ok: false, problem: "invalid-schema" });
    expect(parseProposalAnswer({ variants: [] })).toEqual({ ok: false, problem: "no-result" });
    expect(parseProposalAnswer({ variants: [variant("Vacía", [screen("Nada", "app", [])])] })).toEqual({ ok: false, problem: "no-result" });
  });
});

describe("normalizeProposals", () => {
  it("turns a valid answer into layouts the engine accepts, with links between screens and one shared navigation", () => {
    const [agenda, web] = normalizeProposals(parse(barberAnswer()));
    expect(agenda).toMatchObject({ name: "Agenda primero", rationale: "Porque sí.", recipeId: "tech-precision", recipeReason: "Precisa." });
    expect(agenda!.warnings).toEqual([]);
    expect(agenda!.screens.map((s) => [s.name, s.kind, s.route, s.shell?.nav])).toEqual([
      ["Agenda", "app", "/agenda", "sidebar"],
      ["Clientes", "app", "/clientes", "sidebar"],
      ["Pagos", "app", "/pagos", "sidebar"],
    ]);
    for (const proposed of agenda!.screens) {
      expect(validateLayout(proposed.layout)).toEqual([]);
      expect(inferStructure(proposed.layout).warnings).toEqual([]);
    }
    const calendar = blocksOf(agenda!).find((b) => b.type === "calendar")!;
    expect(calendar).toMatchObject({ label: "Agenda semanal", note: "vista semanal", rect: { col: 0, row: 16, w: 8, h: 60 } });
    expect(blocksOf(agenda!).find((b) => b.type === "list")!.linkTo).toBe(agenda!.screens[1]!.key);
    expect(blocksOf(agenda!).find((b) => b.type === "kpis")!.count).toBe(3);
    // Login-like screens keep «Ninguna»; landing screens have no frame.
    expect(web!.screens.map((s) => s.shell)).toEqual([null, { nav: "none", header: false }]);
    expect(web!.screens[0]!.route).toBe("/");
  });

  it("clamps and snaps rects off the grid, and says so", () => {
    const [proposal] = normalizeProposals(
      parse({
        variants: [
          variant("X", [
            screen("A", "app", [
              block("table", 9, 0, 20, 30.4),
              block("chart", -3, 9999, 6, 99999),
              block("text", Number.NaN, 0, 4, 10),
            ]),
          ]),
        ],
      }),
    );
    const [table, chart, text] = blocksOf(proposal!);
    expect(table!.rect).toEqual({ col: 0, row: 0, w: 12, h: 30 });
    expect(chart!.rect.col).toBe(0);
    expect(chart!.rect.h).toBeLessThanOrEqual(PROPOSAL_MAX_HEIGHT);
    expect(chart!.rect.row).toBeGreaterThanOrEqual(30);
    expect(chart!.rect.row).toBeLessThanOrEqual(PROPOSAL_MAX_ROW + PROPOSAL_MAX_HEIGHT * 2);
    expect(text!.rect.w).toBe(6); // default size, next free slot
    expect(codes(proposal!).filter((code) => code === "clamped")).toHaveLength(2);
    expect(codes(proposal!)).toContain("placed");
    expect(validateLayout(proposal!.screens[0]!.layout)).toEqual([]);
  });

  it("resolves overlaps through the engine: small ones clipped, large ones moved below, never silently", () => {
    const [proposal] = normalizeProposals(
      parse({
        variants: [
          variant("X", [
            screen("A", "app", [
              block("kpis", 0, 0, 12, 20, { label: "KPIs" }),
              block("chart", 0, 19, 12, 40, { label: "Gráfica" }), // 1 row of 40: clipped
              block("table", 0, 10, 12, 40, { label: "Tabla" }), // half covered: moved below
            ]),
          ]),
        ],
      }),
    );
    const layout = proposal!.screens[0]!.layout;
    expect(inferStructure(layout).warnings.filter((w) => w.code === "overlap")).toEqual([]);
    expect(codes(proposal!)).toEqual(expect.arrayContaining(["clipped", "moved"]));
    const moved = proposal!.warnings.find((w): w is Extract<ProposalWarning, { code: "moved" }> => w.code === "moved")!;
    expect(moved.label).toBe("Tabla");
  });

  it("maps unknown types (or keeps them as a free block), never draws them as they are", () => {
    const answer = parse({
      variants: [variant("X", [screen("A", "app", [block("agenda", 0, 0, 12, 40, { label: "Mi agenda" }), block("<script>", 0, 40, 12, 20)])])],
    });
    const [proposal] = normalizeProposals(answer, { mapType: (raw) => (raw === "agenda" ? "calendar" : null), labelFor: (type) => `L:${type}` });
    const [first, second] = blocksOf(proposal!);
    expect(first).toMatchObject({ type: "calendar", label: "Mi agenda" });
    expect(second).toMatchObject({ type: "free", label: "L:free" });
    expect(proposal!.warnings.filter((w) => w.code === "mapped-type")).toEqual([
      { code: "mapped-type", screen: "A", label: "Mi agenda", from: "agenda", to: "calendar" },
      { code: "mapped-type", screen: "A", label: "L:free", from: "<script>", to: "free" },
    ]);
  });

  it("turns navbar and sidebar boxes of app screens into the navigation frame", () => {
    const [proposal] = normalizeProposals(
      parse({ variants: [variant("X", [screen("A", "app", [block("navbar", 0, 0, 12, 8), block("table", 0, 8, 12, 40)], { nav: "none" })])] }),
    );
    expect(blocksOf(proposal!).map((b) => b.type)).toEqual(["table"]);
    expect(proposal!.screens[0]!.shell).toEqual({ nav: "topnav", header: true });
    expect(codes(proposal!)).toEqual(["nav-frame"]);
  });

  it("drops links to missing screens or from blocks without an action, empty screens and unknown recipes, with warnings", () => {
    const [proposal] = normalizeProposals(
      parse({
        variants: [
          variant(
            "X",
            [
              screen("A", "app", [block("chart", 0, 0, 12, 40, { linkTo: 0 }), block("cta", 0, 40, 12, 20, { linkTo: 7 }), block("cta", 0, 60, 12, 20, { linkTo: 1 })]),
              screen("Vacía", "app", []),
              screen("B", "app", [block("table", 0, 0, 12, 40)]),
            ],
            { recipeId: "no-existe" },
          ),
        ],
      }),
    );
    expect(proposal!.screens.map((s) => s.name)).toEqual(["A", "B"]);
    expect(proposal!.recipeId).toBeNull();
    expect(codes(proposal!)).toEqual(expect.arrayContaining(["link-dropped", "trimmed", "recipe-unknown"]));
    // linkTo 1 pointed at the empty screen, which is gone: dropped too.
    expect(blocksOf(proposal!).every((b) => b.linkTo === undefined)).toBe(true);
  });

  it("sanitizes names, labels and notes (one line, no invisible characters, bounded)", () => {
    const [proposal] = normalizeProposals(
      parse({ variants: [variant("Nombre\nlargo‮", [screen("  A\u0000gen‮da ", "app", [block("text", 0, 0, 12, 10, { label: "x".repeat(300), note: "línea 1\nlínea 2" })])])] }),
    );
    expect(proposal!.name).toBe("Nombre largo");
    expect(proposal!.screens[0]!.name).toBe("A genda");
    const [text] = blocksOf(proposal!);
    expect(text!.label).toHaveLength(60);
    expect(text!.note).toBe("línea 1 línea 2");
  });

  it("makes routes from names when the answer's route is not a slug", () => {
    expect(slugOf("Lista de clientes ñ")).toBe("lista-de-clientes-n");
    const [proposal] = normalizeProposals(parse({ variants: [variant("X", [screen("Mis Pagos", "app", [block("table", 0, 0, 12, 40)], { route: "javascript:alert(1)" })])] }));
    expect(proposal!.screens[0]!.route).toBe("/mis-pagos");
  });
});

describe("normalizeMapAnswer", () => {
  it("keeps one library type per known index, leaves «free» as it is and drops the rest", () => {
    const parsed = parseMapAnswer({
      blocks: [
        { index: 0, type: "media" },
        { index: 0, type: "hero" },
        { index: 1, type: "free" },
        { index: 2, type: "sidebar" },
        { index: 3, type: "spaceship" },
        { index: 9, type: "table" },
        { index: 1.5, type: "table" },
      ],
    });
    expect(parsed.ok).toBe(true);
    if (!parsed.ok) return;
    expect(normalizeMapAnswer(parsed.answer, ["landing", "app", "landing", "app"])).toEqual({
      suggestions: [{ index: 0, type: "media" }],
      unchanged: 1,
      dropped: 5,
    });
  });

  it("rejects an answer that is not a map", () => {
    expect(parseMapAnswer({ blocks: [] })).toEqual({ ok: false, problem: "no-result" });
    expect(parseMapAnswer({ variants: [] })).toMatchObject({ ok: false, problem: "invalid-schema" });
  });
});

describe("a real answer of Claude Haiku 5.5 (recorded once, «app de reservas para barberías»)", () => {
  it("validates and normalizes into layouts the engine accepts", async () => {
    const recorded = (await import("./__fixtures__/haiku-barber.json")).default as unknown;
    const proposals = normalizeProposals(parse(recorded));
    expect(proposals).toHaveLength(3);
    for (const proposal of proposals) {
      expect(proposal.recipeId).not.toBeNull();
      expect(proposal.screens.length).toBeGreaterThanOrEqual(2);
      for (const proposed of proposal.screens) {
        expect(validateLayout(proposed.layout)).toEqual([]);
        expect(inferStructure(proposed.layout).warnings.filter((w) => w.code === "overlap")).toEqual([]);
      }
    }
  });
});

describe("«Detalles» in the answer (additive)", () => {
  it("validates answers with and without details, and keeps only clean text and a known product type", () => {
    expect(parse(barberAnswer()).details).toBeUndefined();
    const withDetails = parse({ ...barberAnswer(), details: { brandName: " Navaja\nClub ", tagline: "Reserva tu corte en 30 s", productType: "restaurant-food-service" } });
    expect(normalizeDetails(withDetails.details)).toEqual({ brandName: "Navaja Club", tagline: "Reserva tu corte en 30 s", productType: "restaurant-food-service" });
    expect(normalizeDetails({ brandName: "", tagline: "", productType: "generic" })).toBeNull();
    expect(normalizeDetails({ brandName: "X", tagline: "", productType: "spaceship" })).toEqual({ brandName: "X", tagline: "", productType: null });
    // A broken «details» never sinks the variants.
    expect(parse({ ...barberAnswer(), details: 42 }).variants).toHaveLength(2);
    expect(normalizeDetails({ brandName: "a".repeat(500), tagline: "", productType: "" })!.brandName.length).toBeLessThanOrEqual(80);
  });
});
