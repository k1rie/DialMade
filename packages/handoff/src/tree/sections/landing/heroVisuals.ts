// The visuals of landing.hero: `ProductMockup` (a browser window with the product's dashboard or gallery, for the
// centered variant) and `HeroCollage` (layered cards, for the split variant). Charts and artwork are drawn with
// shapes. The data helpers mirror `landing/lib/copy.ts` of @dialmade/sections, which the package does not export.
import type { ContentContext } from "@dialmade/sections";
import {
  COMPANY_NAMES,
  activityFeed,
  appNav,
  chartData,
  contentProfileIdOf,
  featureList,
  formatDelta,
  formatDuration,
  formatMoney,
  kpiList,
  rngFor,
  statList,
  type ActivityItem,
  type Kpi,
} from "@dialmade/sections";
import type { IconName } from "@dialmade/ui";
import type { BuildContext } from "../../context";
import { badge, button, column, frame, grid, icon, row, shape, text, type BadgeTone } from "../../nodes";
import type { ColorVar, DesignNode, FrameNode, Space } from "../../types";
import { areaBars, areaChart, avatar, brandMark, landingStrings, scaleTo } from "./shared";

/* ---------------------------------------------------------------------------------------------- */
/* Data (copy.ts)                                                                                 */
/* ---------------------------------------------------------------------------------------------- */

/** `acme-cloud` → `acmecloud.com`, for the fictional address bar. */
export function brandDomain(name: string): string {
  const slug = name
    .normalize("NFD")
    .replace(/[̀-ͯ]/g, "")
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, "");
  return `${slug || "brand"}.com`;
}

export function dashboardMock(ctx: ContentContext) {
  return {
    domain: `app.${brandDomain(ctx.brand.name)}`,
    nav: appNav(ctx).slice(0, 5),
    kpis: kpiList(ctx, 3),
    chart: chartData(ctx),
    activity: activityFeed(ctx, 4),
  };
}

export interface GalleryItem {
  id: string;
  title: string;
  meta: string;
  art: number;
  icon?: IconName;
}

type Pair = readonly [{ es: string; en: string }, number];
const t = (es: string, en: string) => ({ es, en });

const PRODUCTS: readonly Pair[] = [
  [t("Bolso de lona", "Canvas tote"), 39],
  [t("Taza de gres", "Stoneware mug"), 18],
  [t("Manta de lino", "Linen throw"), 64],
  [t("Vela de soja", "Soy candle"), 22],
  [t("Jarrón de cerámica", "Ceramic vase"), 48],
  [t("Cuaderno cosido", "Stitched notebook"), 14],
];

const EPISODES: readonly Pair[] = [
  [t("La ciudad dormida", "The Sleeping City"), 38],
  [t("Voces del puerto", "Harbor Voices"), 52],
  [t("Mapas del silencio", "Maps of Silence"), 45],
  [t("El último verano", "The Last Summer"), 72],
  [t("Cartas desde el norte", "Letters from the North"), 41],
  [t("Hora azul", "Blue Hour"), 29],
];

const DISCIPLINES = [
  t("Identidad visual", "Brand identity"),
  t("Sitio web", "Website"),
  t("Packaging", "Packaging"),
  t("App móvil", "Mobile app"),
  t("Campaña", "Campaign"),
  t("Editorial", "Editorial"),
];

/** Tiles of the gallery visual (`galleryItems` of copy.ts, same seed and order). */
export function galleryItems(ctx: ContentContext, count = 4): GalleryItem[] {
  const r = rngFor(ctx.seed, `${ctx.productType.id}:landing-gallery`);
  const arts = r.shuffle([1, 2, 3, 4, 5, 6]);
  const artOf = (i: number) => arts[i % arts.length] as number;
  const profile = contentProfileIdOf(ctx.productType);
  const n = Math.max(0, Math.min(count, 6));
  if (profile === "commerce") {
    return r.sample(PRODUCTS, n).map(([name, price], i) => ({ id: `item-${i + 1}`, title: name[ctx.locale], meta: formatMoney(price, ctx.locale), art: artOf(i) }));
  }
  if (profile === "media") {
    const episode = ctx.locale === "es" ? "Episodio" : "Episode";
    return r.sample(EPISODES, n).map(([title, minutes], i) => ({
      id: `item-${i + 1}`,
      title: title[ctx.locale],
      meta: `${episode} ${r.int(4, 48)} · ${formatDuration(minutes * 60, ctx.locale)}`,
      art: artOf(i),
    }));
  }
  if (profile === "creative") {
    const clients = r.sample(COMPANY_NAMES, n);
    return r.sample(DISCIPLINES, n).map((discipline, i) => ({ id: `item-${i + 1}`, title: clients[i] as string, meta: discipline[ctx.locale], art: artOf(i) }));
  }
  return featureList(ctx, n).map((feature, i) => ({ id: `item-${i + 1}`, title: feature.title, meta: "", art: artOf(i), icon: feature.icon }));
}

/* ---------------------------------------------------------------------------------------------- */
/* Kit pieces                                                                                     */
/* ---------------------------------------------------------------------------------------------- */

const TILE_TONES: Record<number, [ColorVar, ColorVar]> = {
  1: ["chart-1", "chart-2"],
  2: ["chart-2", "chart-3"],
  3: ["chart-3", "chart-5"],
  4: ["chart-4", "chart-1"],
  5: ["chart-5", "chart-2"],
  6: ["brand", "cta"],
};

/** `GalleryTile`: generative artwork (a tinted panel with a shape or the feature's icon) and its caption. */
export function galleryTile(item: GalleryItem, options: { square?: boolean; offsetTop?: number } = {}): FrameNode {
  const [tone, tone2] = TILE_TONES[item.art] ?? TILE_TONES[1]!;
  const art = row(
    {
      name: "Art",
      width: "fill",
      // The mosaic's square art loses to the icon tiles' 4 / 3 (a more specific selector in the CSS).
      aspect: item.icon ? 4 / 3 : options.square ? 1 : 4 / 5,
      align: "center",
      justify: "center",
      radius: "card",
      clip: true,
      fill: { gradient: { angle: 160, stops: [{ color: tone2, opacity: 0.3, at: 0 }, { color: tone, opacity: 0.22, at: 0.35 }, { color: tone, opacity: 0.45, at: 1 }] } },
      label: item.title,
    },
    [
      item.icon
        ? icon(item.icon, tone, 72)
        : shape({
            name: "Shape",
            role: "decor",
            shape: item.art === 3 || item.art === 6 ? "rect" : "ellipse",
            width: item.art === 4 ? 40 : 80,
            height: item.art === 4 ? 64 : item.art === 2 ? 96 : 80,
            radius: item.art === 3 ? "xl" : item.art === 4 ? "full" : undefined,
            fill: item.art === 5 ? undefined : { gradient: { angle: 150, stops: [{ color: tone, opacity: 0.9, at: 0 }, { color: tone, at: 1 }] } },
            ...(item.art === 5 && { stroke: { color: tone, width: 14 } }),
          }),
    ],
  );
  return column({ name: "GalleryTile", tag: "figure", gap: 2, ...(options.offsetTop && { offsetTop: { px: options.offsetTop } }) }, [
    art,
    column({ name: "Caption", gap: { px: 2 } }, [
      text(item.title, "small-strong", { color: "foreground", tag: "span" }),
      text(item.meta, "caption", { color: "muted-foreground", tag: "span" }),
    ]),
  ]);
}

const sentimentOf = (kpi: Pick<Kpi, "delta" | "invert">) => (kpi.delta === 0 ? "neutral" : (kpi.delta > 0) !== kpi.invert ? "positive" : "negative");

/** `StatCard`: label (and icon), value, delta pill and sparkline. */
function statCard(kpi: Kpi, locale: ContentContext["locale"], options: { padding: number; withIcon?: boolean }): FrameNode {
  const sentiment = sentimentOf(kpi);
  const tone: ColorVar = sentiment === "positive" ? "success" : sentiment === "negative" ? "destructive" : "muted-foreground";
  const direction = kpi.delta > 0 ? "arrow-up-right" : kpi.delta < 0 ? "arrow-down-right" : null;
  const values = kpi.trend;
  return column(
    {
      name: "StatCard",
      gap: 3,
      padding: { px: options.padding },
      fill: { color: "card" },
      stroke: { color: "border", card: true },
      radius: "card",
      shadow: "card",
      width: "fill",
    },
    [
      row({ name: "Header", width: "fill", align: "center", justify: "between", gap: 2, minHeight: 32 }, [
        text(kpi.label, "small", { color: "muted-foreground", width: "fill", weight: 500 }),
        options.withIcon && kpi.icon
          ? row({ name: "Icon", width: 32, height: 32, align: "center", justify: "center", radius: "md", fill: { color: "primary", opacity: 0.1 } }, [icon(kpi.icon, "primary-text", 16)])
          : null,
      ]),
      text(kpi.display, "h3", { name: "Value", color: "card-foreground" }),
      row({ name: "Footer", align: "center", gap: 2 }, [
        row(
          { name: "Delta", width: "hug", align: "center", gap: { px: 2 }, padding: { top: { px: 2 }, bottom: { px: 2 }, left: { px: 4 }, right: { px: 6 } }, radius: "badge", fill: { color: tone, opacity: 0.12 } },
          [direction ? icon(direction, tone, 12) : null, text(formatDelta(kpi.delta, locale), "caption-strong", { color: tone, tag: "span" })],
        ),
      ]),
      values.length > 1
        ? areaBars("Sparkline", values, { height: 40, max: Math.max(...values), min: Math.min(...values) - (Math.max(...values) - Math.min(...values)) * 0.15, color: sentiment === "negative" ? "destructive" : "chart-1", bars: 30, opacity: 0.32 })
        : null,
    ],
  );
}

const TONE_BADGE: Record<string, BadgeTone> = { success: "success", warning: "warning", info: "info", destructive: "destructive", neutral: "neutral" };

/** One event of the activity feed: avatar, actor and action, time. */
function activityEvent(item: ActivityItem): FrameNode {
  return row({ name: "Event", tag: "li", width: "fill", align: "start", gap: 2 }, [
    avatar(item.actor, "xs"),
    column({ name: "Text", width: "fill", gap: 0 }, [
      text(item.actor, "small-strong", { color: "card-foreground" }),
      text(item.text, "small", { color: "muted-foreground" }),
    ]),
    text(item.time, "caption", { color: "muted-foreground" }),
  ]);
}

/** A small kit card (padding `min(--dl-card-padding, 18px)` inside the mockups). */
function miniCard(name: string, padding: number, children: (DesignNode | null)[], extra: Partial<FrameNode> & { gap?: Space } = {}): FrameNode {
  const { gap = 3, ...rest } = extra;
  return column(
    { name, gap, padding: { px: padding }, fill: { color: "card" }, stroke: { color: "border", card: true }, radius: "card", shadow: "card", width: "fill", ...rest },
    children,
  );
}

function cardHeader(title: string, action: FrameNode | null, description?: string): FrameNode {
  return row({ name: "CardHeader", width: "fill", align: "start", justify: "between", gap: 3 }, [
    column({ name: "Heading", width: "fill", gap: 1 }, [
      text(title, "body-strong", { color: "card-foreground", tag: "p" }),
      text(description, "small", { color: "muted-foreground" }),
    ]),
    action,
  ]);
}

/* ---------------------------------------------------------------------------------------------- */
/* ProductMockup                                                                                  */
/* ---------------------------------------------------------------------------------------------- */

/** Height of the mockup's screen (`max-height: 34rem`, clipped). */
export const MOCKUP_SCREEN_H = 544;

function navItem(item: { label: string; icon: IconName; active: boolean; count?: number }): FrameNode {
  const fg: ColorVar = item.active ? "primary-text" : "sidebar-foreground";
  return row(
    {
      name: item.active ? "NavItem/active" : "NavItem",
      width: "fill",
      align: "center",
      gap: 3,
      minHeight: 36,
      padding: { x: 3 },
      radius: "button",
      ...(item.active && { fill: { color: "primary", opacity: 0.12 }, stroke: { color: "primary", width: 3, sides: ["left"] as const } }),
    },
    [
      icon(item.icon, fg, 16),
      text(item.label, item.active ? "small-strong" : "small", { color: fg, width: "fill" }),
      item.count !== undefined
        ? row({ name: "Count", width: "hug", padding: { x: { px: 6 } }, radius: "full", fill: { color: item.active ? "primary" : "muted" } }, [
            text(String(item.count), "caption-strong", { color: item.active ? "primary-foreground" : "muted-foreground" }),
          ])
        : null,
    ],
  );
}

function dashboardScreen(ctx: ContentContext, build: BuildContext): FrameNode {
  const data = dashboardMock(ctx);
  const strings = landingStrings(ctx.locale);
  const pad = Math.min(18, build.light.components.card.padding.px);
  const user = data.activity[0];
  // `grid-template-columns: 13.5rem minmax(0, 1fr)`.
  return row({ name: "DashboardScreen", width: "fill", align: "stretch", fill: { color: "background" } }, [
    column(
      { name: "Sidebar", tag: "aside", width: 216, gap: 5, padding: { y: 5, x: 3 }, fill: { color: "sidebar" }, stroke: { color: "sidebar-border", sides: ["right"] as const } },
      [row({ name: "Brand", padding: { x: 2 } }, [brandMark(ctx.brand.name, "sm", true, build.light.fontSizes)]), column({ name: "Nav", gap: { px: 2 } }, data.nav.map(navItem))],
    ),
    column({ name: "Main", width: "fill", gap: 4, padding: 5 }, [
      row({ name: "Top", width: "fill", align: "center", gap: 3 }, [
        text(strings.overview, "h3", { color: "foreground", width: "fill", scale: scaleTo(build.light.fontSizes, "h3", build.light.fontSizes.body.px * 1.125) }),
        row(
          { name: "Search", width: 208, align: "center", gap: 2, minHeight: 32, padding: { x: 3 }, stroke: { color: "input" }, radius: "input", fill: { color: "background" } },
          [icon("search", "muted-foreground", 14), text(strings.search, "small", { color: "muted-foreground" })],
        ),
        button(strings.create, { variant: "cta", size: "sm", leadingIcon: "plus" }),
        user ? avatar(user.actor, "sm") : null,
      ]),
      grid({ name: "Kpis", columns: 3, gap: 3 }, data.kpis.map((kpi) => statCard(kpi, ctx.locale, { padding: pad, withIcon: true }))),
      grid({ name: "Panels", columns: 8, gap: 3 }, [
        miniCard("ChartCard", pad, [cardHeader(data.chart.title, badge(data.chart.categories.at(-1), "neutral")), areaChart(data.chart.series, data.chart.categories, 168, data.chart.title)], {
          place: { col: 0, span: 5, row: 0 },
        }),
        miniCard("Activity", pad, [cardHeader(strings.recent, null), column({ name: "Feed", tag: "ul", gap: 3 }, data.activity.map(activityEvent))], {
          place: { col: 5, span: 3, row: 0 },
        }),
      ]),
    ]),
  ]);
}

function galleryScreen(ctx: ContentContext, build: BuildContext, links: readonly string[]): FrameNode {
  const items = galleryItems(ctx, 4);
  return column({ name: "GalleryScreen", gap: 4, padding: 5, fill: { color: "background" } }, [
    row({ name: "Top", width: "fill", align: "center", gap: 5, padding: { bottom: 3 }, stroke: { color: "border", sides: ["bottom"] as const } }, [
      brandMark(ctx.brand.name, "sm", true, build.light.fontSizes),
      row({ name: "Links", width: "hug", gap: 5 }, links.map((label) => text(label, "small", { color: "muted-foreground", weight: 500 }))),
      row({ name: "Tools", width: "fill", justify: "end", gap: 3 }, [icon("search", "foreground", 18), icon("user", "foreground", 18)]),
    ]),
    text(links[0], "h3", { name: "Title", tag: "p" }),
    grid({ name: "Grid", columns: 4, gap: 4 }, items.map((item) => galleryTile(item))),
  ]);
}

/** `ProductMockup`: a browser window (chrome with dots and address) with the product inside, clipped. */
export function productMockup(ctx: ContentContext, build: BuildContext, kind: "dashboard" | "gallery", navLabels: readonly string[]): FrameNode {
  const domain = kind === "dashboard" ? `app.${brandDomain(ctx.brand.name)}` : brandDomain(ctx.brand.name);
  return column(
    { name: "ProductMockup", label: domain, stroke: { color: "border" }, radius: "xl", fill: { color: "background" }, shadow: "lg", clip: true },
    [
      row({ name: "Chrome", width: "fill", height: 40, align: "center", gap: 3, padding: { x: 4 }, fill: { color: "muted", opacity: 0.7 }, stroke: { color: "border", sides: ["bottom"] as const } }, [
        row({ name: "Dots", width: "fill", gap: { px: 6 } }, [0, 1, 2].map((i) => ({ ...shape({ name: `Dot ${i + 1}`, shape: "ellipse", role: "decor", width: 10, height: 10, fill: { color: "border-strong", opacity: 0.55 } }) }))),
        row({ name: "Url", width: 256, justify: "center", padding: { x: 4, y: { px: 4 } }, radius: "full", fill: { color: "background" } }, [text(domain, "caption", { color: "muted-foreground", align: "center" })]),
        frame({ name: "Spacer", width: "fill" }),
      ]),
      column({ name: "Screen", width: "fill", height: kind === "dashboard" ? MOCKUP_SCREEN_H : "hug", clip: true }, [
        kind === "dashboard" ? dashboardScreen(ctx, build) : galleryScreen(ctx, build, navLabels.slice(0, 3)),
      ]),
    ],
  );
}

/* ---------------------------------------------------------------------------------------------- */
/* HeroCollage                                                                                    */
/* ---------------------------------------------------------------------------------------------- */

/** `HeroCollage`: the main panel plus two floating cards (absolute, as the CSS places them on desktop). */
export function heroCollage(ctx: ContentContext, build: BuildContext, kind: "dashboard" | "gallery"): FrameNode {
  const pad = build.light.components.card.padding.px;
  const fs = (name: "small" | "body" | "h2" | "caption") => build.light.fontSizes[name].px;
  if (kind === "dashboard") {
    const { chart, kpis, activity } = dashboardMock(ctx);
    const [lead, second] = kpis;
    const event = activity[0];
    const chartH = 190;
    const main = column({ name: "Main", width: "fill", padding: { left: { px: 40 }, bottom: { px: 72 } } }, [
      miniCard("MainCard", pad, [
        cardHeader(
          chart.title,
          lead ? badge(lead.deltaLabel, (lead.delta >= 0) !== lead.invert ? "success" : "warning") : null,
          lead ? `${lead.label} · ${lead.display}` : undefined,
        ),
        areaChart(chart.series, chart.categories, chartH, chart.title),
      ]),
    ]);
    // Heights of the main card and the floats, estimated from the tokens, to place the floats like the CSS does.
    const mainH = 2 * pad + fs("body") * 1.3 + 4 + fs("small") * 1.5 + 12 + chartH + 8 + fs("caption") * 1.45 + 72;
    const eventH = 2 * pad + Math.max(32, fs("small") * 1.4 * 2) + 8 + 20;
    const floats = [
      second
        ? { ...statCard(second, ctx.locale, { padding: pad }), shadow: "lg" as const, absolute: { left: 0, top: Math.round(mainH * 0.38), width: 0.38 } }
        : null,
      event
        ? {
            ...miniCard("EventCard", pad, [
              row({ name: "Event", width: "fill", align: "start", gap: 3 }, [
                avatar(event.actor, "sm"),
                column({ name: "Text", width: "fill", gap: 2 }, [
                  text(`${event.actor} ${event.text}`, "small", { color: "muted-foreground" }),
                  row({ name: "Time", width: "hug" }, [badge(event.time, TONE_BADGE[event.tone] ?? "neutral")]),
                ]),
              ]),
            ]),
            shadow: "lg" as const,
            absolute: { left: 0.5, top: Math.round(mainH - eventH), width: 0.5 },
          }
        : null,
    ];
    return column({ name: "HeroCollage", width: "fill" }, [main, ...floats]);
  }

  const tiles = galleryItems(ctx, 4);
  const stat = statList(ctx)[0];
  // The stat card sits at the bottom left of the collage (bottom: 0), over the mosaic's last row: its top is
  // estimated for tiles of ~276 px (two columns of the 568 px visual at desktop width).
  const tileW = 276;
  const rowH = (item: GalleryItem) => (item.icon ? tileW * 0.75 : tileW) + 8 + fs("small") * 1.3 + (item.meta ? 2 + fs("caption") * 1.3 : 0);
  const rows = [tiles.slice(0, 2), tiles.slice(2, 4)].filter((r) => r.length > 0);
  const collageH = rows.reduce((sum, r) => sum + Math.max(...r.map(rowH)), 0) + 16 * (rows.length - 1) + 40 + 48;
  const statH = 2 * pad + fs("h2") * 1.1 + 2 + fs("small") * 1.5;
  return column({ name: "HeroCollage", width: "fill", padding: { bottom: { px: 48 } } }, [
    grid(
      { name: "Mosaic", columns: 2, gap: 4 },
      tiles.map((item, i) => galleryTile(item, { square: true, offsetTop: i % 2 === 1 ? 40 : 0 })),
    ),
    stat
      ? {
          ...miniCard("StatCard", pad, [text(stat.value, "h2", { color: "card-foreground" }), text(stat.label, "small", { color: "muted-foreground" })], { gap: { px: 2 }, shadow: "lg" }),
          absolute: { left: 0.04, top: Math.round(collageH - statH), width: 0.4 },
        }
      : null,
  ]);
}
