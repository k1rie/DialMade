# Brief: Vectora landing page (test of the design skills)

Fictional brand (not a real company). Product: invoicing and cash-flow forecasting for freelancers and small studios, with bank sync. Tagline: «Cash-flow forecasts for freelancers». Copy language: en (US).

## What the developer told us (use as given)
- Audience: Freelancers and small studios who invoice clients and are caught out when a client pays late
- Goal of the page: Connect a bank account and see the next 90 days of cash
- Tone: Calm, precise, numbers first; no hype
- Real facts (never contradict, never invent other numbers): Free for 1 bank; $5/mo Plus; $19/mo Business; read-only bank sync; 2,400 banks supported; 5-minute setup
- Avoid: Crypto-bro neon, stock photos of laptops, purple gradients
- Concept: Pages should feel like a precise console for money arriving late: every screen leads with the next 90 days of cash as a large, calm figure, with dates and amounts in mono. The one idea is that a client's late payment becomes a visible line in a forecast, so freelancers see the gap before it hurts. Keep facts exact: free for 1 bank, $5/mo Plus, $19/mo Business, read-only sync, 2,400 banks, 5-minute setup.

## Fixed by the developer (do not change)
- Sections, in this order: navbar, hero, features (3 items), testimonials, pricing (3 plans), call to action, footer.
- Pricing plans (names and prices exact): Standard $0/mo (1 bank, read-only sync, basic late-payment alerts) · Plus $5/mo, MOST POPULAR (everything in Standard + more banks, 90-day forecast, savings goals) · Business $19/mo (invoicing and collections, team, accounting export)
- Fonts: IBM Plex Sans (heading and body; has real italics); a mono face is allowed (IBM Plex Mono, Google Fonts). Load them from Google Fonts; you may request the italic and opsz axes they really have.
- Palette (the only hues; you may derive tints/shades of these with color-mix() or oklch, never a new hue):
  --background: oklch(1 0 0);
  --foreground: oklch(0.145 0.007 270.47);
  --primary: oklch(0.511 0.23 276.97);
  --primary-foreground: oklch(1 0 0);
  --cta: oklch(0.6094 0.1334 162.114);
  --cta-foreground: oklch(0.145 0.007 270.47);
  --accent: oklch(0.951 0.023 275.36);
  --accent-foreground: oklch(0.392 0.152 277.27);
  --muted: oklch(0.971 0.005 274.97);
  --muted-foreground: oklch(0.547 0.011 279.53);
  --border: oklch(0.923 0.007 277.16);
