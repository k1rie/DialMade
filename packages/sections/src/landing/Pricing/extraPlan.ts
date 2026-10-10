import { contentProfileOf, localize, t } from "../../content";
import type { ContentContext } from "../../types";
import type { PlanEntry } from "./types";

const slugOf = (value: string) =>
  value
    .toLowerCase()
    .normalize("NFD")
    .replace(/\p{M}/gu, "")
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/^-|-$/g, "");

const BUSINESS = {
  names: [t("Empresa", "Enterprise"), t("Corporativo", "Corporate")],
  description: t(
    "Para organizaciones con requisitos de seguridad y soporte a medida.",
    "For organizations with custom security and support needs.",
  ),
  features: [t("Inicio de sesión único (SSO)", "Single sign-on (SSO)"), t("Soporte dedicado", "Dedicated support"), t("Acuerdo de nivel de servicio", "Service level agreement")],
  cta: t("Hablar con ventas", "Talk to sales"),
};

const CONSUMER = {
  names: [t("Premium", "Premium"), t("Plus", "Plus")],
  description: t("Para quienes quieren sacarle todo el partido.", "For people who want the most out of it."),
  features: [t("Atención prioritaria", "Priority support"), t("Acceso anticipado a novedades", "Early access to new features")],
  cta: null,
};

/**
 * A fourth plan above the profile's three (the canvas allows up to 4 plans): «Empresa» for B2B products,
 * «Premium» otherwise, priced at about 2.5× the top plan. Deterministic.
 */
export function extraPlan(ctx: ContentContext, plans: readonly PlanEntry[]): PlanEntry {
  const profile = contentProfileOf(ctx.productType);
  const copy = profile.b2b ? BUSINESS : CONSUMER;
  const taken = new Set(plans.flatMap((plan) => [plan.id, slugOf(plan.name)]));
  const name = copy.names.find((candidate) => !taken.has(slugOf(candidate.en))) ?? copy.names[copy.names.length - 1]!;
  const label = localize(name, ctx);
  let id = slugOf(name.en);
  for (let n = 2; taken.has(id); n++) id = `${slugOf(name.en)}-${n}`;
  const top = plans[plans.length - 1];
  const topPrice = top?.price ?? 0;
  const price = topPrice === 0 ? 0 : Math.max(topPrice + 1, Math.round((topPrice * 2.5) / 10) * 10);
  const everything = top ? (ctx.locale === "es" ? `Todo lo de ${top.name}` : `Everything in ${top.name}`) : null;
  return {
    id,
    name: label,
    price,
    description: localize(copy.description, ctx),
    features: [...(everything ? [everything] : []), ...copy.features.map((feature) => localize(feature, ctx))],
    cta: copy.cta ? localize(copy.cta, ctx) : ctx.locale === "es" ? `Elegir ${label}` : `Choose ${label}`,
    highlighted: false,
  };
}
