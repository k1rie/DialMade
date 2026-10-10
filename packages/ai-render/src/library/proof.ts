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
    id: "logos-ruled-grid",
    type: "logos",
    surface: "landing",
    pattern: "Wordmarks as a ruled grid: a heavy rule above and below, hairlines between cells, each name set large in a different weight or case so it reads as a typographic specimen rather than a row of badges.",
    fits: { composition: ["editorial", "asymmetric", "data-dense"], typeVoice: ["bold-display", "condensed-caps", "quiet"], decoration: ["rules-and-grids", "outlined", "none"], rhythm: ["airy", "balanced", "compact"] },
    html: `<section data-block-id="b-logos" class="@container bg-background py-12">
<div class="mx-auto max-w-container px-6">
<p class="font-mono text-caption uppercase tracking-widest text-muted-foreground">In good company</p>
<ul class="mt-5 grid grid-cols-2 divide-x divide-y divide-border border-y-2 border-foreground @3xl:grid-cols-4 @3xl:divide-y-0">
<li class="px-6 py-8 font-heading text-h2 font-bold uppercase tracking-tight text-foreground">Alderline</li>
<li class="px-6 py-8 font-heading text-h2 font-light italic tracking-tight text-foreground">Fenwick &amp; Co</li>
<li class="px-6 py-8 font-heading text-h2 font-semibold tracking-tighter text-foreground">marlow</li>
<li class="px-6 py-8 font-heading text-h2 font-medium uppercase tracking-widest text-foreground">Hollin</li>
</ul>
</div>
</section>`,
  },
  {
    id: "stats-single-giant",
    // A landing «stats» strip is a `kpis` block on a landing screen.
    type: "kpis",
    surface: "landing",
    pattern: "One giant number at display size on a primary-colored field, with its caption, and three small supporting figures stacked on the right under hairlines. One figure to remember and three to back it up, instead of four equal numbers.",
    fits: { composition: ["asymmetric", "split", "editorial", "data-dense"], typeVoice: ["bold-display", "technical-mono"], colorStrategy: ["brand-forward", "high-contrast-cta"], decoration: ["tinted-panels", "none", "rules-and-grids"], rhythm: ["balanced", "airy"] },
    html: `<section data-block-id="b-stats" class="@container bg-primary py-16 text-primary-foreground @3xl:py-24">
<div class="mx-auto grid max-w-container items-end gap-12 px-6 @3xl:grid-cols-12">
<div class="@3xl:col-span-7">
<p class="font-heading text-giant font-bold tabular-nums leading-none tracking-tighter text-primary-foreground">3 in 4</p>
<p class="mt-4 max-w-md text-body text-primary-foreground">people who try a first session come back within the month.</p>
</div>
<dl class="divide-y divide-primary-foreground/30 border-y border-primary-foreground/30 @3xl:col-span-5">
<div class="flex items-baseline justify-between py-4"><dt class="text-body text-primary-foreground">Sessions a week</dt><dd class="font-heading text-h2 font-semibold tabular-nums text-primary-foreground">140</dd></div>
<div class="flex items-baseline justify-between py-4"><dt class="text-body text-primary-foreground">Instructors</dt><dd class="font-heading text-h2 font-semibold tabular-nums text-primary-foreground">18</dd></div>
<div class="flex items-baseline justify-between py-4"><dt class="text-body text-primary-foreground">Years open</dt><dd class="font-heading text-h2 font-semibold tabular-nums text-primary-foreground">11</dd></div>
</dl>
</div>
</section>`,
  },
];
