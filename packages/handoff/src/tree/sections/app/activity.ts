// app.activity: recent activity in a card: widget header with «Ver todo» (a link to the block's screen when it
// has one), then a timeline of tinted icons joined by a rule, or a list of people with avatars.
import type { SectionBuilder } from "../../context";
import { button, card, column, icon, num, records, row, shape, str, text } from "../../nodes";
import type { ColorVar, FrameNode } from "../../types";
import { appStrings, avatar, inlineText, widgetHeader } from "./shared";

const TONES: Readonly<Record<string, ColorVar>> = {
  success: "success",
  warning: "warning",
  info: "info",
  destructive: "destructive",
};

type Entry = { id: string; actor: string; text: string; time: string; tone: string; icon?: string };

const entries = (value: unknown): Entry[] =>
  records(value).map((item, i) => ({
    id: str(item.id) || `entry-${i}`,
    actor: str(item.actor),
    text: str(item.text),
    time: str(item.time),
    tone: str(item.tone),
    ...(typeof item.icon === "string" && { icon: item.icon }),
  }));

/** «**Actor** did something» and the time under it. */
function body(entry: Entry): FrameNode {
  return column({ name: "Body", width: "fill", gap: { px: 2 }, padding: { top: { px: 2 } } }, [
    inlineText("Text", [
      { text: entry.actor, style: "small-strong", color: "card-foreground" },
      { text: entry.text, style: "small", color: "card-foreground" },
    ]),
    text(entry.time, "caption", { color: "muted-foreground", tag: "p" }),
  ]);
}

export const activityBuilder: SectionBuilder = ({ id, props, variant, ctx }) => {
  const timeline = variant !== "list";
  const items = entries(props.items).slice(0, Math.max(1, num(props.count, 5)));
  const link = ctx.linkTarget?.(id) ?? undefined;
  const viewAll =
    props.showViewAll === true
      ? button(appStrings(ctx.locale).viewAll, { variant: "ghost", size: "sm", icon: "arrow-right", ...(link && { linkTo: link }) })
      : null;

  const list = column(
    { name: "Entries", tag: "ol", width: "fill" },
    items.map((entry, i) => {
      const last = i === items.length - 1;
      const tone = TONES[entry.tone] ?? "muted-foreground";
      if (timeline) {
        return row({ name: `Entry/${entry.id}`, tag: "li", width: "fill", gap: 3, align: "stretch", padding: { bottom: last ? 0 : 4 } }, [
          column({ name: "Rail", width: 32, align: "center", gap: 1 }, [
            row({ name: "Node", width: 32, height: 32, align: "center", justify: "center", radius: "full", fill: { color: tone, opacity: 0.14 } }, [icon(entry.icon ?? "info", tone, 15)]),
            last ? null : shape({ name: "Rule", width: 1, height: "fill", fill: { color: "border" }, role: "decor" }),
          ]),
          body(entry),
        ]);
      }
      return row(
        {
          name: `Entry/${entry.id}`,
          tag: "li",
          width: "fill",
          gap: 3,
          align: "center",
          padding: { top: i === 0 ? 0 : 3, bottom: last ? 0 : 3 },
          ...(i > 0 && { stroke: { color: "border", sides: ["top"] } }),
        },
        [avatar(entry.actor, "sm"), body(entry)],
      );
    }),
  );

  return card("Activity", [widgetHeader(props.title, props.description, [viewAll]), list], { gap: 4, tag: "section" });
};
