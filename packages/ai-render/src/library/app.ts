// App-screen patterns: KPIs, charts, tables and activity. Dense, aligned, and they fill their box (`h-full`). Numbers
// are tabular, deltas carry a direction icon and a sentence, and charts are always drawn from numbers (data-chart).
import type { LibraryBlock } from "./types";

const FOCUS = "focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-foreground";

export const APP: LibraryBlock[] = [
  {
    id: "kpis-delta-spark",
    type: "kpis",
    surface: "app",
    pattern:
      "Four KPI cards in a row: a small label and a delta pill on the first line, the number large on the second, a one-line trend sentence under it and a tiny sparkline at the bottom. The delta pill carries a direction icon and never relies on color alone.",
    fits: { composition: ["data-dense", "bento", "split", "asymmetric"], typeVoice: ["humanist", "technical-mono", "quiet"], imagery: ["data-viz-led"], decoration: ["outlined", "tinted-panels", "none"], rhythm: ["compact", "balanced"] },
    html: `<section data-block-id="b-kpis" class="@container h-full">
<div class="grid h-full grid-cols-2 gap-4 @3xl:grid-cols-4">
<div class="flex flex-col rounded-card border border-border bg-card p-5">
<div class="flex items-center justify-between gap-2"><p class="text-small text-muted-foreground">Revenue</p><span class="inline-flex items-center gap-1 rounded-badge bg-success/10 px-2 py-0.5 text-caption font-medium text-foreground"><i data-icon="arrow-up-right" aria-hidden="true" class="size-3 text-success"></i>12.5%</span></div>
<p class="mt-2 font-heading text-h1 font-semibold tabular-nums tracking-tight text-foreground">$48,200</p>
<p class="mt-1 text-caption text-muted-foreground">Up on last month</p>
<img data-chart="spark" data-values="4,6,5,8,7,10,9,12" alt="Revenue, last eight weeks" class="mt-auto h-8 w-full pt-3">
</div>
<div class="flex flex-col rounded-card border border-border bg-card p-5">
<div class="flex items-center justify-between gap-2"><p class="text-small text-muted-foreground">Active clients</p><span class="inline-flex items-center gap-1 rounded-badge bg-success/10 px-2 py-0.5 text-caption font-medium text-foreground"><i data-icon="arrow-up-right" aria-hidden="true" class="size-3 text-success"></i>4.1%</span></div>
<p class="mt-2 font-heading text-h1 font-semibold tabular-nums tracking-tight text-foreground">1,284</p>
<p class="mt-1 text-caption text-muted-foreground">38 joined this week</p>
<img data-chart="spark" data-values="8,8,9,9,10,11,11,12" alt="Active clients, last eight weeks" class="mt-auto h-8 w-full pt-3">
</div>
<div class="flex flex-col rounded-card border border-border bg-card p-5">
<div class="flex items-center justify-between gap-2"><p class="text-small text-muted-foreground">Cancellations</p><span class="inline-flex items-center gap-1 rounded-badge bg-warning/10 px-2 py-0.5 text-caption font-medium text-foreground"><i data-icon="arrow-down-right" aria-hidden="true" class="size-3 text-warning"></i>1.2%</span></div>
<p class="mt-2 font-heading text-h1 font-semibold tabular-nums tracking-tight text-foreground">3.6%</p>
<p class="mt-1 text-caption text-muted-foreground">Needs a look</p>
<img data-chart="spark" data-values="5,4,5,6,5,7,6,8" alt="Cancellation rate, last eight weeks" class="mt-auto h-8 w-full pt-3">
</div>
<div class="flex flex-col rounded-card border border-border bg-card p-5">
<div class="flex items-center justify-between gap-2"><p class="text-small text-muted-foreground">Avg. ticket</p><span class="inline-flex items-center gap-1 rounded-badge bg-muted px-2 py-0.5 text-caption font-medium text-foreground"><i data-icon="minus" aria-hidden="true" class="size-3"></i>0.0%</span></div>
<p class="mt-2 font-heading text-h1 font-semibold tabular-nums tracking-tight text-foreground">$37.50</p>
<p class="mt-1 text-caption text-muted-foreground">Same as last month</p>
<img data-chart="spark" data-values="6,7,6,7,7,6,7,7" alt="Average ticket, last eight weeks" class="mt-auto h-8 w-full pt-3">
</div>
</div>
</section>`,
  },
  {
    id: "kpis-joined-strip",
    type: "kpis",
    surface: "app",
    pattern:
      "A single card that holds four figures separated by vertical hairlines; the first one is filled with the primary color as the headline metric. Smaller labels in mono, tabular numerals, one line of context each. Compact and calm.",
    fits: { composition: ["data-dense", "asymmetric", "editorial"], typeVoice: ["technical-mono", "quiet", "bold-display"], decoration: ["rules-and-grids", "outlined", "none"], colorStrategy: ["high-contrast-cta", "neutral-with-pops", "tonal-monochrome"], rhythm: ["compact", "balanced"] },
    html: `<section data-block-id="b-kpis" class="@container h-full">
<dl class="grid h-full grid-cols-2 overflow-hidden rounded-card border border-border bg-card @3xl:grid-cols-4 @3xl:divide-x @3xl:divide-border">
<div class="bg-primary p-5 text-primary-foreground"><dt class="font-mono text-caption uppercase tracking-widest text-primary-foreground">Total balance</dt><dd class="mt-2 font-mono text-h1 font-semibold tabular-nums text-primary-foreground">$166.5K</dd><p class="mt-1 text-caption text-primary-foreground">+4.2% vs. last period</p></div>
<div class="p-5"><dt class="font-mono text-caption uppercase tracking-widest text-muted-foreground">Cash in · month</dt><dd class="mt-2 font-mono text-h1 font-semibold tabular-nums text-foreground">$36.8K</dd><p class="mt-1 text-caption text-muted-foreground">+8.1% vs. last period</p></div>
<div class="p-5"><dt class="font-mono text-caption uppercase tracking-widest text-muted-foreground">Cash out · month</dt><dd class="mt-2 font-mono text-h1 font-semibold tabular-nums text-foreground">$28.7K</dd><p class="mt-1 text-caption text-muted-foreground">+2.4% vs. last period</p></div>
<div class="p-5"><dt class="font-mono text-caption uppercase tracking-widest text-muted-foreground">Savings rate</dt><dd class="mt-2 font-mono text-h1 font-semibold tabular-nums text-foreground">17.3%</dd><p class="mt-1 text-caption text-muted-foreground">+1.6 pts vs. last period</p></div>
</dl>
</section>`,
  },
  {
    id: "chart-area-range",
    type: "chart",
    surface: "app",
    pattern:
      "A chart card with a real header: title and period on the left, a segmented range control on the right (the active segment filled), the headline number with its delta under the title, then the area chart filling the rest of the box and a small legend line.",
    fits: { composition: ["data-dense", "split", "bento", "asymmetric"], imagery: ["data-viz-led"], typeVoice: ["humanist", "technical-mono", "quiet"], decoration: ["outlined", "none", "tinted-panels"], rhythm: ["compact", "balanced"] },
    html: `<section data-block-id="b-chart" class="@container flex h-full flex-col rounded-card border border-border bg-card p-5">
<div class="flex flex-wrap items-start justify-between gap-3">
<div>
<h2 class="font-heading text-h3 font-semibold text-foreground">Revenue</h2>
<p class="text-caption text-muted-foreground">Last 3 months</p>
</div>
<div class="inline-flex rounded-button border border-border bg-muted p-0.5 text-caption" role="group" aria-label="Range">
<button type="button" class="rounded-button bg-card px-3 py-1.5 font-medium text-foreground shadow-sm ${FOCUS}">3 months</button>
<button type="button" class="rounded-button px-3 py-1.5 text-muted-foreground hover:text-foreground ${FOCUS}">30 days</button>
<button type="button" class="rounded-button px-3 py-1.5 text-muted-foreground hover:text-foreground ${FOCUS}">7 days</button>
</div>
</div>
<p class="mt-4 flex items-baseline gap-3"><span class="font-heading text-h1 font-semibold tabular-nums tracking-tight text-foreground">$128.4K</span><span class="inline-flex items-center gap-1 text-small font-medium text-foreground"><i data-icon="arrow-up-right" aria-hidden="true" class="size-4 text-success"></i>9.1% vs. previous</span></p>
<img data-chart="area" data-values="32,35,33,38,36,42,40,47,45,52,49,58,56,63;26,28,27,30,29,33,32,36,35,39,38,43,42,46" alt="Revenue and cost over the last three months" class="mt-4 min-h-32 w-full grow">
<div class="mt-3 flex gap-4 text-caption text-muted-foreground"><span class="inline-flex items-center gap-1.5"><span class="size-2 rounded-full bg-chart-1"></span>Revenue</span><span class="inline-flex items-center gap-1.5"><span class="size-2 rounded-full bg-chart-2"></span>Cost</span></div>
</section>`,
  },
  {
    id: "chart-bars-compare",
    type: "chart",
    surface: "app",
    pattern:
      "Grouped bars for two series over twelve periods, a legend with totals on the top right (colored dot, label, total), and the x labels as a single caption row under the chart. Reads as a report, not a decoration.",
    fits: { composition: ["data-dense", "split", "asymmetric"], imagery: ["data-viz-led"], typeVoice: ["technical-mono", "humanist", "quiet"], decoration: ["rules-and-grids", "outlined"], rhythm: ["compact", "balanced"] },
    html: `<section data-block-id="b-chart" class="@container flex h-full flex-col rounded-card border border-border bg-card p-5">
<div class="flex flex-wrap items-start justify-between gap-3">
<div><h2 class="font-heading text-h3 font-semibold text-foreground">Cash in vs. cash out</h2><p class="text-caption text-muted-foreground">Last 12 weeks</p></div>
<dl class="flex gap-6 text-small"><div><dt class="flex items-center gap-1.5 text-caption text-muted-foreground"><span class="size-2 rounded-full bg-chart-1"></span>Cash in</dt><dd class="font-mono tabular-nums text-foreground">$118.2K</dd></div><div><dt class="flex items-center gap-1.5 text-caption text-muted-foreground"><span class="size-2 rounded-full bg-chart-2"></span>Cash out</dt><dd class="font-mono tabular-nums text-foreground">$86.9K</dd></div></dl>
</div>
<img data-chart="bar" data-values="14,18,12,22,19,26,24,30,27,33,31,38;10,12,11,15,13,17,16,19,18,21,20,23" alt="Weekly cash in and cash out" class="mt-5 min-h-32 w-full grow">
<div class="mt-2 flex justify-between font-mono text-caption text-muted-foreground"><span>Jul 8</span><span>Aug 5</span><span>Sep 2</span><span>Sep 26</span></div>
</section>`,
  },
  {
    id: "chart-donut-breakdown",
    type: "chart",
    surface: "app",
    pattern:
      "A donut with the total set beside it (not inside it) and a legend as rows: colored dot, label, value and a thin proportion bar. The legend is the readable part; the donut is the overview.",
    fits: { composition: ["split", "bento", "data-dense"], imagery: ["data-viz-led", "icon-led"], typeVoice: ["humanist", "quiet", "technical-mono"], decoration: ["outlined", "tinted-panels", "none"], rhythm: ["compact", "balanced"] },
    html: `<section data-block-id="b-chart" class="@container h-full rounded-card border border-border bg-card p-5">
<h2 class="font-heading text-h3 font-semibold text-foreground">Where it goes</h2>
<p class="text-caption text-muted-foreground">Spending by category · this month</p>
<div class="mt-5 grid items-center gap-6 @md:grid-cols-12">
<div class="flex items-center gap-4 @md:col-span-5"><img data-chart="donut" data-values="38,24,18,12,8" alt="Spending by category" class="size-32 shrink-0"><div><p class="text-caption text-muted-foreground">Total</p><p class="font-heading text-h2 font-semibold tabular-nums text-foreground">$28.7K</p></div></div>
<ul class="space-y-3 @md:col-span-7">
<li><div class="flex items-center justify-between text-small"><span class="flex items-center gap-2 text-foreground"><span class="size-2 rounded-full bg-chart-1"></span>Payroll</span><span class="tabular-nums text-muted-foreground">$10.9K · 38%</span></div><div class="mt-1.5 h-1.5 rounded-full bg-muted"><div class="h-1.5 w-2/5 rounded-full bg-chart-1"></div></div></li>
<li><div class="flex items-center justify-between text-small"><span class="flex items-center gap-2 text-foreground"><span class="size-2 rounded-full bg-chart-2"></span>Rent</span><span class="tabular-nums text-muted-foreground">$6.9K · 24%</span></div><div class="mt-1.5 h-1.5 rounded-full bg-muted"><div class="h-1.5 w-1/4 rounded-full bg-chart-2"></div></div></li>
<li><div class="flex items-center justify-between text-small"><span class="flex items-center gap-2 text-foreground"><span class="size-2 rounded-full bg-chart-3"></span>Software</span><span class="tabular-nums text-muted-foreground">$5.2K · 18%</span></div><div class="mt-1.5 h-1.5 rounded-full bg-muted"><div class="h-1.5 w-1/5 rounded-full bg-chart-3"></div></div></li>
<li><div class="flex items-center justify-between text-small"><span class="flex items-center gap-2 text-foreground"><span class="size-2 rounded-full bg-chart-4"></span>Marketing</span><span class="tabular-nums text-muted-foreground">$3.4K · 12%</span></div><div class="mt-1.5 h-1.5 rounded-full bg-muted"><div class="h-1.5 w-1/6 rounded-full bg-chart-4"></div></div></li>
</ul>
</div>
</section>`,
  },
  {
    id: "table-status-rows",
    type: "table",
    surface: "app",
    pattern:
      "A table that works like a tool: a toolbar with a search field and filter chips above it, avatar + name in the first column, status as a badge with a dot AND a word, amounts right-aligned in tabular numerals, row hover, and a footer with the count and a pager.",
    fits: { composition: ["data-dense", "split", "asymmetric"], typeVoice: ["humanist", "quiet", "technical-mono"], decoration: ["outlined", "rules-and-grids", "none"], rhythm: ["compact", "balanced"] },
    html: `<section data-block-id="b-table" class="@container flex h-full flex-col overflow-hidden rounded-card border border-border bg-card">
<div class="flex flex-wrap items-center justify-between gap-3 border-b border-border p-4">
<div><h2 class="font-heading text-h3 font-semibold text-foreground">Upcoming appointments</h2><p class="text-caption text-muted-foreground">12 this week</p></div>
<div class="flex items-center gap-2">
<label class="sr-only" for="tbl-search">Search</label>
<input id="tbl-search" type="search" placeholder="Search client…" class="w-44 rounded-input border border-border bg-background px-3 py-2 text-small text-foreground ${FOCUS}">
<button type="button" class="inline-flex items-center gap-2 rounded-button border border-border px-3 py-2 text-small font-medium text-foreground hover:bg-muted ${FOCUS}"><i data-icon="filter" aria-hidden="true" class="size-4"></i>Filters</button>
</div>
</div>
<div class="grow overflow-x-auto">
<table class="w-full min-w-96 text-left text-small">
<caption class="sr-only">Upcoming appointments</caption>
<thead class="bg-muted text-caption uppercase tracking-wide text-muted-foreground"><tr><th scope="col" class="px-4 py-3 font-medium">Client</th><th scope="col" class="px-4 py-3 font-medium">Service</th><th scope="col" class="px-4 py-3 font-medium">Time</th><th scope="col" class="px-4 py-3 font-medium">Status</th><th scope="col" class="px-4 py-3 text-right font-medium">Amount</th></tr></thead>
<tbody class="divide-y divide-border">
<tr class="hover:bg-muted/50"><td class="px-4 py-3"><span class="flex items-center gap-3"><img data-placeholder="avatar" alt="" class="size-8 rounded-full"><span class="font-medium text-foreground">Paula Soler</span></span></td><td class="px-4 py-3 text-muted-foreground">Cut and beard</td><td class="px-4 py-3 tabular-nums text-muted-foreground">Mon 10:00</td><td class="px-4 py-3"><span class="inline-flex items-center gap-1.5 rounded-badge bg-success/10 px-2 py-0.5 text-caption font-medium text-foreground"><span class="size-1.5 rounded-full bg-success"></span>Confirmed</span></td><td class="px-4 py-3 text-right tabular-nums text-foreground">$38.00</td></tr>
<tr class="hover:bg-muted/50"><td class="px-4 py-3"><span class="flex items-center gap-3"><img data-placeholder="avatar" alt="" class="size-8 rounded-full"><span class="font-medium text-foreground">Álvaro Morales</span></span></td><td class="px-4 py-3 text-muted-foreground">Classic cut</td><td class="px-4 py-3 tabular-nums text-muted-foreground">Mon 10:45</td><td class="px-4 py-3"><span class="inline-flex items-center gap-1.5 rounded-badge bg-warning/10 px-2 py-0.5 text-caption font-medium text-foreground"><span class="size-1.5 rounded-full bg-warning"></span>Deposit due</span></td><td class="px-4 py-3 text-right tabular-nums text-foreground">$25.00</td></tr>
<tr class="hover:bg-muted/50"><td class="px-4 py-3"><span class="flex items-center gap-3"><img data-placeholder="avatar" alt="" class="size-8 rounded-full"><span class="font-medium text-foreground">Raúl Navarro</span></span></td><td class="px-4 py-3 text-muted-foreground">Razor shave</td><td class="px-4 py-3 tabular-nums text-muted-foreground">Mon 11:15</td><td class="px-4 py-3"><span class="inline-flex items-center gap-1.5 rounded-badge bg-success/10 px-2 py-0.5 text-caption font-medium text-foreground"><span class="size-1.5 rounded-full bg-success"></span>Confirmed</span></td><td class="px-4 py-3 text-right tabular-nums text-foreground">$18.00</td></tr>
<tr class="hover:bg-muted/50"><td class="px-4 py-3"><span class="flex items-center gap-3"><img data-placeholder="avatar" alt="" class="size-8 rounded-full"><span class="font-medium text-foreground">Marta Morales</span></span></td><td class="px-4 py-3 text-muted-foreground">Color</td><td class="px-4 py-3 tabular-nums text-muted-foreground">Mon 12:00</td><td class="px-4 py-3"><span class="inline-flex items-center gap-1.5 rounded-badge bg-muted px-2 py-0.5 text-caption font-medium text-foreground"><span class="size-1.5 rounded-full bg-border"></span>Pending</span></td><td class="px-4 py-3 text-right tabular-nums text-foreground">$52.00</td></tr>
</tbody>
</table>
</div>
<div class="flex items-center justify-between border-t border-border px-4 py-3 text-caption text-muted-foreground"><p>1–4 of 12</p><div class="flex gap-2"><button type="button" class="rounded-button border border-border px-3 py-1.5 font-medium text-foreground hover:bg-muted ${FOCUS}">Previous</button><button type="button" class="rounded-button border border-border px-3 py-1.5 font-medium text-foreground hover:bg-muted ${FOCUS}">Next</button></div></div>
</section>`,
  },
  {
    id: "table-compact-mono",
    type: "table",
    surface: "app",
    pattern:
      "A dense ledger: no avatars, a mono identifier column, two-line cells kept to one, zebra rows on a faint muted tint, a header in small caps, right-aligned figures and a bold total row at the bottom. Built to be scanned like a statement.",
    fits: { composition: ["data-dense", "editorial", "asymmetric"], typeVoice: ["technical-mono", "condensed-caps", "quiet"], decoration: ["rules-and-grids", "outlined", "none"], rhythm: ["compact"] },
    html: `<section data-block-id="b-table" class="@container flex h-full flex-col overflow-hidden rounded-card border border-border bg-card">
<div class="flex items-center justify-between border-b border-border px-4 py-3"><h2 class="font-mono text-caption font-semibold uppercase tracking-widest text-foreground">Open invoices</h2><p class="font-mono text-caption tabular-nums text-muted-foreground">12 open · $15,905 due</p></div>
<div class="grow overflow-x-auto">
<table class="w-full min-w-96 text-left">
<caption class="sr-only">Open invoices</caption>
<thead><tr class="border-b border-border font-mono text-caption uppercase tracking-widest text-muted-foreground"><th scope="col" class="px-4 py-2 font-medium">Invoice</th><th scope="col" class="px-4 py-2 font-medium">Client</th><th scope="col" class="px-4 py-2 font-medium">Due</th><th scope="col" class="px-4 py-2 text-right font-medium">Amount</th></tr></thead>
<tbody class="font-mono text-small tabular-nums">
<tr><td class="px-4 py-2 text-muted-foreground">INV-0148</td><td class="px-4 py-2 text-foreground">Northfield Studio</td><td class="px-4 py-2 text-muted-foreground">Sep 30</td><td class="px-4 py-2 text-right text-foreground">$3,457.00</td></tr>
<tr class="bg-muted/40"><td class="px-4 py-2 text-muted-foreground">INV-0147</td><td class="px-4 py-2 text-foreground">Lumen Works</td><td class="px-4 py-2 text-muted-foreground">Sep 30</td><td class="px-4 py-2 text-right text-foreground">$2,549.00</td></tr>
<tr><td class="px-4 py-2 text-muted-foreground">INV-0146</td><td class="px-4 py-2 text-foreground">Harbor Coffee Co.</td><td class="px-4 py-2 text-muted-foreground">Sep 28</td><td class="px-4 py-2 text-right text-foreground">$2,678.00</td></tr>
<tr class="bg-muted/40"><td class="px-4 py-2 text-muted-foreground">INV-0144</td><td class="px-4 py-2 text-foreground">Brightline Media</td><td class="px-4 py-2 text-muted-foreground">Sep 28</td><td class="px-4 py-2 text-right text-foreground">$2,755.00</td></tr>
</tbody>
<tfoot><tr class="border-t border-foreground font-mono text-small font-semibold tabular-nums"><th scope="row" colspan="3" class="px-4 py-2 text-left text-foreground">Total</th><td class="px-4 py-2 text-right text-foreground">$11,439.00</td></tr></tfoot>
</table>
</div>
</section>`,
  },
  {
    id: "activity-timeline",
    type: "activity",
    surface: "app",
    pattern:
      "A vertical timeline: a 1px line down the left with a small icon in a ring at each event, the sentence with the actor in medium weight, and a relative time in caption under it. A «View all» link in the header.",
    fits: { composition: ["data-dense", "split", "asymmetric", "editorial"], typeVoice: ["humanist", "quiet", "technical-mono"], decoration: ["rules-and-grids", "outlined", "none"], imagery: ["icon-led"], rhythm: ["compact", "balanced"] },
    html: `<section data-block-id="b-activity" class="@container h-full overflow-hidden rounded-card border border-border bg-card p-5">
<div class="flex items-center justify-between"><h2 class="font-heading text-h3 font-semibold text-foreground">Recent activity</h2><a href="#" class="text-small font-medium text-primary-text ${FOCUS}">View all</a></div>
<ol class="mt-5">
<li class="relative flex gap-3 pb-5"><span class="absolute left-4 top-8 h-full w-px bg-border" aria-hidden="true"></span><span class="relative z-10 flex size-8 shrink-0 items-center justify-center rounded-full border border-border bg-card"><i data-icon="user" aria-hidden="true" class="size-4 text-muted-foreground"></i></span><div class="min-w-0"><p class="text-small text-muted-foreground"><span class="font-medium text-foreground">Álvaro Ortega</span> booked a haircut for Friday</p><p class="text-caption text-muted-foreground">4 min ago</p></div></li>
<li class="relative flex gap-3 pb-5"><span class="absolute left-4 top-8 h-full w-px bg-border" aria-hidden="true"></span><span class="relative z-10 flex size-8 shrink-0 items-center justify-center rounded-full border border-border bg-card"><i data-icon="check-circle" aria-hidden="true" class="size-4 text-success"></i></span><div class="min-w-0"><p class="text-small text-muted-foreground"><span class="font-medium text-foreground">Nuria Ríos</span> paid the $25 deposit</p><p class="text-caption text-muted-foreground">26 min ago</p></div></li>
<li class="relative flex gap-3 pb-5"><span class="absolute left-4 top-8 h-full w-px bg-border" aria-hidden="true"></span><span class="relative z-10 flex size-8 shrink-0 items-center justify-center rounded-full border border-border bg-card"><i data-icon="bell" aria-hidden="true" class="size-4 text-primary-text"></i></span><div class="min-w-0"><p class="text-small text-muted-foreground">Reminder sent to <span class="font-medium text-foreground">12 clients</span> for tomorrow</p><p class="text-caption text-muted-foreground">1 h ago</p></div></li>
<li class="relative flex gap-3"><span class="relative z-10 flex size-8 shrink-0 items-center justify-center rounded-full border border-border bg-card"><i data-icon="alert-triangle" aria-hidden="true" class="size-4 text-warning"></i></span><div class="min-w-0"><p class="text-small text-muted-foreground"><span class="font-medium text-foreground">Sergio Navarro</span> cancelled the 17:00 slot</p><p class="text-caption text-muted-foreground">3 h ago</p></div></li>
</ol>
</section>`,
  },
  {
    id: "activity-feed-avatars",
    type: "activity",
    surface: "app",
    pattern:
      "A feed of rows with an avatar on the left, a sentence with the object in bold and the time right-aligned, separated by hairlines. Quick to scan; one unread dot marks what is new.",
    fits: { composition: ["split", "data-dense", "bento"], typeVoice: ["humanist", "quiet"], decoration: ["outlined", "none", "tinted-panels"], imagery: ["layered-collage", "icon-led"], rhythm: ["compact", "balanced"] },
    html: `<section data-block-id="b-activity" class="@container h-full overflow-hidden rounded-card border border-border bg-card">
<div class="flex items-center justify-between border-b border-border px-5 py-4"><h2 class="font-heading text-h3 font-semibold text-foreground">Latest</h2><span class="rounded-badge bg-primary/10 px-2 py-0.5 text-caption font-medium text-foreground">3 new</span></div>
<ul class="divide-y divide-border">
<li class="flex items-center gap-3 px-5 py-3"><img data-placeholder="avatar" alt="" class="size-9 rounded-full"><p class="min-w-0 grow truncate text-small text-muted-foreground"><span class="font-medium text-foreground">Paula</span> rescheduled <span class="font-medium text-foreground">Thursday 10:00</span></p><span class="flex shrink-0 items-center gap-2 text-caption text-muted-foreground"><span class="size-1.5 rounded-full bg-primary"></span>2 min</span></li>
<li class="flex items-center gap-3 px-5 py-3"><img data-placeholder="avatar" alt="" class="size-9 rounded-full"><p class="min-w-0 grow truncate text-small text-muted-foreground"><span class="font-medium text-foreground">Raúl</span> left a 5-star review</p><span class="flex shrink-0 items-center gap-2 text-caption text-muted-foreground"><span class="size-1.5 rounded-full bg-primary"></span>18 min</span></li>
<li class="flex items-center gap-3 px-5 py-3"><img data-placeholder="avatar" alt="" class="size-9 rounded-full"><p class="min-w-0 grow truncate text-small text-muted-foreground"><span class="font-medium text-foreground">Marta</span> added a note to <span class="font-medium text-foreground">Color formula</span></p><span class="shrink-0 text-caption text-muted-foreground">1 h</span></li>
<li class="flex items-center gap-3 px-5 py-3"><img data-placeholder="avatar" alt="" class="size-9 rounded-full"><p class="min-w-0 grow truncate text-small text-muted-foreground"><span class="font-medium text-foreground">Sergio</span> cancelled <span class="font-medium text-foreground">Friday 17:00</span></p><span class="shrink-0 text-caption text-muted-foreground">3 h</span></li>
</ul>
</section>`,
  },
];
