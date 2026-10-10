# Acme Cloud: prompt for v0

## Before you start

- Paste it into v0. v0 doesn't apply cssVars from a registry, so the theme travels inside this prompt.

Build the Landing page for Acme Cloud in Next.js with shadcn/ui and Tailwind CSS v4.

## Steps

1. Replace the `:root` and `.dark` blocks of `app/globals.css` with the CSS at the end and map the tokens in `@theme inline` (`--color-primary: var(--primary)`…).
2. Load the fonts with `next/font/google`: Inter and Inter.
3. Use shadcn/ui components and set radii, heights and paddings with the `--dl-*` variables (e.g. `rounded-[var(--dl-button-radius)] h-[var(--dl-button-h-md)]`).
4. Build the sections under "Pages" in order, with the given text.
5. Light and dark modes must both work. Respect `prefers-reduced-motion`.

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

## Theme CSS

```css
/* Acme Cloud · Dialmade theme (DesignDoc v2) */
/* Recipe: glass · Type: inter-neo-grotesque · Motion: standard · Palette: brand */

:root {
  --background: oklch(1 0 0);
  --foreground: oklch(0.145 0.007 270.47);
  --card: oklch(1 0 0);
  --card-foreground: oklch(0.145 0.007 270.47);
  --popover: oklch(1 0 0);
  --popover-foreground: oklch(0.145 0.007 270.47);
  --primary: oklch(0.523 0.196 267.75);
  --primary-foreground: oklch(1 0 0);
  --secondary: oklch(0.97 0.006 264.53);
  --secondary-foreground: oklch(0.204 0.009 264.37);
  --muted: oklch(0.97 0.006 264.53);
  --muted-foreground: oklch(0.546 0.011 273.23);
  --accent: oklch(0.952 0.023 266.91);
  --accent-foreground: oklch(0.399 0.129 267.52);
  --destructive: oklch(0.5806 0.2205 11.899);
  --destructive-foreground: oklch(1 0 0);
  --border: oklch(0.922 0.007 268.54);
  --input: oklch(0.669 0.009 264.5);
  --ring: oklch(0.676 0.162 267.48);
  --chart-1: oklch(0.523 0.196 267.75);
  --chart-2: oklch(0.62 0.17 339.96);
  --chart-3: oklch(0.62 0.16 51.91);
  --chart-4: oklch(0.619 0.153 123.57);
  --chart-5: oklch(0.6191 0.1054 196.415);
  --brand: oklch(0.523 0.196 267.75);
  --cta: oklch(0.607 0.1312 70.363);
  --cta-foreground: oklch(0.145 0.007 270.47);
  --primary-text: oklch(0.523 0.196 267.75);
  --border-strong: oklch(0.669 0.009 264.5);
  --success: oklch(0.54 0.114 165);
  --success-foreground: oklch(1 0 0);
  --warning: oklch(0.5229 0.1232 59.525);
  --warning-foreground: oklch(1 0 0);
  --info: oklch(0.533 0.148 253.54);
  --info-foreground: oklch(1 0 0);
  --sidebar: var(--card);
  --sidebar-foreground: var(--card-foreground);
  --sidebar-primary: var(--primary);
  --sidebar-primary-foreground: var(--primary-foreground);
  --sidebar-accent: var(--accent);
  --sidebar-accent-foreground: var(--accent-foreground);
  --sidebar-border: var(--border);
  --sidebar-ring: var(--ring);
  --color-brand-50: oklch(0.976 0.011 269.55);
  --color-brand-100: oklch(0.952 0.023 266.91);
  --color-brand-200: oklch(0.907 0.045 267.42);
  --color-brand-300: oklch(0.844 0.077 267.6);
  --color-brand-400: oklch(0.757 0.123 267.64);
  --color-brand-500: oklch(0.689 0.163 267.65);
  --color-brand-600: oklch(0.604 0.214 267.74);
  --color-brand-700: oklch(0.523 0.196 267.75);
  --color-brand-800: oklch(0.453 0.161 267.81);
  --color-brand-900: oklch(0.399 0.129 267.52);
  --color-brand-950: oklch(0.277 0.093 268.03);
  --color-cta-50: oklch(0.977 0.015 70.89);
  --color-cta-100: oklch(0.953 0.036 71.44);
  --color-cta-200: oklch(0.909 0.069 70.35);
  --color-cta-300: oklch(0.849 0.114 71.56);
  --color-cta-400: oklch(0.767 0.156 71.33);
  --color-cta-500: oklch(0.695 0.15 70.84);
  --color-cta-600: oklch(0.607 0.1312 70.363);
  --color-cta-700: oklch(0.522 0.114 68.83);
  --color-cta-800: oklch(0.4496 0.0984 68.432);
  --color-cta-900: oklch(0.399 0.087 68.84);
  --color-cta-950: oklch(0.277 0.062 66.5);
  --color-neutral-50: oklch(0.985 0.004 271.37);
  --color-neutral-100: oklch(0.97 0.006 264.53);
  --color-neutral-200: oklch(0.922 0.007 268.54);
  --color-neutral-300: oklch(0.869 0.009 264.52);
  --color-neutral-400: oklch(0.709 0.011 267.33);
  --color-neutral-500: oklch(0.555 0.011 267.29);
  --color-neutral-600: oklch(0.438 0.012 267.24);
  --color-neutral-700: oklch(0.371 0.011 264.43);
  --color-neutral-800: oklch(0.269 0.01 268.31);
  --color-neutral-900: oklch(0.204 0.009 264.37);
  --color-neutral-950: oklch(0.145 0.007 270.47);
  --color-success-50: oklch(0.977 0.012 162.05);
  --color-success-100: oklch(0.953 0.028 165.47);
  --color-success-200: oklch(0.912 0.055 165.16);
  --color-success-300: oklch(0.853 0.09 164.86);
  --color-success-400: oklch(0.7737 0.1224 165.102);
  --color-success-500: oklch(0.708 0.135 165.17);
  --color-success-600: oklch(0.631 0.133 164.96);
  --color-success-700: oklch(0.54 0.114 165);
  --color-success-800: oklch(0.4623 0.0954 164.91);
  --color-success-900: oklch(0.4057 0.0762 165.305);
  --color-success-950: oklch(0.2795 0.0544 165.138);
  --color-warning-50: oklch(0.978 0.014 64.35);
  --color-warning-100: oklch(0.952 0.03 59.3);
  --color-warning-200: oklch(0.91 0.057 59.32);
  --color-warning-300: oklch(0.851 0.101 60.49);
  --color-warning-400: oklch(0.77 0.165 59.82);
  --color-warning-500: oklch(0.697 0.164 59.78);
  --color-warning-600: oklch(0.608 0.143 59.91);
  --color-warning-700: oklch(0.5229 0.1232 59.525);
  --color-warning-800: oklch(0.452 0.106 60.33);
  --color-warning-900: oklch(0.399 0.094 60.09);
  --color-warning-950: oklch(0.278 0.065 59.8);
  --color-error-50: oklch(0.978 0.011 17.34);
  --color-error-100: oklch(0.95 0.025 11.58);
  --color-error-200: oklch(0.902 0.052 10.81);
  --color-error-300: oklch(0.835 0.093 11.77);
  --color-error-400: oklch(0.744 0.159 12.11);
  --color-error-500: oklch(0.669 0.224 11.9);
  --color-error-600: oklch(0.5806 0.2205 11.899);
  --color-error-700: oklch(0.503 0.193 11.89);
  --color-error-800: oklch(0.4366 0.1584 11.832);
  --color-error-900: oklch(0.388 0.127 11.91);
  --color-error-950: oklch(0.278 0.091 12.26);
  --color-info-50: oklch(0.977 0.011 256.69);
  --color-info-100: oklch(0.951 0.023 256.1);
  --color-info-200: oklch(0.91 0.044 252.49);
  --color-info-300: oklch(0.849 0.076 253.47);
  --color-info-400: oklch(0.767 0.121 253.7);
  --color-info-500: oklch(0.701 0.16 253.66);
  --color-info-600: oklch(0.621 0.17 253.74);
  --color-info-700: oklch(0.533 0.148 253.54);
  --color-info-800: oklch(0.458 0.122 253.61);
  --color-info-900: oklch(0.402 0.099 254.17);
  --color-info-950: oklch(0.278 0.069 253.37);
  --primary-hover: oklch(0.45 0.168 267.84);
  --primary-foreground-hover: oklch(1 0 0);
  --primary-foreground-muted: oklch(0.928 0.03 267.2);
  --secondary-hover: oklch(0.974 0.005 274.97);
  --cta-hover: oklch(0.662 0.112 70.74);
  --destructive-hover: oklch(0.5 0.19 11.81);
  --dl-font-heading: "Inter", -apple-system, BlinkMacSystemFont, system-ui, 'Segoe UI', sans-serif;
  --dl-font-body: "Inter", -apple-system, BlinkMacSystemFont, system-ui, 'Segoe UI', sans-serif;
  --dl-font-mono: ui-monospace, SFMono-Regular, Menlo, Consolas, monospace;
  --dl-fs-display: clamp(2.125rem, 1.5552rem + 2.4309vw, 3.5rem);
  --dl-fs-h1: clamp(1.9375rem, 1.7303rem + 0.884vw, 2.4375rem);
  --dl-fs-h2: 1.9375rem;
  --dl-fs-h3: 1.5625rem;
  --dl-fs-body: 1rem;
  --dl-fs-small: 0.875rem;
  --dl-fs-caption: 0.75rem;
  --dl-lh-tight: 1.15;
  --dl-lh-body: 1.6;
  --dl-heading-weight: 600;
  --dl-heading-tracking: -0.02em;
  --dl-radius-sm: 8px;
  --dl-radius-md: 12px;
  --dl-radius-lg: 16px;
  --dl-radius-xl: 24px;
  --dl-radius-full: 9999px;
  --dl-space-1: 4px;
  --dl-space-2: 8px;
  --dl-space-3: 12px;
  --dl-space-4: 16px;
  --dl-space-5: 24px;
  --dl-space-6: 32px;
  --dl-space-7: 48px;
  --dl-space-8: 64px;
  --dl-space-9: 96px;
  --dl-space-10: 128px;
  --dl-section-py: 96px;
  --dl-container: 1200px;
  --dl-shadow-sm: 0 1px 2px 0 rgb(9 10 13 / 0.05), 0 1px 3px 0 rgb(9 10 13 / 0.08);
  --dl-shadow-md: 0 4px 12px -2px rgb(9 10 13 / 0.08), 0 2px 4px -2px rgb(9 10 13 / 0.06);
  --dl-shadow-lg: 0 16px 40px -8px rgb(9 10 13 / 0.14), 0 6px 12px -6px rgb(9 10 13 / 0.08);
  --dl-border-width: 1px;
  --dl-duration-fast: 200ms;
  --dl-duration-base: 440ms;
  --dl-duration-slow: 600ms;
  --dl-ease: cubic-bezier(0.215, 0.61, 0.355, 1);
  --dl-button-radius: var(--dl-radius-full);
  --dl-button-h-sm: 32px;
  --dl-button-h-md: 40px;
  --dl-button-h-lg: 48px;
  --dl-button-px: var(--dl-space-5);
  --dl-button-weight: 500;
  --dl-button-shadow: none;
  --dl-card-radius: var(--dl-radius-lg);
  --dl-card-padding: var(--dl-space-5);
  --dl-card-shadow: var(--dl-shadow-md);
  --dl-card-border: var(--dl-border-width) solid var(--border);
  --dl-input-radius: var(--dl-radius-md);
  --dl-input-h: var(--dl-button-h-md);
  --dl-badge-radius: var(--dl-radius-full);
  --dl-nav-h: 64px;
  --dl-table-row-h: 48px;
  --dl-sidebar-w: 256px;
}

.dark {
  --background: oklch(0.145 0.007 270.47);
  --foreground: oklch(0.985 0.004 271.37);
  --card: oklch(0.204 0.009 264.37);
  --card-foreground: oklch(0.985 0.004 271.37);
  --popover: oklch(0.204 0.009 264.37);
  --popover-foreground: oklch(0.985 0.004 271.37);
  --primary: oklch(0.689 0.163 267.65);
  --primary-foreground: oklch(0.277 0.093 268.03);
  --secondary: oklch(0.269 0.01 268.31);
  --secondary-foreground: oklch(0.985 0.004 271.37);
  --muted: oklch(0.269 0.01 268.31);
  --muted-foreground: oklch(0.709 0.011 267.33);
  --accent: oklch(0.277 0.093 268.03);
  --accent-foreground: oklch(0.952 0.023 266.91);
  --destructive: oklch(0.744 0.159 12.11);
  --destructive-foreground: oklch(0.278 0.091 12.26);
  --border: oklch(0.269 0.01 268.31);
  --input: oklch(0.502 0.012 261.77);
  --ring: oklch(0.757 0.123 267.64);
  --chart-1: oklch(0.689 0.163 267.65);
  --chart-2: oklch(0.72 0.17 339.78);
  --chart-3: oklch(0.72 0.17 51.7);
  --chart-4: oklch(0.72 0.17 123.86);
  --chart-5: oklch(0.72 0.123 195.45);
  --brand: oklch(0.523 0.196 267.75);
  --cta: oklch(0.767 0.156 71.33);
  --cta-foreground: oklch(0.277 0.062 66.5);
  --primary-text: oklch(0.689 0.163 267.65);
  --border-strong: oklch(0.502 0.012 261.77);
  --success: oklch(0.7737 0.1224 165.102);
  --success-foreground: oklch(0.2795 0.0544 165.138);
  --warning: oklch(0.77 0.165 59.82);
  --warning-foreground: oklch(0.278 0.065 59.8);
  --info: oklch(0.767 0.121 253.7);
  --info-foreground: oklch(0.278 0.069 253.37);
  --sidebar: var(--card);
  --sidebar-foreground: var(--card-foreground);
  --sidebar-primary: var(--primary);
  --sidebar-primary-foreground: var(--primary-foreground);
  --sidebar-accent: var(--accent);
  --sidebar-accent-foreground: var(--accent-foreground);
  --sidebar-border: var(--border);
  --sidebar-ring: var(--ring);
  --color-brand-50: oklch(0.976 0.011 269.55);
  --color-brand-100: oklch(0.952 0.023 266.91);
  --color-brand-200: oklch(0.907 0.045 267.42);
  --color-brand-300: oklch(0.844 0.077 267.6);
  --color-brand-400: oklch(0.757 0.123 267.64);
  --color-brand-500: oklch(0.689 0.163 267.65);
  --color-brand-600: oklch(0.604 0.214 267.74);
  --color-brand-700: oklch(0.523 0.196 267.75);
  --color-brand-800: oklch(0.453 0.161 267.81);
  --color-brand-900: oklch(0.399 0.129 267.52);
  --color-brand-950: oklch(0.277 0.093 268.03);
  --color-cta-50: oklch(0.977 0.015 70.89);
  --color-cta-100: oklch(0.953 0.036 71.44);
  --color-cta-200: oklch(0.909 0.069 70.35);
  --color-cta-300: oklch(0.849 0.114 71.56);
  --color-cta-400: oklch(0.767 0.156 71.33);
  --color-cta-500: oklch(0.695 0.15 70.84);
  --color-cta-600: oklch(0.607 0.1312 70.363);
  --color-cta-700: oklch(0.522 0.114 68.83);
  --color-cta-800: oklch(0.4496 0.0984 68.432);
  --color-cta-900: oklch(0.399 0.087 68.84);
  --color-cta-950: oklch(0.277 0.062 66.5);
  --color-neutral-50: oklch(0.985 0.004 271.37);
  --color-neutral-100: oklch(0.97 0.006 264.53);
  --color-neutral-200: oklch(0.922 0.007 268.54);
  --color-neutral-300: oklch(0.869 0.009 264.52);
  --color-neutral-400: oklch(0.709 0.011 267.33);
  --color-neutral-500: oklch(0.555 0.011 267.29);
  --color-neutral-600: oklch(0.438 0.012 267.24);
  --color-neutral-700: oklch(0.371 0.011 264.43);
  --color-neutral-800: oklch(0.269 0.01 268.31);
  --color-neutral-900: oklch(0.204 0.009 264.37);
  --color-neutral-950: oklch(0.145 0.007 270.47);
  --color-success-50: oklch(0.977 0.012 162.05);
  --color-success-100: oklch(0.953 0.028 165.47);
  --color-success-200: oklch(0.912 0.055 165.16);
  --color-success-300: oklch(0.853 0.09 164.86);
  --color-success-400: oklch(0.7737 0.1224 165.102);
  --color-success-500: oklch(0.708 0.135 165.17);
  --color-success-600: oklch(0.631 0.133 164.96);
  --color-success-700: oklch(0.54 0.114 165);
  --color-success-800: oklch(0.4623 0.0954 164.91);
  --color-success-900: oklch(0.4057 0.0762 165.305);
  --color-success-950: oklch(0.2795 0.0544 165.138);
  --color-warning-50: oklch(0.978 0.014 64.35);
  --color-warning-100: oklch(0.952 0.03 59.3);
  --color-warning-200: oklch(0.91 0.057 59.32);
  --color-warning-300: oklch(0.851 0.101 60.49);
  --color-warning-400: oklch(0.77 0.165 59.82);
  --color-warning-500: oklch(0.697 0.164 59.78);
  --color-warning-600: oklch(0.608 0.143 59.91);
  --color-warning-700: oklch(0.5229 0.1232 59.525);
  --color-warning-800: oklch(0.452 0.106 60.33);
  --color-warning-900: oklch(0.399 0.094 60.09);
  --color-warning-950: oklch(0.278 0.065 59.8);
  --color-error-50: oklch(0.978 0.011 17.34);
  --color-error-100: oklch(0.95 0.025 11.58);
  --color-error-200: oklch(0.902 0.052 10.81);
  --color-error-300: oklch(0.835 0.093 11.77);
  --color-error-400: oklch(0.744 0.159 12.11);
  --color-error-500: oklch(0.669 0.224 11.9);
  --color-error-600: oklch(0.5806 0.2205 11.899);
  --color-error-700: oklch(0.503 0.193 11.89);
  --color-error-800: oklch(0.4366 0.1584 11.832);
  --color-error-900: oklch(0.388 0.127 11.91);
  --color-error-950: oklch(0.278 0.091 12.26);
  --color-info-50: oklch(0.977 0.011 256.69);
  --color-info-100: oklch(0.951 0.023 256.1);
  --color-info-200: oklch(0.91 0.044 252.49);
  --color-info-300: oklch(0.849 0.076 253.47);
  --color-info-400: oklch(0.767 0.121 253.7);
  --color-info-500: oklch(0.701 0.16 253.66);
  --color-info-600: oklch(0.621 0.17 253.74);
  --color-info-700: oklch(0.533 0.148 253.54);
  --color-info-800: oklch(0.458 0.122 253.61);
  --color-info-900: oklch(0.402 0.099 254.17);
  --color-info-950: oklch(0.278 0.069 253.37);
  --primary-hover: oklch(0.732 0.138 267.83);
  --primary-foreground-hover: oklch(0.239 0.079 267.71);
  --primary-foreground-muted: oklch(0.314 0.099 268.03);
  --secondary-hover: oklch(0.23 0.008 264.4);
  --cta-hover: oklch(0.799 0.134 71.48);
  --destructive-hover: oklch(0.779 0.132 11.78);
  --dl-font-heading: "Inter", -apple-system, BlinkMacSystemFont, system-ui, 'Segoe UI', sans-serif;
  --dl-font-body: "Inter", -apple-system, BlinkMacSystemFont, system-ui, 'Segoe UI', sans-serif;
  --dl-font-mono: ui-monospace, SFMono-Regular, Menlo, Consolas, monospace;
  --dl-fs-display: clamp(2.125rem, 1.5552rem + 2.4309vw, 3.5rem);
  --dl-fs-h1: clamp(1.9375rem, 1.7303rem + 0.884vw, 2.4375rem);
  --dl-fs-h2: 1.9375rem;
  --dl-fs-h3: 1.5625rem;
  --dl-fs-body: 1rem;
  --dl-fs-small: 0.875rem;
  --dl-fs-caption: 0.75rem;
  --dl-lh-tight: 1.15;
  --dl-lh-body: 1.6;
  --dl-heading-weight: 600;
  --dl-heading-tracking: -0.02em;
  --dl-radius-sm: 8px;
  --dl-radius-md: 12px;
  --dl-radius-lg: 16px;
  --dl-radius-xl: 24px;
  --dl-radius-full: 9999px;
  --dl-space-1: 4px;
  --dl-space-2: 8px;
  --dl-space-3: 12px;
  --dl-space-4: 16px;
  --dl-space-5: 24px;
  --dl-space-6: 32px;
  --dl-space-7: 48px;
  --dl-space-8: 64px;
  --dl-space-9: 96px;
  --dl-space-10: 128px;
  --dl-section-py: 96px;
  --dl-container: 1200px;
  --dl-shadow-sm: 0 1px 2px 0 rgb(9 10 13 / 0.11), 0 1px 3px 0 rgb(9 10 13 / 0.176);
  --dl-shadow-md: 0 4px 12px -2px rgb(9 10 13 / 0.176), 0 2px 4px -2px rgb(9 10 13 / 0.132);
  --dl-shadow-lg: 0 16px 40px -8px rgb(9 10 13 / 0.308), 0 6px 12px -6px rgb(9 10 13 / 0.176);
  --dl-border-width: 1px;
  --dl-duration-fast: 200ms;
  --dl-duration-base: 440ms;
  --dl-duration-slow: 600ms;
  --dl-ease: cubic-bezier(0.215, 0.61, 0.355, 1);
  --dl-button-radius: var(--dl-radius-full);
  --dl-button-h-sm: 32px;
  --dl-button-h-md: 40px;
  --dl-button-h-lg: 48px;
  --dl-button-px: var(--dl-space-5);
  --dl-button-weight: 500;
  --dl-button-shadow: none;
  --dl-card-radius: var(--dl-radius-lg);
  --dl-card-padding: var(--dl-space-5);
  --dl-card-shadow: var(--dl-shadow-md);
  --dl-card-border: var(--dl-border-width) solid var(--border);
  --dl-input-radius: var(--dl-radius-md);
  --dl-input-h: var(--dl-button-h-md);
  --dl-badge-radius: var(--dl-radius-full);
  --dl-nav-h: 64px;
  --dl-table-row-h: 48px;
  --dl-sidebar-w: 256px;
}
```
