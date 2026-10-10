// Plugin UI (runs in an iframe with the DOM): reads the pasted or dropped figma-plan, validates it with the plan's
// Zod schema and sends it to the main thread. Shows the report the main thread sends back.
import { FigmaPlanSchema, type FigmaPlan } from "@dialmade/handoff/figma-plan";
import { STRINGS, localeOf } from "./lib/i18n";
import type { Report, ToMain, ToUi } from "./lib/messages";

const t = STRINGS[localeOf(navigator.language)];
const $ = <T extends HTMLElement>(id: string) => document.getElementById(id) as T;

const input = $<HTMLTextAreaElement>("input");
const create = $<HTMLButtonElement>("create");
const status = $<HTMLDivElement>("status");
const drop = $<HTMLDivElement>("drop");

$("title").textContent = t.title;
$("intro").textContent = t.intro;
$("dropText").textContent = t.drop;
$("choose").textContent = t.choose;
$("darkText").textContent = t.dark;
$("flowText").textContent = t.flow;
input.placeholder = t.placeholder;
create.textContent = t.create;

let plan: FigmaPlan | null = null;

const say = (message: string, tone: "error" | "ok" | "" = "") => {
  status.textContent = message;
  status.dataset.tone = tone;
};

function validate() {
  plan = null;
  create.disabled = true;
  const raw = input.value.trim();
  if (!raw) return say("");
  let value: unknown;
  try {
    value = JSON.parse(raw);
  } catch {
    return say(t.invalidJson, "error");
  }
  const parsed = FigmaPlanSchema.safeParse(value);
  if (!parsed.success) {
    const issues = parsed.error.issues.slice(0, 3).map((issue) => `· ${issue.path.join(".") || "/"}: ${issue.message}`);
    return say(`${t.invalidPlan}\n${issues.join("\n")}`, "error");
  }
  plan = parsed.data;
  create.disabled = false;
  say(t.ready(plan.name, plan.pages.length), "ok");
}

async function load(file: File | undefined) {
  if (!file) return;
  input.value = await file.text();
  validate();
}

input.addEventListener("input", validate);
$<HTMLInputElement>("file").addEventListener("change", (event) => void load((event.target as HTMLInputElement).files?.[0]));
drop.addEventListener("dragover", (event) => {
  event.preventDefault();
  drop.dataset.over = "";
});
drop.addEventListener("dragleave", () => delete drop.dataset.over);
drop.addEventListener("drop", (event) => {
  event.preventDefault();
  delete drop.dataset.over;
  void load(event.dataTransfer?.files[0]);
});

create.addEventListener("click", () => {
  if (!plan) return;
  create.disabled = true;
  create.textContent = t.creating;
  const message: ToMain = { type: "create", plan, options: { dark: $<HTMLInputElement>("dark").checked, flow: $<HTMLInputElement>("flow").checked } };
  parent.postMessage({ pluginMessage: message }, "*");
});

function summary(report: Report): string {
  const lines = [
    t.done,
    t.variables(report.variables.created, report.variables.updated),
    t.styles(report.textStyles, report.effectStyles),
    t.pages(report.pages, report.frames),
    ...(report.links > 0 ? [t.links(report.links)] : []),
  ];
  if (report.missingFonts.length) lines.push(t.missingFonts, ...report.missingFonts.map((font) => `· ${font}`));
  if (report.warnings.length) lines.push(t.warnings, ...report.warnings.map((warning) => `· ${warning}`));
  return lines.join("\n");
}

window.onmessage = (event: MessageEvent<{ pluginMessage?: ToUi }>) => {
  const message = event.data.pluginMessage;
  if (!message) return;
  if (message.type === "progress") return say(message.message);
  create.textContent = t.create;
  create.disabled = plan === null;
  if (message.type === "done") say(summary(message.report), "ok");
  else say(`${t.failed} ${message.message}`, "error");
};
