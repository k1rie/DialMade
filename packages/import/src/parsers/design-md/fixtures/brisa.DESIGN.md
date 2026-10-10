---
version: alpha
name: Brisa
description: Calm tools for coastal teams.
colors:
  ocean: "#3464d5"
  sand: "#f7f3ea"
  ink: "#1b2560"
  coral: "oklch(0.68 0.17 35)"
  background: "{colors.sand}"
  foreground: "{colors.ink}"
  border: "rgb(27 37 96 / 12%)"
  ocean-100: "#e0e8fc"
  ocean-500: "{colors.ocean}"
  ocean-900: "#1b2560"
typography:
  headline-lg:
    fontFamily: Brisa Grotesk
    fontSize: 48px
    fontWeight: 600
    lineHeight: 1.1
    letterSpacing: -0.02em
  body-md:
    fontFamily: Inter
    fontSize: 16px
    fontWeight: 400
    lineHeight: 1.5
  label-sm: &label
    fontFamily: Inter
    fontSize: 12px
    fontWeight: 500
  caption: *label
  code:
    fontFamily: Geist Mono
    fontSize: 14px
rounded:
  sm: 4px
  md: 8px
  lg: 12px
  full: 9999px
spacing:
  xxs: 2px
  xs: 4px
  sm: 8px
  md: 16px
  lg: 24px
  section: 96px
components:
  button-primary:
    backgroundColor: "{colors.ocean}"
    textColor: "#ffffff"
    rounded: "{rounded.full}"
    typography: "{typography.label-sm}"
    height: 40px
  button-secondary:
    backgroundColor: "{colors.coral}"
  card:
    backgroundColor: "#ffffff"
    textColor: "{colors.ink}"
    rounded: "{rounded.lg}"
  input:
    rounded: "{rounded.md}"
    borderColor: "{colors.border}"
---

# Brisa

## Overview

Calm, precise and coastal. Plenty of air; one accent per view.

## Colors

| Token | Value |
|---|---|
| ocean | #3464d5 |

Ocean is the brand color.

## Do's and Don'ts

- Do use ocean for the main action.
- Don't put coral text on sand.
