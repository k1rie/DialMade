# Brief: Brisa landing page (test of the design skills)

Fictional brand (not a real company). Product: app de reservas para barberías: agenda semanal, clientes, recordatorios y pagos. Tagline: «Tu barbería, sin llamadas». Copy language: es (Spain).

## What the developer told us (use as given)
- Audience: Barberos y dueños de barberías de barrio (1–4 sillas) que hoy llevan la agenda en papel y WhatsApp
- Goal of the page: Que abran una cuenta gratis y pasen su agenda esta semana
- Tone: Cercano, directo, de barrio; cero jerga de software
- Real facts (never contradict, never invent other numbers): Gratis hasta 5 personas; 12 €/mes por equipo; recordatorios por WhatsApp; 1.200 barberías; sin tarjeta
- Avoid: Look de SaaS corporativo, azules fríos, fotos de stock
- Concept: Las páginas deben sentirse como el mostrador de una barbería de barrio: cercanas, directas y sin jerga. La idea que las hace de Brisa es mostrar la agenda real de la semana, con sillas, horas y recordatorios de WhatsApp, para que cualquier barbero vea en segundos cómo pasar su agenda de papel a Brisa. Datos claros: 5 personas gratis, 12 € al mes por equipo, sin tarjeta, 1.200 barberías.

## Fixed by the developer (do not change)
- Sections, in this order: navbar, hero, features (3 items), testimonials, pricing (3 plans), call to action, footer.
- Pricing plans (names and prices exact): Básico 0 €/mes (hasta 5 personas, agenda y clientes ilimitados, recordatorios básicos) · Equipo 12 €/mes por equipo, MÁS POPULAR (todo lo del Básico, recordatorios por WhatsApp, cobros y resumen semanal) · Empresa 29 €/mes (todo lo del plan Equipo, varias sedes con permisos, gestor de cuenta dedicado)
- Fonts: Inter (heading and body; has real italics and an opsz axis 14..32). Load them from Google Fonts; you may request the italic and opsz axes they really have.
- Palette (the only hues; you may derive tints/shades of these with color-mix() or oklch, never a new hue):
  --background: oklch(1 0 0);
  --foreground: oklch(0.147 0.004 164.84);
  --primary: oklch(0.511 0.086 186.39);
  --primary-foreground: oklch(1 0 0);
  --cta: oklch(0.608 0.133 68.71);
  --cta-foreground: oklch(0.147 0.004 164.84);
  --accent: oklch(0.95 0.02 189.21);
  --accent-foreground: oklch(0.394 0.058 185.04);
  --muted: oklch(0.971 0.003 174.48);
  --muted-foreground: oklch(0.546 0.004 219.56);
  --border: oklch(0.922 0.003 174.48);
