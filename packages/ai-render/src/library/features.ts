// Feature-section patterns. Round two (2026-10-10): the first batch read as «AI template» (equal bordered cards, small
// type, even weight). Every entry here has ONE bold gesture: a statement set at display size, an expanded item beside
// a big panel, numerals at heading size, color-blocked cells, or a fully inverted band.
import type { LibraryBlock } from "./types";

const LINK = "focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-foreground";

export const FEATURES: LibraryBlock[] = [
  {
    id: "features-statement-two-tone",
    type: "features",
    surface: "landing",
    pattern:
      "The section is one sentence set at display size, in two tones: the claim in foreground, the explanation in muted. Under a heavy rule, three short columns open with a big mono numeral. No cards, no icons; the type does the persuading.",
    gesture: "one display-size sentence in two tones, then numbered columns under a heavy rule",
    fits: { composition: ["editorial", "centered-stage", "asymmetric"], typeVoice: ["bold-display", "quiet", "humanist", "technical-mono"], decoration: ["rules-and-grids", "none"], imagery: ["icon-led"], rhythm: ["airy", "balanced"] },
    html: `<section data-block-id="b-features" class="@container bg-background py-20 @3xl:py-32">
<div class="mx-auto max-w-container px-6">
<p class="font-mono text-caption uppercase tracking-widest text-muted-foreground">Why it works</p>
<p class="mt-6 max-w-5xl font-heading text-h1 font-medium leading-tight tracking-tight text-foreground @3xl:text-display">One quiet place for every order and every pickup. <span class="text-muted-foreground">No chasing messages, no double entries and no Sunday-night spreadsheets: the week simply lines up.</span></p>
<dl class="mt-16 grid gap-10 border-t-2 border-foreground pt-8 @3xl:grid-cols-3">
<div><dt class="font-mono text-h1 font-semibold tabular-nums text-foreground">01</dt><dd class="mt-4 text-body font-medium text-foreground">Orders arrive sorted by day and by oven.<span class="mt-1 block text-small font-normal text-muted-foreground">Nothing to copy from a chat into a notebook.</span></dd></div>
<div><dt class="font-mono text-h1 font-semibold tabular-nums text-foreground">02</dt><dd class="mt-4 text-body font-medium text-foreground">Prep lists write themselves.<span class="mt-1 block text-small font-normal text-muted-foreground">Quantities add up per recipe, per morning.</span></dd></div>
<div><dt class="font-mono text-h1 font-semibold tabular-nums text-foreground">03</dt><dd class="mt-4 text-body font-medium text-foreground">Customers hear from you first.<span class="mt-1 block text-small font-normal text-muted-foreground">A message when it is ready, with the time to collect.</span></dd></div>
</dl>
</div>
</section>`,
  },
  {
    id: "features-expanded-list-panel",
    type: "features",
    surface: "landing",
    pattern:
      "An asymmetric 5/7 split: on the left a heading and a vertical list where ONE item is open (accent rule on its left edge, its text and a link visible) and the others are only titles; on the right one big tinted panel with a believable piece of the interface.",
    gesture: "one open item in a list of titles, beside one big tinted panel with the interface",
    fits: { composition: ["split", "asymmetric", "editorial"], typeVoice: ["humanist", "quiet", "bold-display"], decoration: ["tinted-panels", "rules-and-grids", "soft-shapes"], imagery: ["framed-screens", "layered-collage"], rhythm: ["airy", "balanced"] },
    html: `<section data-block-id="b-features" class="@container bg-background py-16 @3xl:py-24">
<div class="mx-auto grid max-w-container gap-12 px-6 @3xl:grid-cols-12 @3xl:items-center">
<div class="@3xl:col-span-5">
<h2 class="font-heading text-h1 font-semibold tracking-tight text-foreground">What a small kitchen needs, and nothing it does not</h2>
<ul class="mt-10 divide-y divide-border border-y border-border">
<li class="border-l-2 border-primary py-6 pl-5"><h3 class="font-heading text-h3 font-semibold text-foreground">Plan the week</h3><p class="mt-2 text-body text-muted-foreground">Standing orders repeat on their own. Add the one-offs and the plan is ready by Sunday.</p><a href="#" class="mt-3 inline-flex items-center gap-1 text-small font-medium text-foreground underline underline-offset-4 ${LINK}">See the planner<i data-icon="arrow-right" aria-hidden="true" class="size-3.5"></i></a></li>
<li class="py-5 pl-5"><h3 class="font-heading text-h3 font-medium text-muted-foreground">Batch and label</h3></li>
<li class="py-5 pl-5"><h3 class="font-heading text-h3 font-medium text-muted-foreground">Hand over and get paid</h3></li>
</ul>
</div>
<div class="@3xl:col-span-7">
<div class="flex min-h-96 items-center justify-center rounded-card bg-primary/10 p-6 @3xl:p-10">
<div class="w-full max-w-md rounded-card border border-border bg-card p-5 shadow-lg">
<div class="flex items-center justify-between"><p class="font-heading text-h3 font-semibold text-foreground">Week 41</p><span class="rounded-badge bg-muted px-2 py-1 text-caption text-foreground">12 standing</span></div>
<div class="mt-5 grid grid-cols-5 gap-2 text-center text-caption text-muted-foreground"><span>Mon</span><span>Tue</span><span>Wed</span><span>Thu</span><span>Fri</span></div>
<div class="mt-2 grid grid-cols-5 gap-2">
<span class="rounded-badge bg-primary/10 px-1 py-3 text-center text-small font-medium text-foreground">48</span><span class="rounded-badge bg-primary/10 px-1 py-3 text-center text-small font-medium text-foreground">52</span><span class="rounded-badge bg-primary px-1 py-3 text-center text-small font-semibold text-primary-foreground">64</span><span class="rounded-badge bg-primary/10 px-1 py-3 text-center text-small font-medium text-foreground">41</span><span class="rounded-badge bg-muted px-1 py-3 text-center text-small font-medium text-foreground">30</span>
</div>
<p class="mt-4 text-small text-foreground">Wednesday is the busiest day: the second oven is booked from 05:00.</p>
</div>
</div>
</div>
</div>
</section>`,
  },
  {
    id: "features-oversized-rows",
    type: "features",
    surface: "landing",
    pattern:
      "Full-width rows under a heavy rule: a numeral at display size on the left, the feature title at heading size in the middle and its explanation on the right. The scale jump between number, title and text is the whole design; no containers.",
    gesture: "display-size numerals opening full-width ruled rows",
    fits: { composition: ["editorial", "asymmetric", "data-dense"], typeVoice: ["bold-display", "condensed-caps", "technical-mono"], decoration: ["rules-and-grids", "none", "outlined"], imagery: ["icon-led"], rhythm: ["airy", "balanced"] },
    html: `<section data-block-id="b-features" class="@container bg-background py-16 @3xl:py-24">
<div class="mx-auto max-w-container px-6">
<h2 class="max-w-2xl font-heading text-h1 font-semibold tracking-tight text-foreground">Three promises we keep every season</h2>
<ol class="mt-12 border-t-2 border-foreground">
<li class="grid gap-3 border-b border-border py-8 @3xl:grid-cols-12 @3xl:items-baseline"><span class="font-heading text-display font-bold tabular-nums leading-none tracking-tight text-foreground @3xl:col-span-3">01</span><h3 class="font-heading text-h1 font-semibold tracking-tight text-foreground @3xl:col-span-5">Walks you can finish</h3><p class="text-body text-muted-foreground @3xl:col-span-4">Every route lists its length, its climb and where the shade is. No surprises at kilometer nine.</p></li>
<li class="grid gap-3 border-b border-border py-8 @3xl:grid-cols-12 @3xl:items-baseline"><span class="font-heading text-display font-bold tabular-nums leading-none tracking-tight text-foreground @3xl:col-span-3">02</span><h3 class="font-heading text-h1 font-semibold tracking-tight text-foreground @3xl:col-span-5">Small groups, always</h3><p class="text-body text-muted-foreground @3xl:col-span-4">Never more than eight people, so you hear the guide and the guide hears you.</p></li>
<li class="grid gap-3 border-b border-border py-8 @3xl:grid-cols-12 @3xl:items-baseline"><span class="font-heading text-display font-bold tabular-nums leading-none tracking-tight text-foreground @3xl:col-span-3">03</span><h3 class="font-heading text-h1 font-semibold tracking-tight text-foreground @3xl:col-span-5">Rain is on us</h3><p class="text-body text-muted-foreground @3xl:col-span-4">If the weather turns, you move to another day or get every cent back. No forms.</p></li>
</ol>
</div>
</section>`,
  },
  {
    id: "features-color-blocks",
    type: "features",
    surface: "landing",
    pattern:
      "A bento made of color blocks instead of bordered cards: one cell filled with the primary color carrying a huge numeral, one inverted (foreground fill), one muted holding a small list and one outlined holding an annotated chart. Different spans and heights; contrast between cells is the composition.",
    gesture: "cells of different sizes and fills (primary, inverted, muted), never equal cards",
    fits: { composition: ["bento", "asymmetric", "data-dense"], decoration: ["tinted-panels", "outlined", "gradient-wash"], imagery: ["data-viz-led", "layered-collage"], colorStrategy: ["brand-forward", "high-contrast-cta", "neutral-with-pops"], typeVoice: ["bold-display", "humanist"], rhythm: ["balanced", "compact"] },
    html: `<section data-block-id="b-features" class="@container bg-background py-16 @3xl:py-24">
<div class="mx-auto max-w-container px-6">
<h2 class="max-w-3xl font-heading text-h1 font-semibold tracking-tight text-foreground">Built around the three hours that decide your day</h2>
<div class="mt-10 grid gap-4 @3xl:grid-cols-12">
<div class="flex min-h-64 flex-col justify-between rounded-card bg-primary p-7 text-primary-foreground @3xl:col-span-7">
<p class="text-small font-medium text-primary-foreground">Setup</p>
<div><p class="font-heading text-display font-bold tabular-nums leading-none tracking-tight text-primary-foreground">12 min</p><p class="mt-3 max-w-sm text-body text-primary-foreground">From the first sign-in to your first scheduled run, on a laptop, with no training.</p></div>
</div>
<div class="flex min-h-64 flex-col justify-between rounded-card bg-foreground p-7 text-background @3xl:col-span-5">
<p class="text-small font-medium text-background">Every morning</p>
<ul class="divide-y divide-background/30 text-body text-background"><li class="flex justify-between py-3"><span>06:00</span><span>Check the inbox</span></li><li class="flex justify-between py-3"><span>06:10</span><span>Approve the day</span></li><li class="flex justify-between py-3"><span>06:15</span><span>Done</span></li></ul>
</div>
<div class="rounded-card bg-muted p-7 @3xl:col-span-5">
<h3 class="font-heading text-h3 font-semibold text-foreground">What needs you</h3>
<ul class="mt-4 space-y-3 text-small text-foreground"><li class="flex items-center gap-3"><span class="size-2 rounded-full bg-primary"></span>Two deliveries are one hour late</li><li class="flex items-center gap-3"><span class="size-2 rounded-full bg-primary"></span>A supplier changed a price</li><li class="flex items-center gap-3"><span class="size-2 rounded-full bg-border"></span>Everything else is handled</li></ul>
</div>
<div class="rounded-card border border-border bg-card p-7 @3xl:col-span-7">
<div class="flex items-baseline justify-between"><h3 class="font-heading text-h3 font-semibold text-foreground">Deliveries on time</h3><p class="font-heading text-h2 font-semibold tabular-nums text-foreground">96%</p></div>
<img data-chart="bar" data-values="82,85,88,84,90,93,91,96" data-highlight="7" alt="Deliveries on time, last eight weeks" class="mt-4 h-28 w-full">
</div>
</div>
</div>
</section>`,
  },
  {
    id: "features-inverted-band",
    type: "features",
    surface: "landing",
    pattern:
      "The whole section flips: a foreground-filled band with a large heading on the left, and three columns of single big figures each with a one-line caption. It interrupts the page rhythm on purpose, so the features read as the moment the page turns serious.",
    gesture: "the whole section inverted, carried by big single figures",
    fits: { composition: ["centered-stage", "asymmetric", "split", "data-dense"], colorStrategy: ["high-contrast-cta", "tonal-monochrome", "neutral-with-pops"], typeVoice: ["bold-display", "technical-mono", "quiet"], decoration: ["none", "outlined", "rules-and-grids"], rhythm: ["airy", "balanced"] },
    html: `<section data-block-id="b-features" class="@container bg-foreground py-20 text-background @3xl:py-28">
<div class="mx-auto max-w-container px-6">
<div class="grid gap-8 @3xl:grid-cols-12 @3xl:items-end">
<h2 class="font-heading text-h1 font-semibold leading-tight tracking-tight text-background @3xl:col-span-7 @3xl:text-display">Less to remember. More done by lunch.</h2>
<p class="text-body text-background @3xl:col-span-5">Three things we measured across 600 kitchens in their first month.</p>
</div>
<dl class="mt-16 grid gap-10 border-t border-background/30 pt-10 @3xl:grid-cols-3 @3xl:divide-x @3xl:divide-background/30">
<div class="@3xl:pr-8"><dd class="font-heading text-display font-bold tabular-nums leading-none tracking-tight text-background">9 h</dd><dt class="mt-3 text-body text-background">saved on paperwork every week</dt></div>
<div class="@3xl:px-8"><dd class="font-heading text-display font-bold tabular-nums leading-none tracking-tight text-background">−31%</dd><dt class="mt-3 text-body text-background">food thrown away</dt></div>
<div class="@3xl:pl-8"><dd class="font-heading text-display font-bold tabular-nums leading-none tracking-tight text-background">4.8</dd><dt class="mt-3 text-body text-background">average rating from customers</dt></div>
</dl>
</div>
</section>`,
  },
];
