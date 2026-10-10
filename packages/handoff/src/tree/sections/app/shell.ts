// app.shell: the dashboard frame (sidebar, inset panel, icon rail or top navigation), its top bar with search,
// the page header and the widgets in a 12-column content grid. A shell placed as a block (narrow, inside a
// landing screen) draws the phone layout its container query shows: menu, brand and account in the top bar.
import { SHELL_ELEMENT_ID, monogramOf } from "@dialmade/sections";
import type { SectionBuilder, SectionInput } from "../../context";
import { COL_PX, DESKTOP_COLUMNS } from "@dialmade/layout";
import { button, column, grid, icon, records, row, shape, str, text } from "../../nodes";
import type { ColorVar, DesignNode, FrameNode, Paint, Stroke } from "../../types";
import {
  SHELL_SPANS,
  appStrings,
  avatar,
  avatarWithStatus,
  brandMark,
  control,
  elementType,
  iconButton,
  menuButton,
  overlay,
  shellDensity,
} from "./shared";

/** Nav items that live at the bottom of the sidebar (`FOOTER_NAV_IDS`). */
const FOOTER_NAV_IDS = new Set(["settings"]);

type Tone = {
  bg: Paint;
  fg: ColorVar;
  muted: ColorVar;
  border: { color: ColorVar; opacity?: number };
  activeBg: Paint;
  activeFg: ColorVar;
  indicator: ColorVar;
  /** Count chip of the nav items. */
  chip: { fill: Paint; color: ColorVar; activeFill: Paint; activeColor: ColorVar };
  mark: { fill: ColorVar; color: ColorVar };
};

/** The navigation surface of each tone (`data-tone` of `.dl-app-shell__frame`). */
function toneOf(tone: unknown): Tone {
  if (tone === "inverted") {
    return {
      bg: { color: "color-neutral-950" },
      fg: "color-neutral-50",
      muted: "color-neutral-400",
      border: { color: "color-neutral-50", opacity: 0.1 },
      activeBg: { color: "color-neutral-50", opacity: 0.13 },
      activeFg: "color-neutral-50",
      indicator: "color-brand-400",
      chip: { fill: { color: "color-neutral-50", opacity: 0.16 }, color: "color-neutral-50", activeFill: { color: "color-neutral-50", opacity: 0.16 }, activeColor: "color-neutral-50" },
      mark: { fill: "primary", color: "primary-foreground" },
    };
  }
  if (tone === "brand") {
    return {
      bg: { color: "primary" },
      fg: "primary-foreground",
      muted: "primary-foreground-muted",
      border: { color: "primary-foreground", opacity: 0.16 },
      activeBg: { color: "primary-hover" },
      activeFg: "primary-foreground",
      indicator: "primary-foreground",
      chip: { fill: { color: "primary-foreground", opacity: 0.16 }, color: "primary-foreground", activeFill: { color: "primary-foreground", opacity: 0.16 }, activeColor: "primary-foreground" },
      mark: { fill: "primary-foreground", color: "primary" },
    };
  }
  return {
    bg: { color: "sidebar" },
    fg: "sidebar-foreground",
    muted: "muted-foreground",
    border: { color: "sidebar-border" },
    activeBg: { color: "primary", opacity: 0.12 },
    activeFg: "primary-text",
    indicator: "primary",
    chip: { fill: { color: "muted" }, color: "muted-foreground", activeFill: { color: "primary" }, activeColor: "primary-foreground" },
    mark: { fill: "primary", color: "primary-foreground" },
  };
}

type NavItem = { id: string; label: string; icon: string; count?: number };

function navItems(value: unknown): NavItem[] {
  return records(value)
    .map((item) => ({
      id: str(item.id),
      label: str(item.label),
      icon: str(item.icon) || "home",
      ...(typeof item.count === "number" && { count: item.count }),
    }))
    .filter((item) => item.id);
}

/** Screen a nav item opens: its id when it is a screen (Layout mode), like `screenLinkProps`. */
const itemLink = (input: SectionInput, id: string) => input.ctx.screenHref?.(id) ?? undefined;

/** `NavItem` (vertical) of the sidebar: icon, label and count; the active one tinted with its indicator. */
function sideNavItem(input: SectionInput, item: NavItem, active: boolean, tone: Tone, rail: boolean): FrameNode {
  const color = active ? tone.activeFg : tone.muted;
  const chip =
    item.count !== undefined && !rail
      ? row(
          {
            name: "Count",
            minHeight: 20,
            padding: { x: { px: 6 } },
            align: "center",
            justify: "center",
            radius: "full",
            fill: active ? tone.chip.activeFill : tone.chip.fill,
          },
          [text(item.count, "caption-strong", { color: active ? tone.chip.activeColor : tone.chip.color, tag: "span" })],
        )
      : null;
  const content = row({ name: "Content", width: rail ? "hug" : "fill", align: "center", gap: 3, padding: rail ? 0 : { left: { px: active ? 9 : 12 } } }, [
    icon(item.icon, color, 16),
    rail ? null : text(item.label, active ? "small-strong" : "small", { color, width: "fill", tag: "span" }),
    chip,
  ]);
  const indicator = active ? shape({ name: "Indicator", width: 3, height: 18, radius: "sm", fill: { color: tone.indicator }, role: "decor" }) : null;
  const link = itemLink(input, item.id);
  return row(
    {
      name: active ? "Nav item/active" : "Nav item",
      tag: "a",
      width: rail ? 44 : "fill",
      minHeight: rail ? 44 : 36,
      align: "center",
      justify: rail ? "center" : "start",
      padding: rail ? 0 : { right: 3 },
      radius: "md",
      ...(active && { fill: tone.activeBg }),
      ...(link && { linkTo: link }),
      ...(rail && { label: item.label }),
    },
    rail ? [content] : [indicator, content],
  );
}

function navList(input: SectionInput, items: NavItem[], activeId: string, tone: Tone, rail: boolean, label: string): FrameNode {
  return column({ name: label, tag: "nav", width: rail ? "hug" : "fill", align: rail ? "center" : "stretch" }, [
    column(
      { name: "Nav list", tag: "ul", width: rail ? "hug" : "fill", gap: { px: 2 }, align: rail ? "center" : "stretch" },
      items.map((item) => ({ ...sideNavItem(input, item, item.id === activeId, tone, rail) })),
    ),
  ]);
}

/** `ShellBrand`: monogram and name, with an optional second line. */
function shellBrand(name: string, meta: string | null, tone: Tone | null, rail = false): FrameNode {
  const fg = tone?.fg ?? "foreground";
  return row({ name: "Brand", width: rail ? "hug" : "fill", align: "center", gap: 2 }, [
    brandMark(monogramOf(name), tone?.mark.fill ?? "primary", tone?.mark.color ?? "primary-foreground"),
    rail
      ? null
      : column({ name: "Brand text", width: "fill" }, [
          text(name, "small-strong", { color: fg, tag: "span" }),
          meta ? text(meta, "caption", { color: tone?.muted ?? "muted-foreground", tag: "span" }) : null,
        ]),
  ]);
}

function sidebar(input: SectionInput, tone: Tone, rail: boolean, inset: boolean): FrameNode {
  const { props, build } = input;
  const strings = appStrings(input.ctx.locale);
  const nav = navItems(props.nav);
  const activeId = str(props.activeId);
  const main = nav.filter((item) => !FOOTER_NAV_IDS.has(item.id));
  const footer: NavItem[] = [...nav.filter((item) => FOOTER_NAV_IDS.has(item.id)), { id: "help", label: strings.help, icon: "info" }];
  const user = (props.user ?? {}) as { name?: unknown; role?: unknown };
  const userName = str(user.name) || "—";
  const border: Stroke = { color: tone.border.color, ...(tone.border.opacity !== undefined && { opacity: tone.border.opacity }) };

  const switcher = row(
    { name: "Workspace switcher", tag: "button", width: rail ? "hug" : "fill", align: "center", gap: 2, padding: rail ? 1 : 2, radius: "md" },
    [shellBrand(str(props.brandName), str(props.workspace) || null, tone, rail), rail ? null : icon("chevrons-up-down", tone.muted, 16)],
  );
  const userBlock = row(
    {
      name: "User",
      width: "fill",
      align: "center",
      justify: rail ? "center" : "start",
      gap: 2,
      padding: { top: 3, x: rail ? 0 : 1 },
      stroke: { ...border, sides: ["top"] },
    },
    [
      avatarWithStatus(userName),
      rail
        ? null
        : column({ name: "User text", width: "fill" }, [
            text(userName, "small-strong", { color: tone.fg, tag: "span" }),
            text(user.role, "caption", { color: tone.muted, tag: "span" }),
          ]),
      rail ? null : iconButton("Account menu", "more", tone.muted),
    ],
  );

  return column(
    {
      name: rail ? "Rail" : "Sidebar",
      tag: "aside",
      width: rail ? 72 : build.light.components.sidebar.w,
      height: "fill",
      ...(!inset && { fill: tone.bg, stroke: { ...border, sides: ["right"] } }),
    },
    [
      // Sticky: the navigation spans the viewport (1440×900 frame), so the account sits at its bottom.
      column(
        { name: "Sidebar inner", width: "fill", height: 900, justify: "between", align: rail ? "center" : "stretch", padding: { y: 4, x: rail ? 2 : 3 } },
        [
          column({ name: "Top", width: rail ? "hug" : "fill", gap: 5, align: rail ? "center" : "stretch" }, [
            switcher,
            navList(input, main, activeId, tone, rail, "Main navigation"),
          ]),
          column({ name: "Sidebar footer", width: "fill", gap: 3, align: rail ? "center" : "stretch" }, [
            navList(input, footer, activeId, tone, rail, "Account navigation"),
            userBlock,
          ]),
        ],
      ),
    ],
  );
}

/** The bell with its unread dot. */
function bell(color: ColorVar, dot: ColorVar): FrameNode {
  return overlay(
    "Notifications",
    32,
    [
      iconButton("Notifications", "bell", color),
      row({ name: "Unread", width: 32, height: 32, justify: "end", padding: { top: { px: 6 }, right: { px: 6 } } }, [
        shape({ name: "Dot", shape: "ellipse", width: 7, height: 7, fill: { color: dot }, role: "decor" }),
      ]),
    ],
    { width: 32 },
  );
}

function search(input: SectionInput, width: number): FrameNode {
  const strings = appStrings(input.ctx.locale);
  return control({
    name: "Search",
    size: "sm",
    width,
    placeholder: str(input.props.searchPlaceholder),
    leadingIcon: "search",
    trailing: row({ name: "Kbd", padding: { x: { px: 5 }, y: { px: 1 } }, radius: "sm", fill: { color: "muted" }, stroke: { color: "border" } }, [
      text(strings.searchShortcut, "caption", { color: "muted-foreground", tag: "span" }),
    ]),
  });
}

function topbar(input: SectionInput, variant: string, tone: Tone, padStep: number): FrameNode {
  const { props } = input;
  const topnav = variant === "topnav";
  const showSearch = props.showSearch === true;
  const nav = navItems(props.nav);
  const activeId = str(props.activeId);
  const user = (props.user ?? {}) as { name?: unknown };
  const fg: ColorVar = topnav ? tone.fg : "foreground";
  const navBar = topnav
    ? row(
        { name: "Top navigation", tag: "nav", align: "center", gap: 1 },
        nav.map((item) => {
          const active = item.id === activeId;
          const color = active ? tone.activeFg : tone.muted;
          const link = itemLink(input, item.id);
          return column(
            {
              name: active ? "Nav item/active" : "Nav item",
              tag: "a",
              minHeight: Math.round(input.build.light.components.nav.h * 0.55),
              justify: "center",
              radius: "md",
              ...(active && { fill: tone.activeBg }),
              ...(link && { linkTo: link }),
            },
            [
              row({ name: "Content", align: "center", gap: 2, padding: { x: 3 }, ...(active && { offsetTop: { px: 2 } }) }, [
                text(item.label, active ? "small-strong" : "small", { color, tag: "span" }),
                item.count !== undefined
                  ? row({ name: "Count", minHeight: 20, padding: { x: { px: 6 } }, align: "center", radius: "full", fill: active ? tone.chip.activeFill : tone.chip.fill }, [
                      text(item.count, "caption-strong", { color: active ? tone.chip.activeColor : tone.chip.color }),
                    ])
                  : null,
              ]),
              // The active item's 2 px underline, over the middle half of the item.
              active
                ? row({ name: "Underline", width: "fill", justify: "center", offsetTop: { px: 0 } }, [
                    shape({ name: "Indicator", width: Math.max(12, Math.round(item.label.length * 3.8)), height: 2, radius: "sm", fill: { color: tone.indicator }, role: "decor" }),
                  ])
                : null,
            ],
          );
        }),
      )
    : null;
  return row(
    {
      name: "Top bar",
      tag: "header",
      width: "fill",
      align: "center",
      gap: 3,
      minHeight: input.build.light.components.nav.h,
      padding: { x: padStep },
      ...(topnav && { fill: tone.bg }),
      stroke: topnav ? { color: tone.border.color, ...(tone.border.opacity !== undefined && { opacity: tone.border.opacity }), sides: ["bottom"] } : { color: "border", sides: ["bottom"] },
    },
    [
      row({ name: "Top bar start", width: "fill", align: "center", gap: 3 }, [
        topnav ? { ...shellBrand(str(props.brandName), null, tone), width: "hug" } : null,
        navBar,
        !topnav && showSearch ? search(input, 384) : null,
      ]),
      row({ name: "Top bar end", align: "center", gap: 2 }, [
        topnav && showSearch ? search(input, 224) : null,
        bell(fg, topnav && props.tone === "brand" ? "primary-foreground" : "primary"),
        topnav ? avatar(str(user.name) || "—", "sm") : null,
      ]),
    ],
  );
}

function pageHeader(input: SectionInput): FrameNode | null {
  const { props } = input;
  if (props.showPageHeader !== true) return null;
  const size = props.density === "compact" ? "sm" : "md";
  return row({ name: "Page header", width: "fill", align: "end", justify: "between", gap: 5, wrap: true }, [
    column({ name: "Heading", width: "fill" }, [
      text(props.title, "h3", { tag: "h1" }),
      text(props.subtitle, "small", { color: "muted-foreground", offsetTop: 1 }),
    ]),
    row({ name: "Actions", align: "center", gap: 2 }, [
      button(appStrings(input.ctx.locale).export, { variant: "outline", size, leadingIcon: "download" }),
      button(props.primaryAction, { variant: "primary", size, leadingIcon: "plus" }),
    ]),
  ]);
}

/**
 * The widgets: one child (a screen's layout) fills the content; several (a legacy dashboard) flow through the
 * 12-column grid with the spans of `.dl-app-shell__content` (chart 8, activity 4, settings 7, dialog 5).
 */
function content(input: SectionInput, gapStep: number): FrameNode {
  const { children, build } = input;
  if (children.length <= 1) return column({ name: "Page content", width: "fill" }, children);
  let col = 0;
  let line = 0;
  const placed = children.map((child) => {
    const key = child.type === "frame" ? child.key : undefined;
    const span = SHELL_SPANS[elementType(build.doc, key) ?? ""] ?? 12;
    if (col + span > 12) {
      col = 0;
      line += 1;
    }
    const place = { col, span, row: line };
    col += span;
    const node = { ...child, place, ...(line > 0 && { offsetTop: gapStep }) } as DesignNode;
    if (col >= 12) {
      col = 0;
      line += 1;
    }
    return node;
  });
  return grid({ name: "Page content", columns: 12, gap: gapStep }, placed);
}

/** A shell placed as a block: the phone layout of its container query (top bar with menu, brand and account). */
function blockShell(input: SectionInput, gapStep: number): FrameNode {
  const { props } = input;
  const user = (props.user ?? {}) as { name?: unknown };
  return column({ name: "App shell", width: "fill", minHeight: 900, fill: { color: "muted", opacity: 0.55 } }, [
    row(
      { name: "Top bar", tag: "header", width: "fill", align: "center", gap: 3, minHeight: input.build.light.components.nav.h, padding: { x: 4 }, stroke: { color: "border", sides: ["bottom"] } },
      [
        row({ name: "Top bar start", width: "fill", align: "center", gap: 2 }, [menuButton("foreground"), { ...shellBrand(str(props.brandName), null, null), width: "hug" }]),
        row({ name: "Top bar end", align: "center", gap: 1 }, [
          props.showSearch === true ? iconButton("Search", "search") : null,
          bell("foreground", "primary"),
          avatar(str(user.name) || "—", "sm"),
        ]),
      ],
    ),
    pageHeader(input) || input.children.length > 0
      ? column({ name: "Page", tag: "section", width: "fill", gap: 4, padding: { top: { px: 14 }, x: 4, bottom: 4 } }, [
          pageHeader(input),
          content(input, gapStep),
        ])
      : null,
  ]);
}

export const shellBuilder: SectionBuilder = (input) => {
  const { props, variant, build, id } = input;
  const { pad, gap } = shellDensity(props.density);
  const isFrame = id === SHELL_ELEMENT_ID || input.children.length > 0;
  if (!isFrame) return blockShell(input, gap);

  const tone = toneOf(props.tone);
  const layout = ["sidebar", "inset", "rail", "topnav"].includes(variant) ? variant : "sidebar";
  const inset = layout === "inset";
  const padPx = build.light.space[pad - 1] ?? 24;
  const page = column(
    {
      name: "Page",
      tag: "section",
      width: "fill",
      maxWidth: build.light.layout.container + 2 * padPx,
      gap,
      padding: { top: { px: Math.round(padPx * 0.85) }, x: pad, bottom: pad },
    },
    [pageHeader(input), content(input, gap)],
  );
  const main = column(
    {
      name: "Main",
      width: "fill",
      align: "center",
      ...(inset && { fill: { color: "background" }, stroke: { color: "border" }, radius: "xl", shadow: "sm", clip: true }),
    },
    [topbar(input, layout, tone, pad), page],
  );
  const canvas: Paint = inset ? tone.bg : { color: "muted", opacity: 0.55 };
  // Inset: the panel keeps 8 px from the edges and the canvas takes the navigation's tone.
  const body = inset ? column({ name: "Main inset", width: "fill", padding: { y: 2, right: 2 } }, [main]) : main;
  return column({ name: "App shell", width: "fill", minHeight: 900, fill: inset && props.tone === "default" ? { color: "muted", opacity: 0.55 } : canvas }, [
    layout === "topnav" ? body : frameRow(sidebar(input, tone, layout === "rail", inset), body, layout === "rail" ? 72 : build.light.components.sidebar.w),
  ]);
};

/**
 * Navigation beside the main column. A row of a fixed sidebar and a `fill` main would be the plain structure,
 * but the plan emitter gives a row's `fill` child less room when it has fixed siblings, and the content's
 * grids take their cell widths from that room. So the frame is a grid of equal columns where the sidebar's
 * px are a whole number of columns of the 1440 px frame (256 px = 8 of 45; the 72 px rail = 1 of 20).
 */
function frameRow(side: FrameNode, main: FrameNode, sidePx: number): FrameNode {
  const PAGE_WIDTH = DESKTOP_COLUMNS * COL_PX;
  const unit = gcd(PAGE_WIDTH, sidePx);
  const columns = PAGE_WIDTH / unit;
  const span = sidePx / unit;
  return grid({ name: "Frame", columns, gap: 0, minHeight: 900 }, [
    { ...side, width: "fill", place: { col: 0, span, row: 0 } },
    { ...main, place: { col: span, span: columns - span, row: 0 } },
  ]);
}

const gcd = (a: number, b: number): number => (b === 0 ? a : gcd(b, a % b));
