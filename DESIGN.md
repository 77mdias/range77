---
version: alpha
name: infisical-the-modern-security-platform-for-developers-and-agents-design-analysis
description: Infisical's design language uses a near-white canvas (#ffffff) paired with near-black text (#000000) and a saturated primary accent (#f5f841). The brand uses a system font stack. The overall voice is clean and minimal.

colors:
  primary: "#f5f841"
  on-primary: "#000000"
  ink: "#000000"
  ink-soft: "#000000"
  body: "#000000"
  body-mid: "#000000"
  mute: "#000000"
  canvas: "#ffffff"
  canvas-soft: "#f9fafb"

typography:
  display-xl:
    fontFamily: system-ui, sans-serif
    fontSize: 15px
    fontWeight: 400
    lineHeight: 19px
  display-lg:
    fontFamily: system-ui, sans-serif
    fontSize: 13px
    fontWeight: 500
    lineHeight: 16px
  display-md:
    fontFamily: system-ui, sans-serif
    fontSize: 12px
    fontWeight: 600
    lineHeight: 15px
  display-sub-lg:
    fontFamily: system-ui, sans-serif
    fontSize: 10px
    fontWeight: 700
    lineHeight: 13px

rounded:
  none: 0px
  sm: 1px
  md: 3px
  lg: 22px
  xl: 50px
  pill: 9999px

spacing:
  xxs: 2px
  xs: 3px
  sm: 4px
  md: 5px
  lg: 6px
  xl: 7px
  2xl: 8px
  3xl: 9px
  4xl: 10px

components:
  button-primary:
    backgroundColor: "{colors.primary}"
    textColor: "{colors.on-primary}"
    typography: "{typography.button-md}"
    rounded: "{rounded.md}"
    padding: "5px 7px"
  button-secondary:
    backgroundColor: "{colors.ink}"
    textColor: "{colors.on-primary}"
    typography: "{typography.button-md}"
    rounded: "{rounded.md}"
    padding: "5px 7px"
  button-tertiary:
    backgroundColor: "{colors.canvas}"
    textColor: "{colors.ink}"
    borderColor: "{colors.ink}"
    typography: "{typography.button-md}"
    rounded: "{rounded.md}"
    padding: "5px 7px"
  card:
    backgroundColor: "{colors.canvas-soft}"
    textColor: "{colors.ink}"
    rounded: "{rounded.md}"
    padding: "7px"
  nav-bar:
    backgroundColor: "{colors.canvas}"
    textColor: "{colors.ink}"
    typography: "{typography.body-sm}"
    padding: "5px 7px"
  text-input:
    backgroundColor: "{colors.canvas}"
    textColor: "{colors.ink}"
    borderColor: "{colors.ink}"
    typography: "{typography.body-md}"
    rounded: "{rounded.sm}"
    padding: "5px 6px"
  footer:
    backgroundColor: "{colors.ink}"
    textColor: "{colors.canvas-soft}"
    typography: "{typography.body-sm}"
    padding: "9px 7px"
---

## Overview

Infisical's design language uses a near-white canvas (#ffffff) paired with near-black text (#000000) and a saturated primary accent (#f5f841). The brand uses a system font stack. The overall voice is clean and minimal.

**Key Characteristics:**

- A `primary` color `{colors.primary}` (`#f5f841`)
- A `on-primary` color `{colors.on-primary}` (`#000000`)
- A `ink` color `{colors.ink}` (`#000000`)
- A `ink-soft` color `{colors.ink-soft}` (`#000000`)
- A `body` color `{colors.body}` (`#000000`)
- A `body-mid` color `{colors.body-mid}` (`#000000`)
- A `mute` color `{colors.mute}` (`#000000`)
- A `canvas` color `{colors.canvas}` (`#ffffff`)
- A `canvas-soft` color `{colors.canvas-soft}` (`#f9fafb`)

## Colors

### Brand & Accent

- **primary** (`{colors.primary}` — `#f5f841`): The brand accent. Use for CTAs, links, and interactive highlights.
- **on-primary** (`{colors.on-primary}` — `#000000`): Text/icon color on top of the primary accent. Ensures contrast.

### Surface

- **canvas** (`{colors.canvas}` — `#ffffff`): Main page background — near-white.
- **canvas-soft** (`{colors.canvas-soft}` — `#f9fafb`): Tinted card/section background — creates subtle depth.

### Text

- **ink** (`{colors.ink}` — `#000000`): Primary text color — deep near-black.
- **ink-soft** (`{colors.ink-soft}` — `#000000`): Near-ink — headings and strong emphasis.
- **body** (`{colors.body}` — `#000000`): Default body text color.
- **body-mid** (`{colors.body-mid}` — `#000000`): Secondary body / metadata.
- **mute** (`{colors.mute}` — `#000000`): Lowest-priority text — fine print, placeholders, captions.

## Typography

### Font Families

System font stack — no custom fonts detected.

### Type Scale

| Token                         | Size | Weight | Line Height | Letter Spacing | Use                 |
| ----------------------------- | ---- | ------ | ----------- | -------------- | ------------------- |
| `{typography.display-xl}`     | 15px | 400    | 19px        | 0              | Hero headline       |
| `{typography.display-lg}`     | 13px | 500    | 16px        | 0              | Section display     |
| `{typography.display-md}`     | 12px | 600    | 15px        | 0              | Sub-section heading |
| `{typography.display-sub-lg}` | 10px | 700    | 13px        | 0              | Large sub-display   |

### Principles

- Build hierarchy using the type scale — don't set arbitrary font sizes.
- Use heavier weights (600–700) only for buttons and emphasis, not for body text.
- Sentence-case headlines; all-caps only for eyebrow / label tokens.

## Layout

### Spacing System

`{spacing.xxs}` 2px · `{spacing.xs}` 3px · `{spacing.sm}` 4px · `{spacing.md}` 5px · `{spacing.lg}` 6px · `{spacing.xl}` 7px · `{spacing.2xl}` 8px · `{spacing.3xl}` 9px · `{spacing.4xl}` 10px

### Grid & Container

Marketing container max-width ~1280px centered with gutters. Hero sections split at desktop; grids collapse to 1-column at mobile.

### Responsive Breakpoints

| Name    | Width      | Key Changes                                 |
| ------- | ---------- | ------------------------------------------- |
| Mobile  | < 768px    | Hero stacks; grids 1-up; hamburger nav      |
| Tablet  | 768–1023px | 2-up grids; nav visible                     |
| Desktop | ≥ 1024px   | Full grids; hero split; max-width container |

## Elevation & Depth

| Level               | Treatment                                                  | Use                          |
| ------------------- | ---------------------------------------------------------- | ---------------------------- |
| Level 0 — Flat      | No shadow, no border                                       | Hero / full-bleed bands      |
| Level 1 — Hairline  | 1px solid `{colors.mute}` border                           | Card chrome, outline buttons |
| Level 2 — Soft Card | `{colors.canvas-soft}` fill against `{colors.canvas}` page | Default content cards        |
| Level 3 — Raised    | Box shadow, 4px blur                                       | Modals, dropdowns            |

## Shapes

### Border Radius Scale

| Token            | Value  | Use                         |
| ---------------- | ------ | --------------------------- |
| `{rounded.none}` | 0px    | Full-bleed bands            |
| `{rounded.sm}`   | 1px    | Inputs, inline pills        |
| `{rounded.md}`   | 3px    | Buttons and cards           |
| `{rounded.lg}`   | 22px   | Large surfaces              |
| `{rounded.xl}`   | 50px   | General                     |
| `{rounded.pill}` | 9999px | Status badges, rounded CTAs |

## Components

**`button-primary`**

- backgroundColor: `{colors.primary}`
- textColor: `{colors.on-primary}`
- typography: `{typography.button-md}`
- rounded: `{rounded.md}`
- padding: `5px 7px`

**`button-secondary`**

- backgroundColor: `{colors.ink}`
- textColor: `{colors.on-primary}`
- typography: `{typography.button-md}`
- rounded: `{rounded.md}`
- padding: `5px 7px`

**`button-tertiary`**

- backgroundColor: `{colors.canvas}`
- textColor: `{colors.ink}`
- borderColor: `{colors.ink}`
- typography: `{typography.button-md}`
- rounded: `{rounded.md}`
- padding: `5px 7px`

**`card`**

- backgroundColor: `{colors.canvas-soft}`
- textColor: `{colors.ink}`
- rounded: `{rounded.md}`
- padding: `7px`

**`nav-bar`**

- backgroundColor: `{colors.canvas}`
- textColor: `{colors.ink}`
- typography: `{typography.body-sm}`
- padding: `5px 7px`

**`text-input`**

- backgroundColor: `{colors.canvas}`
- textColor: `{colors.ink}`
- borderColor: `{colors.ink}`
- typography: `{typography.body-md}`
- rounded: `{rounded.sm}`
- padding: `5px 6px`

**`footer`**

- backgroundColor: `{colors.ink}`
- textColor: `{colors.canvas-soft}`
- typography: `{typography.body-sm}`
- padding: `9px 7px`

## Do's and Don'ts

### Do

- Reserve `#f5f841` for every primary CTA and conversion target
- Keep the canvas at `#ffffff` — maintain brand-accurate background temperature
- Use the defined type scale to build hierarchy — don't mix arbitrary font sizes
- Apply `3px` radius consistently to buttons and cards
- Maintain the spacing scale — don't introduce ad-hoc pixel values
- Pair primary accent with ink-dark text on light surfaces

### Don't

- Don't replace the canvas color with pure white — the exact shade is intentional
- Don't use pure black — `#000000` carries the brand's ink character
- Don't introduce a second chromatic accent color
- Don't set display headlines in weights lighter than 500
- Don't deviate from the border-radius scale
- Don't use font sizes outside the defined type scale
