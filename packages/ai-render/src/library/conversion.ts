// The parts of a landing that ask for something: navigation, pricing, calls to action, FAQ and footer.
import type { LibraryBlock } from "./types";

const FOCUS = "focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-foreground";
const CHECK = `<i data-icon="check" aria-hidden="true" class="mt-0.5 size-4 shrink-0 text-primary-text"></i>`;

export const CONVERSION: LibraryBlock[] = [
  {
    id: "navbar-bar-hairline",
    type: "navbar",
    surface: "landing",
    pattern: "A plain bar: wordmark left, four links centered, a text link and one filled action right, closed by a hairline. The quietest possible frame.",
    fits: { composition: ["editorial", "asymmetric", "split", "centered-stage", "data-dense"], decoration: ["rules-and-grids", "none", "outlined"], typeVoice: ["quiet", "humanist", "technical-mono"] },
    html: `<header data-block-id="b-nav" class="@container border-b border-border bg-background">
<div class="mx-auto flex max-w-container items-center justify-between gap-6 px-6 py-4">
<a href="#" class="font-heading text-h3 font-semibold tracking-tight text-foreground ${FOCUS}">Brand</a>
<nav aria-label="Main" class="hidden items-center gap-8 @3xl:flex"><a href="#" class="text-small text-muted-foreground hover:text-foreground ${FOCUS}">Product</a><a href="#" class="text-small text-muted-foreground hover:text-foreground ${FOCUS}">Pricing</a><a href="#" class="text-small text-muted-foreground hover:text-foreground ${FOCUS}">Customers</a><a href="#" class="text-small text-muted-foreground hover:text-foreground ${FOCUS}">Docs</a></nav>
<div class="flex items-center gap-4"><a href="#" class="hidden text-small font-medium text-foreground @3xl:inline ${FOCUS}">Sign in</a><a href="#" class="rounded-button bg-primary px-4 py-2.5 text-small font-medium text-primary-foreground hover:bg-primary-hover ${FOCUS}">Get started</a></div>
</div>
</header>`,
  },
  {
    id: "navbar-floating-pill",
    type: "navbar",
    surface: "landing",
    pattern: "A floating rounded pill with a border and a soft shadow, inset from the edges: wordmark inside on the left, links in the middle and the action as a small filled pill on the right.",
    fits: { composition: ["centered-stage", "bento", "split"], decoration: ["soft-shapes", "tinted-panels", "gradient-wash"], typeVoice: ["humanist", "bold-display"], rhythm: ["airy", "balanced"] },
    html: `<header data-block-id="b-nav" class="@container bg-background px-4 pt-4">
<div class="mx-auto flex max-w-4xl items-center justify-between gap-4 rounded-full border border-border bg-card px-5 py-2.5 shadow-md">
<a href="#" class="font-heading text-body font-semibold text-foreground ${FOCUS}">Brand</a>
<nav aria-label="Main" class="hidden items-center gap-6 @3xl:flex"><a href="#" class="text-small text-muted-foreground hover:text-foreground ${FOCUS}">Features</a><a href="#" class="text-small text-muted-foreground hover:text-foreground ${FOCUS}">Pricing</a><a href="#" class="text-small text-muted-foreground hover:text-foreground ${FOCUS}">Stories</a></nav>
<a href="#" class="rounded-full bg-primary px-4 py-2 text-small font-medium text-primary-foreground hover:bg-primary-hover ${FOCUS}">Try it free</a>
</div>
</header>`,
  },
  {
    id: "pricing-highlight-checklist",
    type: "pricing",
    surface: "landing",
    pattern:
      "Three plans where the recommended one is not just colored: it is raised (ring, shadow, a small label) and its price is the largest number. Prices are big numerals with a small unit, features are a check list, the action fills the full width of the card.",
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
    type: "pricing",
    surface: "landing",
    pattern:
      "Two plans side by side, not three: one on the light surface, one inverted (foreground fill, background text) so the choice is a clear contrast, with a thin line of reassurance underneath instead of a feature matrix.",
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
    type: "pricing",
    surface: "landing",
    pattern:
      "A comparison table: plan names and prices in the header cells (the recommended column tinted), feature names in the first column, checks and dashes in the cells, row hairlines. For buyers who compare; dense and honest.",
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
    id: "cta-band-solid",
    type: "cta",
    surface: "landing",
    pattern:
      "A full-bleed band in the primary color: the heading and one sentence on the left, a light primary action and a text link on the right, aligned on the same baseline. Short and unmissable; no decoration.",
    fits: { composition: ["asymmetric", "split", "editorial", "data-dense"], colorStrategy: ["brand-forward", "high-contrast-cta"], decoration: ["none", "gradient-wash", "tinted-panels"], typeVoice: ["bold-display", "quiet", "humanist"], rhythm: ["balanced", "compact", "airy"] },
    html: `<section data-block-id="b-cta" class="@container bg-primary py-14 text-primary-foreground @3xl:py-16">
<div class="mx-auto flex max-w-container flex-col gap-8 px-6 @3xl:flex-row @3xl:items-center @3xl:justify-between">
<div class="max-w-xl">
<h2 class="font-heading text-h1 font-semibold tracking-tight text-primary-foreground">The first session is on us</h2>
<p class="mt-2 text-body text-primary-foreground">Come and try it. No card needed, and nothing to cancel.</p>
</div>
<div class="flex flex-wrap items-center gap-4">
<a href="#" class="rounded-button bg-primary-foreground px-6 py-3 text-body font-medium text-primary hover:bg-primary-foreground-hover focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-primary-foreground">Reserve a seat</a>
<a href="#" class="inline-flex items-center gap-2 text-body font-medium text-primary-foreground focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-primary-foreground">See the schedule<i data-icon="arrow-right" aria-hidden="true" class="size-4"></i></a>
</div>
</div>
</section>`,
  },
  {
    id: "cta-email-capture-card",
    type: "cta",
    surface: "landing",
    pattern:
      "One centered, bordered card on a tinted surface: a short heading, one line, and a single-row email field with its button joined to it. Reassurance in small text underneath. The smallest possible conversion form.",
    fits: { composition: ["centered-stage", "bento", "split"], decoration: ["tinted-panels", "soft-shapes", "outlined"], typeVoice: ["humanist", "quiet"], colorStrategy: ["neutral-with-pops", "brand-forward"], rhythm: ["airy", "balanced"] },
    html: `<section data-block-id="b-cta" class="@container bg-background py-16 @3xl:py-24">
<div class="mx-auto max-w-3xl px-6">
<div class="rounded-card border border-border bg-primary/10 p-8 text-center @3xl:p-12">
<h2 class="font-heading text-h1 font-semibold tracking-tight text-foreground">Get the first dispatch free</h2>
<p class="mx-auto mt-3 max-w-md text-body text-foreground">One short email a week with what the neighbors are growing. Unsubscribe in one click.</p>
<div class="mx-auto mt-8 flex max-w-md flex-col gap-3 @sm:flex-row">
<label for="cta-email" class="sr-only">Email</label>
<input id="cta-email" type="email" placeholder="Your email" class="grow rounded-input border border-border bg-background px-4 py-3 text-body text-foreground ${FOCUS}">
<button type="button" class="rounded-button bg-primary px-6 py-3 text-body font-medium text-primary-foreground hover:bg-primary-hover ${FOCUS}">Subscribe</button>
</div>
<p class="mt-4 text-caption text-foreground">No spam. 4,200 gardeners read it.</p>
</div>
</div>
</section>`,
  },
  {
    id: "faq-two-column-divided",
    type: "faq",
    surface: "landing",
    pattern:
      "The heading and a line of help on the left (a third of the width); on the right, questions as a divided list with the question in medium weight and the answer in muted text right under it. No accordion chrome, everything visible.",
    fits: { composition: ["split", "editorial", "asymmetric"], typeVoice: ["quiet", "humanist", "technical-mono"], decoration: ["rules-and-grids", "none"], rhythm: ["airy", "balanced", "compact"] },
    html: `<section data-block-id="b-faq" class="@container bg-background py-16 @3xl:py-24">
<div class="mx-auto grid max-w-container gap-10 px-6 @3xl:grid-cols-12">
<div class="@3xl:col-span-4">
<h2 class="font-heading text-h1 font-semibold tracking-tight text-foreground">Good questions</h2>
<p class="mt-3 text-body text-muted-foreground">Cannot find yours? <a href="#" class="font-medium text-primary-text underline underline-offset-4 ${FOCUS}">Write to us</a>.</p>
</div>
<dl class="divide-y divide-border border-y border-border @3xl:col-span-8">
<div class="py-6"><dt class="text-body font-medium text-foreground">Can I come once before joining?</dt><dd class="mt-2 text-body text-muted-foreground">Yes. The first visit is free and nobody will ask for a card.</dd></div>
<div class="py-6"><dt class="text-body font-medium text-foreground">What happens to my things if I leave?</dt><dd class="mt-2 text-body text-muted-foreground">You can pick them up any day, and we keep them safe for 30 days after you go.</dd></div>
<div class="py-6"><dt class="text-body font-medium text-foreground">Do I need to bring my own tools?</dt><dd class="mt-2 text-body text-muted-foreground">No. Everything is here. If something is missing, tell us and we will get it.</dd></div>
</dl>
</div>
</section>`,
  },
  {
    id: "footer-columns-brand",
    type: "footer",
    surface: "landing",
    pattern: "The wordmark and a one-line description on the left, three short link columns on the right with small uppercase headings, and a hairline above a bottom row with the legal line and two small links.",
    fits: { composition: ["editorial", "asymmetric", "split", "data-dense", "centered-stage"], decoration: ["rules-and-grids", "none", "outlined"], typeVoice: ["quiet", "humanist", "technical-mono"], rhythm: ["airy", "balanced", "compact"] },
    html: `<footer data-block-id="b-footer" class="@container border-t border-border bg-background py-12">
<div class="mx-auto max-w-container px-6">
<div class="grid gap-10 @3xl:grid-cols-12">
<div class="@3xl:col-span-5"><p class="font-heading text-h3 font-semibold tracking-tight text-foreground">Brand</p><p class="mt-2 max-w-xs text-small text-muted-foreground">A shared workshop for people who like making things.</p></div>
<div class="grid grid-cols-3 gap-8 @3xl:col-span-7">
<nav aria-label="Product"><p class="text-caption font-medium uppercase tracking-widest text-foreground">Product</p><ul class="mt-4 space-y-3 text-small text-muted-foreground"><li><a href="#" class="hover:text-foreground ${FOCUS}">Features</a></li><li><a href="#" class="hover:text-foreground ${FOCUS}">Pricing</a></li><li><a href="#" class="hover:text-foreground ${FOCUS}">Schedule</a></li></ul></nav>
<nav aria-label="Company"><p class="text-caption font-medium uppercase tracking-widest text-foreground">Company</p><ul class="mt-4 space-y-3 text-small text-muted-foreground"><li><a href="#" class="hover:text-foreground ${FOCUS}">About</a></li><li><a href="#" class="hover:text-foreground ${FOCUS}">Careers</a></li><li><a href="#" class="hover:text-foreground ${FOCUS}">Contact</a></li></ul></nav>
<nav aria-label="Legal"><p class="text-caption font-medium uppercase tracking-widest text-foreground">Legal</p><ul class="mt-4 space-y-3 text-small text-muted-foreground"><li><a href="#" class="hover:text-foreground ${FOCUS}">Privacy</a></li><li><a href="#" class="hover:text-foreground ${FOCUS}">Terms</a></li></ul></nav>
</div>
</div>
<div class="mt-12 flex flex-col gap-3 border-t border-border pt-6 text-caption text-muted-foreground @3xl:flex-row @3xl:items-center @3xl:justify-between"><p>© 2026 Brand. All rights reserved.</p><p>Open every day except Mondays.</p></div>
</div>
</footer>`,
  },
  {
    id: "footer-minimal-row",
    type: "footer",
    surface: "landing",
    pattern: "A single row: the wordmark, five tiny links evenly spaced and the legal line aligned to the right. Nothing else.",
    fits: { composition: ["centered-stage", "split", "bento"], decoration: ["none", "soft-shapes", "tinted-panels"], typeVoice: ["humanist", "quiet"], rhythm: ["airy", "compact"] },
    html: `<footer data-block-id="b-footer" class="@container bg-muted py-8">
<div class="mx-auto flex max-w-container flex-col items-start gap-5 px-6 @3xl:flex-row @3xl:items-center @3xl:justify-between">
<p class="font-heading text-body font-semibold text-foreground">Brand</p>
<nav aria-label="Footer" class="flex flex-wrap gap-x-6 gap-y-2 text-small text-muted-foreground"><a href="#" class="hover:text-foreground ${FOCUS}">Product</a><a href="#" class="hover:text-foreground ${FOCUS}">Pricing</a><a href="#" class="hover:text-foreground ${FOCUS}">Blog</a><a href="#" class="hover:text-foreground ${FOCUS}">Privacy</a><a href="#" class="hover:text-foreground ${FOCUS}">Contact</a></nav>
<p class="text-caption text-muted-foreground">© 2026 Brand</p>
</div>
</footer>`,
  },
];
