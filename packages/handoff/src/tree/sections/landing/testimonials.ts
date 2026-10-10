// landing.testimonials: section heading and quote cards (stars, quote, author); `spotlight` features the first
// quote large and centered above the rest.
import type { SectionBuilder } from "../../context";
import { card, column, grid, icon, records, row, shape, str, text } from "../../nodes";
import type { FrameNode, TextStyleId } from "../../types";
import { avatar, centered, landingSection, sectionHeading, styleOf, type Emphasis } from "./shared";

const QUOTES = { es: ["«", "»"], en: ["“", "”"] } as const;
type QuoteStyle = { style: TextStyleId; scale?: number; weight?: number };

/** `--_quote-size` / `--_quote-weight` of Testimonials.css, for the cards and the spotlight. */
function quoteStyle(emphasis: Emphasis, big: boolean): QuoteStyle {
  if (big) {
    if (emphasis === "bold") return { style: "h2" };
    return { style: "h3", weight: 500, ...(emphasis === "default" && { scale: 1.1 }) };
  }
  if (emphasis === "subtle") return { style: "body", scale: 0.9375 };
  // Body × 1.25 at weight 500; `lead` keeps the quote's relaxed line height (h3 would set it tight).
  if (emphasis === "bold") return { style: "lead", scale: 1.25 / 1.0625, weight: 500 };
  return { style: "lead" };
}

/** `RatingStars` (5 of 5): the kit has no star icon, so each star is a small sparkle in the warning color. */
function stars(): FrameNode {
  return row({ name: "RatingStars", width: "hug", gap: { px: 2 }, label: "5/5" }, Array.from({ length: 5 }, () => icon("sparkle", "warning", 16)));
}

/** The big quote mark of the spotlight (an SVG in the component): two «66» glyphs drawn with shapes. */
function quoteMark(): FrameNode {
  const glyph = (i: number) =>
    column({ name: `Glyph ${i}`, width: 19, align: "end", gap: 0 }, [
      shape({ name: "Tail", role: "decor", width: 9, height: 12, radius: "sm", fill: { color: "brand", opacity: 0.6 } }),
      shape({ name: "Dot", shape: "ellipse", role: "decor", width: 19, height: 19, fill: { color: "brand", opacity: 0.6 } }),
    ]);
  return row({ name: "QuoteMark", width: "hug", gap: { px: 8 }, label: "“" }, [glyph(1), glyph(2)]);
}

export const testimonialsBuilder: SectionBuilder = ({ props, variant, ctx }) => {
  const style = styleOf(props, { background: "subtle" });
  const marks = QUOTES[ctx.locale] ?? QUOTES.en;
  const rating = props.showRating === true;
  const visible = records(props.items).slice(0, Math.max(1, typeof props.count === "number" ? props.count : 1));
  const [lead, ...rest] = visible;
  const spotlight = variant === "spotlight" && lead ? lead : null;
  const items = spotlight ? rest : visible;

  const quote = (item: Record<string, unknown>, options: { big: boolean; center: boolean }): FrameNode => {
    const role = [str(item.role), str(item.company)].filter(Boolean).join(" · ");
    const textAlign = options.center ? "center" : "start";
    const q = quoteStyle(style.emphasis, options.big);
    const head = column({ name: "Quote", gap: 4, align: options.center ? "center" : "start" }, [
      rating ? stars() : null,
      text(`${marks[0]}${str(item.quote)}${marks[1]}`, q.style, {
        ...(q.scale !== undefined && { scale: q.scale }),
        ...(q.weight !== undefined && { weight: q.weight }),
        name: "Text",
        color: "card-foreground",
        align: textAlign,
        tag: "p",
      }),
    ]);
    const author = row({ name: "Author", width: "hug", align: "center", gap: 3 }, [
      avatar(str(item.name), options.big ? "lg" : "md"),
      column({ name: "Who", width: "hug", align: options.big && options.center ? "center" : "start" }, [
        text(str(item.name), "small-strong", { name: "Name", color: "card-foreground" }),
        text(role, "small", { name: "Role", color: "muted-foreground" }),
      ]),
    ]);
    return column({ name: "Figure", tag: "figure", width: "fill", gap: 4, align: options.center ? "center" : "start" }, [head, author]);
  };

  const spotlightBlock = spotlight
    ? centered(
        column({ name: "Spotlight", gap: 5, align: style.align === "center" ? "center" : "start" }, [
          quoteMark(),
          quote(spotlight, { big: true, center: style.align === "center" }),
        ]),
        style.align,
        864,
        "SpotlightMeasure",
      )
    : null;

  // The card is the figure: quote on top, author pushed to the bottom (`flex: 1` on the quote) of equal-height cards.
  const cards = items.map((item) => {
    const figure = quote(item, { big: false, center: false });
    return card("Testimonial", figure.children, { tag: "li", gap: 4, justify: "between" });
  });
  let list: FrameNode | null = null;
  if (cards.length === 1) {
    list = centered(column({ name: "List", tag: "ul" }, cards), "center", 640, "ListMeasure");
  } else if (cards.length === 5) {
    // Three on top, then two where the last one spans two columns.
    list = grid({ name: "List", tag: "ul", columns: 3, gap: 4, rowGap: 4 }, [
      ...cards.slice(0, 3).map((node, i) => ({ ...node, place: { col: i, span: 1, row: 0 } })),
      { ...cards[3]!, place: { col: 0, span: 1, row: 1 } },
      { ...cards[4]!, place: { col: 1, span: 2, row: 1 } },
    ]);
  } else if (cards.length > 1) {
    list = grid({ name: "List", tag: "ul", columns: cards.length === 2 || cards.length === 4 ? 2 : 3, gap: 4 }, cards);
  }

  return landingSection({ name: "Testimonials", style, gap: 7 }, [sectionHeading(props, style.align), spotlightBlock, list]);
};
