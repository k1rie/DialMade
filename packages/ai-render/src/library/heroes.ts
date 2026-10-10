// Hero patterns. Each is a COMPOSITION idea (what the eye does first, how the product is shown, where the type sits),
// written with neutral copy: the model adapts the idea to the brand and rewrites every line.
import type { LibraryBlock } from "./types";

export const HEROES: LibraryBlock[] = [
  {
    id: "hero-product-window",
    approved: true,
    type: "hero",
    surface: "landing",
    pattern:
      "A left-aligned heading with a short promise and two actions, then a product window (top bar with three dots, sidebar, KPI cards, a chart) spanning the full width and cut off by the bottom edge of the block, so it reads as a real interface.",
    fits: { composition: ["asymmetric", "split", "centered-stage"], imagery: ["framed-screens", "data-viz-led"], typeVoice: ["quiet", "bold-display", "humanist"], rhythm: ["airy", "balanced"] },
    html: `<section data-block-id="b-hero" class="@container relative overflow-hidden bg-background">
<div class="mx-auto max-w-container px-6 pt-20 @3xl:pt-28">
<div class="max-w-3xl">
<p class="inline-flex items-center gap-2 rounded-badge border border-border bg-card px-3 py-1 text-caption text-muted-foreground"><span class="size-1.5 rounded-full bg-primary"></span>New: standing orders</p>
<h1 class="mt-6 font-heading text-display font-semibold tracking-tight text-foreground">Tomorrow's bake, planned by tonight</h1>
<p class="mt-5 max-w-xl text-body text-muted-foreground">Every order, every oven slot and every delivery in one calm view. Made for small bakeries that run on a whiteboard today.</p>
<div class="mt-8 flex flex-wrap items-center gap-3">
<a href="#" class="rounded-button bg-primary px-5 py-3 text-body font-medium text-primary-foreground shadow-button hover:bg-primary-hover focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-foreground">Start free</a>
<a href="#" class="inline-flex items-center gap-2 px-3 py-3 text-body font-medium text-foreground focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-foreground">Take the tour<i data-icon="arrow-right" aria-hidden="true" class="size-4"></i></a>
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
<div class="rounded-card border border-border p-3"><p class="text-caption text-muted-foreground">Orders</p><p class="mt-1 font-heading text-h3 font-semibold tabular-nums text-foreground">64</p></div>
<div class="rounded-card border border-border p-3"><p class="text-caption text-muted-foreground">Loaves</p><p class="mt-1 font-heading text-h3 font-semibold tabular-nums text-foreground">312</p></div>
<div class="rounded-card border border-border bg-primary/10 p-3"><p class="text-caption text-foreground">Oven capacity</p><p class="mt-1 font-heading text-h3 font-semibold tabular-nums text-primary-text">11 left</p></div>
</div>
<img data-chart="area" data-values="22,26,24,31,29,38,36,44,41,52" alt="Loaves baked per day over the next ten days" class="h-32 w-full">
<ul class="divide-y divide-border rounded-card border border-border">
<li class="flex items-center justify-between px-4 py-3 text-small"><span class="text-foreground">Corner café · rye x12</span><span class="tabular-nums text-muted-foreground">Mon 06:30</span></li>
<li class="flex items-center justify-between px-4 py-3 text-small"><span class="text-foreground">Farm shop · sourdough x30</span><span class="tabular-nums text-muted-foreground">Mon 07:15</span></li>
<li class="flex items-center justify-between px-4 py-3 text-small"><span class="text-foreground">School canteen · rolls x120</span><span class="tabular-nums text-muted-foreground">Mon 08:00</span></li>
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
    approved: true,
    type: "hero",
    surface: "landing",
    pattern:
      "An asymmetric 7/5 split: heading, promise and actions on the left; on the right a single raised card that shows one big number, a sparkline and two small stats. Below, a strip of 3–4 metrics separated by vertical hairlines.",
    fits: { composition: ["asymmetric", "split", "data-dense"], typeVoice: ["technical-mono", "bold-display"], decoration: ["outlined", "rules-and-grids", "tinted-panels"], imagery: ["data-viz-led", "framed-screens"], rhythm: ["balanced", "compact"] },
    html: `<section data-block-id="b-hero" class="@container bg-background py-16 @3xl:py-24">
<div class="mx-auto max-w-container px-6">
<div class="grid items-center gap-12 @3xl:grid-cols-12">
<div class="@3xl:col-span-7">
<p class="font-mono text-caption uppercase tracking-widest text-primary-text">// Race-day control</p>
<h1 class="mt-5 font-heading text-display font-bold tracking-tight text-foreground">Race day, readable at a glance</h1>
<p class="mt-5 max-w-xl text-body text-muted-foreground">Registrations, bibs and volunteers on one screen. See who has checked in and what is still missing, before the starting gun.</p>
<div class="mt-8 flex flex-wrap gap-3">
<a href="#" class="rounded-button bg-primary px-5 py-3 text-body font-medium text-primary-foreground hover:bg-primary-hover focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-foreground">Open registrations</a>
<a href="#" class="rounded-button border border-border bg-card px-5 py-3 text-body font-medium text-foreground hover:bg-muted focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-foreground">Download the kit</a>
</div>
</div>
<div class="@3xl:col-span-5">
<div class="rounded-card border border-border bg-card p-6 shadow-lg">
<div class="flex items-start justify-between gap-4">
<div>
<p class="font-mono text-caption uppercase tracking-widest text-muted-foreground">Checked in · 08:40</p>
<p class="mt-2 font-mono text-h1 font-semibold tabular-nums text-foreground">1,284</p>
</div>
<span class="inline-flex items-center gap-1 rounded-badge bg-success/10 px-2 py-1 text-caption font-medium text-foreground"><i data-icon="arrow-up-right" aria-hidden="true" class="size-3.5 text-success"></i>+86 in 10 min</span>
</div>
<img data-chart="area" data-values="12,14,13,17,16,21,19,25,24,30" alt="Check-ins per five minutes" class="mt-4 h-28 w-full">
<div class="mt-4 grid grid-cols-2 gap-4 border-t border-border pt-4">
<div><p class="text-caption text-muted-foreground">Still to arrive</p><p class="font-mono text-h3 tabular-nums text-foreground">216</p></div>
<div><p class="text-caption text-muted-foreground">Volunteers on site</p><p class="font-mono text-h3 tabular-nums text-foreground">42</p></div>
</div>
</div>
</div>
</div>
<dl class="mt-16 grid grid-cols-2 divide-x divide-border border-y border-border @3xl:grid-cols-4">
<div class="px-6 py-5"><dt class="text-caption text-muted-foreground">Runners registered</dt><dd class="mt-1 font-heading text-h2 font-semibold tabular-nums text-foreground">3,920</dd></div>
<div class="px-6 py-5"><dt class="text-caption text-muted-foreground">Countries</dt><dd class="mt-1 font-heading text-h2 font-semibold tabular-nums text-foreground">23</dd></div>
<div class="px-6 py-5"><dt class="text-caption text-muted-foreground">Finish rate</dt><dd class="mt-1 font-heading text-h2 font-semibold tabular-nums text-foreground">94%</dd></div>
<div class="px-6 py-5"><dt class="text-caption text-muted-foreground">Aid stations</dt><dd class="mt-1 font-heading text-h2 font-semibold tabular-nums text-foreground">9</dd></div>
</dl>
</div>
</section>`,
  },
  {
    id: "hero-centered-highlight",
    approved: true,
    type: "hero",
    surface: "landing",
    pattern:
      "A centered stage: one heading where a single word sits inside a tinted pill, a short promise, two actions, and a tight row of overlapping avatars with a one-line proof under them. Quiet and friendly; the color is spent in the pill and the primary action only.",
    fits: { composition: ["centered-stage", "editorial"], typeVoice: ["humanist", "quiet", "bold-display"], decoration: ["soft-shapes", "tinted-panels", "none"], colorStrategy: ["neutral-with-pops", "brand-forward"], rhythm: ["airy"] },
    html: `<section data-block-id="b-hero" class="@container relative overflow-hidden bg-background py-20 @3xl:py-28">
<div class="absolute inset-x-0 top-0 h-64 bg-radial from-primary/15 to-transparent" aria-hidden="true"></div>
<div class="relative mx-auto max-w-4xl px-6 text-center">
<p class="mx-auto inline-flex items-center gap-2 rounded-badge bg-primary/10 px-3 py-1 text-caption font-medium text-foreground"><i data-icon="sparkle" aria-hidden="true" class="size-3.5 text-primary-text"></i>Autumn term is open</p>
<h1 class="mt-6 font-heading text-display font-semibold tracking-tight text-foreground">A choir that fills <span class="rounded-badge bg-primary/10 px-3 text-primary-text">itself</span> before the first rehearsal</h1>
<p class="mx-auto mt-6 max-w-2xl text-body text-muted-foreground">Singers pick a section, get the score and the rehearsal dates. You just show up and sing.</p>
<div class="mt-9 flex flex-wrap items-center justify-center gap-3">
<a href="#" class="rounded-button bg-primary px-6 py-3 text-body font-medium text-primary-foreground shadow-button hover:bg-primary-hover focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-foreground">Start free</a>
<a href="#" class="rounded-button border border-border bg-card px-6 py-3 text-body font-medium text-foreground hover:bg-muted focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-foreground">Hear a rehearsal</a>
</div>
<div class="mt-10 flex flex-col items-center gap-3">
<div class="flex gap-1">
<img data-placeholder="avatar" alt="" class="size-9 rounded-full ring-2 ring-background"><img data-placeholder="avatar" alt="" class="size-9 rounded-full ring-2 ring-background"><img data-placeholder="avatar" alt="" class="size-9 rounded-full ring-2 ring-background"><img data-placeholder="avatar" alt="" class="size-9 rounded-full ring-2 ring-background">
</div>
<p class="text-small text-muted-foreground">Joined by <span class="font-medium text-foreground">310</span> singers this year</p>
</div>
</div>
</section>`,
  },
  {
    id: "hero-editorial-type",
    approved: true,
    type: "hero",
    surface: "landing",
    pattern:
      "Typography as the picture: a mono issue line and a hairline on top, an oversized heading that takes the whole width, then a row of three short statements separated by vertical hairlines and a text-link action. No image at all; the whitespace and the rules do the work.",
    fits: { composition: ["editorial", "asymmetric"], typeVoice: ["bold-display", "condensed-caps", "technical-mono", "quiet"], decoration: ["rules-and-grids", "none", "outlined"], imagery: ["icon-led"], rhythm: ["airy", "balanced"] },
    html: `<section data-block-id="b-hero" class="@container bg-background py-16 @3xl:py-24">
<div class="mx-auto max-w-container px-6">
<div class="flex items-center justify-between gap-4 border-t border-foreground pt-3">
<p class="font-mono text-caption uppercase tracking-widest text-foreground">N° 01 — The press</p>
<p class="font-mono text-caption uppercase tracking-widest text-muted-foreground">Autumn 2026</p>
</div>
<h1 class="mt-10 font-heading text-display font-bold uppercase tracking-tight leading-none text-foreground @3xl:mt-16">Printed slowly, kept for good</h1>
<div class="mt-12 grid gap-8 border-t border-border pt-8 @3xl:grid-cols-3 @3xl:divide-x @3xl:divide-border">
<p class="text-body text-foreground @3xl:pr-8">Short runs, set and inked by hand in one workshop.</p>
<p class="text-body text-foreground @3xl:px-8">Every sheet is numbered and signed on the back.</p>
<div class="@3xl:pl-8">
<a href="#" class="group inline-flex items-center gap-2 text-body font-medium text-foreground focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-foreground">See the editions<i data-icon="arrow-right" aria-hidden="true" class="size-4 transition group-hover:translate-x-1"></i></a>
<p class="mt-2 text-small text-muted-foreground">Flat shipping, tubes included</p>
</div>
</div>
</div>
</section>`,
  },
  {
    id: "hero-framed-media",
    approved: true,
    type: "hero",
    surface: "landing",
    pattern:
      "A large rounded photo that is the hero, with the heading in a raised caption card that sits on its bottom-left corner, pill labels pinned to the picture (price, category) and one primary action under it. Warm, tactile and product-first.",
    fits: { composition: ["editorial", "split", "asymmetric"], imagery: ["layered-collage", "tilted-cards", "framed-screens"], typeVoice: ["humanist", "quiet"], decoration: ["soft-shapes", "none"], colorStrategy: ["neutral-with-pops", "tonal-monochrome"], rhythm: ["airy"] },
    html: `<section data-block-id="b-hero" class="@container bg-background py-10 @3xl:py-16">
<div class="mx-auto max-w-container px-6">
<div class="relative overflow-hidden rounded-xl">
<img data-placeholder="photo" alt="Potted ferns on a wooden shelf, morning light" class="aspect-4/3 w-full object-cover @3xl:aspect-video">
<div class="absolute inset-x-0 bottom-0 p-4 @3xl:p-8">
<div class="max-w-xl rounded-card bg-background p-5 shadow-lg @3xl:p-7">
<span class="inline-flex rounded-badge bg-primary/10 px-3 py-1 text-caption font-medium text-foreground">New this week</span>
<h1 class="mt-3 font-heading text-h1 font-semibold tracking-tight text-foreground @3xl:text-display">Plants that settle in and keep growing</h1>
<p class="mt-2 text-body text-muted-foreground">Grown in our greenhouse and potted by hand, with a care card in every box.</p>
</div>
</div>
<span class="absolute right-4 top-4 rounded-badge bg-background px-3 py-1 text-caption font-medium text-foreground">From $22</span>
</div>
<div class="mt-6 flex flex-wrap items-center justify-between gap-4">
<a href="#" class="rounded-button bg-primary px-6 py-3 text-body font-medium text-primary-foreground hover:bg-primary-hover focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-foreground">Shop the greenhouse</a>
<p class="text-small text-muted-foreground">Ships in 3–5 days · Arrives alive guarantee</p>
</div>
</div>
</section>`,
  },
];
