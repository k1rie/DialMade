// A figma-plan page as HTML that lays out like Figma's auto layout (flex for HORIZONTAL/VERTICAL, absolute
// children for NONE, FILL/HUG/FIXED as flex sizing). A development aid: it shows what the plugin will build
// without opening Figma, so a builder can be compared with the real section side by side.
import type { FigmaPlan, PlanFrame, PlanNode, PlanPaint, PlanTextStyle, Rgba } from "./schema";

const css = (color: Rgba, opacity = 1) =>
  `rgb(${Math.round(color.r * 255)} ${Math.round(color.g * 255)} ${Math.round(color.b * 255)} / ${Number((color.a * opacity).toFixed(3))})`;

function background(fills: readonly PlanPaint[]): string {
  return fills
    .map((fill) =>
      fill.type === "SOLID"
        ? `linear-gradient(${css(fill.color, fill.opacity)}, ${css(fill.color, fill.opacity)})`
        : `linear-gradient(${fill.angle}deg, ${fill.stops.map((stop) => `${css(stop.color)} ${stop.position * 100}%`).join(", ")})`,
    )
    .reverse()
    .join(", ");
}

const escape = (value: string) => value.replace(/&/g, "&amp;").replace(/</g, "&lt;").replace(/>/g, "&gt;").replace(/"/g, "&quot;");

type Parent = "HORIZONTAL" | "VERTICAL" | "NONE" | "ROOT";

function sizing(node: PlanNode, parent: Parent, centered = false): string[] {
  const s = node.sizing;
  const out: string[] = ["box-sizing:border-box", "flex-shrink:0"];
  if (node.absolute || parent === "NONE") out.push("position:absolute", `left:${node.absolute?.x ?? 0}px`, `top:${node.absolute?.y ?? 0}px`);
  if (s.horizontal === "FIXED") out.push(`width:${s.width}px`);
  else if (s.horizontal === "FILL") out.push(parent === "HORIZONTAL" ? "flex:1 1 0;min-width:0" : "align-self:stretch");
  else out.push("width:max-content");
  if (s.vertical === "FIXED") out.push(`height:${s.height ?? 0}px`);
  else if (s.vertical === "FILL") out.push(parent === "VERTICAL" ? "flex:1 1 0;min-height:0" : "align-self:stretch");
  if (s.minHeight !== undefined) out.push(`min-height:${s.minHeight}px`);
  if (s.maxWidth !== undefined) out.push(`max-width:${s.maxWidth}px`);
  // Figma keeps a capped FILL child where the parent's alignment puts it.
  if (s.maxWidth !== undefined && s.horizontal === "FILL" && parent === "VERTICAL" && centered) out.push("margin-inline:auto");
  if (node.opacity !== undefined) out.push(`opacity:${node.opacity}`);
  return out;
}

const ALIGN = { MIN: "flex-start", CENTER: "center", MAX: "flex-end", BASELINE: "baseline", SPACE_BETWEEN: "space-between" } as const;

function strokeCss(stroke: PlanFrame["stroke"]): string[] {
  if (!stroke || stroke.paint.type !== "SOLID") return [];
  const value = `${stroke.weight}px ${stroke.dashed ? "dashed" : "solid"} ${css(stroke.paint.color, stroke.paint.opacity)}`;
  return stroke.sides ? stroke.sides.map((side) => `border-${side}:${value}`) : [`border:${value}`];
}

type Ctx = { styles: Map<string, PlanTextStyle>; effects: Map<string, string> };

function node(ctx: Ctx, n: PlanNode, parent: Parent, centered = false): string {
  const style = sizing(n, parent, centered);
  const attrs = `data-id="${escape(n.id)}" title="${escape(n.name)}"`;
  switch (n.type) {
    case "TEXT": {
      const t = ctx.styles.get(n.textStyle);
      if (t) {
        style.push(
          `font-family:'${t.fontFamily}','${t.fallbackFamily}',system-ui,sans-serif`,
          `font-size:${t.fontSize}px`,
          `font-weight:${t.fontWeight}`,
          `line-height:${t.lineHeight}%`,
          `letter-spacing:${t.letterSpacing / 100}em`,
        );
        if (t.textCase === "UPPER") style.push("text-transform:uppercase");
      }
      if (n.fontSize !== undefined) style.push(`font-size:${n.fontSize}px`);
      if (n.fontWeight !== undefined) style.push(`font-weight:${n.fontWeight}`);
      if (n.sizing.horizontal === "HUG") style.push("white-space:pre");
      style.push(`color:${n.fill.type === "SOLID" ? css(n.fill.color, n.fill.opacity) : "inherit"}`, `text-align:${n.textAlign.toLowerCase()}`, "margin:0");
      if (n.strikethrough) style.push("text-decoration:line-through");
      return `<p ${attrs} style="${style.join(";")}">${escape(n.characters)}</p>`;
    }
    case "ICON":
      return `<div ${attrs} style="${style.join(";")};line-height:0">${n.svg}</div>`;
    case "RECTANGLE":
    case "ELLIPSE":
      style.push(`background:${background(n.fills)}`, ...strokeCss(n.stroke));
      if (n.type === "ELLIPSE") style.push("border-radius:50%");
      else if (n.cornerRadius) style.push(`border-radius:${n.cornerRadius.value}px`);
      return `<div ${attrs} style="${style.join(";")}"></div>`;
    case "FRAME": {
      const l = n.layout;
      if (!(n.absolute || parent === "NONE")) style.push("position:relative");
      if (l.mode !== "NONE") {
        style.push("display:flex", `flex-direction:${l.mode === "HORIZONTAL" ? "row" : "column"}`, `gap:${l.itemSpacing.value}px`);
        if (l.wrap) style.push("flex-wrap:wrap", `row-gap:${l.counterAxisSpacing?.value ?? l.itemSpacing.value}px`);
        style.push(`justify-content:${ALIGN[l.primaryAxisAlign]}`, `align-items:${ALIGN[l.counterAxisAlign]}`);
      }
      const p = l.padding;
      style.push(`padding:${p.top.value}px ${p.right.value}px ${p.bottom.value}px ${p.left.value}px`);
      if (n.fills.length) style.push(`background:${background(n.fills)}`);
      style.push(...strokeCss(n.stroke));
      if (n.cornerRadius) style.push(`border-radius:${n.cornerRadius.value}px`);
      if (n.effectStyle && ctx.effects.has(n.effectStyle)) style.push(`box-shadow:${ctx.effects.get(n.effectStyle)}`);
      if (n.clipsContent) style.push("overflow:hidden");
      const link = `${n.navigateTo ? ` data-navigate="${escape(n.navigateTo)}"` : ""}${n.key ? ` data-key="${escape(n.key)}"` : ""}`;
      const children = n.children.map((child) => node(ctx, child, l.mode, l.counterAxisAlign === "CENTER")).join("");
      return `<div ${attrs}${link} style="${style.join(";")}">${children}</div>`;
    }
  }
}

/** One page of a plan as a standalone HTML document (`pageId`: a page id of the plan; default the first). */
export function planPreviewHtml(plan: FigmaPlan, pageId?: string): string {
  const page = plan.pages.find((entry) => entry.id === pageId) ?? plan.pages[0]!;
  const ctx: Ctx = {
    styles: new Map(plan.textStyles.map((style) => [style.id, style])),
    effects: new Map(
      plan.effectStyles.map((style) => [
        style.id,
        style.effects.map((fx) => `${fx.offset.x}px ${fx.offset.y}px ${fx.radius}px ${fx.spread}px ${css(fx.color)}`).join(", "),
      ]),
    ),
  };
  const families = plan.fonts
    .filter((font) => !/mono/i.test(font.family))
    .map((font) => `family=${encodeURIComponent(font.family).replace(/%20/g, "+")}:wght@${font.weights.join(";")}`)
    .join("&");
  return `<!doctype html><html><head><meta charset="utf-8"><title>${escape(page.name)} · plan</title>
<link rel="stylesheet" href="https://fonts.googleapis.com/css2?${families}&display=swap">
<style>body{margin:0;background:#888}</style></head><body>${node(ctx, page.frame, "ROOT")}</body></html>`;
}
