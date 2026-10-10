// app.componentGallery: the @dialmade/ui kit with the theme applied: eyebrow, title and subtitle, the section
// index (variant `index`) and every gallery section (buttons, fields, selection, badges, avatars, navigation,
// cards, metrics, table, charts, overlays, feedback) with its demos drawn from the kit's pieces.
import { GALLERY_SECTIONS, type GallerySectionId } from "@dialmade/ui";
import type { BuildContext, SectionBuilder } from "../../context";
import { button, card, column, grid, icon, row, shape, str, text, type ButtonVariant } from "../../nodes";
import type { ColorVar, DesignNode, FrameNode } from "../../types";
import { chart, type ChartType } from "./chart";
import { dialogPanel, dialogPreview } from "./confirmDialog";
import { GALLERY_COPY, type GalleryCopy } from "./galleryCopy";
import { statCard } from "./kpiRow";
import { CELL, appStrings, avatar, avatarPx, checkbox, control, elementWidth, iconButton, kitBadge, progressBar, switchTrack, type KitBadgeVariant } from "./shared";

/** `ESSENTIAL_SECTIONS` of the section (scope «essentials»). */
const ESSENTIAL_SECTIONS: readonly GallerySectionId[] = ["buttons", "forms", "selection", "badges", "cards", "table", "overlays"];
/** `PEOPLE` of the gallery's demos. */
const PEOPLE = ["Lucía Navarro", "Marco Ruiz", "Aiko Tanaka", "Sam Okafor", "Elena Petrova", "Tomás Vidal", "Nora Lind"] as const;

type Demo = { label: string; full?: boolean; bare?: boolean; content: (DesignNode | null)[] };
type Ctx = { copy: GalleryCopy; locale: "es" | "en"; kitWidth: number; build: BuildContext };

const intl = (locale: "es" | "en") => (locale === "es" ? "es-MX" : "en-US");
const wrapRow = (name: string, children: (DesignNode | null)[], gap = 3) => row({ name, width: "fill", align: "center", gap, wrap: true }, children);
const mono = (value: string) => text(value, "mono-caption", { color: "muted-foreground", tag: "span" });

/** `GalleryState`: an example with its state name under it. */
const state = (label: string, node: DesignNode | null, stretch = false) =>
  column({ name: `State/${label}`, width: stretch ? "fill" : "hug", gap: 2, align: stretch ? "stretch" : "start" }, [node, mono(label)]);

/** `GalleryDemo`: an overline label over a dashed surface (or the bare content). */
function demo(d: Demo): FrameNode {
  const content = d.content.filter((node): node is DesignNode => !!node);
  return column({ name: `Demo/${d.label}`, width: "fill", gap: 3 }, [
    text(d.label, "overline", { color: "muted-foreground", tag: "p" }),
    d.bare
      ? column({ name: "Surface", width: "fill", gap: 4 }, content)
      : column({ name: "Surface", width: "fill", gap: 4, padding: 5, radius: "lg", fill: { color: "background" }, stroke: { color: "border", dashed: true } }, content),
  ]);
}

/** The demos of a section in the gallery grid (two columns at the kit's width; `full` demos take a row). */
function demoGrid(demos: Demo[], columns: number): FrameNode {
  let col = 0;
  let line = 0;
  const placed = demos.map((d) => {
    const span = d.full ? columns : 1;
    if (col + span > columns) {
      col = 0;
      line += 1;
    }
    const node = { ...demo(d), place: { col, span, row: line } } as DesignNode;
    col += span;
    if (col >= columns) {
      col = 0;
      line += 1;
    }
    return node;
  });
  return { ...grid({ name: "Demos", columns, gap: 6 }, placed), layout: { kind: "grid", columns, gap: 6, rowGap: 6, align: "start" } };
}

/* ------------------------------------------------------------------------------------------------ */
/* Demos per section                                                                                */
/* ------------------------------------------------------------------------------------------------ */

function buttonsDemos({ copy }: Ctx): Demo[] {
  const t = copy.buttons;
  const s = copy.states;
  const variants = ["primary", "secondary", "outline", "ghost", "cta", "destructive"] as const satisfies readonly ButtonVariant[];
  const tinted = (variant: "primary" | "outline") => (variant === "primary" ? { fill: { color: "primary-hover" } } : { fill: { color: "accent" } });
  const states = (variant: "primary" | "outline"): Demo => ({
    label: `${t.states} · ${t.variantLabels[variant]}`,
    full: true,
    content: [
      wrapRow(
        "States",
        [
          state(s.default, button(t.save, { variant })),
          state(s.hover, { ...button(t.save, { variant })!, ...tinted(variant) }),
          state(s.focus, { ...button(t.save, { variant })!, stroke: { color: "ring", width: 2 } }),
          state(s.active, { ...button(t.save, { variant })!, ...tinted(variant) }),
          state(s.disabled, { ...button(t.save, { variant })!, opacity: 0.5 }),
          state(s.loading, { ...button(t.save, { variant })!, name: "Button/loading", width: 132, children: [icon("loader", variant === "primary" ? "primary-foreground" : "foreground", 16)] }),
        ],
        5,
      ),
    ],
  });
  return [
    { label: t.variants, full: true, content: [wrapRow("Variants", variants.map((variant) => button(t.variantLabels[variant], { variant })))] },
    { label: t.sizes, content: [wrapRow("Sizes", (["sm", "md", "lg"] as const).map((size) => button(t.sizeLabels[size], { size })))] },
    {
      label: t.withIcon,
      content: [
        wrapRow("With icon", [
          button(t.newProject, { leadingIcon: "plus" }),
          button(t.continue, { variant: "outline", icon: "arrow-right" }),
          button(t.download, { variant: "secondary", size: "sm", leadingIcon: "download" }),
        ]),
      ],
    },
    {
      label: t.iconOnly,
      content: [
        wrapRow("Icon only", [
          { ...iconButton(t.search, "search", "foreground", "md"), stroke: { color: "border-strong" } },
          iconButton(t.notifications, "bell", "foreground", "md"),
          { ...iconButton(t.settings, "sliders", "secondary-foreground", "md"), fill: { color: "secondary" } },
          { ...iconButton(t.newProject, "plus", "primary-foreground", "md"), fill: { color: "primary" }, radius: "full" },
          iconButton(t.more, "more", "foreground", "sm"),
        ]),
      ],
    },
    states("primary"),
    states("outline"),
  ];
}

/** A field with its box stroked in another color (hover, focus, error previews). */
function recolor(field: FrameNode, color: ColorVar): FrameNode {
  return {
    ...field,
    children: field.children.map((child) =>
      child.type === "frame" && /Input|Select|Textarea/.test(child.name) ? { ...child, stroke: { color, ...(color === "ring" && { width: 2 }) } } : child,
    ),
  };
}

function formsDemos({ copy }: Ctx): Demo[] {
  const t = copy.forms;
  const s = copy.states;
  const error = (message: string) =>
    row({ name: "Error", width: "fill", gap: 1, align: "start" }, [icon("alert-circle", "destructive", 12), text(message, "caption-strong", { color: "destructive", width: "fill" })]);
  const select = (label: string, placeholder: string, invalid = false) => {
    const field = control({ name: "Select", label, placeholder, trailingIcon: "chevrons-up-down" });
    return invalid ? { ...recolor(field, "destructive"), children: [...recolor(field, "destructive").children, error(t.billingError)] } : field;
  };
  return [
    { label: t.textField, content: [control({ label: t.email, placeholder: t.emailPlaceholder, hint: t.emailHint }), control({ placeholder: t.searchPlaceholder, leadingIcon: "search" })] },
    { label: t.textarea, content: [control({ label: t.message, placeholder: t.messagePlaceholder, hint: t.messageHint, multiline: true })] },
    { label: t.select, content: [select(t.country, t.countryPlaceholder), select(t.billing, t.billingPlaceholder, true)] },
    {
      label: t.fieldStates,
      full: true,
      content: [
        grid({ name: "Field states", columns: 3, gap: 5, rowGap: 5 }, [
          state(s.default, control({ label: t.email, placeholder: t.emailPlaceholder }), true),
          state(s.hover, recolor(control({ label: t.email, placeholder: t.emailPlaceholder }), "border-strong"), true),
          state(s.focus, recolor(control({ label: t.email, placeholder: t.emailPlaceholder }), "ring"), true),
          state(s.error, { ...recolor(control({ label: `${t.username} *`, value: t.usernameValue }), "destructive"), children: [...recolor(control({ label: `${t.username} *`, value: t.usernameValue }), "destructive").children, error(t.usernameError)] }, true),
          state(s.disabled, { ...control({ label: t.plan, value: t.planValue }), opacity: 0.6 }, true),
          state(s.disabled, { ...control({ name: "Select", label: t.region, value: t.regionValue, trailingIcon: "chevrons-up-down" }), opacity: 0.6 }, true),
        ]),
      ],
    },
  ];
}

/** `Checkbox` / `Radio` / `Switch` with its label and description. */
function choice(control_: DesignNode, label: string, description?: string, disabled = false): FrameNode {
  return row({ name: `Choice/${label}`, width: "fill", align: "start", gap: 3, ...(disabled && { opacity: 0.55 }) }, [
    control_,
    column({ name: "Text", width: "fill", gap: { px: 2 } }, [text(label, "small-strong", { tag: "span" }), description ? text(description, "caption", { color: "muted-foreground" }) : null]),
  ]);
}

const radio = (checked: boolean): FrameNode =>
  row({ name: checked ? "Radio/checked" : "Radio", width: 18, height: 18, radius: "full", fill: { color: "background" }, stroke: { color: checked ? "primary" : "input", width: checked ? 5 : 1.5 } }, []);

const withStroke = (node: DesignNode, color: ColorVar, width = 1.5): DesignNode => (node.type === "frame" || node.type === "shape" ? { ...node, stroke: { color, width } } : node);

function selectionDemos({ copy }: Ctx): Demo[] {
  const t = copy.selection;
  const s = copy.states;
  const indeterminate = row({ name: "Checkbox/indeterminate", width: 18, height: 18, align: "center", justify: "center", radius: "sm", fill: { color: "primary" } }, [icon("minus", "primary-foreground", 14)]);
  return [
    {
      label: t.checkboxes,
      content: [
        choice(checkbox(false), t.remember),
        choice(checkbox(true), t.terms, t.termsDescription),
        choice(indeterminate, t.selectAll),
        choice(checkbox(false), t.archived, undefined, true),
        choice(withStroke(checkbox(false), "destructive"), t.mustAccept),
      ],
    },
    {
      label: t.radios,
      content: [
        column({ name: "Radio group", width: "fill", gap: 3 }, [
          text(t.billing, "small-strong"),
          choice(radio(false), t.monthly, t.monthlyDescription),
          choice(radio(true), t.yearly, t.yearlyDescription),
          choice(radio(false), t.enterprise, t.enterpriseDescription, true),
        ]),
      ],
    },
    {
      label: t.switches,
      content: [choice(switchTrack(true), t.emailNotifications), choice(switchTrack(false), t.compactMode, t.compactDescription), choice(switchTrack(true), t.sync, undefined, true), choice(switchTrack(false), t.sync)],
    },
    {
      label: copy.buttons.states,
      full: true,
      content: [
        wrapRow(
          "States",
          [
            state(s.hover, withStroke(checkbox(false), "primary")),
            state(s.focus, withStroke(checkbox(true), "ring", 2)),
            state(s.active, withStroke(checkbox(false), "primary")),
            state(s.checked, checkbox(true)),
            state(s.indeterminate, indeterminate),
            state(`${s.disabled} · ${s.checked}`, { ...(checkbox(true) as FrameNode), opacity: 0.55 }),
            state(s.focus, { ...switchTrack(false), stroke: { color: "ring", width: 2 } }),
            state(s.hover, switchTrack(true)),
            state(s.active, switchTrack(false)),
          ],
          5,
        ),
      ],
    },
  ];
}

function badgesDemos({ copy }: Ctx): Demo[] {
  const t = copy.badges;
  const variants: KitBadgeVariant[] = ["default", "neutral", "success", "warning", "info", "destructive", "outline"];
  return [
    { label: t.soft, content: [wrapRow("Soft", variants.map((variant) => kitBadge(t.labels[variant], variant)), 2)] },
    { label: t.solid, content: [wrapRow("Solid", variants.map((variant) => kitBadge(t.labels[variant], variant, { solid: true })), 2)] },
    {
      label: t.withDot,
      content: [
        wrapRow(
          "With dot",
          [
            kitBadge(t.online, "success", { dot: true }),
            kitBadge(t.labels.warning, "warning", { dot: true }),
            kitBadge(t.labels.default, "info", { icon: "sparkle" }),
            kitBadge(t.small, "default", { size: "sm" }),
            { ...kitBadge(t.large, "outline")!, minHeight: 28, padding: { x: 3 } },
          ],
          2,
        ),
      ],
    },
  ];
}

/** An avatar of any px size (initials on its tone over the card), with an optional status dot or ring. */
function sizedAvatar(build: BuildContext, name: string, px: number, options: { square?: boolean; status?: ColorVar; ring?: boolean } = {}): FrameNode {
  const base = avatarPx(build, name, px, options.square);
  const sized: FrameNode = options.ring ? { ...base, stroke: { color: "background", width: 2 } } : base;
  if (!options.status) return sized;
  const dot = Math.max(8, Math.round(px * 0.26));
  const layers: FrameNode[] = [
    sized,
    row({ name: "Status", width: px, height: px, align: "end", justify: "end" }, [
      shape({ name: "Status dot", shape: "ellipse", width: dot, height: dot, fill: { color: options.status }, stroke: { color: "background", width: 2 }, role: "decor" }),
    ]),
  ];
  return { type: "frame", name: "Avatar with status", width: px, layout: { kind: "tracks", columns: [1], rows: [px], areas: null }, children: layers.map((layer) => ({ ...layer, area: CELL })) };
}

function avatarGroup(build: BuildContext, names: readonly string[], px: number, max: number): FrameNode {
  const shown = names.slice(0, max);
  const rest = names.length - shown.length;
  return row({ name: "Avatar group", align: "center" }, [
    ...shown.map((name) => sizedAvatar(build, name, px, { ring: true })),
    rest > 0
      ? row({ name: "More", width: px, height: px, align: "center", justify: "center", radius: "full", fill: { color: "muted" }, stroke: { color: "background", width: 2 } }, [
          text(`+${rest}`, "caption-strong", { color: "muted-foreground" }),
        ])
      : null,
  ]);
}

function avatarsDemos({ copy, build }: Ctx): Demo[] {
  const t = copy.avatars;
  return [
    { label: t.sizes, content: [wrapRow("Sizes", [24, 32, 40, 48, 64].map((px, i) => sizedAvatar(build, PEOPLE[i]!, px)))] },
    {
      label: t.status,
      content: [
        wrapRow("Status", [
          sizedAvatar(build, PEOPLE[0], 48, { status: "success" }),
          sizedAvatar(build, PEOPLE[1], 48, { status: "warning" }),
          sizedAvatar(build, PEOPLE[2], 48, { status: "destructive" }),
          sizedAvatar(build, PEOPLE[3], 48, { status: "muted-foreground" }),
        ]),
      ],
    },
    { label: t.shapes, content: [wrapRow("Shapes", [sizedAvatar(build, PEOPLE[4], 48), sizedAvatar(build, PEOPLE[5], 48, { square: true }), sizedAvatar(build, PEOPLE[6], 48, { square: true, status: "success" })])] },
    { label: t.group, content: [avatarGroup(build, PEOPLE, 40, 4), avatarGroup(build, PEOPLE.slice(0, 3), 32, 3)] },
  ];
}

function navigationDemos({ copy }: Ctx): Demo[] {
  const t = copy.navigation;
  const tab = (label: string, selected: boolean, extra: DesignNode | null = null, disabled = false) =>
    column({ name: selected ? "Tab/selected" : "Tab", ...(disabled && { opacity: 0.5 }) }, [
      row({ name: "Label", align: "center", gap: 2, padding: { x: { px: 2 } }, minHeight: 38 }, [text(label, selected ? "small-strong" : "small", { color: selected ? "foreground" : "muted-foreground" }), extra]),
      selected ? shape({ name: "Indicator", width: "fill", height: 2, radius: "sm", fill: { color: "primary" }, role: "decor" }) : shape({ name: "Indicator", width: "fill", height: 2, role: "decor" }),
    ]);
  const segment = (labels: string[], selected: number, small = false) =>
    row(
      { name: "Segmented", width: small ? "fill" : "hug", gap: 1, padding: { px: 3 }, radius: "md", fill: { color: "muted" } },
      labels.map((label, i) =>
        row(
          { name: i === selected ? "Segment/selected" : "Segment", width: small ? "fill" : "hug", justify: "center", align: "center", minHeight: small ? 30 : 36, padding: { x: small ? 2 : 3 }, radius: "md", ...(i === selected && { fill: { color: "background" }, shadow: "sm" as const }) },
          [text(label, small ? "caption-strong" : "small-strong", { color: i === selected ? "foreground" : "muted-foreground" })],
        ),
      ),
    );
  const crumb = (items: string[], slash = false) =>
    row(
      { name: "Breadcrumb", tag: "nav", align: "center", gap: 2, wrap: true },
      items.flatMap((label, i) => [
        i === 0 && !slash ? icon("home", "muted-foreground", 14) : null,
        text(label, i === items.length - 1 ? "small-strong" : "small", { color: i === items.length - 1 ? "foreground" : "muted-foreground" }),
        i < items.length - 1 ? (slash ? text("/", "small", { color: "muted-foreground" }) : icon("chevron-right", "muted-foreground", 14)) : null,
      ]),
    );
  const navItem = (label: string, glyph: string, options: { active?: boolean; count?: number; hover?: boolean; focus?: boolean; disabled?: boolean; soon?: string } = {}) =>
    row(
      {
        name: "Nav item",
        width: "fill",
        minHeight: 36,
        align: "center",
        gap: 3,
        padding: { x: 3 },
        radius: "md",
        ...(options.active && { fill: { color: "primary", opacity: 0.12 } }),
        ...(options.hover && { fill: { color: "sidebar-accent" } }),
        ...(options.focus && { stroke: { color: "ring", width: 2 } }),
        ...(options.disabled && { opacity: 0.5 }),
      },
      [
        icon(glyph, options.active ? "primary-text" : "muted-foreground", 16),
        text(label, "small", { color: options.active ? "primary-text" : "muted-foreground", width: "fill", weight: options.active ? 600 : 500 }),
        options.count !== undefined
          ? row({ name: "Count", minHeight: 20, padding: { x: { px: 6 } }, align: "center", radius: "full", fill: { color: "muted" } }, [text(options.count, "caption-strong", { color: "muted-foreground" })])
          : null,
        options.soon ? kitBadge(options.soon, "outline", { size: "sm" }) : null,
      ],
    );
  return [
    {
      label: t.tabs,
      content: [
        column({ name: "Tabs", width: "fill", gap: 4 }, [
          row({ name: "Tab list", width: "fill", gap: 5, stroke: { color: "border", sides: ["bottom"] } }, [
            tab(t.overview, true),
            tab(t.activity, false, kitBadge("3", "default", { size: "sm" })),
            tab(t.settings, false),
            tab(t.archived, false, null, true),
          ]),
          text(t.overviewContent, "small", { color: "muted-foreground" }),
        ]),
      ],
    },
    { label: t.segmented, content: [segment([t.day, t.week, t.month], 1), segment([t.day, t.week, t.month], 0, true)] },
    { label: t.breadcrumb, content: [crumb([t.home, t.projects, t.project, t.settings]), crumb([t.projects, t.project], true)] },
    {
      label: t.sidebar,
      content: [
        column({ name: "Sidebar items", tag: "ul", width: "fill", gap: { px: 2 } }, [
          navItem(t.home, "home", { active: true }),
          navItem(t.inbox, "inbox", { count: 12 }),
          navItem(t.projects, "folder", { hover: true }),
          navItem(t.customers, "users", { focus: true }),
          navItem(t.reports, "bar-chart", { disabled: true, soon: t.soon }),
          navItem(t.settings, "sliders"),
        ]),
      ],
    },
    {
      label: t.topNav,
      content: [
        row(
          { name: "Top nav", tag: "ul", align: "center", gap: 1 },
          [t.product, t.pricing, t.docs, t.blog].map((label, i) =>
            column({ name: "Nav item", minHeight: 35, justify: "center", padding: { x: 3 }, radius: "md", ...(i === 0 && { fill: { color: "primary", opacity: 0.12 } }), ...(i === 2 && { fill: { color: "sidebar-accent" } }) }, [
              text(label, "small", { color: i === 0 ? "primary-text" : "muted-foreground", weight: i === 0 ? 600 : 500 }),
            ]),
          ),
        ),
      ],
    },
  ];
}

function cardsDemos({ copy, build }: Ctx): Demo[] {
  const t = copy.cards;
  const head = (title: string, description?: string, action: DesignNode | null = null, small = false) =>
    row({ name: "Card header", width: "fill", align: "start", justify: "between", gap: 3 }, [
      column({ name: "Heading", width: "fill", gap: 1 }, [text(title, "h3", { color: "card-foreground", tag: small ? "h4" : "h3" }), description ? text(description, "small", { color: "muted-foreground" }) : null]),
      action,
    ]);
  return [
    {
      label: t.basic,
      bare: true,
      content: [
        card(
          "Card/basic",
          [
            head(t.proTitle, t.proDescription),
            row({ name: "Price", align: "baseline", gap: 1 }, [text(t.proPrice, "h2", { color: "card-foreground" }), text(t.proPeriod, "small", { color: "muted-foreground" })]),
            column({ name: "Features", tag: "ul", width: "fill", gap: 2 }, t.proFeatures.map((feature) => row({ name: "Feature", tag: "li", align: "center", gap: 2 }, [icon("check", "success", 14), text(feature, "small", { color: "card-foreground" })]))),
            button(t.upgrade, { width: "fill" }),
          ],
          { gap: 4 },
        ),
      ],
    },
    {
      label: t.withActions,
      bare: true,
      content: [
        card(
          "Card/actions",
          [
            head(t.reportTitle, t.reportDescription, iconButton(t.moreActions, "more")),
            text(t.reportBody, "small", { color: "muted-foreground" }),
            row({ name: "Card footer", width: "fill", align: "center", justify: "between", padding: { top: 4 }, stroke: { color: "border", sides: ["top"] } }, [
              avatarGroup(build, PEOPLE.slice(0, 5), 32, 3),
              kitBadge(t.shared, "success", { dot: true }),
            ]),
          ],
          { gap: 4 },
        ),
      ],
    },
    {
      label: t.interactive,
      bare: true,
      content: [
        card("Card/interactive", [head(t.templateTitle, t.templateDescription, icon("arrow-up-right", "muted-foreground", 16)), text(t.templateBody, "small", { color: "muted-foreground" })], { gap: 4 }),
        card("Card/hover", [head(t.templateTitle, `${copy.states.hover} · ${t.templateDescription}`)], { gap: 4, stroke: { color: "border-strong" }, shadow: "lg" }),
      ],
    },
    {
      label: t.muted,
      bare: true,
      content: [
        card("Card/muted", [head(t.tipTitle, undefined, null, true), text(t.tipBody, "small", { color: "muted-foreground" })], { gap: 4, fill: { color: "muted" }, shadow: undefined }),
        card("Card/outline", [head(t.proTitle, t.proDescription, null, true), button(t.details, { variant: "outline", size: "sm" })], { gap: 4, fill: undefined, shadow: undefined }),
      ],
    },
  ];
}

function statsDemos({ copy, locale, kitWidth }: Ctx): Demo[] {
  const t = copy.stats;
  const n = new Intl.NumberFormat(intl(locale));
  const money = new Intl.NumberFormat(intl(locale), { style: "currency", currency: copy.table.currency, maximumFractionDigits: 0 });
  const pct = new Intl.NumberFormat(intl(locale), { style: "percent", maximumFractionDigits: 1 });
  const cards = [
    statCard({ id: "revenue", label: t.revenue, value: money.format(t.revenueValue), delta: 12.4, invert: false, icon: "bar-chart", trend: [31, 34, 33, 38, 41, 40, 45, 48] }, t.vsLastMonth, true, locale),
    statCard({ id: "users", label: t.activeUsers, value: n.format(t.activeUsersValue), delta: 3.1, invert: false, icon: "users", trend: [78, 80, 79, 81, 83, 82, 84] }, t.vsLastMonth, true, locale),
    statCard({ id: "churn", label: t.churn, value: pct.format(t.churnValue), delta: -0.6, invert: true, trend: [3.4, 3.1, 3.2, 2.9, 2.7, 2.6, 2.4] }, t.vsLastMonth, true, locale),
    statCard({ id: "tickets", label: t.tickets, value: n.format(t.ticketsValue), delta: 18, invert: true, icon: "inbox", trend: [] }, t.vsLastMonth, false, locale),
  ];
  const columns = Math.max(1, Math.floor((kitWidth + 20) / (240 + 20)));
  return [{ label: copy.sections.stats.title, full: true, bare: true, content: [grid({ name: "Stats", columns, gap: 5 }, cards)] }];
}

function tableDemos({ copy, locale, build }: Ctx): Demo[] {
  const t = copy.table;
  const statuses = ["paid", "pending", "paid", "overdue", "draft"] as const;
  const variant: Record<(typeof statuses)[number], KitBadgeVariant> = { paid: "success", pending: "warning", overdue: "destructive", draft: "neutral" };
  const money = new Intl.NumberFormat(intl(locale), { style: "currency", currency: t.currency });
  const date = new Intl.DateTimeFormat(intl(locale), { day: "numeric", month: "short", year: "numeric", timeZone: "UTC" });
  // `INVOICES` of the table demo (first page).
  const invoices = Array.from({ length: 5 }, (_, index) => ({
    id: `INV-${String(2041 - index).padStart(4, "0")}`,
    customer: PEOPLE[index % PEOPLE.length]!,
    status: statuses[index % statuses.length]!,
    date: date.format(new Date(Date.UTC(2026, 8, 28 - index * 2))),
    amount: money.format(Math.round((420 + ((index * 7919) % 2600) + index * 13.5) * 100) / 100),
  }));
  const cell = (content: DesignNode | null, end = false) => row({ name: "td", width: "fill", height: 48, align: "center", justify: end ? "end" : "start", padding: { x: 4 } }, [content]);
  const pager = locale === "es" ? { range: "1–5 de 12", page: "Página 1 de 3", previous: "Anterior", next: "Siguiente" } : { range: "1–5 of 12", page: "Page 1 of 3", previous: "Previous", next: "Next" };
  return [
    {
      label: copy.sections.table.title,
      full: true,
      bare: true,
      content: [
        column({ name: "Table", tag: "table", width: "fill", fill: { color: "card" }, stroke: { color: "border" }, radius: "card", clip: true }, [
          row({ name: "Caption", width: "fill", padding: { top: 4, x: 4, bottom: 3 } }, [text(t.caption, "body-strong", { color: "card-foreground" })]),
          row(
            { name: "tr/head", width: "fill", fill: { color: "muted" }, stroke: { color: "border", sides: ["bottom"] } },
            [t.invoice, t.customer, t.status, t.date, t.amount].map((label, i) =>
              row({ name: "th", width: "fill", height: 38, align: "center", justify: i === 4 ? "end" : "start", padding: { x: 4 } }, [text(label, "caption-strong", { color: "muted-foreground", tag: "th" })]),
            ),
          ),
          ...invoices.map((invoice, i) =>
            row({ name: `tr/${invoice.id}`, width: "fill", ...(i < invoices.length - 1 && { stroke: { color: "border", sides: ["bottom"] } }) }, [
              cell(text(invoice.id, "mono-caption", { color: "card-foreground" })),
              cell(row({ name: "Customer", align: "center", gap: 2 }, [avatar(build, invoice.customer, "xs"), text(invoice.customer, "small", { color: "card-foreground" })])),
              cell(kitBadge(t.statuses[invoice.status], variant[invoice.status], { dot: true })),
              cell(text(invoice.date, "small", { color: "card-foreground" })),
              cell(text(invoice.amount, "small", { color: "card-foreground" }), true),
            ]),
          ),
          row({ name: "Pagination", width: "fill", align: "center", justify: "between", padding: { y: 2, x: 4 }, stroke: { color: "border", sides: ["top"] } }, [
            text(pager.range, "caption", { color: "muted-foreground" }),
            row({ name: "Controls", align: "center", gap: 2 }, [
              { ...button(pager.previous, { variant: "outline", size: "sm", leadingIcon: "chevron-left" })!, opacity: 0.5 },
              text(pager.page, "caption", { color: "muted-foreground" }),
              button(pager.next, { variant: "outline", size: "sm", icon: "chevron-right" }),
            ]),
          ]),
        ]),
      ],
    },
  ];
}

function chartsDemos({ copy, locale, kitWidth, build }: Ctx): Demo[] {
  const t = copy.charts;
  const width = (kitWidth - 24) / 2 - 48;
  const compact = new Intl.NumberFormat(intl(locale), { notation: "compact", maximumFractionDigits: 1 });
  const currency = new Intl.NumberFormat(intl(locale), { style: "currency", currency: copy.table.currency, currencyDisplay: "narrowSymbol", notation: "compact", maximumFractionDigits: 1 });
  const weekly = [1240, 1310, 1295, 1420, 1510, 1490, 1630, 1720, 1680, 1810, 1905, 2040];
  const chartDemo = (label: string, title: string, type: ChartType, categories: readonly string[], series: { name: string; values: number[] }[], format = (v: number) => compact.format(v)): Demo => ({
    label,
    bare: true,
    content: [
      card(`Chart/${type}`, [text(title, "h3", { color: "card-foreground", tag: "h4" }), chart({ build, type, title, categories, series, height: 240, width, formatValue: format, showLegend: series.length > 1 })], {
        gap: 4,
      }),
    ],
  });
  return [
    chartDemo(
      t.bar,
      t.revenueTitle,
      "bar",
      t.months,
      [
        { name: t.thisYear, values: [18400, 21300, 19800, 24600, 27100, 29800] },
        { name: t.lastYear, values: [15200, 16900, 17400, 18800, 20500, 22100] },
      ],
      (v) => currency.format(v),
    ),
    chartDemo(t.line, t.usersTitle, "line", weekly.map((_, i) => `${t.weekPrefix}${i + 1}`), [{ name: t.users, values: weekly }]),
    chartDemo(t.area, t.trafficTitle, "area", t.days, [
      { name: t.organic, values: [3200, 3900, 3700, 4300, 4100, 2600, 2300] },
      { name: t.paid, values: [1400, 1800, 2100, 1900, 2400, 1200, 900] },
    ]),
    chartDemo(t.palette, t.usageTitle, "bar", t.quarters, t.plans.map((name, index) => ({ name, values: t.quarters.map((_, quarter) => 20 + ((index * 17 + quarter * 11) % 45) + quarter * 6) }))),
  ];
}

function overlaysDemos({ copy }: Ctx): Demo[] {
  const t = copy.overlays;
  const item = (label: string, glyph: string | null, options: { shortcut?: string; hover?: boolean; disabled?: boolean; destructive?: boolean; checked?: boolean } = {}) =>
    row({ name: "Menu item", width: "fill", minHeight: 32, align: "center", gap: 2, padding: { x: 2 }, radius: "sm", ...(options.hover && { fill: { color: "accent" } }), ...(options.disabled && { opacity: 0.5 }) }, [
      options.checked ? icon("check", "foreground", 14) : glyph ? icon(glyph, options.destructive ? "destructive" : "muted-foreground", 14) : null,
      text(label, "small", { color: options.destructive ? "destructive" : "popover-foreground", width: "fill" }),
      options.shortcut ? text(options.shortcut, "caption", { color: "muted-foreground" }) : null,
    ]);
  const separator = () => shape({ name: "Separator", width: "fill", height: 1, fill: { color: "border" }, role: "decor" });
  const toast = (tone: ColorVar | null, glyph: string, title: string, description: string, action?: string) =>
    row({ name: "Toast", width: "fill", align: "start", gap: 3, padding: { top: 3, right: 3, bottom: 3, left: 4 }, radius: "lg", fill: { color: "popover" }, stroke: { color: "border" }, shadow: "lg" }, [
      icon(glyph, tone ?? "foreground", 18),
      column({ name: "Content", width: "fill", gap: { px: 2 } }, [text(title, "small-strong", { color: "popover-foreground" }), text(description, "small", { color: "muted-foreground" })]),
      action ? button(action, { variant: "outline", size: "sm" }) : iconButton("Dismiss", "x", "muted-foreground"),
    ]);
  const tip = (label: string) => row({ name: "Tooltip", padding: { x: 2, y: 1 }, radius: "sm", fill: { color: "foreground" } }, [text(label, "caption-strong", { color: "background" })]);
  return [
    {
      label: t.dialog,
      bare: true,
      content: [
        dialogPreview(
          dialogPanel({ title: t.deleteTitle, description: t.deleteDescription, glyph: "trash", destructive: true, close: true, footer: [button(t.cancel, { variant: "outline" }), button(t.delete, { variant: "destructive" })] }),
          320,
        ),
      ],
    },
    {
      label: t.dropdown,
      content: [
        button(t.options, { variant: "outline", icon: "chevron-down" }),
        column({ name: "Menu", width: 224, gap: 1, padding: 1, radius: "md", fill: { color: "popover" }, stroke: { color: "border" }, shadow: "md" }, [
          row({ name: "Menu label", width: "fill", padding: { x: 2, y: 1 } }, [text(t.account, "caption-strong", { color: "muted-foreground" })]),
          item(t.profile, "user", { shortcut: "⇧⌘P" }),
          item(t.billing, "file", { hover: true }),
          item(t.settings, "sliders", { shortcut: "⌘," }),
          separator(),
          item(t.showSidebar, null, { checked: true }),
          item(t.exportData, "download", { disabled: true }),
          separator(),
          item(t.logOut, "log-out"),
          item(t.deleteAccount, "trash", { destructive: true }),
        ]),
      ],
    },
    {
      label: t.tooltip,
      content: [
        row({ name: "Tooltips", width: "fill", align: "center", gap: 5, wrap: true }, [
          column({ name: "Tip top", align: "center", gap: 1 }, [tip(t.copyLinkTip), { ...iconButton(t.copyLink, "link", "foreground", "md"), stroke: { color: "border-strong" } }]),
          column({ name: "Tip bottom", align: "center", gap: 1 }, [{ ...iconButton(copy.buttons.search, "search", "foreground", "md"), stroke: { color: "border-strong" } }, tip(t.shortcutTip)]),
          button(t.hoverMe, { variant: "ghost", size: "sm" }),
        ]),
      ],
    },
    {
      label: t.toast,
      content: [
        toast("success", "check-circle", t.savedTitle, t.savedDescription),
        toast(null, "bell", t.commentTitle, t.commentDescription),
        toast("warning", "alert-triangle", t.trialTitle, t.trialDescription, t.upgrade),
        toast("destructive", "alert-circle", t.uploadTitle, t.uploadDescription, t.retry),
      ],
    },
    { label: t.dialogLive, content: [wrapRow("Trigger", [button(t.openDialog, { leadingIcon: "users" })])] },
  ];
}

function feedbackDemos({ copy }: Ctx): Demo[] {
  const t = copy.feedback;
  const alert = (tone: ColorVar | null, glyph: string, title: string | null, body: string, action: DesignNode | null = null) =>
    row(
      { name: "Alert", width: "fill", align: "start", gap: 3, padding: { y: 3, x: 4 }, radius: "lg", fill: tone ? { color: tone, opacity: 0.07 } : { color: "background" }, stroke: tone ? { color: tone, opacity: 0.3 } : { color: "border" } },
      [
        icon(glyph, tone ?? "muted-foreground", 18),
        column({ name: "Content", width: "fill", gap: { px: 2 } }, [title ? text(title, "small-strong") : null, text(body, "small", { color: "foreground", opacity: 0.82 })]),
        action,
      ],
    );
  const progress = (label: string, value: number, valueText: string | null, tone: ColorVar = "primary", height = 8) =>
    column({ name: `Progress/${label}`, width: "fill", gap: 2 }, [
      row({ name: "Label", width: "fill", justify: "between" }, [text(label, "small-strong"), valueText ? text(valueText, "small", { color: "muted-foreground" }) : null]),
      progressBar(value, tone, height),
    ]);
  const bone = (width: number | "fill", height: number, round = false) => shape({ name: "Skeleton", width, height, radius: round ? "full" : "md", fill: { color: "muted" } });
  return [
    {
      label: t.alerts,
      full: true,
      content: [
        alert("info", "info", t.infoTitle, t.infoBody, button(t.reload, { variant: "outline", size: "sm" })),
        alert("success", "check-circle", t.successTitle, t.successBody),
        alert("warning", "alert-triangle", t.warningTitle, t.warningBody),
        alert("destructive", "alert-circle", t.errorTitle, t.errorBody, iconButton("Dismiss", "x", "muted-foreground")),
        alert("muted-foreground", "info", null, t.neutralBody),
      ],
    },
    {
      label: t.progress,
      content: [progress(t.uploading, 64, "64 %"), progress(t.profile, 100, "100 %", "success"), progress(t.storage, 86, t.storageText, "warning", 12), progress(t.processing, 40, null, "primary", 6)],
    },
    {
      label: t.skeleton,
      content: [
        row({ name: "Skeleton head", width: "fill", align: "center", gap: 3 }, [bone(40, 40, true), column({ name: "Lines", width: "fill", gap: 2 }, [bone("fill", 12), bone(140, 12)])]),
        bone("fill", 96),
        column({ name: "Lines", width: "fill", gap: 2 }, [bone("fill", 12), bone("fill", 12), bone(180, 12)]),
      ],
    },
  ];
}

const DEMOS: Record<GallerySectionId, (ctx: Ctx) => Demo[]> = {
  buttons: buttonsDemos,
  forms: formsDemos,
  selection: selectionDemos,
  badges: badgesDemos,
  avatars: avatarsDemos,
  navigation: navigationDemos,
  cards: cardsDemos,
  stats: statsDemos,
  table: tableDemos,
  charts: chartsDemos,
  overlays: overlaysDemos,
  feedback: feedbackDemos,
};

/* ------------------------------------------------------------------------------------------------ */
/* Builder                                                                                          */
/* ------------------------------------------------------------------------------------------------ */

export const componentGalleryBuilder: SectionBuilder = ({ id, props, variant, ctx, build }) => {
  const copy = GALLERY_COPY[ctx.locale];
  const sections = props.scope === "essentials" ? ESSENTIAL_SECTIONS : GALLERY_SECTIONS;
  const space = (step: number) => build.light.space[step - 1] ?? 0;
  const inner = elementWidth(build, id, "app.componentGallery") - 2 - 2 * space(6);
  // The index column (11rem + the body gap) shows from 54rem; the kit's demos are two columns from 2 × 20rem.
  const indexed = variant === "index" && inner >= 864;
  const indexPx = 176 + space(7);
  const kitWidth = indexed ? inner - indexPx : inner;
  const columns = Math.max(1, Math.floor((kitWidth + space(6)) / (320 + space(6))));
  const galleryCtx: Ctx = { copy, locale: ctx.locale, kitWidth, build };

  const kit = column(
    { name: "Kit", width: "fill", gap: 10 },
    sections.map((section) =>
      column({ name: `Gallery section/${section}`, tag: "section", width: "fill", gap: 6 }, [
        column({ name: "Header", tag: "header", width: "fill", maxWidth: 672, gap: 1, padding: { bottom: 4 }, stroke: { color: "border", sides: ["bottom"] } }, [
          text(copy.sections[section].title, "h2", { tag: "h3" }),
          text(copy.sections[section].description, "small", { color: "muted-foreground", tag: "p" }),
        ]),
        demoGrid(DEMOS[section](galleryCtx), columns),
      ]),
    ),
  );

  // Index beside the kit: an 11rem column, the body gap and the kit.
  const index = column({ name: "Index", tag: "nav", width: 176 }, [
    column(
      { name: "Index list", tag: "ol", width: "fill", gap: { px: 2 } },
      sections.map((section) =>
        row({ name: "Index link", tag: "a", width: "fill", padding: { y: 1, x: 3 }, stroke: { color: "border", width: 2, sides: ["left"] } }, [
          text(copy.sections[section].title, "small", { color: "muted-foreground", width: "fill" }),
        ]),
      ),
    ),
  ]);
  const body: FrameNode = indexed ? row({ name: "Body", width: "fill", gap: 7, align: "start" }, [index, kit]) : kit;

  return column({ name: "Component gallery", tag: "section", width: "fill", radius: "xl", fill: { color: "background" }, stroke: { color: "border" } }, [
    column({ name: "Inner", width: "fill", gap: 7, padding: { y: 7, x: 6 } }, [
      column({ name: "Header", tag: "header", width: "fill", maxWidth: 704, gap: 2 }, [
        text(appStrings(ctx.locale).galleryEyebrow(str(props.brandName)), "overline", { color: "primary-text", tag: "p" }),
        text(props.title, "h2", { tag: "h2" }),
        text(props.subtitle, "body", { color: "muted-foreground", tag: "p" }),
      ]),
      body,
    ]),
  ]);
};
