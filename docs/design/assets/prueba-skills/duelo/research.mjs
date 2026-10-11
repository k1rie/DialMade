// Builds the guidance of two page-mode arms, per brand (key read from apps/web/.env.local, never printed):
//   designmd-<brand>.md: Haiku picks the closest of ui-skills' 18 DESIGN.md files and distills it into an abstract brief.
//   refs-<brand>.md: Haiku searches and reads the web (server tools) and returns an abstract reference brief.
// Both briefs are scrubbed of URLs and of the names of the sources (domains seen in the tool results).
// Usage: node research.mjs designmd|refs
import Anthropic from "/Users/diegoguerrero/Desktop/designApp/node_modules/.pnpm/@anthropic-ai+sdk@0.128.0_zod@4.6.5/node_modules/@anthropic-ai/sdk/index.mjs";
import { readFile, writeFile, readdir } from "node:fs/promises";
import { join } from "node:path";

const HERE = import.meta.dirname;
const S = join(HERE, "..");
const LIB = join(S, "skills-src/ui-skills/src/content/design-md");
const env = await readFile("/Users/diegoguerrero/Desktop/designApp/apps/web/.env.local", "utf8");
const apiKey = env.split("\n").find((l) => l.startsWith("ANTHROPIC_API_KEY="))?.slice(18).trim().replace(/^["']|["']$/g, "");
const client = new Anthropic({ apiKey, maxRetries: 2, timeout: 600_000 });
const MODEL = "claude-haiku-5-5";
let spent = 0;
const cost = (u) => ((u.input_tokens ?? 0) * 0.1 + (u.cache_creation_input_tokens ?? 0) * 0.125 + (u.cache_read_input_tokens ?? 0) * 0.01 + (u.output_tokens ?? 0) * 0.5) / 1e6 + (u.server_tool_use?.web_search_requests ?? 0) * 0.01;
const text = (m) => m.content.filter((c) => c.type === "text").map((c) => c.text).join("");

const RULES = `Write an ABSTRACT design reference brief for a page designer, in English, at most 2,500 characters, as short bullets: page rhythm and section roles, how the hero earns attention, how the product is shown working, type scale and contrast (as ratios and adjectives, not font names), density and whitespace, surfaces and depth, copy tone (adjectives) and how claims are made concrete, call-to-action style, imagery approach, one signature idea worth borrowing as a pattern. NEVER include company, product or person names, URLs, slogans or quoted copy, logos, or colors (the palette is fixed by the client). Patterns only.`;

function scrub(brief, names) {
  let out = brief.replace(/https?:\/\/\S+/g, "").replace(/\b[\w-]+\.(?:com|io|dev|app|co|org|net|ai|so|xyz)\b/gi, "");
  for (const name of names) if (name.length >= 3) out = out.replace(new RegExp(`\\b${name.replace(/[.*+?^${}()|[\]\\]/g, "\\$&")}\\b`, "gi"), "[a reference]");
  return out.trim();
}

const mode = process.argv[2];
for (const brand of ["brisa", "vectora", "ollaria"]) {
  const brief = await readFile(join(S, "skilltest", brand, "BRIEF.md"), "utf8");
  if (mode === "designmd") {
    const files = (await readdir(LIB)).filter((f) => f.endsWith(".md"));
    const catalog = await Promise.all(files.map(async (f) => ({ id: f.replace(/\.md$/, ""), overview: (await readFile(join(LIB, f), "utf8")).replace(/\s+/g, " ").slice(0, 500) })));
    const pick = await client.messages.create({
      model: MODEL, max_tokens: 2000, output_config: { effort: "low" },
      messages: [{ role: "user", content: `<brief>\n${brief}\n</brief>\n<design_systems>\n${JSON.stringify(catalog)}\n</design_systems>\nWhich ONE design system's approach (not its brand) would best inspire this product's landing page? Answer with JSON only: {"id": "...", "why": "..."}` }],
    });
    spent += cost(pick.usage);
    const { id } = JSON.parse(text(pick).match(/\{[\s\S]*\}/)[0]);
    const doc = (await readFile(join(LIB, `${id}.md`), "utf8")).slice(0, 60000);
    const distill = await client.messages.create({
      model: MODEL, max_tokens: 4000, output_config: { effort: "low" },
      messages: [{ role: "user", content: `<design_system>\n${doc}\n</design_system>\n<client_brief>\n${brief}\n</client_brief>\nFrom this design system, keep what fits the client brief. ${RULES}` }],
    });
    spent += cost(distill.usage);
    const names = [id, ...id.split("-")];
    await writeFile(join(HERE, `designmd-${brand}.md`), scrub(text(distill), names));
    console.log(brand, "designmd", id, `$${spent.toFixed(4)}`);
    continue;
  }
  // refs: the server tools run inside the call; `pause_turn` continues it.
  const tools = [
    { type: "web_search_20260209", name: "web_search", max_uses: 3 },
    { type: "web_fetch_20260209", name: "web_fetch", max_uses: 3, max_content_tokens: 6000 },
  ];
  const messages = [{ role: "user", content: `<brief>\n${brief}\n</brief>\nFind 2 or 3 landing pages of well-known companies whose product category, audience and tone are close to this brief, and read them. Then: ${RULES}` }];
  const sources = new Set();
  let message;
  for (let turn = 0; turn < 4; turn++) {
    message = await client.messages.create({ model: MODEL, max_tokens: 8000, output_config: { effort: "low" }, tools, messages });
    spent += cost(message.usage);
    for (const block of message.content) {
      const json = JSON.stringify(block);
      for (const m of json.matchAll(/https?:\/\/(?:www\.)?([\w-]+)\.[\w.]+/g)) sources.add(m[1]);
    }
    if (message.stop_reason !== "pause_turn") break;
    messages.push({ role: "assistant", content: message.content });
  }
  const names = [...sources].filter((s) => !/^(?:www|en|docs|blog|app)$/.test(s));
  await writeFile(join(HERE, `refs-${brand}.md`), scrub(text(message), names));
  await writeFile(join(HERE, `refs-${brand}.sources.json`), JSON.stringify(names, null, 1));
  console.log(brand, "refs", names.slice(0, 8).join(","), `$${spent.toFixed(4)}`, message.stop_reason, JSON.stringify(message.usage.server_tool_use ?? {}));
}
console.log("spent", spent.toFixed(4));
