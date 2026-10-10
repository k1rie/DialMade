// Fixtures for the tests of src/lib/ai/layout (no network).
import type { ProposeRequestBody, MapRequestBody } from "./api";
import type { ProposalBlockAnswer, ProposalScreenAnswer, ProposalVariantAnswer } from "./schema";

export const block = (type: string, col: number, row: number, w: number, h: number, extra: Partial<ProposalBlockAnswer> = {}): ProposalBlockAnswer => ({
  type,
  label: "",
  note: "",
  col,
  row,
  w,
  h,
  count: 0,
  linkTo: -1,
  ...extra,
});

export const screen = (name: string, kind: "landing" | "app", blocks: ProposalBlockAnswer[], extra: Partial<ProposalScreenAnswer> = {}): ProposalScreenAnswer => ({
  name,
  kind,
  route: "",
  nav: kind === "app" ? "sidebar" : "none",
  blocks,
  ...extra,
});

export const variant = (name: string, screens: ProposalScreenAnswer[], extra: Partial<ProposalVariantAnswer> = {}): ProposalVariantAnswer => ({
  name,
  rationale: "Porque sí.",
  recipeId: "tech-precision",
  recipeReason: "Precisa.",
  screens,
  ...extra,
});

/** A plausible answer for «app de reservas para barberías»: two variants. */
export const barberAnswer = () => ({
  variants: [
    variant("Agenda primero", [
      screen("Agenda", "app", [
        block("kpis", 0, 0, 12, 14, { label: "Hoy", count: 3 }),
        block("calendar", 0, 16, 8, 60, { label: "Agenda semanal", note: "vista semanal" }),
        block("list", 8, 16, 4, 60, { label: "Próximas citas", linkTo: 1 }),
      ]),
      screen("Clientes", "app", [block("table", 0, 0, 12, 60, { label: "Clientes" })], { route: "/clientes" }),
      screen("Pagos", "app", [block("table", 0, 0, 12, 50, { label: "Pagos" }), block("chart", 0, 52, 12, 40, { label: "Ingresos" })]),
    ]),
    variant("Web y app", [
      screen("Inicio", "landing", [block("navbar", 0, 0, 12, 8), block("hero", 0, 8, 12, 60, { linkTo: 1 }), block("footer", 0, 68, 12, 25)], {
        route: "/",
      }),
      screen("Reservar", "app", [block("calendar", 0, 0, 12, 60)], { nav: "none" }),
    ]),
  ],
});

export const proposeBody = (overrides: Partial<ProposeRequestBody> = {}): ProposeRequestBody => ({
  task: "propose",
  description: "app de reservas para barberías: agenda semanal, lista de clientes, pagos",
  locale: "es",
  kind: "any",
  ...overrides,
});

export const mapBody = (overrides: Partial<MapRequestBody> = {}): MapRequestBody => ({
  task: "map",
  locale: "es",
  blocks: [
    { screen: "Inicio", screenKind: "landing", label: "Bloque libre", note: "fotos del local", rect: { col: 0, row: 10, w: 12, h: 40 } },
    { screen: "Agenda", screenKind: "app", label: "Citas", rect: { col: 8, row: 0, w: 4, h: 40 }, neighbors: ["calendar"] },
  ],
  ...overrides,
});
