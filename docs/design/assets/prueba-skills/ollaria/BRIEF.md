# Brief: Ollaria landing page (test of the design skills)

Fictional brand (not a real company). Product: online shop of a ceramics studio that also sells weekend pottery workshops. Tagline: «Handmade stoneware, fired in small batches». Copy language: en (US).

## What the developer told us (use as given)
- Audience: Design-minded people who buy handmade tableware and book weekend pottery workshops
- Goal of the page: Buy a piece or book a workshop seat
- Tone: Warm, tactile, unhurried; craft over commerce
- Real facts (never contradict, never invent other numbers): Fired in batches of 40; free returns for 30 days; workshops every Saturday; glazes mixed in-house
- Avoid: Generic e-commerce grid look, discount banners, cold blue
- Concept: Pages should feel like an unhurried studio journal where each piece of stoneware gets room to be looked at. The specific idea is to present every product and workshop seat by its batch: fired in batches of 40, glazes mixed in-house, and a Saturday workshop slot. Free 30-day returns sit quietly beside the buy action, never as a discount banner.

## Fixed by the developer (do not change)
- Sections, in this order: navbar, hero, features (3 items), testimonials, pricing (3 plans), call to action, footer.
- Pricing plans (names and prices exact): Essential $39 (2 products of your choice, free shipping, 30-day returns) · Complete $79, MOST POPULAR (4 products, 24-hour shipping, gift wrapping) · Premium $129 (6 products, limited edition included, express shipping)
- Fonts: Outfit for headings (NO italics exist for Outfit) and Work Sans for body (has real italics). Load them from Google Fonts; you may request the italic and opsz axes they really have.
- Palette (the only hues; you may derive tints/shades of these with color-mix() or oklch, never a new hue):
  --background: oklch(1 0 0);
  --foreground: oklch(0.144 0.005 17.79);
  --primary: oklch(0.557 0.137 41.94);
  --primary-foreground: oklch(1 0 0);
  --cta: oklch(0.557 0.137 41.94);
  --cta-foreground: oklch(1 0 0);
  --accent: oklch(0.947 0.027 40.2);
  --accent-foreground: oklch(0.38 0.08 41.53);
  --muted: oklch(0.97 0.005 34.31);
  --muted-foreground: oklch(0.547 0.008 28.87);
  --border: oklch(0.922 0.005 34.31);
