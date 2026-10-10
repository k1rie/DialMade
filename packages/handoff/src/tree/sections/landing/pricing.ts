// landing.pricing: heading, monthly / yearly switch and plan cards (`cards`: columns), or the heading beside a list
// of plan rows (`split`). The highlighted plan gets a primary outline (or a primary panel when bold).
import { formatMoney } from "@dialmade/sections";
import type { Locale } from "@dialmade/catalog";
import type { ResolvedTokens } from "@dialmade/doc";
import type { SectionBuilder } from "../../context";
import { badge, button, card, column, frame, grid, icon, records, row, str, strings, text } from "../../nodes";
import type { ColorVar, FrameNode } from "../../types";
import { centered, landingSection, landingStrings, recolor, scaleTo, sectionHeading, styleOf, withCrossGap, type Emphasis } from "./shared";

interface PriceDisplay {
  prefix: string;
  amount: string;
  period: string;
  caption: string;
}

/** `priceDisplay` of Pricing/price.ts. */
function priceDisplay(price: number, options: { recurring: boolean; billing: string; yearlyDiscount: number; locale: Locale }): PriceDisplay {
  const s = landingStrings(options.locale);
  if (price <= 0) return { prefix: "", amount: s.free, period: "", caption: "" };
  if (!options.recurring) return { prefix: s.from, amount: formatMoney(price, options.locale), period: "", caption: "" };
  const yearly = options.billing === "yearly";
  const monthly = yearly ? Math.max(0, Math.round(price * (1 - Math.min(90, Math.max(0, options.yearlyDiscount)) / 100))) : price;
  return { prefix: "", amount: formatMoney(monthly, options.locale), period: s.perMonth, caption: yearly ? s.billedYearly : s.billedMonthly };
}

/** `BillingToggle`: two options in a muted pill, the current one raised. */
function billingToggle(billing: string, discount: number, locale: Locale): FrameNode {
  const s = landingStrings(locale);
  const option = (id: string, label: string, saving?: string) => {
    const pressed = billing === id;
    return row(
      {
        name: pressed ? "Option/pressed" : "Option",
        tag: "button",
        width: "hug",
        align: "center",
        gap: 2,
        minHeight: 34,
        padding: { x: 4 },
        radius: "button",
        ...(pressed && { fill: { color: "background" }, shadow: "sm" as const }),
      },
      [text(label, "small", { color: pressed ? "foreground" : "muted-foreground", tag: "span", weight: 500 }), saving ? badge(saving, "success") : null],
    );
  };
  return row({ name: "BillingToggle", width: "hug", gap: { px: 2 }, padding: { px: 4 }, stroke: { color: "border" }, radius: "lg", fill: { color: "muted" } }, [
    option("monthly", s.monthly),
    option("yearly", s.yearly, discount > 0 ? s.save(discount) : undefined),
  ]);
}

/** `PlanCard`: name and badge, description, price, button and features (a row of details and price in `split`). */
function planCard(
  plan: Record<string, unknown>,
  price: PriceDisplay,
  options: { highlightLabel: string; emphasis: Emphasis; layout: "card" | "row"; linkTo?: string; fontSizes: ResolvedTokens["fontSizes"] },
): FrameNode {
  const fs = options.fontSizes;
  const highlighted = plan.highlighted === true;
  const panel = highlighted && options.emphasis === "bold";
  const fg: ColorVar = panel ? "primary-foreground" : "card-foreground";
  const muted: ColorVar = panel ? "primary-foreground" : "muted-foreground";
  const mutedOpacity = panel ? 0.78 : undefined;
  const check: ColorVar = panel ? "primary-foreground" : "primary-text";
  const rowLayout = options.layout === "row";

  let planBadge = highlighted && options.highlightLabel ? badge(options.highlightLabel, options.emphasis === "subtle" ? "outline" : "primary") : null;
  if (planBadge && panel) planBadge = recolor(planBadge, { fill: { color: "primary-foreground" }, text: "primary" });
  const head = row({ name: "Head", width: "fill", wrap: true, align: "center", justify: "between", gap: 2 }, [
    text(str(plan.name), "h3", { name: "Name", color: fg, tag: "h3", scale: scaleTo(fs, "h3", fs.body.px * 1.125) }),
    planBadge,
  ]);
  const description = text(str(plan.description), "small", { name: "Description", color: muted, opacity: mutedOpacity, tag: "p" });
  const amount = column({ name: "Price", gap: { px: 2 }, width: rowLayout ? "hug" : "fill", align: rowLayout ? "end" : "stretch" }, [
    row({ name: "Amount", width: "hug", wrap: true, align: "baseline", gap: 1 }, [
      text(price.prefix, "small", { color: muted, opacity: mutedOpacity, tag: "span" }),
      text(price.amount, "h1", { name: "Value", color: fg, tag: "span", ...(fs.h1.px > 44 && { scale: scaleTo(fs, "h1", 44) }) }),
      text(price.period, "small", { color: muted, opacity: mutedOpacity, tag: "span" }),
    ]),
    text(price.caption, "caption", { name: "Caption", color: muted, opacity: mutedOpacity, tag: "p" }) ?? frame({ name: "Caption", height: 17, width: "fill" }),
  ]);
  let cta = button(plan.cta, { variant: highlighted ? "cta" : "outline", width: rowLayout ? "hug" : "fill", linkTo: options.linkTo });
  if (cta && panel) cta = recolor(cta, { fill: { color: "primary-foreground" }, text: "primary" });
  const featureList = strings(plan.features, () => null);
  const features =
    featureList.length > 0
      ? ((node: FrameNode) => (rowLayout ? withCrossGap(node, 1) : node))((rowLayout ? row : column)(
          {
            name: "Features",
            tag: "ul",
            width: "fill",
            gap: rowLayout ? 4 : 2,
            ...(rowLayout ? { wrap: true, padding: { top: 1 } } : { padding: { top: 4 }, stroke: { color: panel ? "primary-foreground" : "border", ...(panel && { opacity: 0.24 }), sides: ["top"] as const } }),
          },
          featureList.map((feature) =>
            row({ name: "Feature", tag: "li", width: rowLayout ? "hug" : "fill", align: "start", gap: 2 }, [
              icon("check", check, 16),
              text(feature, "small", { color: fg, ...(rowLayout ? {} : { width: "fill" as const }) }),
            ]),
          ),
        ))
      : null;

  const surface = {
    tag: "li" as const,
    gap: rowLayout ? (6 as const) : (4 as const),
    ...(highlighted && !panel && { stroke: { color: "primary", width: options.emphasis === "subtle" ? 1 : 2 } }),
    ...(panel && { fill: { color: "primary" }, stroke: { color: "primary" } }),
  };
  if (rowLayout) {
    return card(
      highlighted ? "PlanCard/highlighted" : "PlanCard",
      [
        column({ name: "Main", width: "fill", gap: 3 }, [head, description, features]),
        column({ name: "Side", width: "hug", gap: 4, align: "end", justify: "between" }, [amount, cta]),
      ],
      { ...surface, direction: "row" },
    );
  }
  return card(highlighted ? "PlanCard/highlighted" : "PlanCard", [head, description, amount, cta, features], surface);
}

export const pricingBuilder: SectionBuilder = ({ id, props, variant, ctx, build }) => {
  const style = styleOf(props);
  const split = variant === "split";
  const recurring = props.recurring === true;
  const discount = typeof props.yearlyDiscount === "number" ? props.yearlyDiscount : 0;
  const billing = props.billing === "yearly" ? "yearly" : "monthly";
  const plans = records(props.plans).slice(0, Math.max(1, typeof props.count === "number" ? props.count : 1));
  const linkTo = ctx.linkTarget?.(id) ?? undefined;
  const introAlign = split ? "start" : style.align;
  const textAlign = introAlign === "center" ? "center" : "start";

  const toggle = recurring && props.showToggle === true ? billingToggle(billing, discount, ctx.locale) : null;
  const note = text(props.note, "small", { name: "Note", color: "muted-foreground", align: split ? "start" : textAlign, tag: "p" });
  const cards = plans.map((plan) =>
    planCard(plan, priceDisplay(typeof plan.price === "number" ? plan.price : 0, { recurring, billing, yearlyDiscount: discount, locale: ctx.locale }), {
      highlightLabel: str(props.highlightLabel),
      emphasis: style.emphasis,
      layout: split ? "row" : "card",
      fontSizes: build.light.fontSizes,
      ...(linkTo && { linkTo }),
    }),
  );

  const intro = column({ name: "Intro", width: "fill", gap: 5, align: introAlign === "center" ? "center" : "start" }, [
    sectionHeading(props, introAlign),
    toggle,
    split ? note : null,
  ]);

  if (split) {
    const list = column({ name: "Plans", tag: "ul", width: "fill", gap: 4 }, cards);
    // `minmax(0, 0.85fr) minmax(0, 1.3fr)` with a 64 px gap: 3 / 4 of seven columns, the gap inside the intro.
    const layout = grid({ name: "Layout", columns: 7, gap: 0 }, [
      { ...column({ name: "IntroCell", padding: { right: 8 } }, [intro]), place: { col: 0, span: 3, row: 0 } },
      { ...list, place: { col: 3, span: 4, row: 0 } },
    ]);
    return landingSection({ name: "Pricing", style }, [{ ...layout, layout: { kind: "grid", columns: 7, gap: 0, align: "start" } }]);
  }

  const n = cards.length;
  const plansGrid = grid({ name: "Plans", tag: "ul", columns: n, gap: 5 }, cards);
  const planList = n === 1 ? centered(plansGrid, "center", 448, "PlansMeasure") : n === 2 ? centered(plansGrid, "center", 832, "PlansMeasure") : plansGrid;
  return landingSection({ name: "Pricing", style, gap: 7 }, [intro, planList, split ? null : note]);
};
