// A small stand-in for the Figma Plugin API: the calls code.ts makes, with the checks Figma does that a plugin
// most often trips on (FILL outside auto layout, HUG on a frame without auto layout, text edits before the font
// loads, aliases to unknown variables, reactions to nodes on another page). Enough to run a whole plan in Node.
/* eslint-disable @typescript-eslint/no-explicit-any */

type Font = { family: string; style: string };
const fontKey = (font: Font) => `${font.family}/${font.style}`;

let ids = 0;
const nextId = () => `${++ids}:1`;

class FakeNode {
  id = nextId();
  name = "";
  parent: FakeNode | null = null;
  children: FakeNode[] = [];
  plugin = new Map<string, string>();
  x = 0;
  y = 0;
  width = 100;
  height = 100;
  opacity = 1;
  fills: unknown[] = [];
  strokes: unknown[] = [];
  bound = new Map<string, unknown>();
  modes = new Map<string, string>();
  reactions: unknown[] = [];
  layoutMode: "NONE" | "HORIZONTAL" | "VERTICAL" = "NONE";
  layoutPositioning = "AUTO";
  private sizingH = "FIXED";
  private sizingV = "FIXED";
  constructor(
    readonly type: string,
    private readonly api: FakeFigma,
  ) {}
  appendChild(child: FakeNode) {
    if (child.parent) child.parent.children = child.parent.children.filter((c) => c !== child);
    child.parent = this;
    this.children.push(child);
  }
  remove() {
    if (this.parent) this.parent.children = this.parent.children.filter((c) => c !== this);
    this.parent = null;
  }
  setPluginData(key: string, value: string) {
    this.plugin.set(key, value);
  }
  getPluginData(key: string) {
    return this.plugin.get(key) ?? "";
  }
  resize(width: number, height: number) {
    if (!(width >= 0.01 && height >= 0.01)) throw new Error(`resize: invalid size ${width}×${height} on ${this.name}`);
    this.width = width;
    this.height = height;
  }
  private inAutoLayout() {
    return !!this.parent && this.parent.type === "FRAME" && this.parent.layoutMode !== "NONE";
  }
  private checkSizing(value: string) {
    if (value === "FILL" && !this.inAutoLayout()) throw new Error(`FILL outside auto layout: ${this.name}`);
    if (value === "HUG" && !(this.type === "TEXT" || (this.type === "FRAME" && this.layoutMode !== "NONE"))) throw new Error(`HUG without auto layout: ${this.name}`);
  }
  set layoutSizingHorizontal(value: string) {
    this.checkSizing(value);
    this.sizingH = value;
  }
  get layoutSizingHorizontal() {
    return this.sizingH;
  }
  set layoutSizingVertical(value: string) {
    this.checkSizing(value);
    this.sizingV = value;
  }
  get layoutSizingVertical() {
    return this.sizingV;
  }
  set minHeight(_value: number) {
    if (!(this.type === "FRAME" && this.layoutMode !== "NONE") && !this.inAutoLayout()) throw new Error("minHeight needs auto layout");
  }
  set maxWidth(_value: number) {
    if (!(this.type === "FRAME" && this.layoutMode !== "NONE") && !this.inAutoLayout()) throw new Error("maxWidth needs auto layout");
  }
  setBoundVariable(field: string, variable: any) {
    if (!this.api.variables.known(variable)) throw new Error("unknown variable");
    this.bound.set(field, variable.id);
  }
  async setEffectStyleIdAsync(id: string) {
    if (!this.api.styles.has(id)) throw new Error(`unknown effect style ${id}`);
  }
  async setTextStyleIdAsync(id: string) {
    const style = this.api.styles.get(id);
    if (!style) throw new Error(`unknown text style ${id}`);
    this.api.requireFont(style.fontName);
    this.font = style.fontName;
  }
  setExplicitVariableModeForCollection(collection: any, modeId: string) {
    if (!collection.modes.some((m: any) => m.modeId === modeId)) throw new Error("unknown mode");
    this.modes.set(collection.id, modeId);
  }
  async setReactionsAsync(reactions: any[]) {
    for (const reaction of reactions) {
      const target = this.api.byId.get(reaction.actions[0].destinationId);
      if (!target) throw new Error("unknown destination");
      if (this.api.pageOf(target) !== this.api.pageOf(this)) throw new Error("prototype destination on another page");
    }
    this.reactions = reactions;
  }
  findAll(predicate: (node: FakeNode) => boolean): FakeNode[] {
    const out: FakeNode[] = [];
    const visit = (node: FakeNode) => {
      for (const child of node.children) {
        if (predicate(child)) out.push(child);
        visit(child);
      }
    };
    visit(this);
    return out;
  }
  clone(): FakeNode {
    const copy = new FakeNode(this.type, this.api);
    Object.assign(copy, { ...this, id: copy.id, parent: null, children: [], plugin: new Map(this.plugin), bound: new Map(this.bound), modes: new Map(this.modes) });
    this.api.byId.set(copy.id, copy);
    for (const child of this.children) copy.appendChild(child.clone());
    return copy;
  }
  private font: Font | undefined;
  set fontName(font: Font) {
    if (this.type === "TEXT") this.api.requireFont(font);
    this.font = font;
  }
  get fontName(): Font | undefined {
    return this.font;
  }
  /** Figma's default font of a new text, not loaded yet. */
  initFont(font: Font) {
    this.font = font;
  }
  private chars = "";
  set characters(value: string) {
    this.api.requireFont(this.font);
    this.chars = value;
  }
  get characters() {
    return this.chars;
  }
}

class FakeVariables {
  collections: any[] = [];
  vars: any[] = [];
  known(variable: any) {
    return this.vars.includes(variable);
  }
  async getLocalVariableCollectionsAsync() {
    return this.collections;
  }
  async getLocalVariablesAsync() {
    return this.vars;
  }
  createVariableCollection(name: string) {
    let modeCount = 1;
    const collection: any = {
      id: `VariableCollectionId:${this.collections.length + 1}`,
      name,
      modes: [{ modeId: `${name}:m1`, name: "Mode 1" }],
      renameMode(modeId: string, newName: string) {
        collection.modes.find((m: any) => m.modeId === modeId).name = newName;
      },
      addMode(modeName: string) {
        const modeId = `${name}:m${++modeCount}`;
        collection.modes.push({ modeId, name: modeName });
        return modeId;
      },
    };
    this.collections.push(collection);
    return collection;
  }
  createVariable(name: string, collection: any, type: string) {
    if (!/^[^.{}]+$/.test(name)) throw new Error(`invalid variable name ${name}`);
    const variable: any = {
      id: `VariableID:${this.vars.length + 1}`,
      name,
      variableCollectionId: collection.id,
      resolvedType: type,
      scopes: [],
      values: new Map<string, unknown>(),
      setVariableCodeSyntax() {},
      setValueForMode(modeId: string, value: any) {
        if (!collection.modes.some((m: any) => m.modeId === modeId)) throw new Error("unknown mode");
        if (type === "COLOR" && !(value.type === "VARIABLE_ALIAS" || ("r" in value && "a" in value))) throw new Error(`bad color for ${name}`);
        if (type === "FLOAT" && typeof value !== "number") throw new Error(`bad number for ${name}`);
        variable.values.set(modeId, value);
      },
      remove() {},
    };
    this.vars.push(variable);
    return variable;
  }
  createVariableAlias(variable: any) {
    if (!this.known(variable)) throw new Error("alias to unknown variable");
    return { type: "VARIABLE_ALIAS", id: variable.id };
  }
  setBoundVariableForPaint(paint: any, field: string, variable: any) {
    if (field !== "color" || paint.type !== "SOLID" || !this.known(variable)) throw new Error("bad paint binding");
    return { ...paint, boundVariables: { color: { type: "VARIABLE_ALIAS", id: variable.id } } };
  }
}

export class FakeFigma {
  variables = new FakeVariables();
  styles = new Map<string, any>();
  byId = new Map<string, FakeNode>();
  loaded = new Set<string>();
  root: FakeNode;
  currentPage: FakeNode;
  messages: unknown[] = [];
  ui: { postMessage: (m: unknown) => void; onmessage: ((m: any) => Promise<void>) | null } = {
    postMessage: (m) => this.messages.push(m),
    onmessage: null,
  };
  viewport = { scrollAndZoomIntoView() {} };
  notify() {}
  showUI() {}
  closePlugin() {}

  constructor(readonly fonts: Font[] = [{ family: "Inter", style: "Regular" }, { family: "Inter", style: "Medium" }, { family: "Inter", style: "Semi Bold" }, { family: "Inter", style: "Bold" }]) {
    this.root = this.make("DOCUMENT");
    this.currentPage = this.createPage();
  }
  private make(type: string) {
    const node = new FakeNode(type, this);
    this.byId.set(node.id, node);
    return node;
  }
  pageOf(node: FakeNode): FakeNode | null {
    let current: FakeNode | null = node;
    while (current && current.type !== "PAGE") current = current.parent;
    return current;
  }
  requireFont(font: Font | undefined) {
    if (!font || !this.loaded.has(fontKey(font))) throw new Error(`font not loaded: ${font ? fontKey(font) : "none"}`);
  }
  async loadAllPagesAsync() {}
  async setCurrentPageAsync(page: FakeNode) {
    this.currentPage = page;
  }
  async listAvailableFontsAsync() {
    return this.fonts.map((fontName) => ({ fontName }));
  }
  async loadFontAsync(font: Font) {
    if (!this.fonts.some((f) => fontKey(f) === fontKey(font))) throw new Error(`font not available: ${fontKey(font)}`);
    this.loaded.add(fontKey(font));
  }
  createPage() {
    const page = this.make("PAGE");
    (page as any).flowStartingPoints = [];
    this.root.appendChild(page);
    return page;
  }
  createFrame() {
    return this.make("FRAME");
  }
  createText() {
    const text = this.make("TEXT");
    text.initFont({ family: "Inter", style: "Regular" });
    return text;
  }
  createRectangle() {
    return this.make("RECTANGLE");
  }
  createEllipse() {
    return this.make("ELLIPSE");
  }
  createNodeFromSvg(svg: string) {
    if (!svg.startsWith("<svg")) throw new Error("bad svg");
    const frame = this.make("FRAME");
    const vector = this.make("VECTOR");
    frame.appendChild(vector);
    return frame;
  }
  private style(type: string) {
    const style: any = { id: `S:${type}${this.styles.size + 1}`, type, name: "" };
    this.styles.set(style.id, style);
    Object.defineProperty(style, "fontName", {
      get: () => style._font,
      set: (font: Font) => {
        this.requireFont(font);
        style._font = font;
      },
    });
    style.setBoundVariable = (_field: string, variable: any) => {
      if (!this.variables.known(variable)) throw new Error("unknown variable");
    };
    return style;
  }
  createTextStyle() {
    return this.style("TEXT");
  }
  createEffectStyle() {
    return this.style("EFFECT");
  }
  async getLocalTextStylesAsync() {
    return [...this.styles.values()].filter((s) => s.type === "TEXT");
  }
  async getLocalEffectStylesAsync() {
    return [...this.styles.values()].filter((s) => s.type === "EFFECT");
  }
}

export type { FakeNode };
