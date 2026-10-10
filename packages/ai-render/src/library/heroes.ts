// Hero patterns. Each is a COMPOSITION idea (what the eye does first, how the product is shown, where the type sits),
// written with neutral copy: the model adapts the idea to the brand and rewrites every line.
import type { LibraryBlock } from "./types";

export const HEROES: LibraryBlock[] = [
  {
    id: "hero-product-window",
    type: "hero",
    surface: "landing",
    pattern:
      "A left-aligned heading with a short promise and two actions, then a product window (top bar with three dots, sidebar, KPI cards, a chart) spanning the full width and cut off by the bottom edge of the block, so it reads as a real interface.",
    fits: { composition: ["asymmetric", "split", "centered-stage"], imagery: ["framed-screens", "data-viz-led"], typeVoice: ["quiet", "bold-display", "humanist"], rhythm: ["airy", "balanced"] },
    html: `<section data-block-id="b-hero" class="@container relative overflow-hidden bg-background">
<div class="mx-auto max-w-container px-6 pt-20 @3xl:pt-28">
<div class="max-w-3xl">
<p class="inline-flex items-center gap-2 rounded-badge border border-border bg-card px-3 py-1 text-caption text-muted-foreground"><span class="size-1.5 rounded-full bg-primary"></span>New: weekly forecasts</p>
<h1 class="mt-6 font-heading text-display font-semibold tracking-tight text-foreground">Know where the month is heading before it gets there</h1>
<p class="mt-5 max-w-xl text-body text-muted-foreground">One calm view of what came in, what is going out and what is still due. Built for small teams that do not have a finance department.</p>
<div class="mt-8 flex flex-wrap items-center gap-3">
<a href="#" class="rounded-button bg-primary px-5 py-3 text-body font-medium text-primary-foreground shadow-button hover:bg-primary-hover focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-foreground">Start free</a>
<a href="#" class="inline-flex items-center gap-2 px-3 py-3 text-body font-medium text-foreground focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-foreground">See how it works<i data-icon="arrow-right" aria-hidden="true" class="size-4"></i></a>
</div>
</div>
<div class="relative mt-14 h-72 overflow-hidden @3xl:h-96">
<div class="absolute inset-x-0 top-0 rounded-t-card border border-b-0 border-border bg-card shadow-lg">
<div class="flex items-center gap-2 border-b border-border px-4 py-3">
<span class="size-2.5 rounded-full bg-border"></span><span class="size-2.5 rounded-full bg-border"></span><span class="size-2.5 rounded-full bg-border"></span>
<span class="ml-3 h-5 w-48 rounded-badge bg-muted"></span>
</div>
<div class="grid grid-cols-12">
<div class="col-span-3 hidden space-y-3 border-r border-border p-4 @3xl:block">
<span class="block h-4 w-24 rounded-badge bg-primary/20"></span><span class="block h-3 w-20 rounded-badge bg-muted"></span><span class="block h-3 w-28 rounded-badge bg-muted"></span><span class="block h-3 w-16 rounded-badge bg-muted"></span><span class="block h-3 w-24 rounded-badge bg-muted"></span>
</div>
<div class="col-span-12 space-y-4 p-5 @3xl:col-span-9">
<div class="grid grid-cols-3 gap-3">
<div class="rounded-card border border-border p-3"><p class="text-caption text-muted-foreground">Cash in</p><p class="mt-1 font-heading text-h3 font-semibold tabular-nums text-foreground">$48,200</p></div>
<div class="rounded-card border border-border p-3"><p class="text-caption text-muted-foreground">Cash out</p><p class="mt-1 font-heading text-h3 font-semibold tabular-nums text-foreground">$31,950</p></div>
<div class="rounded-card border border-border bg-primary/10 p-3"><p class="text-caption text-foreground">Projected</p><p class="mt-1 font-heading text-h3 font-semibold tabular-nums text-primary-text">+$16,250</p></div>
</div>
<img data-chart="area" data-values="22,26,24,31,29,38,36,44,41,52" alt="Projected balance over the next ten weeks" class="h-32 w-full">
<ul class="divide-y divide-border rounded-card border border-border">
<li class="flex items-center justify-between px-4 py-3 text-small"><span class="text-foreground">Studio rent</span><span class="tabular-nums text-muted-foreground">Due Oct 1 · $1,200</span></li>
<li class="flex items-center justify-between px-4 py-3 text-small"><span class="text-foreground">Invoice #1042</span><span class="tabular-nums text-muted-foreground">Expected Oct 4 · $3,400</span></li>
<li class="flex items-center justify-between px-4 py-3 text-small"><span class="text-foreground">Payroll</span><span class="tabular-nums text-muted-foreground">Oct 15 · $5,600</span></li>
</ul>
</div>
</div>
</div>
</div>
</div>
</section>`,
  },
  {
    id: "hero-split-metrics",
    type: "hero",
    surface: "landing",
    pattern:
      "An asymmetric 7/5 split: heading, promise and actions on the left; on the right a single raised card that shows one big number, a sparkline and two small stats. Below, a strip of 3–4 metrics separated by vertical hairlines.",
    fits: { composition: ["asymmetric", "split", "data-dense"], typeVoice: ["technical-mono", "bold-display"], decoration: ["outlined", "rules-and-grids", "tinted-panels"], imagery: ["data-viz-led", "framed-screens"], rhythm: ["balanced", "compact"] },
    html: `<section data-block-id="b-hero" class="@container bg-background py-16 @3xl:py-24">
<div class="mx-auto max-w-container px-6">
<div class="grid items-center gap-12 @3xl:grid-cols-12">
<div class="@3xl:col-span-7">
<p class="font-mono text-caption uppercase tracking-widest text-primary-text">// Live forecasting</p>
<h1 class="mt-5 font-heading text-display font-bold tracking-tight text-foreground">Cash-flow you can read at a glance</h1>
<p class="mt-5 max-w-xl text-body text-muted-foreground">Connect your accounts once. See the next 90 days, flag the weeks that run short and send reminders before they do.</p>
<div class="mt-8 flex flex-wrap gap-3">
<a href="#" class="rounded-button bg-primary px-5 py-3 text-body font-medium text-primary-foreground hover:bg-primary-hover focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-foreground">Open an account</a>
<a href="#" class="rounded-button border border-border bg-card px-5 py-3 text-body font-medium text-foreground hover:bg-muted focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-foreground">Talk to sales</a>
</div>
</div>
<div class="@3xl:col-span-5">
<div class="rounded-card border border-border bg-card p-6 shadow-lg">
<div class="flex items-start justify-between gap-4">
<div>
<p class="font-mono text-caption uppercase tracking-widest text-muted-foreground">Projected balance · 90d</p>
<p class="mt-2 font-mono text-h1 font-semibold tabular-nums text-foreground">$24,380</p>
</div>
<span class="inline-flex items-center gap-1 rounded-badge bg-success/10 px-2 py-1 text-caption font-medium text-foreground"><i data-icon="arrow-up-right" aria-hidden="true" class="size-3.5 text-success"></i>+12.4%</span>
</div>
<img data-chart="area" data-values="12,14,13,17,16,21,19,25,24,30" alt="Balance trend over 90 days" class="mt-4 h-28 w-full">
<div class="mt-4 grid grid-cols-2 gap-4 border-t border-border pt-4">
<div><p class="text-caption text-muted-foreground">Due in 30 days</p><p class="font-mono text-h3 tabular-nums text-foreground">$3,215</p></div>
<div><p class="text-caption text-muted-foreground">Invoices paid</p><p class="font-mono text-h3 tabular-nums text-foreground">28</p></div>
</div>
</div>
</div>
</div>
<dl class="mt-16 grid grid-cols-2 divide-x divide-border border-y border-border @3xl:grid-cols-4">
<div class="px-6 py-5"><dt class="text-caption text-muted-foreground">Invoices tracked</dt><dd class="mt-1 font-heading text-h2 font-semibold tabular-nums text-foreground">12,480</dd></div>
<div class="px-6 py-5"><dt class="text-caption text-muted-foreground">Avg. days to get paid</dt><dd class="mt-1 font-heading text-h2 font-semibold tabular-nums text-foreground">18</dd></div>
<div class="px-6 py-5"><dt class="text-caption text-muted-foreground">Late payments caught</dt><dd class="mt-1 font-heading text-h2 font-semibold tabular-nums text-foreground">94%</dd></div>
<div class="px-6 py-5"><dt class="text-caption text-muted-foreground">Setup time</dt><dd class="mt-1 font-heading text-h2 font-semibold tabular-nums text-foreground">5 min</dd></div>
</dl>
</div>
</section>`,
  },
  {
    id: "hero-centered-highlight",
    type: "hero",
    surface: "landing",
    pattern:
      "A centered stage: one heading where a single word sits inside a tinted pill, a short promise, two actions, and a tight row of overlapping avatars with a one-line proof under them. Quiet and friendly; the color is spent in the pill and the primary action only.",
    fits: { composition: ["centered-stage", "editorial"], typeVoice: ["humanist", "quiet", "bold-display"], decoration: ["soft-shapes", "tinted-panels", "none"], colorStrategy: ["neutral-with-pops", "brand-forward"], rhythm: ["airy"] },
    html: `<section data-block-id="b-hero" class="@container relative overflow-hidden bg-background py-20 @3xl:py-28">
<div class="absolute inset-x-0 top-0 h-64 bg-radial from-primary/15 to-transparent" aria-hidden="true"></div>
<div class="relative mx-auto max-w-4xl px-6 text-center">
<p class="mx-auto inline-flex items-center gap-2 rounded-badge bg-primary/10 px-3 py-1 text-caption font-medium text-foreground"><i data-icon="sparkle" aria-hidden="true" class="size-3.5 text-primary-text"></i>Bookings open for autumn</p>
<h1 class="mt-6 font-heading text-display font-semibold tracking-tight text-foreground">A schedule that fills <span class="rounded-badge bg-primary/10 px-3 text-primary-text">itself</span> while you work</h1>
<p class="mx-auto mt-6 max-w-2xl text-body text-muted-foreground">Clients pick a time, get a reminder and pay the deposit. You just show up and do what you are good at.</p>
<div class="mt-9 flex flex-wrap items-center justify-center gap-3">
<a href="#" class="rounded-button bg-primary px-6 py-3 text-body font-medium text-primary-foreground shadow-button hover:bg-primary-hover focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-foreground">Start free</a>
<a href="#" class="rounded-button border border-border bg-card px-6 py-3 text-body font-medium text-foreground hover:bg-muted focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-foreground">Watch the 2-min tour</a>
</div>
<div class="mt-10 flex flex-col items-center gap-3">
<div class="flex gap-1">
<img data-placeholder="avatar" alt="" class="size-9 rounded-full ring-2 ring-background"><img data-placeholder="avatar" alt="" class="size-9 rounded-full ring-2 ring-background"><img data-placeholder="avatar" alt="" class="size-9 rounded-full ring-2 ring-background"><img data-placeholder="avatar" alt="" class="size-9 rounded-full ring-2 ring-background">
</div>
<p class="text-small text-muted-foreground">Trusted by <span class="font-medium text-foreground">2,400</span> independent studios</p>
</div>
</div>
</section>`,
  },
  {
    id: "hero-editorial-type",
    type: "hero",
    surface: "landing",
    pattern:
      "Typography as the picture: a mono issue line and a hairline on top, an oversized heading that takes the whole width, then a row of three short statements separated by vertical hairlines and a text-link action. No image at all; the whitespace and the rules do the work.",
    fits: { composition: ["editorial", "asymmetric"], typeVoice: ["bold-display", "condensed-caps", "technical-mono", "quiet"], decoration: ["rules-and-grids", "none", "outlined"], imagery: ["icon-led"], rhythm: ["airy", "balanced"] },
    html: `<section data-block-id="b-hero" class="@container bg-background py-16 @3xl:py-24">
<div class="mx-auto max-w-container px-6">
<div class="flex items-center justify-between gap-4 border-t border-foreground pt-3">
<p class="font-mono text-caption uppercase tracking-widest text-foreground">N° 01 — The studio</p>
<p class="font-mono text-caption uppercase tracking-widest text-muted-foreground">Autumn 2026</p>
</div>
<h1 class="mt-10 font-heading text-display font-bold uppercase tracking-tight leading-none text-foreground @3xl:mt-16">Objects made slowly, for the long run</h1>
<div class="mt-12 grid gap-8 border-t border-border pt-8 @3xl:grid-cols-3 @3xl:divide-x @3xl:divide-border">
<p class="text-body text-foreground @3xl:pr-8">Small batches, fired and finished by hand in one workshop.</p>
<p class="text-body text-foreground @3xl:px-8">Every piece is numbered and keeps a record of who made it.</p>
<div class="@3xl:pl-8">
<a href="#" class="group inline-flex items-center gap-2 text-body font-medium text-foreground focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-foreground">Browse the collection<i data-icon="arrow-right" aria-hidden="true" class="size-4 transition group-hover:translate-x-1"></i></a>
<p class="mt-2 text-small text-muted-foreground">Free shipping over $90</p>
</div>
</div>
</div>
</section>`,
  },
  {
    id: "hero-framed-media",
    type: "hero",
    surface: "landing",
    pattern:
      "A large rounded photo that is the hero, with the heading in a raised caption card that sits on its bottom-left corner, pill labels pinned to the picture (price, category) and one primary action under it. Warm, tactile and product-first.",
    fits: { composition: ["editorial", "split", "asymmetric"], imagery: ["layered-collage", "tilted-cards", "framed-screens"], typeVoice: ["humanist", "quiet"], decoration: ["soft-shapes", "none"], colorStrategy: ["neutral-with-pops", "tonal-monochrome"], rhythm: ["airy"] },
    html: `<section data-block-id="b-hero" class="@container bg-background py-10 @3xl:py-16">
<div class="mx-auto max-w-container px-6">
<div class="relative overflow-hidden rounded-xl">
<img data-placeholder="photo" alt="Hand-thrown bowls on a wooden shelf, morning light" class="aspect-4/3 w-full object-cover @3xl:aspect-video">
<div class="absolute inset-x-0 bottom-0 p-4 @3xl:p-8">
<div class="max-w-xl rounded-card bg-background p-5 shadow-lg @3xl:p-7">
<span class="inline-flex rounded-badge bg-primary/10 px-3 py-1 text-caption font-medium text-foreground">New collection</span>
<h1 class="mt-3 font-heading text-h1 font-semibold tracking-tight text-foreground @3xl:text-display">Tableware that gets better with use</h1>
<p class="mt-2 text-body text-muted-foreground">Glazed in small batches and made to be used every day.</p>
</div>
</div>
<span class="absolute right-4 top-4 rounded-badge bg-background px-3 py-1 text-caption font-medium text-foreground">From $38</span>
</div>
<div class="mt-6 flex flex-wrap items-center justify-between gap-4">
<a href="#" class="rounded-button bg-primary px-6 py-3 text-body font-medium text-primary-foreground hover:bg-primary-hover focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-foreground">Shop the collection</a>
<p class="text-small text-muted-foreground">Ships in 3–5 days · 30-day returns</p>
</div>
</div>
</section>`,
  },
];
