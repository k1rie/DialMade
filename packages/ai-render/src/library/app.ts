// App-screen patterns: KPIs, charts, tables and activity. Dense, aligned, and they fill their box (`h-full`). Numbers
// are tabular, deltas carry a direction icon and a sentence, and charts are always drawn from numbers (data-chart).
import type { LibraryBlock } from "./types";

const FOCUS = "focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-foreground";

export const APP: LibraryBlock[] = [
  {
    id: "kpis-dominant-figure",
    type: "kpis",
    surface: "app",
    pattern:
      "One figure rules the block: a tall inverted panel with the number at display size, its period and its delta in one line; beside it a plain ledger of three supporting figures separated by hairlines. Hierarchy instead of four equal cards.",
    gesture: "one inverted panel with the main figure, the rest a plain ledger",
    fits: { composition: ["asymmetric", "split", "data-dense", "bento"], typeVoice: ["bold-display", "technical-mono", "humanist"], colorStrategy: ["high-contrast-cta", "neutral-with-pops", "tonal-monochrome"], decoration: ["outlined", "none", "tinted-panels"], rhythm: ["balanced", "compact"] },
    html: `<section data-block-id="b-kpis" class="@container h-full">
<div class="grid h-full gap-4 @3xl:grid-cols-12">
<div class="flex flex-col justify-between rounded-card bg-foreground p-6 text-background @3xl:col-span-5">
<p class="font-mono text-caption uppercase tracking-widest text-background">Net sales · this week</p>
<div class="mt-8"><p class="font-heading text-display font-bold tabular-nums leading-none tracking-tight text-background">€18,420</p><p class="mt-3 inline-flex items-center gap-2 text-small text-background"><i data-icon="arrow-up-right" aria-hidden="true" class="size-4"></i>12.4% more than last week</p></div>
</div>
<dl class="flex flex-col divide-y divide-border rounded-card border border-border bg-card @3xl:col-span-7">
<div class="flex grow items-baseline justify-between gap-4 px-6 py-4"><dt class="text-body text-muted-foreground">Orders</dt><dd class="font-heading text-h1 font-semibold tabular-nums text-foreground">212</dd></div>
<div class="flex grow items-baseline justify-between gap-4 px-6 py-4"><dt class="text-body text-muted-foreground">Average basket</dt><dd class="font-heading text-h1 font-semibold tabular-nums text-foreground">€26.40</dd></div>
<div class="flex grow items-baseline justify-between gap-4 px-6 py-4"><dt class="text-body text-muted-foreground">Returns</dt><dd class="font-heading text-h1 font-semibold tabular-nums text-foreground">2.4%</dd></div>
</dl>
</div>
</section>`,
  },
  {
    id: "kpis-scoreboard",
    type: "kpis",
    surface: "app",
    pattern:
      "A scoreboard: four figures at heading size in one row, divided by heavy vertical rules, a mono label above each and its change below in mono. No card fills; two rules above and below hold it. Reads in one glance, like a result sheet.",
    gesture: "four figures divided by heavy vertical rules, no card fills",
    fits: { composition: ["data-dense", "editorial", "asymmetric"], typeVoice: ["technical-mono", "condensed-caps", "bold-display"], decoration: ["rules-and-grids", "outlined", "none"], rhythm: ["compact", "balanced"] },
    html: `<section data-block-id="b-kpis" class="@container h-full">
<dl class="grid h-full grid-cols-2 divide-x-2 divide-foreground border-y-2 border-foreground @3xl:grid-cols-4">
<div class="px-5 py-5"><dt class="font-mono text-caption uppercase tracking-widest text-muted-foreground">Generated</dt><dd class="mt-3 font-mono text-h1 font-semibold tabular-nums text-foreground">18.4<span class="text-h3 text-muted-foreground"> MWh</span></dd><p class="mt-2 font-mono text-caption text-foreground">▲ 4.2% vs. yesterday</p></div>
<div class="px-5 py-5"><dt class="font-mono text-caption uppercase tracking-widest text-muted-foreground">Used locally</dt><dd class="mt-3 font-mono text-h1 font-semibold tabular-nums text-foreground">11.2<span class="text-h3 text-muted-foreground"> MWh</span></dd><p class="mt-2 font-mono text-caption text-foreground">▲ 8.1% vs. yesterday</p></div>
<div class="px-5 py-5"><dt class="font-mono text-caption uppercase tracking-widest text-muted-foreground">Sent to grid</dt><dd class="mt-3 font-mono text-h1 font-semibold tabular-nums text-foreground">7.2<span class="text-h3 text-muted-foreground"> MWh</span></dd><p class="mt-2 font-mono text-caption text-foreground">▼ 2.4% vs. yesterday</p></div>
<div class="px-5 py-5"><dt class="font-mono text-caption uppercase tracking-widest text-muted-foreground">Self-use</dt><dd class="mt-3 font-mono text-h1 font-semibold tabular-nums text-foreground">61<span class="text-h3 text-muted-foreground"> %</span></dd><p class="mt-2 font-mono text-caption text-foreground">▲ 1.6 pts vs. yesterday</p></div>
</dl>
</section>`,
  },
  {
    id: "chart-full-bleed-area",
    type: "chart",
    surface: "app",
    pattern:
      "The chart is the card: no inner padding around it, the area runs edge to edge and the title, the headline number and the range switch sit over a quiet header. A dashed marker and a callout say which point matters. Big, calm, one story.",
    gesture: "the area runs edge to edge with one marked point",
    fits: { composition: ["data-dense", "split", "asymmetric", "bento"], imagery: ["data-viz-led"], typeVoice: ["humanist", "technical-mono", "quiet", "bold-display"], decoration: ["none", "outlined", "gradient-wash"], rhythm: ["compact", "balanced"] },
    html: `<section data-block-id="b-chart" class="@container flex h-full flex-col overflow-hidden rounded-card border border-border bg-card">
<div class="flex flex-wrap items-start justify-between gap-4 p-5">
<div><p class="text-small text-muted-foreground">Visitors · last 3 months</p><p class="mt-1 font-heading text-display font-bold tabular-nums leading-none tracking-tight text-foreground">12,480</p></div>
<div class="flex flex-col items-end gap-3">
<div class="inline-flex rounded-button border border-border bg-muted p-0.5 text-caption" role="group" aria-label="Range"><button type="button" class="rounded-button bg-card px-3 py-1.5 font-medium text-foreground shadow-sm ${FOCUS}">3 months</button><button type="button" class="rounded-button px-3 py-1.5 text-muted-foreground hover:text-foreground ${FOCUS}">30 days</button></div>
</div>
</div>
<img data-chart="area" data-values="620,680,650,720,700,790,760,860,830,940,900,1010,1204,1080,1150,1120,1180,1160" data-labels="Jun 22,Jun 29,Jul 6,Jul 13,Jul 20,Jul 27,Aug 3,Aug 10,Aug 17,Aug 24,Aug 31,Sep 7,Sep 14,Sep 21,Sep 28,Oct 5,Oct 12,Oct 19" data-highlight="12" alt="Visitors per week over the last three months, peaking on Sep 14" class="min-h-40 w-full grow">
</section>`,
  },
  {
    id: "chart-annotated-bars",
    type: "chart",
    surface: "app",
    pattern:
      "Bars where one is the story: every bar is dimmed except the one that matters, and a text callout above states it with its figure and why. The legend shrinks to a caption. The chart makes one claim.",
    gesture: "every bar dimmed but one, and a sentence that names it",
    fits: { composition: ["data-dense", "split", "editorial", "asymmetric"], imagery: ["data-viz-led"], typeVoice: ["humanist", "technical-mono", "bold-display"], decoration: ["outlined", "rules-and-grids", "none"], rhythm: ["compact", "balanced"] },
    html: `<section data-block-id="b-chart" class="@container flex h-full flex-col rounded-card border border-border bg-card p-5">
<p class="font-mono text-caption uppercase tracking-widest text-muted-foreground">Orders per week</p>
<h2 class="mt-2 max-w-md font-heading text-h2 font-semibold tracking-tight text-foreground">Week 9 was the best of the quarter: <span class="text-primary-text">+38%</span> on the average.</h2>
<img data-chart="bar" data-values="21,24,22,26,25,29,27,30,38,28,26,31" data-labels="W1,W2,W3,W4,W5,W6,W7,W8,W9,W10,W11,W12" data-highlight="8" alt="Orders per week, week 9 highlighted" class="mt-5 min-h-32 w-full grow">
</section>`,
  },
  {
    id: "chart-ranked-leaders",
    type: "chart",
    surface: "app",
    pattern:
      "A leaderboard instead of a pie: each row is a rank numeral at heading size, the name, the value and a thick proportional bar under it, widest first. Ordered, readable at a glance, and the top row is filled in the primary color.",
    gesture: "ranked rows with big rank numerals and thick bars",
    fits: { composition: ["data-dense", "asymmetric", "split", "editorial"], imagery: ["data-viz-led", "icon-led"], typeVoice: ["bold-display", "technical-mono", "humanist"], decoration: ["rules-and-grids", "none", "outlined"], rhythm: ["compact", "balanced"] },
    html: `<section data-block-id="b-chart" class="@container h-full rounded-card border border-border bg-card p-5">
<div class="flex items-baseline justify-between"><h2 class="font-heading text-h3 font-semibold text-foreground">Best sellers</h2><p class="text-caption text-muted-foreground">Units · this month</p></div>
<ol class="mt-5 space-y-5">
<li class="grid grid-cols-12 items-center gap-x-4 gap-y-2"><span class="col-span-1 font-heading text-h1 font-bold tabular-nums text-foreground">1</span><span class="col-span-8 text-body font-medium text-foreground">Rye loaf</span><span class="col-span-3 text-right font-mono text-body tabular-nums text-foreground">1,420</span><div class="col-span-11 col-start-2 h-3 rounded-full bg-muted"><div class="h-3 w-full rounded-full bg-primary"></div></div></li>
<li class="grid grid-cols-12 items-center gap-x-4 gap-y-2"><span class="col-span-1 font-heading text-h1 font-bold tabular-nums text-muted-foreground">2</span><span class="col-span-8 text-body text-foreground">Seeded roll</span><span class="col-span-3 text-right font-mono text-body tabular-nums text-foreground">1,010</span><div class="col-span-11 col-start-2 h-3 rounded-full bg-muted"><div class="h-3 w-3/4 rounded-full bg-foreground"></div></div></li>
<li class="grid grid-cols-12 items-center gap-x-4 gap-y-2"><span class="col-span-1 font-heading text-h1 font-bold tabular-nums text-muted-foreground">3</span><span class="col-span-8 text-body text-foreground">Cardamom bun</span><span class="col-span-3 text-right font-mono text-body tabular-nums text-foreground">640</span><div class="col-span-11 col-start-2 h-3 rounded-full bg-muted"><div class="h-3 w-1/2 rounded-full bg-foreground"></div></div></li>
<li class="grid grid-cols-12 items-center gap-x-4 gap-y-2"><span class="col-span-1 font-heading text-h1 font-bold tabular-nums text-muted-foreground">4</span><span class="col-span-8 text-body text-foreground">Olive focaccia</span><span class="col-span-3 text-right font-mono text-body tabular-nums text-foreground">380</span><div class="col-span-11 col-start-2 h-3 rounded-full bg-muted"><div class="h-3 w-1/3 rounded-full bg-foreground"></div></div></li>
</ol>
</section>`,
  },
  {
    id: "table-editorial-rows",
    type: "table",
    surface: "app",
    pattern:
      "A table without a box: a heading and a count, a mono caps header under a heavy rule, rows with generous height and the first column in medium weight, the status as a dot and a word (no pills), figures right-aligned in tabular numerals and a bold total under a closing rule.",
    gesture: "no box: a heavy rule, tall rows and a bold total",
    fits: { composition: ["editorial", "data-dense", "asymmetric"], typeVoice: ["quiet", "technical-mono", "humanist", "condensed-caps"], decoration: ["rules-and-grids", "none", "outlined"], rhythm: ["balanced", "compact", "airy"] },
    html: `<section data-block-id="b-table" class="@container flex h-full flex-col">
<div class="flex flex-wrap items-baseline justify-between gap-3"><h2 class="font-heading text-h2 font-semibold tracking-tight text-foreground">Deliveries today</h2><p class="font-mono text-caption uppercase tracking-widest text-muted-foreground">18 scheduled · 3 late</p></div>
<div class="mt-5 grow overflow-x-auto">
<table class="w-full min-w-96 text-left">
<caption class="sr-only">Deliveries today</caption>
<thead><tr class="border-b-2 border-foreground font-mono text-caption uppercase tracking-widest text-muted-foreground"><th scope="col" class="py-3 pr-4 font-medium">Recipient</th><th scope="col" class="px-4 py-3 font-medium">Window</th><th scope="col" class="px-4 py-3 font-medium">Status</th><th scope="col" class="py-3 pl-4 text-right font-medium">Weight</th></tr></thead>
<tbody class="divide-y divide-border text-body">
<tr class="hover:bg-muted/50"><th scope="row" class="py-4 pr-4 text-left font-medium text-foreground">Corner café</th><td class="px-4 py-4 tabular-nums text-muted-foreground">09:00–10:00</td><td class="px-4 py-4 text-foreground"><span class="inline-flex items-center gap-2"><span class="size-2 rounded-full bg-success"></span>On the way</span></td><td class="py-4 pl-4 text-right tabular-nums text-foreground">42.0 kg</td></tr>
<tr class="hover:bg-muted/50"><th scope="row" class="py-4 pr-4 text-left font-medium text-foreground">Farm shop</th><td class="px-4 py-4 tabular-nums text-muted-foreground">10:00–11:00</td><td class="px-4 py-4 text-foreground"><span class="inline-flex items-center gap-2"><span class="size-2 rounded-full bg-warning"></span>Needs signature</span></td><td class="py-4 pl-4 text-right tabular-nums text-foreground">18.5 kg</td></tr>
<tr class="hover:bg-muted/50"><th scope="row" class="py-4 pr-4 text-left font-medium text-foreground">School canteen</th><td class="px-4 py-4 tabular-nums text-muted-foreground">11:00–12:00</td><td class="px-4 py-4 text-foreground"><span class="inline-flex items-center gap-2"><span class="size-2 rounded-full bg-border"></span>Packed</span></td><td class="py-4 pl-4 text-right tabular-nums text-foreground">126.0 kg</td></tr>
</tbody>
<tfoot><tr class="border-t-2 border-foreground"><th scope="row" colspan="3" class="py-4 pr-4 text-left font-semibold text-foreground">Total</th><td class="py-4 pl-4 text-right font-semibold tabular-nums text-foreground">186.5 kg</td></tr></tfoot>
</table>
</div>
</section>`,
  },
  {
    id: "table-agenda-days",
    type: "table",
    surface: "app",
    pattern:
      "Rows grouped by day: each group opens with a heavy rule and the day as a large numeral with its weekday in mono on the left, and the entries as a clean list on the right (time in mono, name, a status word). The structure is a calendar, the content a table.",
    gesture: "rows grouped under large day numerals",
    fits: { composition: ["editorial", "split", "asymmetric", "data-dense"], typeVoice: ["technical-mono", "bold-display", "quiet"], decoration: ["rules-and-grids", "none"], rhythm: ["balanced", "compact", "airy"] },
    html: `<section data-block-id="b-table" class="@container h-full">
<h2 class="font-heading text-h3 font-semibold text-foreground">Next visits</h2>
<div class="mt-4 space-y-0">
<div class="grid gap-3 border-t-2 border-foreground py-5 @3xl:grid-cols-12">
<div class="flex items-baseline gap-3 @3xl:col-span-3"><span class="font-heading text-display font-bold tabular-nums leading-none tracking-tight text-foreground">14</span><span class="font-mono text-caption uppercase tracking-widest text-muted-foreground">Mon</span></div>
<ul class="divide-y divide-border @3xl:col-span-9">
<li class="flex items-baseline gap-4 py-3"><span class="w-14 shrink-0 font-mono text-small tabular-nums text-muted-foreground">09:30</span><span class="grow text-body font-medium text-foreground">Paula Soler · Group of 6</span><span class="text-small text-foreground">Confirmed</span></li>
<li class="flex items-baseline gap-4 py-3"><span class="w-14 shrink-0 font-mono text-small tabular-nums text-muted-foreground">12:00</span><span class="grow text-body font-medium text-foreground">Álvaro Morales · Private tasting</span><span class="text-small text-foreground">Deposit due</span></li>
</ul>
</div>
<div class="grid gap-3 border-t-2 border-foreground py-5 @3xl:grid-cols-12">
<div class="flex items-baseline gap-3 @3xl:col-span-3"><span class="font-heading text-display font-bold tabular-nums leading-none tracking-tight text-foreground">15</span><span class="font-mono text-caption uppercase tracking-widest text-muted-foreground">Tue</span></div>
<ul class="divide-y divide-border @3xl:col-span-9">
<li class="flex items-baseline gap-4 py-3"><span class="w-14 shrink-0 font-mono text-small tabular-nums text-muted-foreground">11:00</span><span class="grow text-body font-medium text-foreground">Raúl Navarro · Cellar tour</span><span class="text-small text-foreground">Confirmed</span></li>
</ul>
</div>
</div>
</section>`,
  },
  {
    id: "activity-latest-and-log",
    type: "activity",
    surface: "app",
    pattern:
      "The newest event gets a tinted panel with its sentence at body-large size and an avatar; below, «Earlier» is a compact log of mono timestamps and one-line events under hairlines. One thing to read now, the rest to scan.",
    gesture: "the newest event large on a tint, the rest a mono log",
    fits: { composition: ["split", "asymmetric", "data-dense", "editorial"], typeVoice: ["technical-mono", "humanist", "quiet"], decoration: ["tinted-panels", "rules-and-grids", "outlined"], rhythm: ["compact", "balanced"] },
    html: `<section data-block-id="b-activity" class="@container h-full">
<div class="rounded-card bg-primary/10 p-5">
<p class="font-mono text-caption uppercase tracking-widest text-foreground">Just now</p>
<div class="mt-3 flex items-start gap-3"><img data-placeholder="avatar" alt="" class="size-10 shrink-0 rounded-full"><p class="text-h3 font-medium leading-snug text-foreground">Nuria Ríos uploaded the signed form and paid the deposit.</p></div>
</div>
<p class="mt-6 font-mono text-caption uppercase tracking-widest text-muted-foreground">Earlier</p>
<ul class="mt-2 divide-y divide-border border-y border-border">
<li class="flex gap-4 py-3 text-small"><span class="w-12 shrink-0 font-mono tabular-nums text-muted-foreground">09:12</span><span class="text-foreground">Reminder sent to 12 members for tomorrow</span></li>
<li class="flex gap-4 py-3 text-small"><span class="w-12 shrink-0 font-mono tabular-nums text-muted-foreground">08:47</span><span class="text-foreground">Sergio Navarro released the 17:00 place</span></li>
<li class="flex gap-4 py-3 text-small"><span class="w-12 shrink-0 font-mono tabular-nums text-muted-foreground">08:30</span><span class="text-foreground">Álvaro Ortega joined the Friday workshop</span></li>
</ul>
</section>`,
  },
  {
    id: "activity-day-groups",
    type: "activity",
    surface: "app",
    pattern:
      "Events grouped under day labels set in mono caps with a rule that runs to the edge; within a group, avatar, sentence with the object in bold and the time pushed right. It is a feed that knows when things happened.",
    gesture: "events under mono day labels with rules to the edge",
    fits: { composition: ["data-dense", "split", "editorial"], typeVoice: ["technical-mono", "humanist", "quiet"], decoration: ["rules-and-grids", "none", "outlined"], imagery: ["layered-collage", "icon-led"], rhythm: ["compact", "balanced"] },
    html: `<section data-block-id="b-activity" class="@container h-full">
<div class="flex items-center gap-4"><p class="font-mono text-caption uppercase tracking-widest text-foreground">Today</p><span class="h-px grow bg-border"></span></div>
<ul class="mt-3 space-y-3">
<li class="flex items-center gap-3"><img data-placeholder="avatar" alt="" class="size-8 shrink-0 rounded-full"><p class="min-w-0 grow truncate text-small text-muted-foreground"><span class="font-medium text-foreground">Paula</span> moved her visit to <span class="font-medium text-foreground">Thursday</span></p><span class="shrink-0 font-mono text-caption tabular-nums text-muted-foreground">09:12</span></li>
<li class="flex items-center gap-3"><img data-placeholder="avatar" alt="" class="size-8 shrink-0 rounded-full"><p class="min-w-0 grow truncate text-small text-muted-foreground"><span class="font-medium text-foreground">Raúl</span> left a 5-star review</p><span class="shrink-0 font-mono text-caption tabular-nums text-muted-foreground">08:47</span></li>
</ul>
<div class="mt-6 flex items-center gap-4"><p class="font-mono text-caption uppercase tracking-widest text-foreground">Yesterday</p><span class="h-px grow bg-border"></span></div>
<ul class="mt-3 space-y-3">
<li class="flex items-center gap-3"><img data-placeholder="avatar" alt="" class="size-8 shrink-0 rounded-full"><p class="min-w-0 grow truncate text-small text-muted-foreground"><span class="font-medium text-foreground">Marta</span> added a note to <span class="font-medium text-foreground">Kiln log</span></p><span class="shrink-0 font-mono text-caption tabular-nums text-muted-foreground">17:30</span></li>
</ul>
</section>`,
  },
];
