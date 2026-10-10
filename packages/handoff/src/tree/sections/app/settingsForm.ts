// app.settingsForm: workspace settings in a card: the «General» group (name, email, language, time zone and
// about, cut by `count`), the notification switches, and the footer with Cancel and Save (Save opens the
// block's screen when it links to one). `split` puts each group's heading beside its fields.
import type { BuildContext, SectionBuilder } from "../../context";
import { button, card, column, grid, num, records, row, str, text } from "../../nodes";
import type { DesignNode, FrameNode } from "../../types";
import { LANGUAGE_LABELS, appStrings, control, fontScale, switchTrack, widgetHeader } from "./shared";

/** `SETTINGS_GENERAL_FIELDS` and `settingsShown` of the section. */
const GENERAL_FIELDS = ["workspaceName", "email", "language", "timezone", "about"] as const;
const MAX_COUNT = 11;

function shown(count: number, toggles: number) {
  const n = Math.max(1, Math.min(MAX_COUNT, Math.floor(count)));
  return { fields: GENERAL_FIELDS.slice(0, n), toggles: Math.max(0, Math.min(toggles, n - GENERAL_FIELDS.length)) };
}

/** A group: heading and hint, then its content (beside it when split). */
function group(build: BuildContext, name: string, title: string, hint: string, content: FrameNode, split: boolean): FrameNode {
  const head = column({ name: "Group head", width: "fill" }, [
    text(title, "h3", { color: "card-foreground", tag: "h3", scale: fontScale(build, "h3", "small") }),
    text(hint, "caption", { color: "muted-foreground", offsetTop: { px: 2 } }),
  ]);
  if (split) {
    return grid({ name, columns: 3, gap: 6, padding: { top: 5 }, stroke: { color: "border", sides: ["top"] } }, [
      { ...head, place: { col: 0, span: 1, row: 0 } },
      { ...content, place: { col: 1, span: 2, row: 0 } },
    ]);
  }
  return column({ name, width: "fill", gap: 4, padding: { top: 5 }, stroke: { color: "border", sides: ["top"] } }, [head, content]);
}

export const settingsFormBuilder: SectionBuilder = ({ id, props, variant, ctx, build }) => {
  const strings = appStrings(ctx.locale).settings;
  const split = variant === "split";
  const toggles = records(props.notifications);
  const visible = shown(num(props.count, 8), toggles.length);
  const has = (field: (typeof GENERAL_FIELDS)[number]) => visible.fields.includes(field);
  const link = ctx.linkTarget?.(id) ?? undefined;

  // Two columns from 30rem (`.dl-app-settings__fields`): name|email, language|time zone, then about across.
  const pairs: DesignNode[] = [];
  const cells: FrameNode[] = [];
  if (has("workspaceName")) cells.push(control({ label: strings.name, value: str(props.workspaceName) }));
  if (has("email")) cells.push(control({ label: strings.email, value: str(props.email), leadingIcon: "mail", hint: strings.emailHint }));
  if (has("language")) cells.push(control({ name: "Select", label: strings.language, value: LANGUAGE_LABELS[str(props.language)] ?? str(props.language), trailingIcon: "chevrons-up-down" }));
  if (has("timezone")) cells.push(control({ name: "Select", label: strings.timezone, value: str(props.timezone), trailingIcon: "chevrons-up-down" }));
  cells.forEach((cell, i) => pairs.push({ ...cell, place: { col: i % 2, span: 1, row: Math.floor(i / 2) } }));
  if (has("about")) {
    const line = Math.ceil(cells.length / 2);
    pairs.push({ ...control({ label: strings.about, value: str(props.about), multiline: true }), place: { col: 0, span: 2, row: line } });
  }
  const fields = grid({ name: "Fields", columns: 2, gap: 4, rowGap: 4 }, pairs);

  const switches = toggles.slice(0, visible.toggles).map((item, i) =>
    row(
      {
        name: `Switch/${str(item.id)}`,
        tag: "li",
        width: "fill",
        align: "start",
        justify: "between",
        gap: 3,
        ...(i > 0 && { padding: { top: 3 }, offsetTop: 3, stroke: { color: "border", sides: ["top"] } }),
      },
      [
        column({ name: "Text", width: "fill", gap: { px: 2 } }, [
          text(item.label, "small", { tag: "span", weight: 500 }),
          text(item.description, "caption", { color: "muted-foreground", tag: "span" }),
        ]),
        switchTrack(item.enabled === true),
      ],
    ),
  );

  return card(
    "Settings form",
    [
      widgetHeader(build, props.title, props.description),
      column({ name: "Form", tag: "form", width: "fill", gap: 5 }, [
        group(build, "General", strings.general, strings.generalHint, fields, split),
        switches.length > 0
          ? group(build, "Notifications", strings.notifications, strings.notificationsHint, column({ name: "Toggles", tag: "ul", width: "fill" }, switches), split)
          : null,
        row({ name: "Footer", width: "fill", justify: "end", gap: 2, padding: { top: 4 }, stroke: { color: "border", sides: ["top"] } }, [
          button(strings.cancel, { variant: "ghost" }),
          button(strings.save, { variant: "primary", ...(link && { linkTo: link }) }),
        ]),
      ]),
    ],
    { gap: 4, tag: "section" },
  );
};
