// The AI island runtime (spec §6.1): the only script of the preview origin. The app frames `island.html` in a
// `sandbox="allow-scripts"` iframe (opaque origin, no forms, popups or top navigation) and sends it ONE block:
// sanitized HTML, the CSS compiled for it and the theme variables. The runtime paints it, reports its height, and in
// Ajustar sends the selection and inline text edits back. It accepts messages only from the app origin it was given
// (`?parent=`), which the CSP's `frame-ancestors` already pins, and validates every message with the shared schemas.
import { ISLAND_BLEED, IslandMessageSchema, MAX_ISLAND_HEIGHT, ParentMessageSchema, type IslandMessage, type ParentMessage } from "@dialmade/ai-render/protocol";
import { z } from "zod";
import { insertBlock } from "./insert";

// No `new Function` fast paths: the island's CSP (Trusted Types, no unsafe-eval) forbids them.
z.config({ jitless: true });
import { measureBlock } from "./measure";

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

function render(message: Extract<ParentMessage, { type: "render" }>) {
  blockId = message.blockId;
  editable = message.editable;
  document.documentElement.lang = message.lang;
  setTheme(message.vars, message.mode, message.fontsHref);
  style.textContent = message.css;
  insertBlock(host, message.html);
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

function reportMeasure() {
  const root = host.firstElementChild;
  if (!blockId || !root) return;
  send({ type: "measure", blockId, ...measureBlock(root) });
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
  else reportMeasure();
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

// Inline text edit (Ajustar): double click (or Enter on a focused text) edits that text in place; Enter or blur sends
// ONE textEdit, Escape restores it. Track B finishes the interaction design.
let editing: { element: HTMLElement; before: string } | null = null;

function startEdit(element: HTMLElement) {
  if (!editable || editing) return;
  editing = { element, before: element.textContent ?? "" };
  element.setAttribute("contenteditable", "plaintext-only");
  element.focus();
}

function endEdit(commit: boolean) {
  if (!editing || !blockId) return;
  const { element, before } = editing;
  editing = null;
  element.removeAttribute("contenteditable");
  const text = (element.textContent ?? "").replace(/\s+/g, " ").trim().slice(0, 2000);
  if (!commit || text === before.trim()) {
    element.textContent = before;
    return;
  }
  send({ type: "textEdit", blockId, t: Number(element.getAttribute("data-dl-t")), text });
}

host.addEventListener("dblclick", (event) => {
  const element = event.target instanceof Element ? event.target.closest<HTMLElement>("[data-dl-t]") : null;
  if (element) startEdit(element);
});
host.addEventListener("keydown", (event) => {
  if (!editing) return;
  if (event.key === "Enter") {
    event.preventDefault();
    endEdit(true);
  } else if (event.key === "Escape") endEdit(false);
});
host.addEventListener("focusout", () => endEdit(true));

send({ type: "ready", v: 1 });
