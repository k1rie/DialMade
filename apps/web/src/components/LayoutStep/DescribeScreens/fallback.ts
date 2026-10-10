// «Describe tu producto» without AI (also «Sin IA»): keywords and the library's es/en synonyms (`searchBlocks`) pick a
// block for each need the description names, and a few fixed structures arrange them. Weaker than the AI, but it
// costs nothing and always answers. Its output has the shape of an AI answer, so the same `normalizeProposals` turns it
// into screens. Pure: no React, no DOM.
import { getBlockDef, type LibraryBlockType, type ScreenKind } from "@dialmade/layout";
import type { DescribeKind, LayoutDictionary } from "@/i18n/layout";
import { KEEP_FREE, PROPOSAL_BLOCK_TYPES, type LayoutVariantCount } from "@/lib/ai/layout/constants";
import type { ProposalAnswer, ProposalBlockAnswer, ProposalScreenAnswer, ProposalVariantAnswer } from "@/lib/ai/layout/schema";
import { normalizeSearchText } from "../searchBlocks";

export type FallbackText = LayoutDictionary["describe"]["fallback"];

export type FallbackOptions = {
  kind: DescribeKind;
  variants: LayoutVariantCount;
  /** The library search over both locales (`searchBlocks(query, [es, en])`), best first. */
  search: (query: string) => readonly LibraryBlockType[];
  text: FallbackText;
};

/** Needs read from one description at most (one screen each in «Una pantalla por tarea»). */
export const MAX_NEEDS = 6;
const NAME_MAX = 40;

/** Words that point at an app or at a public website (normalized: lowercase, no accents). */
const APP_HINTS = new Set(
  "app aplicacion dashboard panel admin gestion gestionar agenda reservas reserva citas cita clientes inventario crm pagos facturas pedidos usuarios estadisticas metricas tareas proyectos saas software herramienta plataforma tool manage booking bookings appointments customers clients payments invoices orders users stats analytics tasks projects inventory schedule backoffice intranet".split(
    " ",
  ),
);
const LANDING_HINTS = new Set(
  "landing web pagina sitio marketing portfolio portafolio blog precios pricing site homepage home about nosotros contacto contact testimonios testimonials newsletter waitlist lanzamiento launch tienda restaurante cafeteria hotel agencia estudio".split(
    " ",
  ),
);

/** Domain nouns the library synonyms do not cover, by the block that shows them best. */
const DOMAIN: ReadonlyMap<string, LibraryBlockType> = new Map(
  (
    [
      ["table", "clientes cliente customers customer clients client usuarios users pacientes patients alumnos students socios members miembros empleados employees pagos pago payments payment cobros facturas factura invoices ventas sales pedidos orders transacciones transactions gastos expenses inventario inventory stock"],
      ["chart", "informes informe reportes reporte reports analytics analiticas ingresos revenue graficas evolucion"],
      ["calendar", "reservas reserva citas cita turnos turno horarios bookings booking shifts"],
      ["settings", "perfil profile cuenta preferencias"],
      ["cards", "equipo team staff barberos profesionales servicios services galeria gallery fotos photos portfolio portafolio productos catalogo catalog menu carta"],
      ["list", "mensajes messages chat notificaciones notifications avisos"],
      ["media", "mapa map ubicacion location video"],
    ] as const
  ).flatMap(([type, words]) => words.split(" ").map((word) => [word, type] as const)),
);

const PROPOSAL: ReadonlySet<string> = new Set(PROPOSAL_BLOCK_TYPES);
/** Blocks that only make sense on a public web page: never a need of an app screen. */
const LANDING_ONLY: ReadonlySet<LibraryBlockType> = new Set(["navbar", "footer", "hero", "pricing", "logos", "testimonials"]);
/** Blocks that stay narrow next to a wide one in «Todo en un panel». */
const NARROW: ReadonlySet<LibraryBlockType> = new Set(["list", "activity", "form", "media", "text", "empty"]);

export type Need = { phrase: string; type: LibraryBlockType };

const capitalize = (text: string) => (text ? text.charAt(0).toLocaleUpperCase() + text.slice(1) : text);
const cut = (text: string, max: number) => (text.length <= max ? text : text.slice(0, max).trimEnd());

/** «app de reservas para barberías: agenda semanal, lista de clientes y pagos» → the phrases after «:», split. */
export function splitNeeds(description: string): string[] {
  const colon = description.indexOf(":");
  const body = colon >= 0 ? description.slice(colon + 1) : description;
  const parts = body
    .split(/[,;\n·•|+/]|\s(?:y|e|and|&|con|with)\s/i)
    .map((part) => part.replace(/[.!?¿¡"«»“”]/g, "").trim())
    .filter((part) => normalizeSearchText(part).length >= 3);
  const seen = new Set<string>();
  const unique = parts.filter((part) => {
    const key = normalizeSearchText(part);
    if (seen.has(key)) return false;
    seen.add(key);
    return true;
  });
  return unique.slice(0, MAX_NEEDS);
}

/** «Elige tú»: app when it names more app things than website things (a tie goes to app when it names any). */
export function detectKind(description: string, kind: DescribeKind): ScreenKind {
  if (kind !== "any") return kind;
  const words = normalizeSearchText(description).split(" ");
  const app = words.filter((word) => APP_HINTS.has(word)).length;
  const landing = words.filter((word) => LANDING_HINTS.has(word)).length;
  return app > 0 && app >= landing ? "app" : landing > 0 ? "landing" : "app";
}

/** The block for one need on a screen of `kind`: domain words, then the library search (phrase, then each word). */
export function resolveNeed(phrase: string, kind: ScreenKind, search: FallbackOptions["search"]): LibraryBlockType {
  const allowed = (type: LibraryBlockType) => PROPOSAL.has(type) && !(kind === "app" && LANDING_ONLY.has(type)) && type !== "navbar" && type !== "footer";
  const words = normalizeSearchText(phrase)
    .split(" ")
    .filter((word) => word.length >= 3);
  for (const word of words) {
    const type = DOMAIN.get(word);
    if (type && allowed(type)) return type;
  }
  const fromSearch = (query: string) => search(query).find(allowed);
  const whole = fromSearch(phrase);
  if (whole) return whole;
  for (const word of [...words].sort((a, b) => b.length - a.length)) {
    const type = fromSearch(word);
    if (type) return type;
  }
  return KEEP_FREE;
}

type Spec = { type: LibraryBlockType; label?: string; note?: string; w?: number; h?: number; count?: number; linkTo?: number };

/**
 * Blocks top to bottom; a narrow block (`w` < 12) goes next to the previous one when they fit in the row. `gap`: rows
 * between rows (app screens breathe, landing sections touch, like the templates).
 */
function stack(specs: readonly Spec[], gap: number): ProposalBlockAnswer[] {
  const blocks: ProposalBlockAnswer[] = [];
  let top = 0;
  let height = 0;
  let col = 0;
  for (const spec of specs) {
    const w = spec.w ?? 12;
    const h = spec.h ?? getBlockDef(spec.type).defaultSize.h;
    if (blocks.length > 0 && (col === 0 || col + w > 12)) {
      top += height + gap;
      height = 0;
      col = 0;
    }
    blocks.push({ type: spec.type, label: spec.label ?? "", note: spec.note ?? "", col, row: top, w, h, count: spec.count ?? 0, linkTo: spec.linkTo ?? -1 });
    height = Math.max(height, h);
    col = col + w >= 12 ? 0 : col + w;
  }
  return blocks;
}

const screen = (name: string, kind: ScreenKind, specs: readonly Spec[], extra: Partial<ProposalScreenAnswer> = {}): ProposalScreenAnswer => ({
  name,
  kind,
  route: "",
  nav: kind === "app" ? "sidebar" : "none",
  blocks: stack(specs, kind === "app" ? 2 : 0),
  ...extra,
});

const variant = (text: { name: string; rationale: string }, screens: ProposalScreenAnswer[]): ProposalVariantAnswer => ({
  name: text.name,
  rationale: text.rationale,
  recipeId: "",
  recipeReason: "",
  screens,
});

/** The need as a block of its own screen (full width) or of a panel (narrow ones beside the wide ones). */
const needSpec = (need: Need, narrow: boolean): Spec => ({
  type: need.type,
  label: cut(capitalize(need.phrase), 60),
  note: need.phrase,
  ...(narrow && NARROW.has(need.type) && { w: 4 }),
  ...(narrow && !NARROW.has(need.type) && need.type !== "kpis" && { w: 8 }),
});

/** A deterministic answer for `description`: 2 or 3 variants, as `normalizeProposals` expects them. */
export function fallbackAnswer(description: string, options: FallbackOptions): ProposalAnswer {
  const { text, search } = options;
  const kind = detectKind(description, options.kind);
  const phrases = splitNeeds(description);
  const needs: Need[] = (phrases.length > 0 ? phrases : [description.trim()]).map((phrase) => ({ phrase: cut(phrase, NAME_MAX), type: resolveNeed(phrase, kind, search) }));
  const variants: ProposalVariantAnswer[] = [];

  // One app screen with every need: KPIs on top, then the needs (a narrow one next to a wide one).
  const panelScreen = (name: string) =>
    screen(name, "app", [{ type: "kpis", label: text.summary, count: 4 }, ...needs.map((need) => needSpec(need, true))]);

  if (kind === "app") {
    const perNeed = needs.slice(0, 5).map((need) => screen(cut(capitalize(need.phrase), NAME_MAX), "app", [needSpec(need, false)]));
    variants.push(
      variant(text.perNeed, [
        screen(text.home, "app", [
          { type: "kpis", label: text.summary, count: 4 },
          { type: "activity", w: 12, h: 40 },
        ]),
        ...perNeed,
      ]),
    );
    variants.push(variant(text.onePanel, [panelScreen(text.panel)]));
    if (options.variants === 3) {
      variants.push(
        variant(text.withWeb, [
          screen(text.home, "landing", [
            { type: "navbar" },
            { type: "hero", linkTo: 1 },
            { type: "features", count: Math.min(6, Math.max(3, needs.length)), note: needs.map((need) => need.phrase).join(", ").slice(0, 200) },
            { type: "cta", linkTo: 1 },
            { type: "footer" },
          ]),
          panelScreen(text.panel),
        ]),
      );
    }
  } else {
    variants.push(
      variant(text.landing, [
        screen(text.home, "landing", [
          { type: "navbar" },
          { type: "hero" },
          ...needs.map((need) => needSpec(need, false)),
          { type: "cta" },
          { type: "footer" },
        ]),
      ]),
    );
    variants.push(
      variant(text.landingPricing, [
        screen(text.home, "landing", [
          { type: "navbar", linkTo: 1 },
          { type: "hero", linkTo: 1 },
          { type: "features", count: Math.min(6, Math.max(3, needs.length)), note: needs.map((need) => need.phrase).join(", ").slice(0, 200) },
          { type: "cta", linkTo: 1 },
          { type: "footer" },
        ]),
        screen(text.pricing, "landing", [{ type: "navbar" }, { type: "text", h: 16 }, { type: "pricing", count: 3 }, { type: "footer" }]),
      ]),
    );
    if (options.variants === 3) {
      variants.push(
        variant(text.withWeb, [
          screen(text.home, "landing", [{ type: "navbar" }, { type: "hero", linkTo: 1 }, { type: "cta", linkTo: 1 }, { type: "footer" }]),
          panelScreen(text.panel),
        ]),
      );
    }
  }
  return { variants };
}
