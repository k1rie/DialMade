// Plan B test: ONE call per page (no agent loop), free HTML/CSS, with or without the two skills in the system prompt.
// Usage: node run.mjs <arm>   arms: haiku-skills | sonnet-skills | haiku-plain
// The key is read from apps/web/.env.local by code and never printed. Hard cap: MAX_USD over the whole run (spend.json).
import Anthropic from "/Users/diegoguerrero/Desktop/designApp/node_modules/.pnpm/@anthropic-ai+sdk@0.128.0_zod@4.6.5/node_modules/@anthropic-ai/sdk/index.mjs";
import { readFile, writeFile, mkdir } from "node:fs/promises";
import { existsSync } from "node:fs";
import { join } from "node:path";

const REPO = "/Users/diegoguerrero/Desktop/designApp";
const HERE = "/private/tmp/claude-501/-Users-diegoguerrero-Desktop-designApp/c3b5464f-5b4b-4820-a521-b2e3109f704d/scratchpad/skilltest/b";
const BRIEFS = join(HERE, "..");
const MAX_USD = 1;
const PRICE = { haiku: { in: 0.1, out: 0.5 }, sonnet: { in: 2, out: 10 } };
const ARMS = {
  "haiku-skills": { model: "claude-haiku-5-5", price: PRICE.haiku, skills: true },
  "sonnet-skills": { model: "claude-sonnet-5-5", price: PRICE.sonnet, skills: true, fallbacks: true },
  "haiku-plain": { model: "claude-haiku-5-5", price: PRICE.haiku, skills: false },
};
const arm = ARMS[process.argv[2]];
if (!arm) throw new Error(`arm? ${Object.keys(ARMS).join(", ")}`);

const env = await readFile(join(REPO, "apps/web/.env.local"), "utf8");
const apiKey = env.split("\n").find((l) => l.startsWith("ANTHROPIC_API_KEY="))?.slice(18).trim().replace(/^["']|["']$/g, "");
const client = new Anthropic({ apiKey, maxRetries: 2, timeout: 600_000 });

const TASK = `You are an award-winning design director and front-end engineer. Design and build ONE landing page for the brief in the user message, as a single self-contained HTML document.
Hard rules:
- Everything in the brief's "Fixed by the developer" is a constraint: section order, plan names and prices, fonts, palette hues. Facts are real; never invent other numbers, customer logos or real companies or people. Write the copy in the brief's language.
- One HTML file: semantic HTML + inline <style>; Google Fonts <link> only (request the real italic/opsz axes when you use them). No external images, no CDNs, no frameworks: draw imagery with CSS or inline SVG. Responsive down to 390 px with no horizontal scroll. Accessible contrast. Minimal or no JS.
- You cannot run tools, scripts or screenshots in this call: skip any step that needs them and apply the design guidance directly.
- Answer with the HTML document only, from <!doctype html> to </html>, nothing before or after.`;

const skillText = async () => {
  const files = [
    [".claude/skills/impeccable/SKILL.md", "Impeccable (Apache-2.0, pbakaus/impeccable)"],
    [".claude/skills/impeccable/reference/mode-persuade.md", "Impeccable · mode-persuade"],
    [".claude/skills/impeccable/reference/new-work.md", "Impeccable · new-work"],
    [".claude/skills/impeccable/reference/craft-floor.md", "Impeccable · craft-floor"],
    [".claude/skills/taste-skill/SKILL.md", "taste-skill (MIT, Leonxlnx/taste-skill)"],
  ];
  const parts = await Promise.all(files.map(async ([f, label]) => `<skill name="${label}">\n${await readFile(join(REPO, f), "utf8")}\n</skill>`));
  return `\n\nFollow these two design skills (their guidance, not their tool steps):\n${parts.join("\n")}`;
};
const system = [{ type: "text", text: TASK + (arm.skills ? await skillText() : ""), cache_control: { type: "ephemeral" } }];

const spendFile = join(HERE, "spend.json");
const spend = existsSync(spendFile) ? JSON.parse(await readFile(spendFile, "utf8")) : { total: 0, runs: [] };
const cost = (u, p) => ((u.input_tokens ?? 0) * p.in + (u.cache_creation_input_tokens ?? 0) * p.in * 1.25 + (u.cache_read_input_tokens ?? 0) * p.in * 0.1 + (u.output_tokens ?? 0) * p.out) / 1e6;

for (const brand of ["brisa", "vectora", "ollaria"]) {
  if (spend.total >= MAX_USD) throw new Error(`stop: spent $${spend.total.toFixed(3)} >= $${MAX_USD}`);
  const out = join(HERE, process.argv[2], brand);
  await mkdir(out, { recursive: true });
  const brief = await readFile(join(BRIEFS, brand, "BRIEF.md"), "utf8");
  const t0 = performance.now();
  const params = {
    model: arm.model,
    max_tokens: 32_000,
    system,
    messages: [{ role: "user", content: [{ type: "text", text: `<brief>\n${brief}\n</brief>\n\nBuild the page.` }] }],
    output_config: { effort: "medium" },
    ...(arm.fallbacks && { betas: ["server-side-fallback-2026-07-01"], fallbacks: "default" }),
  };
  const message = await client.beta.messages.stream(params).finalMessage();
  const text = message.content.map((c) => (c.type === "text" ? c.text : "")).join("");
  const start = text.search(/<!doctype html>/i);
  const end = text.toLowerCase().lastIndexOf("</html>");
  const html = start >= 0 && end > start ? text.slice(start, end + 7) : text;
  await writeFile(join(out, "index.html"), html);
  const usd = cost(message.usage, arm.price);
  spend.total += usd;
  spend.runs.push({ arm: process.argv[2], brand, model: message.model, usd: +usd.toFixed(4), seconds: +((performance.now() - t0) / 1000).toFixed(1), usage: message.usage, stop: message.stop_reason, chars: html.length });
  await writeFile(spendFile, JSON.stringify(spend, null, 1));
  console.log(process.argv[2], brand, message.model, `$${usd.toFixed(4)}`, `${((performance.now() - t0) / 1000).toFixed(0)}s`, message.stop_reason, `${html.length} chars`, `total $${spend.total.toFixed(3)}`);
}
