# Acme Cloud: prompt for Cursor

## Before you start

- Save `DESIGN.md` at the repo root and `theme.css` next to your global stylesheet. Then paste this text into Cursor's Agent.

Implement the Landing page for Acme Cloud following `DESIGN.md` and the rule `.cursor/rules/dialmade-design.mdc`.

## Steps

1. Create `.cursor/rules/dialmade-design.mdc` with the content at the end.
2. Import `theme.css` in the global stylesheet and map the tokens with Tailwind v4 `@theme inline`.
3. Load the fonts (https://fonts.googleapis.com/css2?family=Inter:wght@400;500;600;700&display=swap).
4. Build the sections under "Pages" in order, one component each.
5. Never write literal colors, radii or shadows: always use the variables.

## Design direction

### Brand

- Name: Acme Cloud
- Tagline: Ship faster, sleep better
- Product: SaaS (General)
- Focus: Landing page
- Style: Glass. Translucent, blurred layers over colourful backgrounds. Depth without weight.
- Palette style: brand

### Colors

Exact hex per role (names are the CSS variables). Every text and UI pair meets AA.

| Role | Light | Dark |
| --- | --- | --- |
| `--background` | #ffffff | #090a0d |
| `--foreground` | #090a0d | #f9fafd |
| `--card` | #ffffff | #15171b |
| `--card-foreground` | #090a0d | #f9fafd |
| `--popover` | #ffffff | #15171b |
| `--popover-foreground` | #090a0d | #f9fafd |
| `--primary` | #3a5bd9 | #6f94ff |
| `--primary-foreground` | #ffffff | #152355 |
| `--secondary` | #f3f5f9 | #24262b |
| `--secondary-foreground` | #15171b | #f9fafd |
| `--muted` | #f3f5f9 | #24262b |
| `--muted-foreground` | #6e7077 | #9ea1a8 |
| `--accent` | #e8efff | #152355 |
| `--accent-foreground` | #29408c | #e8efff |
| `--destructive` | #dd1b57 | #ff7d91 |
| `--destructive-foreground` | #ffffff | #4b0e1c |
| `--border` | #e3e5ea | #24262b |
| `--input` | #92959b | #60646b |
| `--ring` | #6b90fa | #8eadff |
| `--chart-1` | #3a5bd9 | #6f94ff |
| `--chart-2` | #c656a6 | #e875c6 |
| `--chart-3` | #ce6400 | #f58029 |
| `--chart-4` | #749400 | #8fb51e |
| `--chart-5` | #00999b | #00bcbd |
| `--brand` | #3a5bd9 | #3a5bd9 |
| `--cta` | #b37200 | #f0a024 |
| `--cta-foreground` | #090a0d | #3c2100 |
| `--primary-text` | #3a5bd9 | #6f94ff |
| `--border-strong` | #92959b | #60646b |
| `--success` | #00835e | #5dcea2 |
| `--success-foreground` | #ffffff | #053122 |
| `--warning` | #9c5500 | #ff972f |
| `--warning-foreground` | #ffffff | #3f1f00 |
| `--info` | #1f6dbf | #7bb7ff |
| `--info-foreground` | #ffffff | #0c2949 |

### Typography

- Headings: Inter 600, tracking -0.02em, line-height 1.15
- Text: Inter 400, line-height 1.6
- Google Fonts: https://fonts.googleapis.com/css2?family=Inter:wght@400;500;600;700&display=swap
- Scale: display 56px (fluid from 34px) · h1 39px (fluid from 31px) · h2 31px · h3 25px · body 16px · small 14px · caption 12px

### Shape, space and elevation

- Radii: sm 8px · md 12px · lg 16px · xl 24px · full 9999px
- Spacing (density 5/10): 4, 8, 12, 16, 24, 32, 48, 64, 96, 128 px (`--dl-space-1…10`)
- Container: 1200px · Section padding: 96px · Border: 1px
- Shadows (light mode): sm `0 1px 2px 0 rgb(9 10 13 / 0.05), 0 1px 3px 0 rgb(9 10 13 / 0.08)` · md `0 4px 12px -2px rgb(9 10 13 / 0.08), 0 2px 4px -2px rgb(9 10 13 / 0.06)` · lg `0 16px 40px -8px rgb(9 10 13 / 0.14), 0 6px 12px -6px rgb(9 10 13 / 0.08)`

### Components

- Button: radius 9999px, h 32/40/48px, padding-x 24px, weight 500, shadow none
- Card: radius 16px, padding 24px, shadow md, border 1px solid --border
- Input: radius 12px, h 40px · Badge: radius 9999px
- Nav 64px · Table row 48px · Sidebar 256px

### Motion

- Standard: fast 200ms · base 440ms · slow 600ms · ease `cubic-bezier(0.215, 0.61, 0.355, 1)`
- Respect `prefers-reduced-motion`.

### Pages

**Landing page** (`minimal`)

1. Navigation bar (`landing.navbar`)
2. Hero (`landing.hero`)
3. Features (`landing.features`)
4. Call to action (`landing.cta`)
5. Footer (`landing.footer`)

**Style guide** (`brand-board`)

1. Cover (`brand.cover`)
2. 01 Identity (`brand.identity`)
3. 02 Palette (`brand.palette`)
4. 03 Typography (`brand.type`)
5. 04 Shapes (`brand.shape`)
6. 05 Components (`brand.components`)
7. 06 Art direction (`brand.artDirection`)

**Dashboard & components** (`app-dashboard`)

1. Shell (sidebar and top bar) (`app.shell`)
   - KPI row (`app.kpiRow`)
   - Chart card (`app.chartCard`)
   - Activity (`app.activity`)
   - Data table (`app.dataTable`)
   - Component gallery (`app.componentGallery`)

## Rules

- Use the exact hex values and roles. Don't invent colors, fonts, radii or shadows.
- `--brand` is decorative: for brand-colored text use `--primary-text`.
- `--cta` only for the main action of each view. `--accent` is the hover surface, not the CTA.
- One display per view; hierarchy comes from the type scale.
- Animate with CSS or Motion (motion.dev), never GSAP, and never beyond the `slow` duration.

## Files in the pack

- `theme.css`: every CSS variable (`:root` and `.dark`)
- `tokens.tokens.json`: DTCG 2025.10 tokens (color, typography, dimensions, shadows, durations and components)
- `figma-light.tokens.json`: Figma color variables, light mode
- `figma-dark.tokens.json`: Figma color variables, dark mode
- `figma-numbers.tokens.json`: Figma number variables (radii, spacing and components)
- `DESIGN.md`: agent-readable brief (DESIGN.md spec)

## Content of `.cursor/rules/dialmade-design.mdc`

```md
---
description: Acme Cloud design system (Dialmade). Apply it to any UI work.
globs: "**/*.{tsx,jsx,css}"
alwaysApply: true
---

- The source of truth is `DESIGN.md` and `theme.css`: read them before touching the UI.
- Use the exact hex values and roles. Don't invent colors, fonts, radii or shadows.
- `--brand` is decorative: for brand-colored text use `--primary-text`.
- `--cta` only for the main action of each view. `--accent` is the hover surface, not the CTA.
- One display per view; hierarchy comes from the type scale.
- Animate with CSS or Motion (motion.dev), never GSAP, and never beyond the `slow` duration.
```
