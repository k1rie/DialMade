// Social proof: testimonials, logos and stats. Names are fictional; the model replaces every line.
import type { LibraryBlock } from "./types";

export const PROOF: LibraryBlock[] = [
  {
    id: "testimonials-pull-quote",
    approved: true,
    type: "testimonials",
    surface: "landing",
    pattern:
      "One large pull quote instead of a grid of cards: a hairline above, the quote set at heading size, then a small avatar with name and role, and a quiet row of two or three other short quotes underneath separated by vertical hairlines.",
    fits: { composition: ["editorial", "centered-stage", "asymmetric"], typeVoice: ["quiet", "humanist", "bold-display"], decoration: ["rules-and-grids", "none"], rhythm: ["airy", "balanced"] },
    html: `<section data-block-id="b-proof" class="@container bg-background py-16 @3xl:py-24">
<div class="mx-auto max-w-container px-6">
<div class="border-t border-foreground pt-10">
<blockquote class="max-w-4xl font-heading text-h1 font-medium leading-tight tracking-tight text-foreground @3xl:text-display">“We stopped chasing people for answers. The week plans itself and I finally have my evenings back.”</blockquote>
<div class="mt-8 flex items-center gap-4">
<img data-placeholder="avatar" alt="" class="size-12 rounded-full">
<div><p class="text-body font-medium text-foreground">Maya Ortega</p><p class="text-small text-muted-foreground">Head brewer, Ortega &amp; Daughters</p></div>
</div>
</div>
<div class="mt-12 grid gap-6 border-t border-border pt-8 @3xl:grid-cols-3 @3xl:divide-x @3xl:divide-border">
<p class="text-body text-muted-foreground @3xl:pr-8">“We were running in one afternoon.” <span class="block pt-2 text-small font-medium text-foreground">Jonas, taproom manager</span></p>
<p class="text-body text-muted-foreground @3xl:px-8">“Visitors keep saying how easy it was.” <span class="block pt-2 text-small font-medium text-foreground">Priya, tour guide</span></p>
<p class="text-body text-muted-foreground @3xl:pl-8">“Empty tables went from weekly to rare.” <span class="block pt-2 text-small font-medium text-foreground">Tomás, restaurateur</span></p>
</div>
</div>
</section>`,
  },
  {
    id: "testimonials-tinted-trio",
    approved: true,
    type: "testimonials",
    surface: "landing",
    pattern:
      "Three quote panels, each on its own soft tint (primary, accent, muted) and at different heights, with the quote large and the person at the bottom. Warmth comes from the color blocking, not from decoration.",
    fits: { composition: ["bento", "asymmetric", "centered-stage"], decoration: ["tinted-panels", "soft-shapes", "gradient-wash"], typeVoice: ["humanist", "quiet"], colorStrategy: ["brand-forward", "neutral-with-pops"], imagery: ["layered-collage", "tilted-cards"], rhythm: ["airy", "balanced"] },
    html: `<section data-block-id="b-proof" class="@container bg-background py-16 @3xl:py-24">
<div class="mx-auto max-w-container px-6">
<h2 class="max-w-2xl font-heading text-h1 font-semibold tracking-tight text-foreground">People who stopped doing it the hard way</h2>
<div class="mt-10 grid gap-4 @3xl:grid-cols-3 @3xl:items-start">
<figure class="flex min-h-72 flex-col justify-between rounded-card bg-primary/10 p-7">
<blockquote class="font-heading text-h3 font-medium text-foreground">“I used to spend Sundays on the rota. Now I spend them with my kids.”</blockquote>
<figcaption class="mt-8 flex items-center gap-3"><img data-placeholder="avatar" alt="" class="size-10 rounded-full"><span><span class="block text-small font-medium text-foreground">Lucía Vega</span><span class="block text-caption text-foreground">Midwife, Vega House</span></span></figcaption>
</figure>
<figure class="flex min-h-80 flex-col justify-between rounded-card bg-accent/20 p-7 @3xl:mt-8">
<blockquote class="font-heading text-h3 font-medium text-foreground">“It is like having a colleague who never forgets a thing.”</blockquote>
<figcaption class="mt-8 flex items-center gap-3"><img data-placeholder="avatar" alt="" class="size-10 rounded-full"><span><span class="block text-small font-medium text-foreground">Omar Haddad</span><span class="block text-caption text-muted-foreground">Potter, Haddad Ceramics</span></span></figcaption>
</figure>
<figure class="flex min-h-72 flex-col justify-between rounded-card bg-muted p-7">
<blockquote class="font-heading text-h3 font-medium text-foreground">“The first thing the whole crew actually uses.”</blockquote>
<figcaption class="mt-8 flex items-center gap-3"><img data-placeholder="avatar" alt="" class="size-10 rounded-full"><span><span class="block text-small font-medium text-foreground">Ana Ribeiro</span><span class="block text-caption text-muted-foreground">Workshop lead</span></span></figcaption>
</figure>
</div>
</div>
</section>`,
  },
  {
    id: "testimonials-score-and-quotes",
    approved: true,
    type: "testimonials",
    surface: "landing",
    pattern:
      "A big rating numeral with its caption on the left (the proof as a number), and two short quotes stacked on the right in bordered rows with avatar, name and a one-line result in bold.",
    fits: { composition: ["split", "asymmetric", "data-dense"], typeVoice: ["bold-display", "technical-mono", "humanist"], decoration: ["outlined", "rules-and-grids"], imagery: ["data-viz-led", "icon-led"], rhythm: ["balanced", "compact"] },
    html: `<section data-block-id="b-proof" class="@container bg-background py-16 @3xl:py-24">
<div class="mx-auto grid max-w-container gap-10 px-6 @3xl:grid-cols-12 @3xl:items-center">
<div class="@3xl:col-span-5">
<p class="font-heading text-display font-bold tabular-nums tracking-tight text-foreground">4.9<span class="text-h2 text-muted-foreground">/5</span></p>
<p class="mt-3 text-body text-muted-foreground">Average rating from 1,800+ reviews, and 9 out of 10 owners keep it after the first season.</p>
</div>
<div class="space-y-4 @3xl:col-span-7">
<figure class="rounded-card border border-border bg-card p-6">
<p class="text-small font-semibold text-primary-text">Fewer last-minute gaps</p>
<blockquote class="mt-2 text-body text-foreground">“The reminders alone paid for it in the first week.”</blockquote>
<figcaption class="mt-4 flex items-center gap-3"><img data-placeholder="avatar" alt="" class="size-8 rounded-full"><span class="text-small text-muted-foreground">Sofía Marín · Owner, Casa Sol</span></figcaption>
</figure>
<figure class="rounded-card border border-border bg-card p-6">
<p class="text-small font-semibold text-primary-text">Six hours back every week</p>
<blockquote class="mt-2 text-body text-foreground">“What I used to do by hand is simply done by Monday morning.”</blockquote>
<figcaption class="mt-4 flex items-center gap-3"><img data-placeholder="avatar" alt="" class="size-8 rounded-full"><span class="text-small text-muted-foreground">Dev Patel · Site manager</span></figcaption>
</figure>
</div>
</div>
</section>`,
  },
  {
    id: "logos-wordmark-row",
    type: "logos",
    surface: "landing",
    pattern:
      "A quiet row: one small caption line and five fictional wordmarks set in the heading font in muted text, evenly spaced and separated by vertical hairlines. Never colored logos, never a wall of badges.",
    fits: { composition: ["editorial", "centered-stage", "asymmetric"], typeVoice: ["quiet", "humanist", "technical-mono"], decoration: ["rules-and-grids", "none", "outlined"], rhythm: ["airy", "balanced", "compact"] },
    html: `<section data-block-id="b-logos" class="@container bg-background py-10">
<div class="mx-auto max-w-container px-6">
<p class="text-center text-caption uppercase tracking-widest text-muted-foreground">Trusted by</p>
<ul class="mt-6 grid grid-cols-2 gap-y-6 @3xl:grid-cols-5 @3xl:divide-x @3xl:divide-border">
<li class="text-center font-heading text-h3 font-semibold tracking-tight text-muted-foreground">Alderline</li>
<li class="text-center font-heading text-h3 font-semibold tracking-tight text-muted-foreground">Fenwick</li>
<li class="text-center font-heading text-h3 font-semibold tracking-tight text-muted-foreground">Marlow &amp; Co</li>
<li class="text-center font-heading text-h3 font-semibold tracking-tight text-muted-foreground">Tidewater</li>
<li class="col-span-2 text-center font-heading text-h3 font-semibold tracking-tight text-muted-foreground @3xl:col-span-1">Hollin</li>
</ul>
</div>
</section>`,
  },
  {
    id: "stats-numeral-band",
    // A landing «stats» strip is a `kpis` block on a landing screen.
    type: "kpis",
    surface: "landing",
    pattern:
      "A full-width tonal band with four huge numerals separated by vertical hairlines, each with a small caption above it. The numbers are the content; no icons, no cards.",
    fits: { composition: ["data-dense", "editorial", "asymmetric", "centered-stage"], typeVoice: ["bold-display", "technical-mono", "condensed-caps"], decoration: ["tinted-panels", "rules-and-grids", "gradient-wash"], colorStrategy: ["tonal-monochrome", "brand-forward", "high-contrast-cta"], rhythm: ["airy", "balanced", "compact"] },
    html: `<section data-block-id="b-stats" class="@container bg-primary py-14 text-primary-foreground @3xl:py-20">
<div class="mx-auto max-w-container px-6">
<dl class="grid grid-cols-2 gap-y-10 @3xl:grid-cols-4 @3xl:divide-x @3xl:divide-primary-foreground/20">
<div class="@3xl:px-8 @3xl:first:pl-0"><dt class="text-caption uppercase tracking-widest text-primary-foreground">Meals served a week</dt><dd class="mt-3 font-heading text-display font-bold tabular-nums tracking-tight">48k</dd></div>
<div class="@3xl:px-8"><dt class="text-caption uppercase tracking-widest text-primary-foreground">Kitchens</dt><dd class="mt-3 font-heading text-display font-bold tabular-nums tracking-tight">620</dd></div>
<div class="@3xl:px-8"><dt class="text-caption uppercase tracking-widest text-primary-foreground">Waste avoided</dt><dd class="mt-3 font-heading text-display font-bold tabular-nums tracking-tight">31%</dd></div>
<div class="@3xl:px-8"><dt class="text-caption uppercase tracking-widest text-primary-foreground">Cities</dt><dd class="mt-3 font-heading text-display font-bold tabular-nums tracking-tight">14</dd></div>
</dl>
</div>
</section>`,
  },
];
