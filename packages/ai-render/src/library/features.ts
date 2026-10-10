// Feature-section patterns. The default to beat is «three equal cards with an icon in a circle»: these vary scale,
// rhythm and the way the product is shown.
import type { LibraryBlock } from "./types";

const LINK = "focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-foreground";

export const FEATURES: LibraryBlock[] = [
  {
    id: "features-intro-mock-links",
    type: "features",
    surface: "landing",
    pattern:
      "A two-line heading on the left and its explanation on the right, then ONE wide product panel as the proof, and under it a row of three short capabilities separated by hairlines, each ending in a text link with an arrow.",
    fits: { composition: ["editorial", "asymmetric", "split"], typeVoice: ["quiet", "humanist", "bold-display"], decoration: ["rules-and-grids", "outlined", "none"], imagery: ["framed-screens", "data-viz-led"], rhythm: ["airy", "balanced"] },
    html: `<section data-block-id="b-features" class="@container bg-background py-16 @3xl:py-24">
<div class="mx-auto max-w-container px-6">
<div class="grid gap-6 @3xl:grid-cols-12 @3xl:items-end">
<h2 class="font-heading text-h1 font-semibold tracking-tight text-foreground @3xl:col-span-7">One inbox for everything<br>that needs a decision</h2>
<p class="text-body text-muted-foreground @3xl:col-span-5">Requests from email, chat and forms arrive already sorted, labeled and routed to whoever owns them.</p>
</div>
<div class="mt-12 overflow-hidden rounded-card border border-border bg-card shadow-lg">
<div class="flex items-center gap-2 border-b border-border px-4 py-3">
<span class="size-2.5 rounded-full bg-border"></span><span class="size-2.5 rounded-full bg-border"></span><span class="size-2.5 rounded-full bg-border"></span>
<span class="ml-3 text-caption text-muted-foreground">Inbox · 12 open</span>
</div>
<ul class="divide-y divide-border">
<li class="flex items-center gap-4 px-5 py-4"><span class="size-2 rounded-full bg-primary"></span><div class="min-w-0 grow"><p class="truncate text-body font-medium text-foreground">Refund request from a returning customer</p><p class="truncate text-small text-muted-foreground">Routed to Billing · labeled «Refund» · reply drafted</p></div><span class="rounded-badge bg-primary/10 px-2 py-1 text-caption text-foreground">Billing</span></li>
<li class="flex items-center gap-4 px-5 py-4"><span class="size-2 rounded-full bg-border"></span><div class="min-w-0 grow"><p class="truncate text-body font-medium text-foreground">Question about the annual plan</p><p class="truncate text-small text-muted-foreground">Routed to Sales · waiting on you since 9:40</p></div><span class="rounded-badge bg-muted px-2 py-1 text-caption text-foreground">Sales</span></li>
<li class="flex items-center gap-4 px-5 py-4"><span class="size-2 rounded-full bg-border"></span><div class="min-w-0 grow"><p class="truncate text-body font-medium text-foreground">Bug report: export stops at 80%</p><p class="truncate text-small text-muted-foreground">Routed to Engineering · linked to 3 similar reports</p></div><span class="rounded-badge bg-muted px-2 py-1 text-caption text-foreground">Support</span></li>
</ul>
</div>
<div class="mt-10 grid gap-8 border-t border-border pt-8 @3xl:grid-cols-3 @3xl:divide-x @3xl:divide-border">
<div class="@3xl:pr-8"><h3 class="font-heading text-h3 font-semibold text-foreground">Sorted on arrival</h3><p class="mt-2 text-small text-muted-foreground">Every message is read, labeled and given an owner.</p><a href="#" class="mt-3 inline-flex items-center gap-1 text-small font-medium text-primary-text ${LINK}">How routing works<i data-icon="arrow-right" aria-hidden="true" class="size-3.5"></i></a></div>
<div class="@3xl:px-8"><h3 class="font-heading text-h3 font-semibold text-foreground">Replies in your voice</h3><p class="mt-2 text-small text-muted-foreground">Drafts that follow your past answers. You approve in one key.</p><a href="#" class="mt-3 inline-flex items-center gap-1 text-small font-medium text-primary-text ${LINK}">See a draft<i data-icon="arrow-right" aria-hidden="true" class="size-3.5"></i></a></div>
<div class="@3xl:pl-8"><h3 class="font-heading text-h3 font-semibold text-foreground">Nothing falls through</h3><p class="mt-2 text-small text-muted-foreground">Waiting items resurface before they become late.</p><a href="#" class="mt-3 inline-flex items-center gap-1 text-small font-medium text-primary-text ${LINK}">About reminders<i data-icon="arrow-right" aria-hidden="true" class="size-3.5"></i></a></div>
</div>
</div>
</section>`,
  },
  {
    id: "features-hairline-index",
    type: "features",
    surface: "landing",
    pattern:
      "A section label and heading above three columns that are only separated by vertical hairlines. Each column opens with a small mono index (01, 02, 03), then a title and two lines of text. No cards, no fills, no icons: structure comes from rules and numbers.",
    fits: { composition: ["editorial", "asymmetric", "data-dense"], typeVoice: ["technical-mono", "quiet", "condensed-caps", "bold-display"], decoration: ["rules-and-grids", "none", "outlined"], imagery: ["icon-led"], rhythm: ["airy", "balanced", "compact"] },
    html: `<section data-block-id="b-features" class="@container bg-background py-16 @3xl:py-24">
<div class="mx-auto max-w-container px-6">
<p class="font-mono text-caption uppercase tracking-widest text-muted-foreground">What you get</p>
<h2 class="mt-3 max-w-2xl font-heading text-h1 font-semibold tracking-tight text-foreground">Three things, done properly</h2>
<div class="mt-12 grid border-t border-foreground @3xl:grid-cols-3 @3xl:divide-x @3xl:divide-border">
<div class="border-b border-border py-8 @3xl:border-b-0 @3xl:pr-8"><p class="font-mono text-caption text-primary-text">01</p><h3 class="mt-6 font-heading text-h3 font-semibold text-foreground">Booked by the client</h3><p class="mt-3 text-body text-muted-foreground">A public page with your real availability. No back-and-forth, no double bookings.</p></div>
<div class="border-b border-border py-8 @3xl:border-b-0 @3xl:px-8"><p class="font-mono text-caption text-primary-text">02</p><h3 class="mt-6 font-heading text-h3 font-semibold text-foreground">Reminded, then paid</h3><p class="mt-3 text-body text-muted-foreground">A message the day before and a deposit at booking. No-shows drop to almost none.</p></div>
<div class="py-8 @3xl:pl-8"><p class="font-mono text-caption text-primary-text">03</p><h3 class="mt-6 font-heading text-h3 font-semibold text-foreground">Remembered next time</h3><p class="mt-3 text-body text-muted-foreground">Preferences, notes and history stay with the client, ready before they sit down.</p></div>
</div>
</div>
</section>`,
  },
  {
    id: "features-bento-mixed",
    type: "features",
    surface: "landing",
    pattern:
      "A bento grid with different spans: one large cell (7 columns) carrying a chart, one tall cell (5) carrying a list, and three small cells below. Every cell is title top-left, one sentence, then its own small visual. Scale contrast replaces the usual row of equal cards.",
    fits: { composition: ["bento", "data-dense", "asymmetric"], imagery: ["data-viz-led", "framed-screens", "icon-led"], decoration: ["tinted-panels", "outlined", "soft-shapes"], typeVoice: ["humanist", "technical-mono", "quiet"], rhythm: ["balanced", "compact"] },
    html: `<section data-block-id="b-features" class="@container bg-background py-16 @3xl:py-24">
<div class="mx-auto max-w-container px-6">
<h2 class="max-w-2xl font-heading text-h1 font-semibold tracking-tight text-foreground">Everything you need to see the whole picture</h2>
<div class="mt-10 grid gap-4 @3xl:grid-cols-12">
<div class="rounded-card border border-border bg-card p-6 @3xl:col-span-7">
<h3 class="font-heading text-h3 font-semibold text-foreground">Trends, not snapshots</h3>
<p class="mt-1 text-small text-muted-foreground">Twelve weeks of income against spending, updated as it happens.</p>
<img data-chart="bar" data-values="14,18,12,22,19,26,24,30,27,33,31,38;10,12,11,15,13,17,16,19,18,21,20,23" alt="Income and spending, last twelve weeks" class="mt-6 h-40 w-full">
</div>
<div class="rounded-card border border-border bg-primary/10 p-6 @3xl:col-span-5">
<h3 class="font-heading text-h3 font-semibold text-foreground">Alerts that matter</h3>
<p class="mt-1 text-small text-foreground">Only what needs you, once.</p>
<ul class="mt-5 space-y-3">
<li class="flex items-center gap-3 rounded-card bg-card px-4 py-3 text-small text-foreground"><i data-icon="alert-triangle" aria-hidden="true" class="size-4 text-warning"></i>Rent leaves on Friday</li>
<li class="flex items-center gap-3 rounded-card bg-card px-4 py-3 text-small text-foreground"><i data-icon="check-circle" aria-hidden="true" class="size-4 text-success"></i>Invoice #1042 was paid</li>
<li class="flex items-center gap-3 rounded-card bg-card px-4 py-3 text-small text-foreground"><i data-icon="bell" aria-hidden="true" class="size-4 text-primary-text"></i>Two invoices go overdue</li>
</ul>
</div>
<div class="rounded-card border border-border bg-card p-6 @3xl:col-span-4"><p class="font-mono text-h1 font-semibold tabular-nums text-foreground">5 min</p><h3 class="mt-2 font-heading text-h3 font-semibold text-foreground">To connect</h3><p class="mt-1 text-small text-muted-foreground">Read-only access to your bank. Nothing moves without you.</p></div>
<div class="rounded-card border border-border bg-card p-6 @3xl:col-span-4"><p class="font-mono text-h1 font-semibold tabular-nums text-foreground">98%</p><h3 class="mt-2 font-heading text-h3 font-semibold text-foreground">Matched automatically</h3><p class="mt-1 text-small text-muted-foreground">Payments find their invoice by themselves.</p></div>
<div class="rounded-card border border-border bg-card p-6 @3xl:col-span-4"><p class="font-mono text-h1 font-semibold tabular-nums text-foreground">24/7</p><h3 class="mt-2 font-heading text-h3 font-semibold text-foreground">Nothing to babysit</h3><p class="mt-1 text-small text-muted-foreground">It keeps watching so you do not have to.</p></div>
</div>
</div>
</section>`,
  },
  {
    id: "features-numbered-rows",
    type: "features",
    surface: "landing",
    pattern:
      "A divided list instead of cards: each row has a large index on the left, the title and a sentence in the middle, and a quiet icon or arrow on the right. Generous row height, hairlines between rows, a sticky-feeling heading column on the left on wide boxes.",
    fits: { composition: ["editorial", "split", "asymmetric"], typeVoice: ["quiet", "humanist", "bold-display"], decoration: ["rules-and-grids", "none"], imagery: ["icon-led"], rhythm: ["airy", "balanced"] },
    html: `<section data-block-id="b-features" class="@container bg-background py-16 @3xl:py-24">
<div class="mx-auto grid max-w-container gap-10 px-6 @3xl:grid-cols-12">
<div class="@3xl:col-span-4">
<p class="text-caption font-medium uppercase tracking-widest text-primary-text">How it works</p>
<h2 class="mt-3 font-heading text-h1 font-semibold tracking-tight text-foreground">From first visit to repeat client</h2>
<p class="mt-4 text-body text-muted-foreground">Three steps you set up once and never touch again.</p>
</div>
<ol class="divide-y divide-border border-y border-border @3xl:col-span-8">
<li class="flex items-start gap-6 py-7"><span class="w-10 shrink-0 font-heading text-h2 font-semibold tabular-nums text-muted-foreground">01</span><div class="grow"><h3 class="font-heading text-h3 font-semibold text-foreground">They find a time</h3><p class="mt-1 text-body text-muted-foreground">Your page shows only the slots you can really take.</p></div><i data-icon="calendar" aria-hidden="true" class="mt-1 size-5 shrink-0 text-muted-foreground"></i></li>
<li class="flex items-start gap-6 py-7"><span class="w-10 shrink-0 font-heading text-h2 font-semibold tabular-nums text-muted-foreground">02</span><div class="grow"><h3 class="font-heading text-h3 font-semibold text-foreground">They get a reminder</h3><p class="mt-1 text-body text-muted-foreground">A friendly message the day before, with a one-tap reschedule.</p></div><i data-icon="bell" aria-hidden="true" class="mt-1 size-5 shrink-0 text-muted-foreground"></i></li>
<li class="flex items-start gap-6 py-7"><span class="w-10 shrink-0 font-heading text-h2 font-semibold tabular-nums text-muted-foreground">03</span><div class="grow"><h3 class="font-heading text-h3 font-semibold text-foreground">They come back</h3><p class="mt-1 text-body text-muted-foreground">Their history is saved, so rebooking takes ten seconds.</p></div><i data-icon="users" aria-hidden="true" class="mt-1 size-5 shrink-0 text-muted-foreground"></i></li>
</ol>
</div>
</section>`,
  },
  {
    id: "features-visual-tiles",
    type: "features",
    surface: "landing",
    pattern:
      "A 2×2 grid of equal tiles where every tile has the VISUAL on top (a tinted panel with a tiny, believable piece of the interface) and the title and description underneath. The picture explains, the words confirm.",
    fits: { composition: ["split", "bento", "centered-stage"], imagery: ["framed-screens", "layered-collage", "tilted-cards"], decoration: ["tinted-panels", "soft-shapes", "gradient-wash"], typeVoice: ["humanist", "quiet"], colorStrategy: ["brand-forward", "neutral-with-pops"], rhythm: ["airy", "balanced"] },
    html: `<section data-block-id="b-features" class="@container bg-background py-16 @3xl:py-24">
<div class="mx-auto max-w-container px-6">
<h2 class="mx-auto max-w-2xl text-center font-heading text-h1 font-semibold tracking-tight text-foreground">Less admin, more of the work you love</h2>
<div class="mt-12 grid gap-6 @3xl:grid-cols-2">
<div>
<div class="flex h-56 items-center justify-center overflow-hidden rounded-card bg-primary/10 p-6">
<div class="w-full max-w-xs rounded-card border border-border bg-card p-4 shadow-md"><p class="text-caption text-muted-foreground">Thursday</p><div class="mt-3 space-y-2"><div class="rounded-badge bg-primary/10 px-3 py-2 text-small text-foreground">10:00 · Anna, trim</div><div class="rounded-badge bg-muted px-3 py-2 text-small text-foreground">11:30 · Free</div><div class="rounded-badge bg-primary/10 px-3 py-2 text-small text-foreground">12:00 · Marc, color</div></div></div>
</div>
<h3 class="mt-5 font-heading text-h3 font-semibold text-foreground">A calendar that fills itself</h3>
<p class="mt-1 text-body text-muted-foreground">Open slots are offered to the people on your waiting list first.</p>
</div>
<div>
<div class="flex h-56 items-center justify-center overflow-hidden rounded-card bg-accent/20 p-6">
<div class="w-full max-w-xs rounded-card border border-border bg-card p-4 shadow-md"><p class="text-caption text-muted-foreground">Deposit</p><p class="mt-1 font-heading text-h2 font-semibold tabular-nums text-foreground">$15.00</p><div class="mt-3 flex items-center gap-2 text-small text-foreground"><i data-icon="check-circle" aria-hidden="true" class="size-4 text-success"></i>Paid by Anna</div></div>
</div>
<h3 class="mt-5 font-heading text-h3 font-semibold text-foreground">Paid before they arrive</h3>
<p class="mt-1 text-body text-muted-foreground">A small deposit at booking keeps the chair from sitting empty.</p>
</div>
<div>
<div class="flex h-56 items-center justify-center overflow-hidden rounded-card bg-muted p-6">
<div class="w-full max-w-xs space-y-2"><div class="ml-auto w-4/5 rounded-card bg-card px-3 py-2 text-small text-foreground shadow-sm">Hi Anna, see you tomorrow at 10.</div><div class="w-3/5 rounded-card bg-primary px-3 py-2 text-small text-primary-foreground">Perfect, thanks!</div></div>
</div>
<h3 class="mt-5 font-heading text-h3 font-semibold text-foreground">Reminders that get answered</h3>
<p class="mt-1 text-body text-muted-foreground">Clients reply in the same thread, and you see it all in one place.</p>
</div>
<div>
<div class="flex h-56 items-center justify-center overflow-hidden rounded-card bg-primary/10 p-6">
<img data-chart="bar" data-values="8,11,9,14,12,18,16,22" alt="Returning clients per month" class="h-32 w-full max-w-xs">
</div>
<h3 class="mt-5 font-heading text-h3 font-semibold text-foreground">Know who comes back</h3>
<p class="mt-1 text-body text-muted-foreground">See which services bring people back, and which ones do not.</p>
</div>
</div>
</div>
</section>`,
  },
];
