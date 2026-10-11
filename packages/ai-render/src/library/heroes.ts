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
    gesture: "a real product window across the block, cut off by its bottom edge",
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
    gesture: "one raised card with a single big number beside the heading",
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
    gesture: "one word of the heading inside a tinted pill",
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
    gesture: "an oversized heading as the only picture, held by hairlines",
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
    gesture: "a large photo with the heading on a caption card over its corner",
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
  {
    id: "hero-launch-spec-sheet",
    approved: true,
    type: "hero",
    surface: "landing",
    pattern:
      "A launch read like a catalogue page on a quiet paper-like field: a heading in two voices (one roman line, one italic line), a short paragraph, a small dark button with the price set in mono beside it and a 2×2 spec sheet (caps labels over mono values); on the right the product drawn as a physical object out of simple shapes (a body, a screen showing a tiny real interface, a keyboard in front) with two or three stickers stuck on its frame, below the screen: never on top of its text.",
    gesture: "a two-voice heading and a mono spec sheet, with the product as an object with stickers on its frame",
    fits: { composition: ["split", "asymmetric", "editorial"], typeVoice: ["quiet", "humanist", "technical-mono"], imagery: ["layered-collage", "framed-screens"], decoration: ["none", "soft-shapes"], colorStrategy: ["neutral-with-pops", "tonal-monochrome", "high-contrast-cta"], rhythm: ["airy", "balanced"] },
    html: `<section data-block-id="b-hero" class="@container overflow-hidden bg-muted py-20 @3xl:py-28">
<div class="mx-auto grid max-w-container items-center gap-16 px-6 @3xl:grid-cols-12">
<div class="@3xl:col-span-5">
<h1 class="font-heading text-display font-normal leading-none tracking-tight text-foreground">Introducing<span class="block italic">Quill Desk.</span></h1>
<p class="mt-6 max-w-sm text-body text-foreground">Not a laptop and not a typewriter. Quill Desk keeps your drafts, counts your words and never shows you a notification. A writing room that fits on your table.</p>
<div class="mt-8 flex flex-wrap items-center gap-5">
<a href="#" class="rounded-button bg-foreground px-5 py-3 text-small font-medium text-background hover:bg-foreground/90 focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-foreground">Order Quill Desk</a>
<p class="font-mono text-small tabular-nums text-foreground">€1,290.00</p>
</div>
<dl class="mt-12 grid max-w-sm grid-cols-2 gap-x-10 gap-y-6">
<div><dt class="text-caption uppercase tracking-widest text-foreground">Keyboard</dt><dd class="mt-1 font-mono text-small text-foreground">78 quiet keys</dd></div>
<div><dt class="text-caption uppercase tracking-widest text-foreground">Memory</dt><dd class="mt-1 font-mono text-small text-foreground">40,000 pages</dd></div>
<div><dt class="text-caption uppercase tracking-widest text-foreground">Battery</dt><dd class="mt-1 font-mono text-small text-foreground">9 days</dd></div>
<div><dt class="text-caption uppercase tracking-widest text-foreground">Display</dt><dd class="mt-1 font-mono text-small text-foreground">9" paper-white</dd></div>
</dl>
</div>
<div class="relative mx-auto w-full max-w-sm @3xl:col-span-5 @3xl:col-start-8">
<div class="rounded-xl border border-border bg-card p-6 pb-8 shadow-lg">
<div class="aspect-4/3 rounded-lg border-4 border-muted bg-foreground p-4">
<div class="grid grid-cols-3 gap-3 font-mono text-caption text-background">
<ul class="space-y-2"><li class="flex items-center gap-2"><span class="size-1.5 rounded-full bg-primary"></span>Drafts</li><li class="flex items-center gap-2"><span class="size-1.5 rounded-full bg-cta"></span>Notes</li><li class="flex items-center gap-2"><span class="size-1.5 rounded-full bg-background"></span>Trash</li></ul>
<div class="col-span-2 rounded-sm bg-background p-2 text-foreground"><p class="border-b border-foreground pb-1">chapter-3.txt</p><p class="mt-2">2,140 words saved</p></div>
</div>
</div>
<div class="mt-6 flex items-center justify-between"><span class="h-2 w-28 rounded-full bg-foreground"></span><div class="grid grid-cols-3 gap-1"><span class="size-1.5 bg-foreground"></span><span class="size-1.5 bg-foreground"></span><span class="size-1.5 bg-foreground"></span><span class="size-1.5 bg-foreground"></span><span class="size-1.5 bg-foreground"></span><span class="size-1.5 bg-foreground"></span></div></div>
</div>
<div class="mx-8 mt-3 rounded-lg border border-border bg-card p-3 shadow-md"><div class="grid grid-cols-10 gap-1"><span class="h-3 rounded-sm bg-border"></span><span class="h-3 rounded-sm bg-border"></span><span class="h-3 rounded-sm bg-border"></span><span class="h-3 rounded-sm bg-border"></span><span class="h-3 rounded-sm bg-border"></span><span class="h-3 rounded-sm bg-border"></span><span class="h-3 rounded-sm bg-border"></span><span class="h-3 rounded-sm bg-border"></span><span class="h-3 rounded-sm bg-border"></span><span class="h-3 rounded-sm bg-border"></span><span class="h-3 rounded-sm bg-border"></span><span class="h-3 rounded-sm bg-border"></span><span class="h-3 rounded-sm bg-border"></span><span class="h-3 rounded-sm bg-border"></span><span class="h-3 rounded-sm bg-border"></span><span class="h-3 rounded-sm bg-border"></span><span class="h-3 rounded-sm bg-border"></span><span class="h-3 rounded-sm bg-border"></span><span class="h-3 rounded-sm bg-border"></span><span class="h-3 rounded-sm bg-border"></span><span class="col-span-6 col-start-3 h-3 rounded-sm bg-border"></span></div></div>
<span class="absolute bottom-28 left-0 flex size-14 -translate-x-3 -rotate-12 items-center justify-center rounded-full bg-cta text-caption font-semibold text-cta-foreground">1st</span>
<span class="absolute bottom-24 left-12 flex size-10 rotate-6 items-center justify-center rounded-lg border border-border bg-card shadow-sm"><i data-icon="sparkle" aria-hidden="true" class="size-5 text-primary-text"></i></span>
<span class="absolute bottom-32 left-24 -rotate-3 rounded-sm bg-primary px-2 py-1 font-mono text-caption uppercase text-primary-foreground">Write, don't scroll</span>
</div>
</div>
</section>`,
  },
  {
    id: "hero-printed-matter",
    approved: true,
    type: "hero",
    surface: "landing",
    pattern:
      "A narrow left column like a letterhead, closed by a vertical hairline: a round back-link at the top, the name in two lines at the bottom (the second indented and italic) and an address in mono; the rest is a pile of large printed cards that run off the bottom edge: an upright colored card in front (a round notch at its top, a two-voice message, a small mark, a round dark button), another color peeking above it and a pale postcard with a dashed round stamp tilted behind.",
    gesture: "a pile of large printed cards in different fills, the front one carrying the message",
    fits: { composition: ["asymmetric", "split", "editorial"], imagery: ["tilted-cards", "layered-collage"], typeVoice: ["humanist", "quiet", "bold-display"], decoration: ["soft-shapes", "tinted-panels", "none"], colorStrategy: ["brand-forward", "neutral-with-pops"], rhythm: ["airy", "balanced"] },
    html: `<section data-block-id="b-hero" class="@container overflow-hidden bg-background">
<div class="mx-auto grid max-w-container @3xl:grid-cols-12">
<div class="flex flex-col justify-between gap-16 px-6 py-12 @3xl:col-span-3 @3xl:border-r @3xl:border-border @3xl:py-16">
<a href="#" class="inline-flex items-center gap-3 font-mono text-caption uppercase tracking-widest text-foreground focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-foreground"><span class="flex size-10 items-center justify-center rounded-full border border-border"><i data-icon="chevron-left" aria-hidden="true" class="size-4"></i></span>Back to the shop</a>
<div>
<h1 class="font-heading text-display font-normal leading-none tracking-tight text-foreground">Paper<span class="block pl-10 italic">Ink</span></h1>
<p class="mt-6 font-mono text-caption text-foreground">Est. 1931<br>Riverside Lane 4<br>Bristol</p>
</div>
</div>
<div class="relative min-h-96 @3xl:col-span-9">
<div class="absolute right-6 top-12 h-96 w-3/5 rotate-3 rounded-lg border border-border bg-card p-6 shadow-md @3xl:w-2/5">
<div class="flex justify-end"><span class="flex size-24 items-center justify-center rounded-full border-2 border-dashed border-border text-center font-mono text-caption uppercase leading-tight text-muted-foreground">Official<br>receipt<br>No. 12</span></div>
<div class="mt-16 space-y-5"><span class="block h-px bg-border"></span><span class="block h-px bg-border"></span><span class="block h-px w-2/3 bg-border"></span></div>
</div>
<div class="absolute left-16 top-6 h-96 w-1/2 rounded-lg bg-primary shadow-md @3xl:left-40 @3xl:w-2/5"></div>
<div class="absolute left-6 top-16 h-96 w-3/5 rounded-lg bg-accent p-8 shadow-lg @3xl:left-24 @3xl:w-2/5">
<div class="absolute inset-x-0 top-0 flex justify-center"><span class="size-16 rounded-b-full bg-background"></span></div>
<p class="mt-14 font-heading text-h1 leading-tight text-accent-foreground">For long<span class="block pl-6 italic">letters</span></p>
<i data-icon="mail" aria-hidden="true" class="mx-auto mt-8 block size-8 text-accent-foreground"></i>
<p class="mt-6 text-center font-heading text-h3 leading-tight text-accent-foreground">at<br>Paper<br><span class="italic">Ink</span></p>
<a href="#" aria-label="Open the card shop" class="absolute bottom-6 right-6 flex size-12 items-center justify-center rounded-full bg-foreground text-background focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-foreground"><i data-icon="arrow-right" aria-hidden="true" class="size-5"></i></a>
</div>
</div>
</div>
</section>`,
  },
  {
    id: "hero-color-field-name",
    approved: true,
    type: "hero",
    surface: "landing",
    pattern:
      "The whole hero is a field of the brand color under a faint square grid, with a few tiny pixel-like flowers scattered on it; a mono row across the top (a label on the left, three bold words in the middle, a place on the right), a long empty stretch, a small mono label and link centered, and the name at giant size in italic along the bottom edge, centered and cropped by it.",
    gesture: "a brand-color field with the name at giant size, cropped by the bottom edge",
    fits: { composition: ["editorial", "centered-stage", "asymmetric"], colorStrategy: ["brand-forward", "tonal-monochrome"], typeVoice: ["bold-display", "condensed-caps", "technical-mono"], decoration: ["rules-and-grids", "none"], rhythm: ["airy", "balanced"] },
    html: `<section data-block-id="b-hero" class="@container relative overflow-hidden bg-primary">
<div aria-hidden="true" class="absolute inset-0 grid grid-cols-6 divide-x divide-primary-foreground/10 @3xl:grid-cols-12"><span></span><span></span><span></span><span></span><span></span><span></span><span class="hidden @3xl:block"></span><span class="hidden @3xl:block"></span><span class="hidden @3xl:block"></span><span class="hidden @3xl:block"></span><span class="hidden @3xl:block"></span><span class="hidden @3xl:block"></span></div>
<div aria-hidden="true" class="absolute inset-0 grid grid-rows-6 divide-y divide-primary-foreground/10"><span></span><span></span><span></span><span></span><span></span><span></span></div>
<div aria-hidden="true" class="absolute left-24 top-28 grid size-5 grid-cols-3"><span></span><span class="bg-cta"></span><span></span><span class="bg-cta"></span><span class="bg-background"></span><span class="bg-cta"></span><span></span><span class="bg-cta"></span><span></span></div>
<div aria-hidden="true" class="absolute right-40 top-20 grid size-4 grid-cols-3"><span></span><span class="bg-cta"></span><span></span><span class="bg-cta"></span><span class="bg-background"></span><span class="bg-cta"></span><span></span><span class="bg-cta"></span><span></span></div>
<div aria-hidden="true" class="absolute bottom-44 right-16 grid size-6 grid-cols-3"><span></span><span class="bg-cta"></span><span></span><span class="bg-cta"></span><span class="bg-background"></span><span class="bg-cta"></span><span></span><span class="bg-cta"></span><span></span></div>
<div class="relative mx-auto max-w-container px-6 pt-8">
<div class="grid grid-cols-2 items-center font-mono text-caption uppercase tracking-widest text-primary-foreground @xl:grid-cols-3"><span>Clay school 2026</span><span class="hidden justify-center gap-8 font-bold @xl:flex"><span>Wheel</span><span>Glaze</span><span>Kiln</span></span><span class="text-right">Porto · PT</span></div>
<div class="mt-40 flex flex-col items-center gap-3 text-center">
<p class="font-mono text-caption uppercase tracking-widest text-primary-foreground">Evening wheel classes</p>
<a href="#" class="inline-flex items-center gap-2 border-b border-primary-foreground py-1 font-mono text-caption uppercase tracking-widest text-primary-foreground focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-primary-foreground">Book a wheel<i data-icon="arrow-right" aria-hidden="true" class="size-3.5"></i></a>
</div>
</div>
<div class="relative mt-6 h-16 overflow-hidden @3xl:h-28">
<h1 class="translate-y-2 whitespace-nowrap text-center font-heading text-display font-normal italic leading-none tracking-tight text-primary-foreground @3xl:translate-y-4 @3xl:text-giant">Terracotta</h1>
</div>
</section>`,
  },
  {
    id: "hero-widget-shapes",
    approved: true,
    type: "hero",
    surface: "landing",
    pattern:
      "A heavy heading set one word per line, a large plain promise, two full-width sign-up buttons stacked (brand, then dark), each with its icon in a light square on the left, an «or» rule and a text link; on the right a large, detailed booking widget (its title at heading size; host column with a mark, avatar, event and placeholder lines; a full month with the open days tinted; time slots with one being confirmed) floating over two big geometric shapes in the brand and CTA colors that spill past it.",
    gesture: "a detailed product widget floating over two big color shapes",
    fits: { composition: ["split", "asymmetric"], imagery: ["framed-screens", "layered-collage"], decoration: ["soft-shapes", "gradient-wash", "tinted-panels"], colorStrategy: ["brand-forward", "neutral-with-pops"], typeVoice: ["bold-display", "humanist"], rhythm: ["balanced", "airy"] },
    html: `<section data-block-id="b-hero" class="@container overflow-hidden bg-background py-16 @3xl:py-20">
<div class="mx-auto grid max-w-container items-center gap-12 px-6 @3xl:grid-cols-12">
<div class="@3xl:col-span-5">
<h1 class="font-heading text-display font-bold leading-none tracking-tight text-foreground"><span class="block">Tastings</span><span class="block">booked</span><span class="block">ahead</span></h1>
<p class="mt-8 max-w-md text-h3 font-normal text-muted-foreground">Guests pick a table, a time and a flight. You open the cellar door to a full room.</p>
<div class="mt-10 max-w-sm space-y-3">
<a href="#" class="flex items-center gap-4 rounded-button bg-primary p-2 pr-6 text-body font-semibold text-primary-foreground hover:bg-primary-hover focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-foreground"><span class="flex size-10 items-center justify-center rounded-md bg-background text-primary-text"><i data-icon="calendar" aria-hidden="true" class="size-5"></i></span><span class="grow text-center">Sign up with your calendar</span></a>
<a href="#" class="flex items-center gap-4 rounded-button bg-foreground p-2 pr-6 text-body font-semibold text-background hover:bg-foreground/90 focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-foreground"><span class="flex size-10 items-center justify-center rounded-md bg-background text-foreground"><i data-icon="mail" aria-hidden="true" class="size-5"></i></span><span class="grow text-center">Sign up with your inbox</span></a>
<div class="flex items-center gap-4 text-small uppercase text-muted-foreground"><span class="h-px grow bg-border"></span>or<span class="h-px grow bg-border"></span></div>
<p class="text-small text-muted-foreground"><a href="#" class="font-medium text-primary-text underline underline-offset-4 focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-foreground">Start free with email.</a> No card needed.</p>
</div>
</div>
<div class="relative @3xl:col-span-7">
<span aria-hidden="true" class="absolute right-24 top-0 size-80 rounded-full bg-primary"></span>
<span aria-hidden="true" class="absolute bottom-0 right-0 size-80 rotate-12 rounded-xl bg-cta"></span>
<div class="relative z-10 mb-16 mt-28 rounded-xl border border-border bg-card shadow-lg">
<p class="px-8 pb-6 pt-8 font-heading text-h2 font-semibold text-foreground">Share your tasting page</p>
<div class="grid border-t border-border @xl:grid-cols-12">
<div class="space-y-3 border-b border-border p-5 @xl:col-span-3 @xl:border-b-0 @xl:border-r">
<p class="flex items-center gap-2 text-small font-semibold text-foreground"><span class="size-5 rotate-12 rounded-md bg-primary"></span>Quinta Alta</p>
<img data-placeholder="avatar" alt="Host of the tasting" class="size-10 rounded-full">
<p class="text-small text-muted-foreground">Inés Varela</p>
<p class="text-body font-semibold text-foreground">Cellar flight</p>
<p class="flex items-center gap-2 text-small text-muted-foreground"><i data-icon="calendar" aria-hidden="true" class="size-4"></i>45 min</p>
<span class="block h-2 rounded-full bg-muted"></span>
</div>
<div class="p-5 @xl:col-span-5">
<p class="text-small font-semibold text-foreground">Select a date &amp; time</p>
<p class="mt-3 flex items-center justify-center gap-4 text-small text-foreground"><i data-icon="chevron-left" aria-hidden="true" class="size-4"></i>May 2026<i data-icon="chevron-right" aria-hidden="true" class="size-4"></i></p>
<div class="mt-3 grid grid-cols-7 gap-y-1.5 text-center text-caption tabular-nums text-muted-foreground"><span>M</span><span>T</span><span>W</span><span>T</span><span>F</span><span>S</span><span>S</span><span class="py-1.5">4</span><span class="py-1.5">5</span><span class="rounded-full bg-primary/10 py-1.5 font-semibold text-foreground">6</span><span class="rounded-full bg-primary/10 py-1.5 font-semibold text-foreground">7</span><span class="rounded-full bg-primary/10 py-1.5 font-semibold text-foreground">8</span><span class="py-1.5">9</span><span class="py-1.5">10</span><span class="py-1.5">11</span><span class="py-1.5">12</span><span class="rounded-full bg-primary/10 py-1.5 font-semibold text-foreground">13</span><span class="rounded-full bg-primary/10 py-1.5 font-semibold text-foreground">14</span><span class="rounded-full bg-primary/10 py-1.5 font-semibold text-foreground">15</span><span class="py-1.5">16</span><span class="py-1.5">17</span><span class="py-1.5">18</span><span class="py-1.5">19</span><span class="rounded-full bg-primary/10 py-1.5 font-semibold text-foreground">20</span><span class="rounded-full bg-primary/10 py-1.5 font-semibold text-foreground">21</span><span class="rounded-full bg-primary py-1.5 font-semibold text-primary-foreground">22</span><span class="rounded-full bg-primary/10 py-1.5 font-semibold text-foreground">23</span><span class="py-1.5">24</span><span class="py-1.5">25</span><span class="py-1.5">26</span><span class="rounded-full bg-primary/10 py-1.5 font-semibold text-foreground">27</span><span class="rounded-full bg-primary/10 py-1.5 font-semibold text-foreground">28</span><span class="py-1.5">29</span><span class="py-1.5">30</span><span class="py-1.5">31</span></div>
</div>
<div class="space-y-2 border-t border-border p-5 @xl:col-span-4 @xl:border-l @xl:border-t-0">
<p class="text-small text-muted-foreground">Friday, May 22</p>
<span class="block rounded-button border border-primary py-2.5 text-center text-small font-semibold text-primary-text">17:00</span>
<div class="grid grid-cols-2 gap-2"><span class="rounded-button bg-foreground py-2.5 text-center text-small font-semibold text-background">18:30</span><span class="rounded-button bg-primary py-2.5 text-center text-small font-semibold text-primary-foreground">Confirm</span></div>
<span class="block rounded-button border border-primary py-2.5 text-center text-small font-semibold text-primary-text">20:00</span>
</div>
</div>
</div>
</div>
</div>
</section>`,
  },
  {
    id: "hero-photo-field",
    approved: true,
    type: "hero",
    surface: "landing",
    pattern:
      "A full-bleed photo that stays bright at the top and sinks into the dark at the bottom, everything centered on it: a small light badge, a large heading where one word is italic, a line whose first sentence is bold, one light uppercase button, a wide translucent «ask» bar with a real question being typed, a short line and two small awards flanked by marks.",
    gesture: "a full-bleed photo with a large centered heading, one word in italic",
    fits: { composition: ["centered-stage", "editorial"], typeVoice: ["quiet", "humanist", "bold-display"], imagery: ["layered-collage"], decoration: ["gradient-wash", "none"], colorStrategy: ["high-contrast-cta", "tonal-monochrome"], rhythm: ["airy"] },
    html: `<section data-block-id="b-hero" class="@container relative overflow-hidden bg-foreground">
<img data-placeholder="photo" alt="Morning sky over rows of vegetable beds" class="absolute inset-0 size-full object-cover">
<div aria-hidden="true" class="absolute inset-0 bg-linear-to-b from-foreground/40 via-foreground/50 to-foreground"></div>
<div class="relative mx-auto flex max-w-container flex-col items-center px-6 py-24 text-center @3xl:py-32">
<span class="rounded-badge bg-background px-4 py-1.5 text-small font-medium uppercase tracking-wide text-primary-text">Free for the first season</span>
<h1 class="mt-8 font-heading text-display font-normal leading-none tracking-tight text-background @3xl:text-giant"><span class="italic">Grow</span> your own.</h1>
<p class="mt-8 max-w-lg text-body text-background"><strong class="block font-semibold">Plotwise is your allotment planner.</strong>What to sow, when to water and what to pick, for your soil and your weather, all in one place.</p>
<a href="#" class="mt-8 inline-flex items-center gap-2 rounded-button bg-background px-6 py-3 text-small font-semibold uppercase tracking-wide text-foreground hover:bg-muted focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-background">Get started<i data-icon="arrow-right" aria-hidden="true" class="size-4"></i></a>
<div class="mt-12 flex w-full max-w-2xl items-center justify-between gap-4 rounded-full border border-background/30 bg-background/10 py-2.5 pl-7 pr-2.5 text-left">
<p class="text-h3 font-normal text-background">What can I still sow in Mar<span class="ml-0.5 inline-block h-6 w-px bg-background align-middle"></span></p>
<span class="flex size-12 shrink-0 items-center justify-center rounded-full bg-background/20 text-background"><i data-icon="arrow-up-right" aria-hidden="true" class="size-5"></i></span>
</div>
<p class="mt-8 text-body text-background">Track every bed. Ask anything.</p>
<div class="mt-8 flex flex-wrap justify-center gap-10"><div class="flex items-center gap-3 text-background"><i data-icon="sparkle" aria-hidden="true" class="size-5"></i><div class="text-center"><p class="font-heading text-h3 leading-tight">Garden Guild</p><p class="font-mono text-caption uppercase tracking-widest">Best planner 2025</p></div><i data-icon="sparkle" aria-hidden="true" class="size-5"></i></div><div class="flex items-center gap-3 text-background"><i data-icon="sparkle" aria-hidden="true" class="size-5"></i><div class="text-center"><p class="font-heading text-h3 leading-tight">Soil &amp; Seed</p><p class="font-mono text-caption uppercase tracking-widest">Most useful app 2026</p></div><i data-icon="sparkle" aria-hidden="true" class="size-5"></i></div></div>
</div>
</section>`,
  },
  {
    id: "hero-giant-devices",
    approved: true,
    type: "hero",
    surface: "landing",
    pattern:
      "A vivid gradient field in the brand colors cut by a diagonal edge, a translucent announcement pill, a giant heavy heading over three or four short lines that crosses the cut, a plain promise and an email field fused with its button in one pill; on the right a phone with a real checkout overlapping a dashboard panel (a tinted top bar with a search field, today's figures and a line chart, two small cards) that runs past the edge of the block.",
    gesture: "a giant heading over a diagonal gradient, beside a phone overlapping a dashboard",
    fits: { composition: ["split", "asymmetric"], typeVoice: ["bold-display", "condensed-caps"], imagery: ["layered-collage", "framed-screens", "data-viz-led"], decoration: ["gradient-wash", "soft-shapes", "none"], colorStrategy: ["brand-forward", "high-contrast-cta", "neutral-with-pops"], rhythm: ["balanced", "airy"] },
    html: `<section data-block-id="b-hero" class="@container relative overflow-hidden bg-background pb-16 pt-12 @3xl:pb-24">
<div aria-hidden="true" class="absolute inset-x-0 top-0 h-96 bg-linear-to-br from-accent via-primary to-cta"></div>
<div aria-hidden="true" class="absolute inset-x-0 top-80 h-96 -rotate-6 scale-105 bg-background"></div>
<div class="relative mx-auto grid max-w-container gap-12 px-6 @3xl:grid-cols-12">
<div class="@3xl:col-span-7">
<a href="#" class="inline-flex items-center gap-2 rounded-full bg-foreground/80 px-4 py-2 text-small font-semibold text-background focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-foreground">Spring market · stalls open now<i data-icon="chevron-right" aria-hidden="true" class="size-4"></i></a>
<h1 class="mt-10 font-heading text-display font-black leading-none tracking-tighter text-foreground @3xl:text-giant">Fresh stock for every corner shop</h1>
<p class="mt-10 max-w-xl text-h3 font-normal text-muted-foreground">Order fruit, bread and dairy from farms near you before 10 pm and find it on your shelves at 7.</p>
<div class="mt-10 flex max-w-md items-center gap-2 rounded-full border border-border bg-muted p-1.5">
<label for="hero-giant-email" class="sr-only">Email address</label>
<input id="hero-giant-email" type="email" placeholder="Email address" class="min-w-0 grow bg-transparent px-4 py-2.5 text-body text-foreground">
<button type="button" class="inline-flex shrink-0 items-center gap-1 rounded-full bg-foreground px-5 py-3 text-body font-semibold text-background hover:bg-foreground/90 focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-foreground">Start now<i data-icon="chevron-right" aria-hidden="true" class="size-4"></i></button>
</div>
</div>
<div class="relative h-96 @3xl:col-span-5 @3xl:h-auto">
<div class="absolute left-28 top-8 w-96 overflow-hidden rounded-xl border border-border bg-card shadow-lg">
<div class="flex items-center gap-3 border-b border-border bg-primary/10 px-4 py-3"><span class="size-5 rounded-full bg-primary"></span><span class="font-mono text-caption uppercase tracking-widest text-foreground">Market Hall</span><span class="ml-auto h-6 w-32 rounded-full bg-card"></span></div>
<div class="p-5">
<p class="font-heading text-h3 font-semibold text-foreground">Today</p>
<div class="mt-3 flex justify-end gap-8 text-right"><div><p class="text-caption text-muted-foreground">Orders</p><p class="text-body font-semibold tabular-nums text-foreground">€3,284.50</p></div><div><p class="text-caption text-muted-foreground">Yesterday</p><p class="text-body tabular-nums text-muted-foreground">€2,916.10</p></div></div>
<img data-chart="line" data-values="4,4,6,5,9,12,11,16,15,18" data-labels="06:00,07:00,08:00,09:00,10:00,11:00,12:00,13:00,14:00,Now" data-highlight="9" alt="Orders through the day, highest now" class="mt-3 h-28 w-full">
<div class="mt-4 grid grid-cols-2 gap-3"><div class="rounded-lg border border-border p-3"><p class="text-caption text-muted-foreground">New shops</p><p class="text-body font-semibold tabular-nums text-foreground">37</p><img data-chart="spark" data-values="3,5,4,7,6,9" alt="New shops this week" class="mt-1 h-8 w-24"></div><div class="rounded-lg border border-border p-3"><p class="text-caption text-muted-foreground">On time</p><p class="text-body font-semibold tabular-nums text-foreground">98%</p><img data-chart="spark" data-values="91,94,93,96,97,98" alt="Deliveries on time this week" class="mt-1 h-8 w-24"></div></div>
</div>
</div>
<div class="absolute left-0 top-24 z-10 w-60 rounded-xl border-4 border-foreground bg-card p-4 shadow-lg">
<img data-placeholder="photo" alt="A crate of red apples" class="mx-auto size-16 rounded-lg object-cover">
<p class="mt-2 text-center text-small font-semibold text-foreground">Orchard crate</p>
<p class="text-center text-caption text-muted-foreground">€19 per crate</p>
<span class="mt-3 block rounded-md bg-foreground py-2 text-center text-small font-semibold text-background">Order for 7:00</span>
<p class="mt-3 text-center text-caption text-muted-foreground">or pay on delivery</p>
<p class="mt-2 text-caption text-foreground">Shop email</p><span class="mt-1 block h-7 rounded-md border border-border"></span>
<p class="mt-2 text-caption text-foreground">Card</p><span class="mt-1 block h-7 rounded-md border border-border"></span>
<span class="mt-3 block rounded-md bg-foreground py-2 text-center text-small font-semibold text-background">Pay</span>
</div>
</div>
</div>
</section>`,
  },
];
