// 02 · Palette (`brand/Palette`): core color chips, the 50–950 scales, the roles of both modes and the AA
// contrast table. Every swatch is painted with a color variable; hex values are text labels.
import type { BuildContext, SectionBuilder } from "../../context";
import { badge, bool, column, dot, frame, grid, row, shape, text } from "../../nodes";
import type { DesignNode, FrameNode } from "../../types";
import { CHART_ROLES, CHIP_ROLES, KEY_PAIRS, PALETTE_COPY, ROLE_NAMES, SCALE_GROUPS, SCALE_NAMES, SCALE_STEPS, TABLE_ROLES, type ScaleGroup } from "./copy";
import {
  boardPanel,
  boardSection,
  contrastRows,
  dataTable,
  formatHex,
  formatRatio,
  mono,
  modeSwatch,
  roleCssName,
  textOr,
  tokensOf,
} from "./shared";

type Mode = "light" | "dark";
type Copy = (typeof PALETTE_COPY)["es" | "en"];
const MODES: readonly Mode[] = ["light", "dark"];

function chips(build: BuildContext, copy: Copy, mode: Mode, locale: "es" | "en", tall: boolean): FrameNode {
  const other: Mode = mode === "light" ? "dark" : "light";
  const colors = tokensOf(build, mode).colors;
  const roles = CHIP_ROLES.filter((role) => role !== "cta" || colors.cta !== colors.primary);
  return grid(
    { name: "Chips", tag: "ul", columns: roles.length, gap: 3, rowGap: 4 },
    roles.map((role) => {
      const css = roleCssName(role);
      return column({ name: css, tag: "li", gap: { px: 2 } }, [
        shape({
          name: "Swatch",
          width: "fill",
          aspect: tall ? 3 / 4 : 3 / 2,
          radius: "card",
          fill: { color: css },
          stroke: { color: "foreground", opacity: 0.12, width: 1 },
        }),
        text(ROLE_NAMES[role]![locale], "small-strong", { tag: "span", offsetTop: 2 }),
        mono(`--${css}`),
        mono(formatHex(colors[css]), "foreground"),
        mono(`${copy[other]} ${formatHex(tokensOf(build, other).colors[css])}`),
      ]);
    }),
  );
}

function anchorOf(group: ScaleGroup, build: BuildContext): number | undefined {
  if (group === "brand") return build.inputs.theme.anchors.brand;
  if (group === "cta") return build.inputs.theme.anchors.accent;
  return undefined;
}

function scales(build: BuildContext, copy: Copy, locale: "es" | "en"): FrameNode {
  const groups = SCALE_GROUPS.filter((group) => group !== "cta" || build.inputs.theme.scales.accent);
  const nameWidth = 88;
  const steps = (cells: DesignNode[]) => grid({ name: "Ramp", tag: "ul", columns: SCALE_STEPS.length, gap: { px: 3 } }, cells);
  const header = row({ name: "Steps", width: "fill", gap: 3, align: "center" }, [
    frame({ name: "Spacer", width: nameWidth, children: [] }),
    { ...steps(SCALE_STEPS.map((step) => mono(String(step), "muted-foreground", { align: "center", tag: "span" })!)), width: "fill" },
  ]);
  const rows = groups.map((group) => {
    const anchor = anchorOf(group, build);
    return row({ name: SCALE_NAMES[group][locale], width: "fill", gap: 3, align: "center" }, [
      text(SCALE_NAMES[group][locale], "small", { width: nameWidth, tag: "span" }),
      {
        ...steps(
          SCALE_STEPS.map((step) => {
            const color = `color-${group}-${step}`;
            const base = { name: `${group}-${step}`, height: 44, radius: "sm" as const, fill: { color }, stroke: { color: "foreground", opacity: 0.08, width: 1 } };
            return step === anchor
              ? column({ ...base, width: "fill", tag: "li", align: "center", justify: "end", padding: { bottom: { px: 6 } } }, [
                  { ...dot("Anchor", 7, "color-neutral-50"), stroke: { color: "color-neutral-950", width: 1.5 } },
                ])
              : shape({ ...base, width: "fill" });
          }),
        ),
        width: "fill",
      },
    ]);
  });
  return boardPanel("Scales", [column({ name: "Scales", width: "fill", gap: 2 }, [header, ...rows])], { label: copy.scales, meta: `● ${copy.anchor}` });
}

function rolesTable(build: BuildContext, copy: Copy, pageMode: Mode, locale: "es" | "en"): FrameNode {
  // The chart swatches overlap on a ring of the card color of the page (a scale step: it sits in a pinned subtree).
  const ring = pageMode === "light" ? "color-neutral-50" : "color-neutral-950";
  const value = (mode: Mode, roles: readonly string[]) => {
    const css = roles.map(roleCssName);
    const colors = tokensOf(build, mode).colors;
    return [
      // Each mode's swatches bind the role variables inside a subtree pinned to that mode.
      row(
        { name: "Swatches", width: "hug", gap: 0 },
        css.map((name, i) => modeSwatch(name, name, mode, 20, i > 0 ? { stroke: { color: ring, width: 2 } } : {})),
      ),
      css.length === 1 ? mono(formatHex(colors[css[0]!]), "card-foreground") : null,
    ];
  };
  const rows = TABLE_ROLES.map((role) => {
    const charts = role === "charts";
    const roles = charts ? CHART_ROLES : [role];
    return [
      [
        column({ name: "Role", gap: { px: 1 } }, [
          text(charts ? copy.charts : ROLE_NAMES[role]![locale], "small", { color: "card-foreground", tag: "th" }),
          mono(charts ? "--chart-1…5" : `--${roleCssName(role)}`),
        ]),
      ],
      value("light", roles),
      value("dark", roles),
    ];
  });
  return dataTable(build, {
    name: "Roles",
    caption: copy.roles,
    compact: true,
    columns: [
      { header: copy.role, width: "fill" },
      { header: copy.light, width: 136 },
      { header: copy.dark, width: 124 },
    ],
    rows,
  });
}

function contrastTable(build: BuildContext, copy: Copy, mode: Mode, locale: "es" | "en"): FrameNode {
  const order = new Map<string, number>(KEY_PAIRS.map((pair, index) => [pair, index]));
  const rows = contrastRows(build, mode)
    .filter((entry) => order.has(entry.pair))
    .sort((a, b) => order.get(a.pair)! - order.get(b.pair)!);
  const roleName = (role: string) => ROLE_NAMES[role]?.[locale] ?? role;
  return dataTable(build, {
    name: "Contrast",
    caption: copy.contrast(copy[mode]),
    compact: true,
    columns: [
      { header: copy.sample, width: 68 },
      { header: copy.pair, width: "fill" },
      { header: copy.ratio, width: 84, align: "end" },
      { header: copy.required, width: 72, align: "end" },
      { header: copy.result, width: 88 },
    ],
    rows: rows.map((entry) => [
      [
        row(
          {
            name: "Sample",
            width: 40,
            height: 28,
            align: "center",
            justify: "center",
            radius: "sm",
            fill: { color: roleCssName(entry.bgRole) },
            stroke: { color: "foreground", opacity: 0.14, width: 1 },
          },
          [text("Aa", "small-strong", { color: roleCssName(entry.fgRole), tag: "span" })],
        ),
      ],
      [
        row({ name: "Pair", gap: 1, align: "baseline" }, [
          text(roleName(entry.fgRole), "small", { color: "card-foreground", tag: "span" }),
          text(copy.on, "small", { color: "muted-foreground", tag: "span" }),
          text(roleName(entry.bgRole), "small", { color: "card-foreground", tag: "span" }),
        ]),
      ],
      [text(formatRatio(entry.ratio, locale), "small", { color: "card-foreground" })],
      [text(formatRatio(entry.required, locale), "small", { color: "card-foreground" })],
      [badge(entry.pass ? copy.pass : copy.fail, entry.pass ? "success" : "destructive", entry.pass ? "check" : "x")],
    ]),
  });
}

export const paletteBuilder: SectionBuilder = ({ id, props, variant, ctx, build }) => {
  const copy = PALETTE_COPY[ctx.locale];
  const swatches = variant === "swatches";
  const showContrast = bool(props.showContrast);
  const summary = showContrast
    ? MODES.map((mode) => {
        const rows = contrastRows(build, mode);
        const passed = rows.filter((entry) => entry.pass).length;
        return badge(copy.summary(copy[mode], passed, rows.length), passed === rows.length ? "success" : "warning", passed === rows.length ? "check" : "alert-triangle");
      })
    : [];

  const tables = swatches
    ? null
    : showContrast
      ? frame({
          name: "Tables",
          width: "fill",
          layout: { kind: "grid", columns: 11, gap: 4, align: "start" },
          children: [
            { ...rolesTable(build, copy, ctx.mode, ctx.locale), place: { col: 0, span: 5, row: 0 } },
            { ...contrastTable(build, copy, ctx.mode, ctx.locale), place: { col: 5, span: 6, row: 0 } },
          ],
        })
      : rolesTable(build, copy, ctx.mode, ctx.locale);

  return boardSection({
    ctx,
    type: "brand.palette",
    elementId: id,
    name: "Palette",
    title: textOr(props.title, copy.title),
    intro: textOr(props.intro, copy.intro),
    aside: summary.length > 0 ? [row({ name: "Summary", tag: "ul", gap: 2, wrap: true }, summary)] : [],
    children: [chips(build, copy, ctx.mode, ctx.locale, swatches), bool(props.showScales) ? scales(build, copy, ctx.locale) : null, tables],
  });
};
