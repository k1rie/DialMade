// The AI island runtime (spec §6.1): the only script of the preview origin. The app frames `island.html` in a
// `sandbox="allow-scripts"` iframe (opaque origin, no forms, popups or top navigation) and sends it ONE block:
// sanitized HTML, the CSS compiled for it and the theme variables. The runtime paints it, reports its height, and in
// Ajustar sends the selection and inline text edits back. It accepts messages only from the app origin it was given
// (`?parent=`), which the CSP's `frame-ancestors` already pins, and validates every message with the shared schemas.
import "./zodConfig";
import { ISLAND_BLEED, IslandMessageSchema, MAX_ISLAND_HEIGHT, ParentMessageSchema, type IslandMessage, type ParentMessage } from "@dialmade/ai-render/protocol";
import { PAGE_BASE_CSS, sanitizeCss } from "@dialmade/ai-render/runtime";
import { insertBlock } from "./insert";
import { measureAtWidths, measureBlock } from "./measure";

const params = new URLSearchParams(location.search);
const parentOrigin = (() => {
  try {
    return new URL(params.get("parent") ?? "").origin;
  } catch {
    return null;
  }
})();

const host = document.getElementById("dl-island")!;
const style = document.createElement("style");
const vars = document.createElement("style");
document.head.append(vars, style);
let blockId: string | null = null;
let editable = false;
let fontsLink: HTMLLinkElement | null = null;
/** The inline text edit in progress (see below). */
let editing: { element: HTMLElement; before: string; keyboard: boolean } | null = null;

function send(message: IslandMessage) {
  if (!parentOrigin || !IslandMessageSchema.safeParse(message).success) return;
  window.parent.postMessage(message, parentOrigin);
}

function setTheme(themeVars: Record<string, string>, mode: "light" | "dark", fontsHref: string | null) {
  const body = Object.entries(themeVars)
    .map(([name, value]) => `${name}:${value};`)
    .join("");
  vars.textContent = `:root{${body}color-scheme:${mode}}html,body{margin:0;background:transparent}#dl-island{padding:${ISLAND_BLEED}px}`;
  document.documentElement.dataset.dlMode = mode;
  if (fontsHref && fontsLink?.href !== fontsHref) {
    fontsLink?.remove();
    fontsLink = document.createElement("link");
    fontsLink.rel = "stylesheet";
    fontsLink.href = fontsHref;
    document.head.append(fontsLink);
  }
}

const texts = () => [...host.querySelectorAll<HTMLElement>("[data-dl-t]")];

/** In Ajustar the block is a picture to select and edit, not a page to use: its links and controls are no tab stops. */
const FOCUSABLE = "a[href], button, input, select, textarea, summary, [tabindex], [contenteditable]";

function render(message: Extract<ParentMessage, { type: "render" }>) {
  blockId = message.blockId;
  editable = message.editable;
  // A text saved while walking the texts with Tab comes back as a new render: the edit in progress resumes on the
  // same text (same `data-dl-t`) with what the user has typed so far.
  const resume = editing && editable ? { t: editing.element.getAttribute("data-dl-t"), text: editing.element.textContent ?? "", before: editing.before, keyboard: editing.keyboard } : null;
  editing = null;
  document.documentElement.lang = message.lang;
  setTheme(message.vars, message.mode, message.fontsHref);
  // Page mode: the host is where the page stylesheet's scope (`[data-dl-ai-block]`) starts; its CSS is cleaned again.
  if (message.page) host.setAttribute("data-dl-ai-block", "");
  else host.removeAttribute("data-dl-ai-block");
  style.textContent = message.page ? `${message.css}${PAGE_BASE_CSS}${sanitizeCss(message.pageCss ?? "", { kind: "page" }).css}` : message.css;
  insertBlock(host, message.html, { page: message.page === true });
  if (editable) for (const element of host.querySelectorAll<HTMLElement>(FOCUSABLE)) element.tabIndex = -1;
  const again = resume ? texts().find((node) => node.getAttribute("data-dl-t") === resume.t) : undefined;
  if (resume && again) {
    again.textContent = resume.text;
    startEdit(again, resume.keyboard, resume.before);
  }
  reportSize();
  requestAnimationFrame(() => {
    reportSize();
    reportMeasure();
  });
}

function reportSize() {
  if (!blockId) return;
  const height = Math.min(MAX_ISLAND_HEIGHT, Math.ceil(host.getBoundingClientRect().height));
  send({ type: "size", blockId, height });
}

function reportMeasure(widths?: readonly number[]) {
  const root = host.firstElementChild;
  if (!blockId || !root) return;
  const measurements = widths && widths.length > 0 ? measureAtWidths(host, root, widths) : [measureBlock(root)];
  for (const measurement of measurements) send({ type: "measure", blockId, ...measurement });
}

new ResizeObserver(() => reportSize()).observe(host);
document.fonts?.ready.then(() => reportSize()).catch(() => {});

window.addEventListener("message", (event) => {
  if (event.source !== window.parent || event.origin !== parentOrigin) return;
  const parsed = ParentMessageSchema.safeParse(event.data);
  if (!parsed.success) return;
  const message = parsed.data;
  if (message.type === "render") render(message);
  else if (message.type === "theme") setTheme(message.vars, message.mode, message.fontsHref);
  else if (message.type === "edit") editFromKeyboard(message.t);
  else reportMeasure(message.widths);
});

// Links never navigate (the sandbox forbids it anyway): `#screen:<id>` asks the app to open that screen.
host.addEventListener("click", (event) => {
  const target = event.target instanceof Element ? event.target : null;
  const link = target?.closest("a[href]");
  if (link) event.preventDefault();
  if (!blockId) return;
  if (editable) {
    const textNode = target?.closest("[data-dl-t]");
    const t = textNode ? Number(textNode.getAttribute("data-dl-t")) : null;
    send({ type: "select", blockId, t: Number.isInteger(t) ? t : null, text: textNode?.textContent?.slice(0, 200) ?? null });
    return;
  }
  const screen = /^#screen:([\w-]+)$/.exec(link?.getAttribute("href") ?? "");
  if (screen) send({ type: "navigate", blockId, screenId: screen[1]! });
});

// Inline text edit (Ajustar). With the mouse: double click a text. With the keyboard: the app sends `edit {t}` (the
// «Editar textos» button of the «Bloque de IA» card) and the island edits that text, or the first one; Tab and
// Shift+Tab save it and move to the next / previous text. Enter or leaving the field saves ONE textEdit, Escape
// restores it. When a keyboard edit ends, `editEnd` tells the app to take focus back.
function startEdit(element: HTMLElement, keyboard: boolean, before = element.textContent ?? "") {
  if (!editable || editing) return;
  editing = { element, before, keyboard };
  element.setAttribute("contenteditable", "plaintext-only");
  element.focus();
  // Caret at the end, like a field the user tabbed into.
  const selection = window.getSelection();
  if (selection) {
    selection.selectAllChildren(element);
    selection.collapseToEnd();
  }
}

function endEdit(commit: boolean) {
  if (!editing || !blockId) return;
  const { element, before } = editing;
  editing = null;
  element.removeAttribute("contenteditable");
  const text = (element.textContent ?? "").replace(/\s+/g, " ").trim().slice(0, 2000);
  if (!commit || text === before.trim()) element.textContent = before;
  else send({ type: "textEdit", blockId, t: Number(element.getAttribute("data-dl-t")), text });
}

function editFromKeyboard(t: number | null) {
  if (!editable || !blockId) return;
  const all = texts();
  const element = (t === null ? undefined : all.find((node) => node.getAttribute("data-dl-t") === String(t))) ?? all[0];
  if (editing) endEdit(true);
  if (element) startEdit(element, true);
  else send({ type: "editEnd", blockId });
}

host.addEventListener("dblclick", (event) => {
  const element = event.target instanceof Element ? event.target.closest<HTMLElement>("[data-dl-t]") : null;
  if (element) startEdit(element, false);
});
host.addEventListener("keydown", (event) => {
  if (!editing || !blockId) return;
  const current = editing.element;
  const keyboard = editing.keyboard;
  if (event.key === "Enter" || event.key === "Escape") {
    event.preventDefault();
    endEdit(event.key === "Enter");
    if (keyboard) send({ type: "editEnd", blockId });
  } else if (event.key === "Tab") {
    event.preventDefault();
    const all = texts();
    const next = all[all.indexOf(current) + (event.shiftKey ? -1 : 1)];
    endEdit(true);
    if (next) startEdit(next, true);
    else send({ type: "editEnd", blockId });
  }
});
// Leaving the field saves it (only the field being edited: moving to the next text must not end the new edit).
host.addEventListener("focusout", (event) => {
  if (editing && event.target === editing.element) endEdit(true);
});

send({ type: "ready", v: 1 });
