// The parts of a landing that ask for something: navigation, pricing, calls to action, FAQ and footer.
import type { LibraryBlock } from "./types";

const FOCUS = "focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-foreground";
const CHECK = `<i data-icon="check" aria-hidden="true" class="mt-0.5 size-4 shrink-0 text-primary-text"></i>`;

export const CONVERSION: LibraryBlock[] = [
  {
    id: "pricing-highlight-checklist",
    approved: true,
    type: "pricing",
    surface: "landing",
    pattern:
      "Three plans where the recommended one is not just colored: it is raised (ring, shadow, a small label) and its price is the largest number. Prices are big numerals with a small unit, features are a check list, the action fills the full width of the card.",
    gesture: "the recommended plan raised and holding the largest price",
    fits: { composition: ["centered-stage", "split", "bento", "editorial"], typeVoice: ["humanist", "bold-display", "quiet"], decoration: ["outlined", "tinted-panels", "soft-shapes", "none"], colorStrategy: ["high-contrast-cta", "brand-forward", "neutral-with-pops"], rhythm: ["airy", "balanced"] },
    html: `<section data-block-id="b-pricing" class="@container bg-background py-16 @3xl:py-24">
<div class="mx-auto max-w-container px-6">
<div class="mx-auto max-w-2xl text-center">
<h2 class="font-heading text-h1 font-semibold tracking-tight text-foreground">Pricing that grows with the garden</h2>
<p class="mt-3 text-body text-muted-foreground">Start small. Add plots when you are ready.</p>
</div>
<div class="mt-12 grid gap-6 @3xl:grid-cols-3 @3xl:items-stretch">
<div class="flex flex-col rounded-card border border-border bg-card p-7">
<h3 class="font-heading text-h3 font-semibold text-foreground">Solo</h3>
<p class="mt-1 text-small text-muted-foreground">For one grower getting started.</p>
<p class="mt-6 flex items-baseline gap-1"><span class="font-heading text-display font-bold tabular-nums tracking-tight text-foreground">$0</span><span class="text-small text-muted-foreground">/month</span></p>
<ul class="mt-6 grow space-y-3 text-small text-foreground"><li class="flex gap-3">${CHECK}1 plot</li><li class="flex gap-3">${CHECK}Sowing calendar</li><li class="flex gap-3">${CHECK}Weekly reminders</li></ul>
<a href="#" class="mt-8 block rounded-button border border-border bg-background px-5 py-3 text-center text-body font-medium text-foreground hover:bg-muted ${FOCUS}">Start free</a>
</div>
<div class="relative flex flex-col rounded-card border border-primary bg-card p-7 shadow-lg ring-2 ring-primary">
<span class="absolute right-6 top-0 -translate-y-3 rounded-badge bg-primary px-3 py-1 text-caption font-medium text-primary-foreground">Most popular</span>
<h3 class="font-heading text-h3 font-semibold text-foreground">Team</h3>
<p class="mt-1 text-small text-muted-foreground">For a shared allotment.</p>
<p class="mt-6 flex items-baseline gap-1"><span class="font-heading text-display font-bold tabular-nums tracking-tight text-foreground">$24</span><span class="text-small text-muted-foreground">/month per plot</span></p>
<ul class="mt-6 grow space-y-3 text-small text-foreground"><li class="flex gap-3">${CHECK}Everything in Solo</li><li class="flex gap-3">${CHECK}Up to 12 members</li><li class="flex gap-3">${CHECK}Shared harvest log</li><li class="flex gap-3">${CHECK}Seed and tool inventory</li></ul>
<a href="#" class="mt-8 block rounded-button bg-primary px-5 py-3 text-center text-body font-medium text-primary-foreground hover:bg-primary-hover ${FOCUS}">Try it for a season</a>
</div>
<div class="flex flex-col rounded-card border border-border bg-card p-7">
<h3 class="font-heading text-h3 font-semibold text-foreground">Business</h3>
<p class="mt-1 text-small text-muted-foreground">For several sites.</p>
<p class="mt-6 flex items-baseline gap-1"><span class="font-heading text-display font-bold tabular-nums tracking-tight text-foreground">$79</span><span class="text-small text-muted-foreground">/month per site</span></p>
<ul class="mt-6 grow space-y-3 text-small text-foreground"><li class="flex gap-3">${CHECK}Everything in Team</li><li class="flex gap-3">${CHECK}Roles and permissions</li><li class="flex gap-3">${CHECK}Reports across sites</li></ul>
<a href="#" class="mt-8 block rounded-button border border-border bg-background px-5 py-3 text-center text-body font-medium text-foreground hover:bg-muted ${FOCUS}">Talk to us</a>
</div>
</div>
</div>
</section>`,
  },
  {
    id: "pricing-inverted-pair",
    approved: true,
    type: "pricing",
    surface: "landing",
    pattern:
      "Two plans side by side, not three: one on the light surface, one inverted (foreground fill, background text) so the choice is a clear contrast, with a thin line of reassurance underneath instead of a feature matrix.",
    gesture: "two plans, one of them inverted",
    fits: { composition: ["split", "asymmetric", "editorial"], typeVoice: ["bold-display", "quiet", "technical-mono"], colorStrategy: ["high-contrast-cta", "neutral-with-pops", "tonal-monochrome"], decoration: ["outlined", "none", "rules-and-grids"], rhythm: ["airy", "balanced"] },
    html: `<section data-block-id="b-pricing" class="@container bg-background py-16 @3xl:py-24">
<div class="mx-auto max-w-5xl px-6">
<h2 class="font-heading text-h1 font-semibold tracking-tight text-foreground">Two ways in. No surprises.</h2>
<div class="mt-10 grid gap-5 @3xl:grid-cols-2">
<div class="rounded-card border border-border bg-card p-8">
<p class="font-mono text-caption uppercase tracking-widest text-muted-foreground">Day pass</p>
<p class="mt-4 font-heading text-display font-bold tabular-nums tracking-tight text-foreground">$12</p>
<p class="text-small text-muted-foreground">per month, billed yearly</p>
<ul class="mt-6 space-y-3 text-body text-foreground"><li class="flex gap-3">${CHECK}Access to the open studio</li><li class="flex gap-3">${CHECK}Shared tools</li><li class="flex gap-3">${CHECK}Beginner workshop</li></ul>
<a href="#" class="mt-8 inline-block rounded-button border border-foreground px-6 py-3 text-body font-medium text-foreground hover:bg-muted ${FOCUS}">Pick a day</a>
</div>
<div class="rounded-card bg-foreground p-8 text-background">
<p class="font-mono text-caption uppercase tracking-widest text-background">Member</p>
<p class="mt-4 font-heading text-display font-bold tabular-nums tracking-tight text-background">$39</p>
<p class="text-small text-background">per month, billed yearly</p>
<ul class="mt-6 space-y-3 text-body text-background"><li class="flex gap-3"><i data-icon="check" aria-hidden="true" class="mt-0.5 size-4 shrink-0 text-background"></i>Open studio, any day</li><li class="flex gap-3"><i data-icon="check" aria-hidden="true" class="mt-0.5 size-4 shrink-0 text-background"></i>Your own storage shelf</li><li class="flex gap-3"><i data-icon="check" aria-hidden="true" class="mt-0.5 size-4 shrink-0 text-background"></i>Two guest passes a month</li></ul>
<a href="#" class="mt-8 inline-block rounded-button bg-background px-6 py-3 text-body font-medium text-foreground hover:bg-muted focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-background">Become a member</a>
</div>
</div>
<p class="mt-6 text-small text-muted-foreground">Cancel anytime · First month refundable · Prices in USD</p>
</div>
</section>`,
  },
  {
    id: "pricing-comparison-table",
    approved: true,
    type: "pricing",
    surface: "landing",
    pattern:
      "A comparison table: plan names and prices in the header cells (the recommended column tinted), feature names in the first column, checks and dashes in the cells, row hairlines. For buyers who compare; dense and honest.",
    gesture: "a comparison table with the recommended column tinted",
    fits: { composition: ["data-dense", "editorial", "split"], typeVoice: ["technical-mono", "quiet", "humanist"], decoration: ["rules-and-grids", "outlined", "none"], rhythm: ["compact", "balanced"] },
    html: `<section data-block-id="b-pricing" class="@container bg-background py-16 @3xl:py-24">
<div class="mx-auto max-w-container px-6">
<h2 class="font-heading text-h1 font-semibold tracking-tight text-foreground">Compare the memberships</h2>
<div class="mt-8 overflow-x-auto">
<table class="w-full min-w-96 text-left text-small">
<caption class="sr-only">Plan comparison</caption>
<thead>
<tr class="border-b border-foreground align-bottom">
<th scope="col" class="py-4 pr-4 font-normal text-muted-foreground">Features</th>
<th scope="col" class="px-4 py-4"><span class="block font-heading text-h3 font-semibold text-foreground">Visitor</span><span class="block font-mono text-body tabular-nums text-muted-foreground">$0</span></th>
<th scope="col" class="bg-primary/10 px-4 py-4"><span class="block font-heading text-h3 font-semibold text-foreground">Regular</span><span class="block font-mono text-body tabular-nums text-foreground">$18</span></th>
<th scope="col" class="px-4 py-4"><span class="block font-heading text-h3 font-semibold text-foreground">Resident</span><span class="block font-mono text-body tabular-nums text-muted-foreground">$48</span></th>
</tr>
</thead>
<tbody class="divide-y divide-border">
<tr><th scope="row" class="py-4 pr-4 font-normal text-foreground">Visits a month</th><td class="px-4 py-4 text-muted-foreground">4</td><td class="bg-primary/10 px-4 py-4 text-foreground">Unlimited</td><td class="px-4 py-4 text-muted-foreground">Unlimited</td></tr>
<tr><th scope="row" class="py-4 pr-4 font-normal text-foreground">Guest passes</th><td class="px-4 py-4 text-muted-foreground">0</td><td class="bg-primary/10 px-4 py-4 text-foreground">2</td><td class="px-4 py-4 text-muted-foreground">6</td></tr>
<tr><th scope="row" class="py-4 pr-4 font-normal text-foreground">Kiln access</th><td class="px-4 py-4 text-muted-foreground">—</td><td class="bg-primary/10 px-4 py-4 text-foreground"><i data-icon="check" aria-hidden="true" class="size-4 text-primary-text"></i><span class="sr-only">Included</span></td><td class="px-4 py-4 text-muted-foreground"><i data-icon="check" aria-hidden="true" class="size-4"></i><span class="sr-only">Included</span></td></tr>
<tr><th scope="row" class="py-4 pr-4 font-normal text-foreground">Private bench</th><td class="px-4 py-4 text-muted-foreground">—</td><td class="bg-primary/10 px-4 py-4 text-foreground">—</td><td class="px-4 py-4 text-muted-foreground"><i data-icon="check" aria-hidden="true" class="size-4"></i><span class="sr-only">Included</span></td></tr>
</tbody>
</table>
</div>
</div>
</section>`,
  },
  {
    id: "navbar-masthead",
    type: "navbar",
    surface: "landing",
    pattern: "A masthead: links on the left, the wordmark centered in heavy uppercase, account and cart on the right, closed by a 2px rule. It reads as a publication, not as an app bar.",
    gesture: "the wordmark centered in heavy uppercase over a 2px rule",
    fits: { composition: ["editorial", "asymmetric", "centered-stage"], typeVoice: ["bold-display", "condensed-caps", "quiet"], decoration: ["rules-and-grids", "none", "outlined"], rhythm: ["airy", "balanced"] },
    html: `<header data-block-id="b-nav" class="@container border-b-2 border-foreground bg-background">
<div class="mx-auto grid max-w-container grid-cols-3 items-center gap-4 px-6 py-4">
<nav aria-label="Main" class="flex gap-5 text-small text-foreground"><a href="#" class="${FOCUS}">Shop</a><a href="#" class="hidden ${FOCUS} @3xl:inline">Journal</a><a href="#" class="hidden ${FOCUS} @3xl:inline">About</a></nav>
<a href="#" class="text-center font-heading text-h2 font-bold uppercase tracking-tight text-foreground ${FOCUS}">Brand</a>
<div class="flex items-center justify-end gap-5 text-small text-foreground"><a href="#" class="hidden ${FOCUS} @3xl:inline">Account</a><a href="#" class="rounded-button border border-foreground px-4 py-2 font-medium ${FOCUS}">Cart · 2</a></div>
</div>
</header>`,
  },
  {
    id: "navbar-inverted-mono",
    type: "navbar",
    surface: "landing",
    pattern: "A solid inverted bar (foreground fill): a mono wordmark with a trailing underscore, small uppercase mono links with wide tracking and an outlined action. Technical and terse.",
    gesture: "a solid inverted bar set in mono",
    fits: { composition: ["data-dense", "asymmetric", "split"], typeVoice: ["technical-mono", "condensed-caps"], decoration: ["outlined", "rules-and-grids", "none"], colorStrategy: ["high-contrast-cta", "tonal-monochrome", "neutral-with-pops"], rhythm: ["compact", "balanced"] },
    html: `<header data-block-id="b-nav" class="@container bg-foreground">
<div class="mx-auto flex max-w-container items-center justify-between gap-6 px-6 py-4">
<a href="#" class="font-mono text-body font-semibold text-background focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-background">brand_</a>
<nav aria-label="Main" class="hidden items-center gap-8 font-mono text-caption uppercase tracking-widest text-background @3xl:flex"><a href="#" class="focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-background">Product</a><a href="#" class="focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-background">Docs</a><a href="#" class="focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-background">Changelog</a><a href="#" class="focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-background">Pricing</a></nav>
<a href="#" class="rounded-button border border-background px-4 py-2 font-mono text-caption uppercase tracking-widest text-background hover:bg-background hover:text-foreground focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-background">Sign in</a>
</div>
</header>`,
  },
  {
    id: "cta-oversized-inverted",
    type: "cta",
    surface: "landing",
    pattern: "An inverted band with the heading at display size in uppercase, taking the whole width, and under it one large light button and an underlined text link. A single sentence, a single decision.",
    gesture: "one display-size uppercase sentence across an inverted band",
    fits: { composition: ["editorial", "centered-stage", "asymmetric"], typeVoice: ["bold-display", "condensed-caps", "technical-mono"], colorStrategy: ["high-contrast-cta", "tonal-monochrome", "neutral-with-pops"], decoration: ["none", "rules-and-grids"], rhythm: ["airy", "balanced"] },
    html: `<section data-block-id="b-cta" class="@container bg-foreground py-20 text-background @3xl:py-28">
<div class="mx-auto max-w-container px-6">
<h2 class="font-heading text-display font-bold uppercase leading-none tracking-tight text-background">Bring your first order tomorrow</h2>
<div class="mt-10 flex flex-wrap items-center gap-6">
<a href="#" class="rounded-button bg-background px-7 py-4 text-body font-semibold text-foreground hover:bg-muted focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-background">Start free</a>
<a href="#" class="inline-flex items-center gap-2 border-b border-background pb-1 text-body font-medium text-background focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-background">Talk to a person<i data-icon="arrow-right" aria-hidden="true" class="size-4"></i></a>
</div>
<p class="mt-8 text-small text-background">Free for the first month · No card · Cancel from your phone</p>
</div>
</section>`,
  },
  {
    id: "cta-tilted-cards",
    type: "cta",
    surface: "landing",
    pattern:
      "A tinted panel with the heading and a short line on the left and, on the right, two cards stacked and slightly rotated in opposite directions: the back one previews what the visitor gets, the front one holds the block's actions (its buttons, or a field when the block asks for one). The tilt adds life; the card holds the point.",
    gesture: "two cards rotated in opposite directions, the front one holding the actions",
    fits: { composition: ["split", "asymmetric", "bento"], imagery: ["tilted-cards", "layered-collage"], decoration: ["tinted-panels", "soft-shapes", "gradient-wash"], typeVoice: ["humanist", "bold-display"], colorStrategy: ["brand-forward", "neutral-with-pops"], rhythm: ["airy", "balanced"] },
    html: `<section data-block-id="b-cta" class="@container bg-background py-16 @3xl:py-24">
<div class="mx-auto max-w-container px-6">
<div class="grid items-center gap-12 overflow-hidden rounded-xl bg-primary/10 p-8 @3xl:grid-cols-12 @3xl:p-14">
<div class="@3xl:col-span-6">
<h2 class="font-heading text-h1 font-semibold tracking-tight text-foreground @3xl:text-display">Your first seed box is on us</h2>
<p class="mt-4 max-w-md text-body text-foreground">Pick six varieties for the season and we post them on Friday, with sowing notes for your plot.</p>
</div>
<div class="relative min-h-64 @3xl:col-span-6">
<div class="absolute inset-x-6 top-2 rotate-3 rounded-card border border-border bg-card p-5 shadow-md"><div class="flex items-center justify-between gap-4"><p class="text-small font-medium text-foreground">First box · ships Friday</p><span class="rounded-badge bg-primary/10 px-2 py-1 text-caption text-foreground">6 varieties</span></div><p class="mt-2 text-small text-muted-foreground">Cherry tomato, sweet basil, runner beans…</p></div>
<div class="absolute inset-x-0 bottom-0 -rotate-2 rounded-card border border-border bg-card p-6 shadow-lg">
<p class="text-small font-medium text-foreground">Two minutes to join · pause any month</p>
<div class="mt-4 flex flex-wrap items-center gap-5"><a href="#" class="rounded-button bg-primary px-6 py-3 text-body font-medium text-primary-foreground hover:bg-primary-hover ${FOCUS}">Claim my box</a><a href="#" class="inline-flex items-center gap-2 py-2.5 text-body font-medium text-foreground underline underline-offset-4 ${FOCUS}">See what is inside<i data-icon="arrow-right" aria-hidden="true" class="size-4"></i></a></div>
</div>
</div>
</div>
</div>
</section>`,
  },
  {
    id: "cta-brand-figure",
    type: "cta",
    surface: "landing",
    pattern:
      "The whole band in the brand color: on the left one giant figure that IS the offer (days free, minutes to start, visits on the house) with its unit under it; on the right, past a vertical hairline, the heading, one line and the actions, the main one the only light shape on the band.",
    gesture: "one giant figure of the offer on a band in the brand color",
    fits: { composition: ["split", "asymmetric", "editorial"], typeVoice: ["humanist", "bold-display", "quiet"], colorStrategy: ["brand-forward", "tonal-monochrome", "high-contrast-cta"], decoration: ["tinted-panels", "soft-shapes", "none"], rhythm: ["airy", "balanced"] },
    html: `<section data-block-id="b-cta" class="@container bg-primary py-20 text-primary-foreground @3xl:py-28">
<div class="mx-auto grid max-w-container items-center gap-10 px-6 @3xl:grid-cols-12 @3xl:gap-12">
<div class="@3xl:col-span-5">
<p class="font-heading text-giant font-black leading-none tracking-tight tabular-nums text-primary-foreground">3</p>
<p class="mt-3 text-h3 font-semibold text-primary-foreground">classes on the house</p>
</div>
<div class="@3xl:col-span-7 @3xl:border-l @3xl:border-primary-foreground/30 @3xl:pl-12">
<h2 class="font-heading text-h1 font-semibold tracking-tight text-primary-foreground">Throw your first pot this week</h2>
<p class="mt-4 max-w-md text-body text-primary-foreground">Clay, aprons and a patient teacher included. Book from your phone and pay only if you stay.</p>
<div class="mt-8 flex flex-wrap items-center gap-6">
<a href="#" class="rounded-button bg-background px-7 py-4 text-body font-semibold text-foreground hover:bg-muted focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-primary-foreground">Book a class</a>
<a href="#" class="inline-flex items-center gap-2 border-b border-primary-foreground pb-1 text-body font-medium text-primary-foreground focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-primary-foreground">See the timetable<i data-icon="arrow-right" aria-hidden="true" class="size-4"></i></a>
</div>
</div>
</div>
</section>`,
  },
  {
    id: "cta-offer-showcase",
    approved: true,
    type: "cta",
    surface: "landing",
    pattern:
      "Two panels side by side: a light card where a giant price is the hook (the brand mark, a tinted offer badge, the figure, what it buys in large muted type, the renewal, an email field and one dark full-width button, small print), and a dark night panel that sells the feeling: a few tiny stars, a sentence in two voices, a mono proof line between marks and a translucent card with a labelled rising chart.",
    gesture: "a giant price as the hook, beside a dark showcase panel",
    fits: { composition: ["split", "bento", "centered-stage"], typeVoice: ["quiet", "humanist", "bold-display"], colorStrategy: ["high-contrast-cta", "neutral-with-pops", "tonal-monochrome"], imagery: ["data-viz-led", "framed-screens"], decoration: ["outlined", "none", "tinted-panels"], rhythm: ["airy", "balanced"] },
    html: `<section data-block-id="b-cta" class="@container bg-muted py-16 @3xl:py-24">
<div class="mx-auto grid max-w-container gap-4 px-6 @3xl:grid-cols-2">
<div class="flex flex-col items-center rounded-xl border border-border bg-card px-8 py-12 text-center">
<img data-asset="logo" alt="Bloom and Stem" class="h-8 w-auto">
<span class="mt-6 rounded-badge bg-primary/10 px-3 py-1 text-small font-medium text-foreground">Spring offer · 95% off</span>
<p class="mt-4 font-heading text-giant font-normal leading-none tracking-tight tabular-nums text-foreground">€1</p>
<h2 class="font-heading text-h1 font-normal tracking-tight text-muted-foreground">for your first box</h2>
<p class="mt-3 text-small text-muted-foreground">Then €24 a month. Skip or cancel any week.</p>
<div class="mt-8 w-full max-w-sm space-y-3 text-left">
<label for="cta-offer-email" class="sr-only">Email</label>
<input id="cta-offer-email" type="email" placeholder="Email" class="w-full rounded-input border border-border bg-background px-4 py-3.5 text-body text-foreground">
<button type="button" class="w-full rounded-button bg-foreground px-6 py-3.5 text-body font-semibold text-background hover:bg-foreground/90 focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-foreground">Send me flowers</button>
</div>
<p class="mt-4 text-small text-muted-foreground">Already a member? <a href="#" class="font-medium text-foreground underline underline-offset-4 focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-foreground">Sign in</a></p>
<p class="mt-6 max-w-sm text-caption text-muted-foreground">New members only. By joining you accept our <a href="#" class="underline underline-offset-2 focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-foreground">terms</a> and <a href="#" class="underline underline-offset-2 focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-foreground">privacy policy</a>.</p>
</div>
<div class="relative flex flex-col items-center justify-center overflow-hidden rounded-xl bg-foreground px-8 py-14 text-center">
<div aria-hidden="true"><span class="absolute left-8 top-10 size-0.5 rounded-full bg-background"></span><span class="absolute left-24 top-36 size-1 rounded-full bg-background"></span><span class="absolute left-64 top-8 size-0.5 rounded-full bg-background"></span><span class="absolute right-10 top-16 size-1 rounded-full bg-background"></span><span class="absolute right-24 top-44 size-0.5 rounded-full bg-background"></span><span class="absolute left-12 bottom-24 size-0.5 rounded-full bg-background"></span><span class="absolute right-16 bottom-12 size-1 rounded-full bg-background"></span><span class="absolute left-40 bottom-10 size-0.5 rounded-full bg-background"></span><span class="absolute bottom-20 right-20 h-px w-20 rotate-12 bg-background/40"></span></div>
<p class="relative font-heading text-h1 font-normal tracking-tight text-background">Fresh every Friday.<span class="block italic">Picked that morning.</span></p>
<p class="relative mt-5 flex items-center gap-3 font-mono text-caption uppercase tracking-widest text-background"><i data-icon="sparkle" aria-hidden="true" class="size-4"></i>4.9 / 5 · 2,300 members<i data-icon="sparkle" aria-hidden="true" class="size-4"></i></p>
<div class="relative mt-10 w-full max-w-sm rounded-xl border border-background/20 bg-background/5 p-5 text-left">
<div class="flex items-center justify-between"><p class="font-mono text-caption uppercase tracking-widest text-background">Stems this season</p><span class="flex size-7 items-center justify-center rounded-md border border-background/40 text-background"><i data-icon="plus" aria-hidden="true" class="size-4"></i></span></div>
<p class="mt-3 font-heading text-h2 tabular-nums text-background">1,840</p>
<p class="flex items-center gap-2 text-small text-background"><span class="size-1.5 rounded-full bg-background"></span>May</p>
<img data-chart="area" data-values="120,140,180,260,420,610,780,900" alt="Stems delivered per week this season" class="mt-3 h-28 w-full">
<div class="mt-2 flex justify-between font-mono text-caption text-background"><span>01</span><span>07</span><span>14</span><span>21</span><span>28</span></div>
</div>
</div>
</div>
</section>`,
  },
  {
    id: "form-console-dark",
    approved: true,
    type: "form",
    surface: "landing",
    pattern:
      "A near-black stage with a single beam of light crossing one side (a thin bright line inside a soft glow), tiny mono annotations in its corners (a status, a version with a mode pill, a terminal-like line) and a vertical rail of mono words on the edge; on the other side a translucent rounded panel holds the whole form: a mono pill label, the title, three round icon buttons, a labelled rule, mono caps field labels over pill fields and one full-width light button.",
    gesture: "a dark stage with one beam of light, framed by mono annotations in its corners",
    fits: { composition: ["split", "asymmetric", "data-dense"], typeVoice: ["technical-mono", "condensed-caps", "bold-display"], colorStrategy: ["high-contrast-cta", "tonal-monochrome"], decoration: ["gradient-wash", "outlined", "rules-and-grids"], rhythm: ["airy", "balanced"] },
    html: `<section data-block-id="b-form" class="@container relative overflow-hidden bg-foreground py-24 @3xl:py-32">
<div aria-hidden="true" class="absolute inset-y-0 left-0 hidden w-1/2 @3xl:block"><span class="absolute left-24 top-0 h-full w-64 rotate-12 bg-radial from-background/25 via-transparent to-transparent"></span><span class="absolute left-56 top-0 h-full w-1 rotate-12 bg-linear-to-b from-transparent via-background to-transparent"></span></div>
<p class="absolute left-6 top-6 font-mono text-caption uppercase tracking-widest text-background">Obs.core // on-line</p>
<p class="absolute right-6 top-6 flex items-center gap-4 font-mono text-caption uppercase tracking-widest text-background">v03.01<span class="rounded-full border border-background/30 px-2 py-0.5">Night</span></p>
<p class="absolute bottom-6 left-6 font-mono text-caption uppercase tracking-widest text-background">uplink_ready_</p>
<div aria-hidden="true" class="absolute bottom-24 right-6 top-24 hidden flex-col items-center gap-3 font-mono text-caption uppercase text-background @3xl:flex"><span>Idle</span><span class="w-px grow bg-background/20"></span><span>Dome</span><span class="w-px grow bg-background/20"></span><span>02</span></div>
<div class="relative mx-auto grid max-w-container px-6 @3xl:grid-cols-12">
<div class="rounded-xl border border-background/10 bg-background/5 p-8 shadow-lg @3xl:col-span-5 @3xl:col-start-7">
<span class="rounded-full border border-background/30 px-2.5 py-1 font-mono text-caption uppercase tracking-widest text-background">Night.pass</span>
<h2 class="mt-5 font-heading text-h2 font-semibold text-background">Reserve the dome</h2>
<p class="mt-1 text-small text-background">Telescope time, or a guided night under the sky.</p>
<div class="mt-6 grid grid-cols-3 gap-3"><button type="button" aria-label="Continue with your member card" class="flex items-center justify-center rounded-full border border-background/20 bg-background/10 py-3 text-background hover:bg-background/20 focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-background"><i data-icon="user" aria-hidden="true" class="size-5"></i></button><button type="button" aria-label="Continue with email" class="flex items-center justify-center rounded-full border border-background/20 bg-background/10 py-3 text-background hover:bg-background/20 focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-background"><i data-icon="mail" aria-hidden="true" class="size-5"></i></button><button type="button" aria-label="Pick from the calendar" class="flex items-center justify-center rounded-full border border-background/20 bg-background/10 py-3 text-background hover:bg-background/20 focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-background"><i data-icon="calendar" aria-hidden="true" class="size-5"></i></button></div>
<div class="mt-6 flex items-center gap-3 font-mono text-caption uppercase tracking-widest text-background"><span class="h-px grow bg-background/20"></span>Or by hand<span class="h-px grow bg-background/20"></span></div>
<div class="mt-5 space-y-4"><div><label for="dome-name" class="font-mono text-caption uppercase tracking-widest text-background">Name</label><input id="dome-name" type="text" placeholder="Your name" class="mt-2 w-full rounded-full border border-background/20 bg-background/10 px-5 py-3 text-body text-background placeholder-background"></div><div><label for="dome-night" class="font-mono text-caption uppercase tracking-widest text-background">Night</label><input id="dome-night" type="text" placeholder="Friday 22 May" class="mt-2 w-full rounded-full border border-background/20 bg-background/10 px-5 py-3 text-body text-background placeholder-background"></div></div>
<button type="button" class="mt-8 flex w-full items-center justify-center gap-2 rounded-full bg-background px-6 py-4 font-mono text-small font-semibold uppercase tracking-widest text-foreground hover:bg-muted focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-background">Request the night<i data-icon="arrow-right" aria-hidden="true" class="size-4"></i></button>
</div>
</div>
</section>`,
  },
  {
    id: "faq-big-questions",
    type: "faq",
    surface: "landing",
    pattern: "The questions ARE the design: each one at heading size on the left half of a ruled row, its answer in muted body text on the right. A heavy rule opens the list. No accordion chrome, no plus icons, everything visible at once.",
    gesture: "every question at heading size in ruled rows, all answers visible",
    fits: { composition: ["editorial", "split", "asymmetric"], typeVoice: ["bold-display", "quiet", "humanist"], decoration: ["rules-and-grids", "none"], rhythm: ["airy", "balanced"] },
    html: `<section data-block-id="b-faq" class="@container bg-background py-16 @3xl:py-24">
<div class="mx-auto max-w-container px-6">
<h2 class="font-heading text-h1 font-semibold tracking-tight text-foreground">Before you ask</h2>
<dl class="mt-10 border-t-2 border-foreground">
<div class="grid gap-3 border-b border-border py-8 @3xl:grid-cols-12"><dt class="font-heading text-h2 font-semibold tracking-tight text-foreground @3xl:col-span-6">Can I come once before joining?</dt><dd class="text-body text-muted-foreground @3xl:col-span-5 @3xl:col-start-8">Yes. The first visit is free and nobody will ask for a card.</dd></div>
<div class="grid gap-3 border-b border-border py-8 @3xl:grid-cols-12"><dt class="font-heading text-h2 font-semibold tracking-tight text-foreground @3xl:col-span-6">What if I need to stop?</dt><dd class="text-body text-muted-foreground @3xl:col-span-5 @3xl:col-start-8">Cancel from your phone, in two taps. The month you already paid stays yours.</dd></div>
<div class="grid gap-3 border-b border-border py-8 @3xl:grid-cols-12"><dt class="font-heading text-h2 font-semibold tracking-tight text-foreground @3xl:col-span-6">Do I need my own tools?</dt><dd class="text-body text-muted-foreground @3xl:col-span-5 @3xl:col-start-8">No. Everything is here. If something is missing, tell us and we will get it.</dd></div>
</dl>
</div>
</section>`,
  },
  {
    id: "footer-giant-wordmark",
    type: "footer",
    surface: "landing",
    pattern: "Three small link columns and the legal line sit at the top; the wordmark takes the bottom of the block at display size in heavy uppercase, cropped to one line. The footer ends the page with a signature, not with a list.",
    gesture: "the wordmark at display size as the last line of the page",
    fits: { composition: ["editorial", "centered-stage", "asymmetric"], typeVoice: ["bold-display", "condensed-caps", "quiet"], decoration: ["none", "rules-and-grids"], rhythm: ["airy", "balanced"] },
    html: `<footer data-block-id="b-footer" class="@container overflow-hidden bg-background pt-14">
<div class="mx-auto max-w-container px-6">
<div class="grid gap-10 @3xl:grid-cols-12">
<p class="max-w-xs text-body text-foreground @3xl:col-span-5">A shared workshop for people who like making things.</p>
<nav aria-label="Footer" class="grid grid-cols-3 gap-8 text-small @3xl:col-span-7">
<ul class="space-y-3 text-muted-foreground"><li class="font-medium text-foreground">Visit</li><li><a href="#" class="hover:text-foreground ${FOCUS}">Opening hours</a></li><li><a href="#" class="hover:text-foreground ${FOCUS}">Find us</a></li></ul>
<ul class="space-y-3 text-muted-foreground"><li class="font-medium text-foreground">Join</li><li><a href="#" class="hover:text-foreground ${FOCUS}">Memberships</a></li><li><a href="#" class="hover:text-foreground ${FOCUS}">Workshops</a></li></ul>
<ul class="space-y-3 text-muted-foreground"><li class="font-medium text-foreground">Studio</li><li><a href="#" class="hover:text-foreground ${FOCUS}">About</a></li><li><a href="#" class="hover:text-foreground ${FOCUS}">Privacy</a></li></ul>
</nav>
</div>
</div>
<p class="mt-14 overflow-hidden whitespace-nowrap px-6 text-center font-heading text-giant font-bold uppercase leading-none tracking-tighter text-foreground">Brand</p>
</footer>`,
  },
  {
    id: "footer-inverted-signup",
    type: "footer",
    surface: "landing",
    pattern: "A fully inverted footer: a large sentence with an email field on the left, three link columns on the right, and a hairline above the legal row. It closes the page on the same dark note as the call to action.",
    gesture: "the whole footer inverted, opening with a large sentence",
    fits: { composition: ["split", "asymmetric", "data-dense"], colorStrategy: ["high-contrast-cta", "tonal-monochrome", "neutral-with-pops"], typeVoice: ["bold-display", "technical-mono", "humanist"], decoration: ["none", "outlined", "rules-and-grids"], rhythm: ["balanced", "compact", "airy"] },
    html: `<footer data-block-id="b-footer" class="@container bg-foreground py-14 text-background">
<div class="mx-auto max-w-container px-6">
<div class="grid gap-12 @3xl:grid-cols-12">
<div class="@3xl:col-span-6">
<p class="font-heading text-h1 font-semibold leading-tight tracking-tight text-background">Letters from the workshop, once a month.</p>
<div class="mt-6 flex max-w-md flex-col gap-3 @sm:flex-row"><label for="foot-email" class="sr-only">Email</label><input id="foot-email" type="email" placeholder="Your email" class="grow rounded-input border border-background bg-foreground px-4 py-3 text-body text-background focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-background"><button type="button" class="rounded-button bg-background px-5 py-3 text-body font-medium text-foreground focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-background">Join</button></div>
</div>
<nav aria-label="Footer" class="grid grid-cols-3 gap-8 text-small @3xl:col-span-6">
<ul class="space-y-3"><li class="font-medium text-background">Visit</li><li><a href="#" class="text-background focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-background">Hours</a></li><li><a href="#" class="text-background focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-background">Find us</a></li></ul>
<ul class="space-y-3"><li class="font-medium text-background">Join</li><li><a href="#" class="text-background focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-background">Memberships</a></li><li><a href="#" class="text-background focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-background">Workshops</a></li></ul>
<ul class="space-y-3"><li class="font-medium text-background">Studio</li><li><a href="#" class="text-background focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-background">About</a></li><li><a href="#" class="text-background focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-background">Privacy</a></li></ul>
</nav>
</div>
<div class="mt-14 flex flex-col gap-2 border-t border-background/30 pt-6 text-caption text-background @3xl:flex-row @3xl:justify-between"><p>© 2026 Brand</p><p>Open every day except Mondays</p></div>
</div>
</footer>`,
  },
];
