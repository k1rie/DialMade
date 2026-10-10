// 05 · Components (`brand/Components`): the kit wearing the brand. Showcase: buttons in every variant and size,
// badges and avatars, a form (inputs, select, switch, checkbox), a plan card and a short table. States: a
// matrix of components × default, hover, focus, pressed and disabled.
import { heroCopy, personNames, pricingPlans, rngFor, tableData, type Tone } from "@dialmade/sections";
import { colorIndexOf, initialsOf } from "@dialmade/ui";
import type { BuildContext, SectionBuilder } from "../../context";
import { badge, bool, button, column, dot, frame, grid, icon, row, text, type BadgeTone, type ButtonVariant } from "../../nodes";
import type { DesignNode, FrameNode } from "../../types";
import { COMPONENTS_COPY } from "./copy";
import { boardPanel, boardSection, dataTable, textOr } from "./shared";

type Copy = (typeof COMPONENTS_COPY)["es" | "en"];
type State = "default" | "hover" | "focus" | "active" | "disabled";
const STATES: readonly State[] = ["default", "hover", "focus", "active", "disabled"];
const STATE_BUTTONS = ["primary", "secondary", "outline", "ghost", "cta"] as const satisfies readonly ButtonVariant[];

const TONE_BADGE: Record<Tone, BadgeTone> = { success: "success", warning: "warning", info: "info", destructive: "destructive", neutral: "neutral" };
const DOT_COLOR: Record<BadgeTone, string> = {
  success: "success",
  warning: "warning",
  info: "info",
  destructive: "destructive",
  neutral: "secondary-foreground",
  primary: "primary-text",
  outline: "foreground",
};

/** `Badge` with `dot`: a 6 px dot before the label. */
function dotBadge(label: string, tone: BadgeTone): FrameNode | null {
  const node = badge(label, tone);
  return node ? { ...node, children: [dot("Dot", 6, DOT_COLOR[tone]), ...node.children] } : null;
}

/** A button forced into a preview state, like `previewState` does in the kit. */
function stateButton(variant: ButtonVariant, label: string, state: State): FrameNode | null {
  const node = button(label, { variant, size: "sm" });
  if (!node) return null;
  const subtle = variant === "outline" || variant === "ghost";
  if (state === "hover" || state === "active") {
    const fill = subtle ? "accent" : `${variant}-hover`;
    const textColor = subtle ? "accent-foreground" : undefined;
    return {
      ...node,
      fill: { color: fill },
      children: node.children.map((child) => (textColor && child.type === "text" ? { ...child, color: textColor } : child)),
    };
  }
  if (state === "focus") return { ...node, stroke: { color: "ring", width: 2 } };
  if (state === "disabled") return { ...node, opacity: 0.5 };
  return node;
}

interface InputSpec {
  label?: string;
  placeholder?: string;
  value?: string;
  leadingIcon?: string;
  trailingIcon?: string;
  hint?: string;
  error?: string;
  size?: "sm" | "md";
  state?: State;
}

/** `Input` / `Select` of the kit: label, the field box (icons, placeholder or value) and hint or error. */
function input({ label, placeholder, value, leadingIcon, trailingIcon, hint, error, size = "md", state = "default" }: InputSpec): FrameNode {
  const sm = size === "sm";
  const border = error ? "destructive" : state === "hover" ? "border-strong" : state === "focus" ? "ring" : "input";
  return column({ name: "Field", tag: "label", width: "fill", gap: 2 }, [
    text(label, "small-strong", { tag: "span" }),
    row(
      {
        name: trailingIcon ? "Select" : "Input",
        width: "fill",
        minHeight: sm ? 32 : 40,
        align: "center",
        gap: 2,
        padding: { x: sm ? 2 : 3 },
        radius: "input",
        fill: { color: state === "disabled" ? "muted" : "background" },
        stroke: { color: border, ...(state === "focus" && { width: 2 }) },
        ...(state === "disabled" && { opacity: 0.6 }),
      },
      [
        leadingIcon ? icon(leadingIcon, "muted-foreground", 16) : null,
        text(value ?? placeholder ?? " ", sm ? "caption" : "small", { color: value ? "foreground" : "muted-foreground", width: "fill" }),
        trailingIcon ? icon(trailingIcon, "muted-foreground", 16) : null,
      ],
    ),
    hint ? text(hint, "caption", { color: "muted-foreground" }) : null,
    error ? row({ name: "Error", gap: 1, align: "center" }, [icon("alert-circle", "destructive", 12), text(error, "caption", { color: "destructive" })]) : null,
  ]);
}

const switchBox = (state: State = "default"): FrameNode =>
  row(
    {
      name: "Switch",
      width: 36,
      height: 20,
      align: "center",
      justify: "end",
      padding: { px: 2 },
      radius: "full",
      fill: { color: state === "hover" ? "primary-hover" : "primary" },
      ...(state === "focus" && { stroke: { color: "ring", width: 2 } }),
      ...(state === "disabled" && { opacity: 0.55 }),
    },
    [dot("Thumb", 16, "primary-foreground")],
  );

const checkboxBox = (state: State = "default"): FrameNode =>
  row(
    {
      name: "Checkbox",
      width: 18,
      height: 18,
      align: "center",
      justify: "center",
      radius: "sm",
      fill: { color: "primary" },
      ...(state === "focus" && { stroke: { color: "ring", width: 2 } }),
      ...(state === "disabled" && { opacity: 0.55 }),
    },
    [icon("check", "primary-foreground", 14)],
  );

const choice = (control: FrameNode, label: string) =>
  row({ name: "Choice", tag: "label", gap: 3, align: "center" }, [control, text(label, "small", { tag: "span" })]);

/** `AvatarGroup`: up to four initials avatars and a «+N» counter. */
function avatarGroup(names: readonly string[], max = 4): FrameNode {
  const visible = names.slice(0, max);
  const hidden = names.length - visible.length;
  const avatar = (label: string, fill: { color: string; opacity?: number }, color: string, style: "small-strong" | "caption-strong") =>
    row({ name: "Avatar", width: 40, height: 40, align: "center", justify: "center", radius: "full", fill, stroke: { color: "background", width: 2 } }, [
      text(label, style, { color, tag: "span" }),
    ]);
  return row({ name: "Avatar group", width: "hug", gap: 0, align: "center" }, [
    ...visible.map((name) => avatar(initialsOf(name), { color: `chart-${colorIndexOf(name)}`, opacity: 0.24 }, "foreground", "small-strong")),
    hidden > 0 ? avatar(`+${hidden}`, { color: "muted" }, "muted-foreground", "caption-strong") : null,
  ]);
}

function showcase(build: BuildContext, ctx: Parameters<SectionBuilder>[0]["ctx"], copy: Copy, showTable: boolean): FrameNode {
  const hero = heroCopy(ctx);
  const { plans } = pricingPlans(ctx);
  const plan = plans.find((candidate) => candidate.highlighted) ?? plans[0];
  const people = personNames(rngFor(ctx.seed, "brand-components"), ctx.locale, 6);
  const data = tableData(ctx, 4);
  const status = data.columns.find((col) => col.kind === "status");
  const columns = [...data.columns.filter((col) => col !== status).slice(0, status ? 3 : 4), ...(status ? [status] : [])];

  const buttons = boardPanel(
    "Buttons",
    [
      row({ name: "Row", width: "fill", wrap: true, align: "center", gap: 3 }, [
        button(hero.primaryCta, { variant: "primary" }),
        button(hero.secondaryCta, { variant: "secondary" }),
        button(copy.more, { variant: "outline" }),
        button(copy.search, { variant: "ghost" }),
      ]),
      row({ name: "Row", width: "fill", wrap: true, align: "center", gap: 3 }, [
        button(hero.primaryCta, { variant: "cta", size: "lg", icon: "arrow-right" }),
        button(copy.create, { variant: "primary", size: "sm", leadingIcon: "plus" }),
        button(copy.delete, { variant: "destructive", size: "sm", leadingIcon: "trash" }),
        stateButton("secondary", copy.disabled, "disabled"),
        row({ name: "IconButton/outline", tag: "button", width: 40, height: 40, align: "center", justify: "center", radius: "button", stroke: { color: "border-strong" } }, [
          icon("more", "foreground", 16),
        ]),
      ]),
    ],
    { label: copy.buttons },
  );

  const solidBeta = badge(copy.statuses.beta, "primary", "sparkle");
  const badges = boardPanel(
    "Badges",
    [
      row({ name: "Row", width: "fill", wrap: true, align: "center", gap: 3 }, [
        dotBadge(copy.statuses.active, "success"),
        dotBadge(copy.statuses.pending, "warning"),
        badge(copy.statuses.fresh, "info"),
        badge(copy.statuses.overdue, "destructive"),
        badge(copy.statuses.draft, "neutral"),
        solidBeta
          ? {
              ...solidBeta,
              name: "Badge/solid",
              fill: { color: "primary" },
              children: solidBeta.children.map((child) => (child.type === "text" || child.type === "icon" ? { ...child, color: "primary-foreground" } : child)),
            }
          : null,
      ]),
      avatarGroup(people),
    ],
    { label: copy.badges },
  );

  const form = boardPanel(
    "Form",
    [
      grid({ name: "Fields", tag: "form", columns: 2, gap: 5, rowGap: 4 }, [
        input({ label: copy.email, placeholder: copy.emailPlaceholder, leadingIcon: "mail", hint: copy.emailHint }),
        input({ label: copy.company, error: copy.companyError }),
        input({ label: copy.plan, value: plan?.name ?? "", trailingIcon: "chevrons-up-down" }),
        choice(switchBox(), copy.notifications),
        choice(checkboxBox(), copy.terms),
      ]),
    ],
    { label: copy.form },
  );

  const card = plan
    ? column(
        { name: "Card", tag: "article", width: "fill", gap: 4, padding: 5, fill: { color: "card" }, stroke: { color: "border", card: true }, radius: "card", shadow: "card" },
        [
          row({ name: "Card header", width: "fill", justify: "between", align: "start", gap: 3 }, [
            column({ name: "Heading", width: "fill", gap: 1 }, [
              text(plan.name, "h3", { color: "card-foreground", tag: "h3" }),
              text(plan.description, "small", { color: "muted-foreground", tag: "p" }),
            ]),
            plan.highlighted ? badge(copy.popular, "primary") : null,
          ]),
          column({ name: "Card body", width: "fill", gap: 4 }, [
            row({ name: "Price", gap: 1, align: "baseline" }, [
              text(plan.priceLabel, "h2", { color: "card-foreground", tag: "span" }),
              text(plan.period, "small", { color: "muted-foreground", tag: "span" }),
            ]),
            column(
              { name: "Features", tag: "ul", width: "fill", gap: 2 },
              plan.features.slice(0, 4).map((feature) =>
                row({ name: "Feature", tag: "li", width: "fill", gap: 2, align: "center" }, [
                  icon("check", "primary-text", 14),
                  text(feature, "small", { color: "card-foreground", width: "fill" }),
                ]),
              ),
            ),
          ]),
          row({ name: "Card footer", width: "fill" }, [button(plan.cta, { variant: "primary", width: "fill" })]),
        ],
      )
    : null;

  const table = showTable
    ? dataTable(build, {
        name: "Table",
        caption: data.title,
        columns: columns.map((col) => ({ header: col.label, width: "fill" as const, align: col.align })),
        rows: data.rows.map((entry) =>
          columns.map((col, index) => {
            const cell = entry.cells[col.key];
            if (!cell) return [];
            return [cell.tone ? dotBadge(cell.text, TONE_BADGE[cell.tone]) : text(cell.text, index === 0 ? "small-strong" : "small", { color: "card-foreground" })];
          }),
        ),
      })
    : null;

  const place = (node: FrameNode | null, col: number, span: number, rowIndex: number): DesignNode | null =>
    node ? { ...node, place: { col, span, row: rowIndex } } : null;
  return frame({
    name: "Showcase",
    width: "fill",
    layout: { kind: "grid", columns: 12, gap: 4, rowGap: 4 },
    children: [
      place(buttons, 0, 7, 0),
      place(badges, 7, 5, 0),
      place(form, 0, card ? 7 : 12, 1),
      place(card, 7, 5, 1),
      place(table, 0, 12, 2),
    ],
  });
}

function states(copy: Copy): FrameNode {
  const rows: { label: string; render: (state: State) => DesignNode | null }[] = [
    ...STATE_BUTTONS.map((variant) => ({ label: copy.variants[variant], render: (state: State) => stateButton(variant, copy.buttonLabel, state) })),
    { label: copy.field, render: (state: State) => input({ placeholder: copy.emailPlaceholder, size: "sm", state }) },
    { label: copy.checkbox, render: (state: State) => checkboxBox(state) },
    { label: copy.switch, render: (state: State) => switchBox(state) },
  ];
  const cell = (content: (DesignNode | null)[], width: number | "fill", name = "td") =>
    row({ name, width, align: "center", padding: { x: 4, y: 3 }, stroke: { color: "border", width: 1, sides: ["top"] } }, content);
  return column(
    { name: "States", tag: "table", width: "fill", fill: { color: "card" }, stroke: { color: "border", card: true }, radius: "card", shadow: "card", clip: true },
    [
      column({ name: "Caption", width: "fill", padding: { top: 4, x: 4, bottom: 2 } }, [text(copy.states, "small-strong", { color: "card-foreground" })]),
      row({ name: "Header", width: "fill" }, [
        cell([text(copy.component, "overline", { color: "muted-foreground", tag: "th", weight: 400 })], 160, "th"),
        ...STATES.map((state) => cell([text(copy.stateNames[state], "overline", { color: "muted-foreground", tag: "th", weight: 400 })], "fill", "th")),
      ]),
      ...rows.map((entry) =>
        row({ name: entry.label, width: "fill" }, [
          cell([text(entry.label, "small", { color: "card-foreground", tag: "th" })], 160, "th"),
          ...STATES.map((state) => cell([entry.render(state)], "fill")),
        ]),
      ),
    ],
  );
}

export const componentsBuilder: SectionBuilder = ({ id, props, variant, ctx, build }) => {
  const copy = COMPONENTS_COPY[ctx.locale];
  return boardSection({
    ctx,
    type: "brand.components",
    elementId: id,
    name: "Components",
    title: textOr(props.title, copy.title),
    intro: textOr(props.intro, copy.intro),
    children: [variant === "states" ? states(copy) : showcase(build, ctx, copy, bool(props.showTable))],
  });
};
