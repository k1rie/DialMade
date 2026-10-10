// Main thread of the Dialmade plugin. The UI validates the figma-plan (Zod) and posts it here; this file builds it
// with the Plugin API: variables (color in Light/Dark, tokens), text and effect styles, one page per screen plus
// the style guide, auto layout frames bound to those variables and styles, and the prototype links on a «Flow»
// page (Figma prototypes cannot jump between pages). Running it again on the same file updates the variables and
// styles by name and replaces the frames it made before.
import type { FigmaPlan, PlanCollection, PlanFrame, PlanNode, PlanPaint, PlanTextStyle } from "@dialmade/handoff/figma-plan";
import { resolveFont, type FontName } from "./lib/fonts";
import type { Report, ToMain, ToUi } from "./lib/messages";

const PLUGIN_KEY = "dialmade";
const FLOW_PAGE = { es: "Flujo (prototipo)", en: "Flow (prototype)" } as const;
const PAGE_GAP = 160;

figma.showUI(__html__, { width: 420, height: 560, themeColors: true });

const post = (message: ToUi) => figma.ui.postMessage(message);

type Ctx = {
  plan: FigmaPlan;
  report: Report;
  variables: Map<string, Variable>;
  textStyles: Map<string, TextStyle>;
  effectStyles: Map<string, EffectStyle>;
  fonts: Map<string, FontName>;
  /** Fonts loaded for text weight overrides, by `family/weight`. */
  weightFonts: Map<string, FontName>;
  available: FontName[];
  colorCollection: VariableCollection | null;
  modeIds: Map<string, string>;
  /** Plan node id → the node built for it. */
  nodes: Map<string, SceneNode>;
};

/* ---------------------------------------------------------------------------------------------- */
/* Variables                                                                                      */
/* ---------------------------------------------------------------------------------------------- */

async function ensureCollection(ctx: Ctx, spec: PlanCollection): Promise<{ collection: VariableCollection; modes: Map<string, string> }> {
  const existing = (await figma.variables.getLocalVariableCollectionsAsync()).find((c) => c.name === spec.name);
  const collection = existing ?? figma.variables.createVariableCollection(spec.name);
  const modes = new Map<string, string>();
  spec.modes.forEach((name, i) => {
    const found = collection.modes.find((mode) => mode.name === name);
    if (found) {
      modes.set(name, found.modeId);
      return;
    }
    if (i === 0 && !existing) {
      collection.renameMode(collection.modes[0]!.modeId, name);
      modes.set(name, collection.modes[0]!.modeId);
      return;
    }
    try {
      modes.set(name, collection.addMode(name));
    } catch {
      ctx.report.warnings.push(
        ctx.plan.locale === "es"
          ? `Tu plan de Figma no permite el modo «${name}» en «${spec.name}»: se crearon solo los valores de «${spec.modes[0]}».`
          : `Your Figma plan does not allow the “${name}” mode in “${spec.name}”: only the “${spec.modes[0]}” values were created.`,
      );
    }
  });
  return { collection, modes };
}

async function buildVariables(ctx: Ctx, spec: PlanCollection, isColor: boolean) {
  const { collection, modes } = await ensureCollection(ctx, spec);
  const local = await figma.variables.getLocalVariablesAsync();
  const inCollection = new Map(local.filter((v) => v.variableCollectionId === collection.id).map((v) => [v.name, v]));
  // First every variable exists (aliases need their target), then the values.
  for (const entry of spec.variables) {
    let variable = inCollection.get(entry.name);
    if (variable && variable.resolvedType !== entry.type) {
      variable.remove();
      variable = undefined;
    }
    if (variable) ctx.report.variables.updated++;
    else {
      variable = figma.variables.createVariable(entry.name, collection, entry.type);
      ctx.report.variables.created++;
    }
    variable.scopes = entry.scopes as VariableScope[];
    if (entry.cssVar) variable.setVariableCodeSyntax("WEB", `var(${entry.cssVar})`);
    ctx.variables.set(entry.name, variable);
  }
  for (const entry of spec.variables) {
    const variable = ctx.variables.get(entry.name)!;
    for (const [modeName, value] of Object.entries(entry.values)) {
      const modeId = modes.get(modeName);
      if (!modeId) continue;
      if (typeof value === "object" && "alias" in value) {
        const target = ctx.variables.get(value.alias);
        if (target) variable.setValueForMode(modeId, figma.variables.createVariableAlias(target));
      } else {
        variable.setValueForMode(modeId, value as VariableValue);
      }
    }
  }
  if (isColor) {
    ctx.colorCollection = collection;
    ctx.modeIds = modes;
  }
}

/* ---------------------------------------------------------------------------------------------- */
/* Styles                                                                                         */
/* ---------------------------------------------------------------------------------------------- */

async function buildFonts(ctx: Ctx) {
  const available = (await figma.listAvailableFontsAsync()).map((font) => font.fontName);
  ctx.available = available;
  const missing = new Set<string>();
  for (const style of ctx.plan.textStyles) {
    const resolved = resolveFont(available, style.fontFamily, style.fontWeight, style.fallbackFamily);
    if (resolved.substituted) missing.add(`${style.fontFamily} → ${resolved.font.family}`);
    try {
      await figma.loadFontAsync(resolved.font);
      ctx.fonts.set(style.id, resolved.font);
    } catch {
      const inter = { family: "Inter", style: "Regular" };
      await figma.loadFontAsync(inter);
      ctx.fonts.set(style.id, inter);
      missing.add(`${style.fontFamily} → Inter`);
    }
  }
  ctx.report.missingFonts = [...missing];
}

async function buildTextStyles(ctx: Ctx) {
  const local = await figma.getLocalTextStylesAsync();
  for (const spec of ctx.plan.textStyles) {
    const style = local.find((s) => s.name === spec.name) ?? figma.createTextStyle();
    applyTextStyle(ctx, style, spec);
    ctx.textStyles.set(spec.id, style);
    ctx.report.textStyles++;
  }
}

function applyTextStyle(ctx: Ctx, style: TextStyle, spec: PlanTextStyle) {
  style.name = spec.name;
  style.fontName = ctx.fonts.get(spec.id) ?? { family: "Inter", style: "Regular" };
  style.fontSize = spec.fontSize;
  style.lineHeight = { unit: "PERCENT", value: spec.lineHeight };
  style.letterSpacing = { unit: "PERCENT", value: spec.letterSpacing };
  style.textCase = spec.textCase;
  const size = spec.fontSizeVariable ? ctx.variables.get(spec.fontSizeVariable) : undefined;
  if (size) {
    try {
      style.setBoundVariable("fontSize", size);
    } catch {
      // Older files: the size stays a plain number.
    }
  }
}

async function buildEffectStyles(ctx: Ctx) {
  const local = await figma.getLocalEffectStylesAsync();
  for (const spec of ctx.plan.effectStyles) {
    const style = local.find((s) => s.name === spec.name) ?? figma.createEffectStyle();
    style.name = spec.name;
    style.effects = spec.effects.map((fx) => ({
      type: "DROP_SHADOW",
      color: fx.color,
      offset: fx.offset,
      radius: fx.radius,
      spread: fx.spread,
      visible: true,
      blendMode: "NORMAL",
      showShadowBehindNode: false,
    }));
    ctx.effectStyles.set(spec.id, style);
    ctx.report.effectStyles++;
  }
}

/** The style's family at another weight (a text override), loaded once. */
async function weightFont(ctx: Ctx, styleId: string, weight: number): Promise<FontName | null> {
  const spec = ctx.plan.textStyles.find((style) => style.id === styleId);
  const base = ctx.fonts.get(styleId);
  if (!spec || !base) return null;
  const key = `${base.family}/${weight}`;
  const known = ctx.weightFonts.get(key);
  if (known) return known;
  const resolved = resolveFont(ctx.available, base.family, weight, spec.fallbackFamily).font;
  try {
    await figma.loadFontAsync(resolved);
  } catch {
    return null;
  }
  ctx.weightFonts.set(key, resolved);
  return resolved;
}

/* ---------------------------------------------------------------------------------------------- */
/* Nodes                                                                                          */
/* ---------------------------------------------------------------------------------------------- */

function paint(ctx: Ctx, spec: PlanPaint): Paint {
  if (spec.type === "SOLID") {
    const { r, g, b, a } = spec.color;
    let solid: SolidPaint = { type: "SOLID", color: { r, g, b }, opacity: a * (spec.opacity ?? 1) };
    const variable = spec.variable ? ctx.variables.get(spec.variable) : undefined;
    if (variable) {
      solid = figma.variables.setBoundVariableForPaint(solid, "color", variable);
      // Binding resets the opacity to the variable's alpha: keep the paint's own opacity on top.
      solid = { ...solid, opacity: spec.opacity ?? solid.opacity ?? 1 };
    }
    return solid;
  }
  // CSS angles: 0deg points up, 90deg right. Figma's transform maps the gradient's unit square.
  const rad = ((spec.angle - 90) * Math.PI) / 180;
  const cos = Math.cos(rad);
  const sin = Math.sin(rad);
  return {
    type: "GRADIENT_LINEAR",
    gradientTransform: [
      [cos, sin, 0.5 - cos / 2 - sin / 2],
      [-sin, cos, 0.5 + sin / 2 - cos / 2],
    ],
    gradientStops: spec.stops.map((stop) => ({ position: stop.position, color: stop.color })),
  };
}

const bind = (ctx: Ctx, node: SceneNode & { setBoundVariable: (field: VariableBindableNodeField, v: Variable | null) => void }, field: VariableBindableNodeField, name: string | undefined) => {
  const variable = name ? ctx.variables.get(name) : undefined;
  if (!variable) return;
  try {
    node.setBoundVariable(field, variable);
  } catch {
    // The value is already set as a number.
  }
};

type Sized = FrameNode | RectangleNode | EllipseNode | TextNode;

function applySizing(node: Sized, spec: PlanNode, parent: BaseNode & ChildrenMixin) {
  const s = spec.sizing;
  const inAutoLayout = "layoutMode" in parent && (parent as FrameNode).layoutMode !== "NONE";
  if (spec.absolute) {
    if (inAutoLayout) node.layoutPositioning = "ABSOLUTE";
    node.x = spec.absolute.x;
    node.y = spec.absolute.y;
  }
  const canHug = node.type === "TEXT" || (node.type === "FRAME" && node.layoutMode !== "NONE");
  const width = s.horizontal === "FIXED" || !inAutoLayout || (s.horizontal === "HUG" && !canHug) ? Math.max(1, s.width) : null;
  const height = s.height !== undefined && (s.vertical === "FIXED" || !canHug) ? Math.max(1, s.height) : null;
  if (width !== null || height !== null) node.resize(width ?? Math.max(1, node.width), height ?? Math.max(1, node.height));
  const horizontal = !inAutoLayout && s.horizontal === "FILL" ? "FIXED" : s.horizontal === "HUG" && !canHug ? "FIXED" : s.horizontal;
  const vertical = !inAutoLayout && s.vertical === "FILL" ? "FIXED" : s.vertical === "HUG" && !canHug ? "FIXED" : s.vertical;
  try {
    node.layoutSizingHorizontal = horizontal;
    node.layoutSizingVertical = vertical;
  } catch {
    // FILL outside auto layout or HUG without content: keep the fixed size.
  }
  if (node.type === "FRAME" || node.type === "TEXT") {
    try {
      if (s.minHeight !== undefined) node.minHeight = s.minHeight;
      if (s.maxWidth !== undefined) node.maxWidth = s.maxWidth;
    } catch {
      // Min/max only apply to auto layout frames and their children.
    }
  }
  if (spec.opacity !== undefined) node.opacity = spec.opacity;
}

function applyStroke(ctx: Ctx, node: FrameNode | RectangleNode | EllipseNode, spec: PlanFrame["stroke"]) {
  if (!spec) return;
  node.strokes = [paint(ctx, spec.paint)];
  node.strokeAlign = "INSIDE";
  if (spec.dashed) node.dashPattern = [4, 4];
  if (!spec.sides) {
    node.strokeWeight = spec.weight;
    return;
  }
  if (node.type === "ELLIPSE") {
    node.strokeWeight = spec.weight;
    return;
  }
  const sides = new Set(spec.sides);
  node.strokeTopWeight = sides.has("top") ? spec.weight : 0;
  node.strokeRightWeight = sides.has("right") ? spec.weight : 0;
  node.strokeBottomWeight = sides.has("bottom") ? spec.weight : 0;
  node.strokeLeftWeight = sides.has("left") ? spec.weight : 0;
}

function applyRadius(ctx: Ctx, node: FrameNode | RectangleNode, spec: PlanFrame["cornerRadius"]) {
  if (!spec) return;
  node.cornerRadius = spec.value;
  for (const corner of ["topLeftRadius", "topRightRadius", "bottomLeftRadius", "bottomRightRadius"] as const) bind(ctx, node, corner, spec.variable);
}

async function buildNode(ctx: Ctx, spec: PlanNode, parent: BaseNode & ChildrenMixin): Promise<SceneNode> {
  let node: SceneNode;
  switch (spec.type) {
    case "FRAME": {
      const frame = figma.createFrame();
      frame.name = spec.name;
      frame.fills = spec.fills.map((fill) => paint(ctx, fill));
      frame.clipsContent = spec.clipsContent;
      const layout = spec.layout;
      if (layout.mode !== "NONE") {
        frame.layoutMode = layout.mode;
        frame.layoutWrap = layout.wrap ? "WRAP" : "NO_WRAP";
        frame.itemSpacing = layout.itemSpacing.value;
        if (layout.wrap && layout.counterAxisSpacing) frame.counterAxisSpacing = layout.counterAxisSpacing.value;
        frame.paddingTop = layout.padding.top.value;
        frame.paddingRight = layout.padding.right.value;
        frame.paddingBottom = layout.padding.bottom.value;
        frame.paddingLeft = layout.padding.left.value;
        frame.primaryAxisAlignItems = layout.primaryAxisAlign;
        frame.counterAxisAlignItems = layout.counterAxisAlign === "BASELINE" && layout.mode === "VERTICAL" ? "MIN" : layout.counterAxisAlign;
        bind(ctx, frame, "itemSpacing", layout.itemSpacing.variable);
        bind(ctx, frame, "paddingTop", layout.padding.top.variable);
        bind(ctx, frame, "paddingRight", layout.padding.right.variable);
        bind(ctx, frame, "paddingBottom", layout.padding.bottom.variable);
        bind(ctx, frame, "paddingLeft", layout.padding.left.variable);
      }
      applyStroke(ctx, frame, spec.stroke);
      applyRadius(ctx, frame, spec.cornerRadius);
      const effect = spec.effectStyle ? ctx.effectStyles.get(spec.effectStyle) : undefined;
      if (effect) await frame.setEffectStyleIdAsync(effect.id);
      if (spec.key) frame.setPluginData("key", spec.key);
      if (spec.mode) setMode(ctx, frame, spec.mode);
      parent.appendChild(frame);
      // Children before the frame's own sizing: a HUG frame needs its content, a FILL child needs its parent.
      for (const child of spec.children) await buildNode(ctx, child, frame);
      applySizing(frame, spec, parent);
      node = frame;
      break;
    }
    case "TEXT": {
      const text = figma.createText();
      const font = ctx.fonts.get(spec.textStyle) ?? { family: "Inter", style: "Regular" };
      text.fontName = font;
      const style = ctx.textStyles.get(spec.textStyle);
      if (style) await text.setTextStyleIdAsync(style.id);
      text.characters = spec.characters;
      if (spec.fontWeight !== undefined) {
        const font = await weightFont(ctx, spec.textStyle, spec.fontWeight);
        if (font) text.fontName = font;
      }
      if (spec.fontSize !== undefined) text.fontSize = spec.fontSize;
      text.name = spec.name;
      text.fills = [paint(ctx, spec.fill)];
      text.textAlignHorizontal = spec.textAlign;
      if (spec.strikethrough) text.textDecoration = "STRIKETHROUGH";
      parent.appendChild(text);
      text.textAutoResize = spec.sizing.horizontal === "HUG" ? "WIDTH_AND_HEIGHT" : "HEIGHT";
      applySizing(text, spec, parent);
      if (spec.sizing.horizontal !== "HUG") text.textAutoResize = "HEIGHT";
      node = text;
      break;
    }
    case "RECTANGLE":
    case "ELLIPSE": {
      const shape = spec.type === "ELLIPSE" ? figma.createEllipse() : figma.createRectangle();
      shape.name = spec.image ? `${spec.name} (image)` : spec.name;
      shape.fills = spec.fills.map((fill) => paint(ctx, fill));
      applyStroke(ctx, shape, spec.stroke);
      if (shape.type === "RECTANGLE") applyRadius(ctx, shape, spec.cornerRadius);
      parent.appendChild(shape);
      applySizing(shape, spec, parent);
      node = shape;
      break;
    }
    case "ICON": {
      const icon = figma.createNodeFromSvg(spec.svg);
      icon.name = spec.name;
      icon.fills = [];
      const color = paint(ctx, spec.color);
      for (const vector of icon.findAll((n) => n.type === "VECTOR") as VectorNode[]) vector.strokes = [color];
      parent.appendChild(icon);
      if ("layoutMode" in parent && (parent as FrameNode).layoutMode !== "NONE") icon.layoutSizingHorizontal = "FIXED";
      icon.resize(spec.sizing.width, spec.sizing.height ?? spec.sizing.width);
      if (spec.absolute) {
        if ("layoutMode" in parent && (parent as FrameNode).layoutMode !== "NONE") icon.layoutPositioning = "ABSOLUTE";
        icon.x = spec.absolute.x;
        icon.y = spec.absolute.y;
      }
      node = icon;
      break;
    }
  }
  ctx.nodes.set(spec.id, node);
  return node;
}

/* ---------------------------------------------------------------------------------------------- */
/* Pages and prototype                                                                            */
/* ---------------------------------------------------------------------------------------------- */

async function pageFor(id: string, name: string): Promise<PageNode> {
  await figma.loadAllPagesAsync();
  const existing = figma.root.children.find((page) => page.getPluginData("page") === id);
  if (existing) {
    for (const child of [...existing.children]) if (child.getPluginData(PLUGIN_KEY)) child.remove();
    existing.name = name;
    return existing;
  }
  const page = figma.createPage();
  page.name = name;
  page.setPluginData("page", id);
  return page;
}

function setMode(ctx: Ctx, frame: FrameNode, mode: string) {
  const modeId = ctx.modeIds.get(mode);
  if (ctx.colorCollection && modeId) frame.setExplicitVariableModeForCollection(ctx.colorCollection, modeId);
}

/** Pairs every node of `original` with the same node of its clone (same structure, same order). */
function pairClones(original: SceneNode, clone: SceneNode, out: Map<string, SceneNode>, byNode: Map<SceneNode, string>) {
  const planId = byNode.get(original);
  if (planId) out.set(planId, clone);
  if ("children" in original && "children" in clone) {
    original.children.forEach((child, i) => {
      const twin = clone.children[i];
      if (twin) pairClones(child, twin, out, byNode);
    });
  }
}

function linksOf(frame: PlanFrame, out: { from: string; to: string }[] = []): { from: string; to: string }[] {
  if (frame.navigateTo) out.push({ from: frame.id, to: frame.navigateTo });
  for (const child of frame.children) if (child.type === "FRAME") linksOf(child, out);
  return out;
}

async function buildFlow(ctx: Ctx, screens: { spec: PlanFrame; node: FrameNode }[]) {
  const links = screens.flatMap(({ spec }) => linksOf(spec));
  if (links.length === 0) return;
  const page = await pageFor("flow", FLOW_PAGE[ctx.plan.locale]);
  const byNode = new Map<SceneNode, string>();
  for (const [id, node] of ctx.nodes) byNode.set(node, id);
  const clones = new Map<string, SceneNode>();
  let x = 0;
  for (const { node } of screens) {
    const clone = node.clone();
    page.appendChild(clone);
    clone.x = x;
    clone.y = 0;
    clone.setPluginData(PLUGIN_KEY, "flow");
    x += clone.width + PAGE_GAP;
    pairClones(node, clone, clones, byNode);
  }
  for (const link of links) {
    const from = clones.get(link.from);
    const to = clones.get(link.to);
    if (!from || !to || !("setReactionsAsync" in from)) continue;
    await (from as FrameNode).setReactionsAsync([
      {
        trigger: { type: "ON_CLICK" },
        actions: [{ type: "NODE", destinationId: to.id, navigation: "NAVIGATE", transition: null, preserveScrollPosition: false }],
      },
    ]);
    ctx.report.links++;
  }
  const start = clones.get(screens[0]!.spec.id);
  if (start) page.flowStartingPoints = [{ nodeId: start.id, name: ctx.plan.name }];
}

async function create(plan: FigmaPlan, options: { dark: boolean; flow: boolean }): Promise<Report> {
  const ctx: Ctx = {
    plan,
    report: { variables: { created: 0, updated: 0 }, textStyles: 0, effectStyles: 0, pages: 0, frames: 0, links: 0, missingFonts: [], warnings: [] },
    variables: new Map(),
    textStyles: new Map(),
    effectStyles: new Map(),
    fonts: new Map(),
    weightFonts: new Map(),
    available: [],
    colorCollection: null,
    modeIds: new Map(),
    nodes: new Map(),
  };
  const es = plan.locale === "es";
  post({ type: "progress", message: es ? "Variables…" : "Variables…" });
  await buildVariables(ctx, plan.collections.color, true);
  await buildVariables(ctx, plan.collections.tokens, false);
  post({ type: "progress", message: es ? "Fuentes y estilos…" : "Fonts and styles…" });
  await buildFonts(ctx);
  await buildTextStyles(ctx);
  await buildEffectStyles(ctx);

  const screens: { spec: PlanFrame; node: FrameNode }[] = [];
  let first: { page: PageNode; node: FrameNode } | null = null;
  for (const [i, spec] of plan.pages.entries()) {
    post({ type: "progress", message: `${i + 1}/${plan.pages.length} · ${spec.name}` });
    const page = await pageFor(spec.id, spec.name);
    const node = (await buildNode(ctx, spec.frame, page)) as FrameNode;
    node.setPluginData(PLUGIN_KEY, "screen");
    node.x = 0;
    node.y = 0;
    setMode(ctx, node, plan.defaultMode);
    ctx.report.pages++;
    ctx.report.frames++;
    if (options.dark && ctx.modeIds.has("Dark") && ctx.modeIds.has("Light")) {
      const dark = node.clone();
      page.appendChild(dark);
      dark.name = `${node.name} · ${plan.defaultMode === "Dark" ? "Light" : "Dark"}`;
      dark.x = node.width + PAGE_GAP;
      dark.setPluginData(PLUGIN_KEY, "variant");
      setMode(ctx, dark, plan.defaultMode === "Dark" ? "Light" : "Dark");
      ctx.report.frames++;
    }
    if (spec.kind === "screen") screens.push({ spec: spec.frame, node });
    first ??= { page, node };
  }
  if (options.flow) await buildFlow(ctx, screens);
  if (first) {
    await figma.setCurrentPageAsync(first.page);
    figma.viewport.scrollAndZoomIntoView([first.node]);
  }
  return ctx.report;
}

figma.ui.onmessage = async (message: ToMain) => {
  if (message.type === "close") {
    figma.closePlugin();
    return;
  }
  try {
    const report = await create(message.plan, message.options);
    post({ type: "done", report });
    figma.notify(message.plan.locale === "es" ? `Dialmade: ${report.pages} páginas creadas` : `Dialmade: ${report.pages} pages created`);
  } catch (error) {
    post({ type: "error", message: error instanceof Error ? error.message : String(error) });
  }
};
