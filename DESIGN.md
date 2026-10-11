---
version: alpha
name: Protocol Precision
description: Design language for a high-performance tactical esports telemetry interface. Pure off-white canvas (#f9f9f9) and white cards collided with absolute black typographic infrastructure (#000000), pierced by an electric neon yellow (#f5f841) reserved for actionable states. Space Grotesk for display, Geist for body, JetBrains Mono for data/HUD.

colors:
  surface: "#f9f9f9"
  surface-container-lowest: "#ffffff"
  canvas-soft: "#f9fafb"
  on-surface: "#1a1c1c"
  primary-container: "#f5f841"
  primary: "#616200"
  secondary: "#000000"
  border-hairline: "#000000"
  outline: "#797861"
  outline-variant: "#cac8ad"
  error: "#ba1a1a"

typography:
  display-xl:
    fontFamily: Space Grotesk
    fontSize: 32px
    fontWeight: 700
    lineHeight: 36px
    letterSpacing: -0.03em
  display-xl-mobile:
    fontFamily: Space Grotesk
    fontSize: 24px
    fontWeight: 700
    lineHeight: 28px
    letterSpacing: -0.02em
  headline-lg:
    fontFamily: Space Grotesk
    fontSize: 20px
    fontWeight: 600
    lineHeight: 24px
    letterSpacing: -0.02em
  headline-md:
    fontFamily: Space Grotesk
    fontSize: 16px
    fontWeight: 600
    lineHeight: 20px
    letterSpacing: -0.01em
  body-lg:
    fontFamily: Geist
    fontSize: 14px
    fontWeight: 500
    lineHeight: 18px
  body-md:
    fontFamily: Geist
    fontSize: 13px
    fontWeight: 400
    lineHeight: 17px
  body-sm:
    fontFamily: Geist
    fontSize: 12px
    fontWeight: 400
    lineHeight: 16px
  label-md:
    fontFamily: JetBrains Mono
    fontSize: 11px
    fontWeight: 600
    lineHeight: 14px
    letterSpacing: 0.04em
  label-sm:
    fontFamily: JetBrains Mono
    fontSize: 10px
    fontWeight: 500
    lineHeight: 12px
    letterSpacing: 0.06em
  label-xs:
    fontFamily: JetBrains Mono
    fontSize: 9px
    fontWeight: 700
    lineHeight: 11px
    letterSpacing: 0.08em

rounded:
  sm: 2px
  DEFAULT: 4px
  md: 3px
  lg: 6px
  xl: 8px
  full: 9999px

spacing:
  gutter: 0.75rem
  gutter-mobile: 0.5rem
  margin: 1rem
  margin-mobile: 0.75rem
  space-xs: 0.1875rem
  space-sm: 0.25rem
  space-md: 0.375rem
  space-lg: 0.5rem
  space-xl: 0.625rem

components:
  button-primary:
    backgroundColor: "{colors.primary-container}"
    textColor: "{colors.secondary}"
    borderColor: "{colors.secondary}"
    typography: "{typography.label-md}"
    rounded: "{rounded.md}"
    padding: "5px 8px"
  button-secondary:
    backgroundColor: "{colors.secondary}"
    textColor: "{colors.surface-container-lowest}"
    typography: "{typography.label-md}"
    rounded: "{rounded.md}"
    padding: "5px 8px"
  button-tertiary:
    backgroundColor: "{colors.surface-container-lowest}"
    textColor: "{colors.secondary}"
    borderColor: "{colors.secondary}"
    typography: "{typography.label-md}"
    rounded: "{rounded.md}"
    padding: "5px 8px"
  chip:
    backgroundColor: "{colors.surface-container-lowest}"
    textColor: "{colors.secondary}"
    borderColor: "{colors.secondary}"
    typography: "{typography.label-xs}"
    rounded: "{rounded.sm}"
    padding: "2px 4px"
  card:
    backgroundColor: "{colors.canvas-soft}"
    textColor: "{colors.secondary}"
    borderColor: "{colors.border-hairline}"
    rounded: "{rounded.md}"
    padding: "7px"
  text-input:
    backgroundColor: "{colors.surface-container-lowest}"
    textColor: "{colors.secondary}"
    borderColor: "{colors.border-hairline}"
    typography: "{typography.body-sm}"
    rounded: "{rounded.sm}"
    padding: "5px 6px"
  ai-coach-callout:
    backgroundColor: "{colors.surface-container-lowest}"
    textColor: "{colors.secondary}"
    borderColor: "{colors.border-hairline}"
    accentLeftBorder: "4px solid {colors.primary-container}"
    typography: "{typography.body-sm}"
    rounded: "{rounded.md}"
    padding: "8px 10px"
---

## Overview

Protocol Precision expresses a high-performance tactical interface engineered for competitive
esports analytics, telemetry breakdown and algorithmic AI coaching. It blends brutalist engineering
discipline with crisp technical minimalism: razor-sharp, distraction-free and calibrated for
ultra-fast cognitive ingestion.

**Key Characteristics:**

- Tactical brutalism & technical minimalism: strict containment, crisp `1px` borders, near-flat
  elevation and dense spatial metrics.
- High-contrast energy: off-white canvas `#f9f9f9` and `#f9fafb` panels against absolute black
  typographic infrastructure `#000000`, pierced by electric neon yellow `#f5f841`.
- Micro-radius geometry (`1px`–`6px`) and hard, blur-free offset shadows.

## Colors

### Palette Architecture

- **primary-container** (`#f5f841`): high-voltage neon yellow. Strictly reserved for high-priority
  CTAs, live AI callouts, win-probability spikes and active states. Always coupled with `#000000`.
- **primary** (`#616200`): olive accent for text on light surfaces.
- **secondary** (`#000000`): solid structural ink — hairlines, high-contrast badges, deep utility
  buttons and the entire typography hierarchy.
- **surface** (`#f9f9f9`): page canvas.
- **surface-container-lowest** (`#ffffff`): card/modal/popover surface.
- **canvas-soft** (`#f9fafb`): recessed data cards, telemetry grids and sidebars.
- **border-hairline** (`#000000`): pure black `1px` boundaries that contain modules without blurred
  shadows.
- **outline** (`#797861`) / **outline-variant** (`#cac8ad`): secondary text and weak dividers.
- **error** (`#ba1a1a`): loss/error states.

### Usage Rules

- Never use `#f5f841` for body copy, large container fills or decorative washes.
- Never introduce secondary chromatic colors (standard reds/blues/purples); status relies on black
  fills, wireframes and the neon yellow accent.

## Typography

### Font Pairing

- **Display & section headers (Space Grotesk):** technical, sharp, geometric posture for major
  metrics and section titles.
- **Body & continuous copy (Geist):** neutral, developer-grade legibility for breakdown paragraphs
  and coach recommendations.
- **Data, HUD eyebrows & telemetry (JetBrains Mono):** numerical tables, percentages, scores and
  micro-labels.

### Type Scale

| Token                  | Size | Weight | Line Height | Letter Spacing | Use                  |
| ---------------------- | ---- | ------ | ----------- | -------------- | -------------------- |
| `display-xl`           | 32px | 700    | 36px        | -0.03em        | Hero headline        |
| `display-xl-mobile`    | 24px | 700    | 28px        | -0.02em        | Mobile hero          |
| `headline-lg`          | 20px | 600    | 24px        | -0.02em        | Section heading      |
| `headline-md`          | 16px | 600    | 20px        | -0.01em        | Sub-section heading  |
| `body-lg`              | 14px | 500    | 18px        | 0              | Lead body            |
| `body-md`              | 13px | 400    | 17px        | 0              | Default body         |
| `body-sm`              | 12px | 400    | 16px        | 0              | Compact body         |
| `label-md`             | 11px | 600    | 14px        | 0.04em         | Labels (UPPER)       |
| `label-sm`             | 10px | 500    | 12px        | 0.06em         | Small labels (UPPER) |
| `label-xs`             | 9px  | 700    | 11px        | 0.08em         | Micro-chips (UPPER)  |

### Principles

- All label/eyebrow tokens (`label-xs`, `label-sm`, `label-md`) are rendered UPPERCASE.
- Numerical statistics and time deltas use tabular figures (`font-variant-numeric: tabular-nums`)
  via the monospaced family (`font-hud`).
- Maintain tight, punchy tracking across headings; avoid loose tracking on body copy.

## Layout

### Grid & Structure

- Desktop (≥ 1024px): 12-column grid, `0.75rem` gutters, `1rem` outer margins.
- Tablet (768–1023px): 6-column grid, `0.75rem` gutters.
- Mobile (< 768px): 2–4 column fluid grid, `0.5rem` gutters, `0.75rem` margins. Heavy tables switch
  to horizontal-scroll telemetry matrices.

### Spacing Density

Micro-increments (`3px`–`10px`). Card/module padding stays compressed (`5px`–`8px`) to maximize
above-the-fold telemetry density.

## Elevation & Depth

Structure comes from planar shifts and black hairlines — no gaussian blur, no multi-tier fuzz.

| Level                    | Treatment                                                          | Use                             |
| ------------------------ | ------------------------------------------------------------------ | ------------------------------- |
| Level 0 — Base Canvas    | `#f9f9f9`, flat                                                     | Viewport background             |
| Level 1 — Sub-panel      | `#f9fafb` + `1px solid #000000`                                     | Telemetry cards, tables, maps   |
| Level 2 — Active / hero  | `#ffffff` + `1px solid #000000` + `2px 2px 0 #000000` (or yellow underline) | Active/hover primary element    |
| Level 3 — Floating overlay | `#ffffff` + `1px solid #000000` + `3px 3px 0 #000000`              | Dropdowns, popovers, AI modals  |

Hard-shadow utilities live in `@theme` (`--shadow-hard-1|-2|-3|-4|-6` → `shadow-hard-*`).

## Shapes

### Border Radius Scale

| Token            | Value  | Use                                     |
| ---------------- | ------ | --------------------------------------- |
| `rounded-xs`     | 1px    | Inputs, pills, stat chips               |
| `rounded-sm`     | 2px    | Micro chips                             |
| `rounded-md`     | 3px    | Buttons, cards, utility containers      |
| `rounded-lg`     | 6px    | Larger surfaces                         |
| `rounded-xl`     | 8px    | Panels                                  |
| `rounded-full`   | 9999px | Rank badges, site markers, live dots    |

## Components

**`button-primary`**

- fill `#f5f841`; text & border `#000000`; radius 3px; padding `5px 8px`; hover keeps `#f5f841` with
  `1px 1px 0 #000000`.

**`button-secondary`**

- fill `#000000`; text `#ffffff`; radius 3px; padding `5px 8px`.

**`button-tertiary`**

- fill `#ffffff`; text `#000000`; border `1px solid #000000`; radius 3px; padding `5px 8px`.

**`chip`** — rectangular tag, radius 1px, padding `2px 4px`, `label-xs`. Default `#ffffff` + black
border; active/MVP/FIRST BLOOD uses `#f5f841` fill + `#000000` text.

**`card`** — fill `#f9fafb`, border `1px solid #000`, radius 3px, padding 7px. Internal grids split
by `1px solid #000` hairlines.

**`text-input`** — fill `#ffffff`, text `#000000`, border `1px solid #000`, radius 1px, padding
`5px 6px`, `body-sm`.

**`ai-coach-callout`** — fill `#ffffff`, border `1px solid #000`, left accent `4px solid #f5f841`,
radius 3px, padding `8px 10px`, eyebrow `label-xs` (`// PROTOCOL ADVICE: ROUND N`), body `body-sm`.

## Métricas derivadas

A HenrikDev/Riot não expõem todas as métricas exibidas. As ausentes que têm
fonte derivável são computadas em `src/services/analytics/**` (cobertura 100%)
e ficam documentadas aqui — o resto vira `—`, nunca número inventado.

### KAST%

`KAST% = (rounds com K, A, S ou T / total de rounds jogados) × 100`

- **K**ill: o jogador matou alguém no round.
- **A**ssist: o jogador assistiu um abate no round.
- **S**urvived: o jogador não morreu no round.
- **T**raded: o jogador morreu e um companheiro de time matou o assassino ainda
  no **mesmo round**.

Derivado de `rounds[]` + `kills[]` (killer/victim/assistants por PUUID). Sem
timeline de abates não há base → fica `null` (a view mostra `—`).

### Rating ValCoach

Métrica **composta** (não oficial) normalizada por referências de jogador médio
— na média de todas as dimensões o rating é exatamente **1.00**:

| Dimensão | Cálculo | Referência | Peso |
| --- | --- | --- | --- |
| Kill | KPR / ref | 0.70 | 0.35 |
| Assist | APR / ref | 0.25 | 0.10 |
| Survival | (1 − DPR) / ref | 0.50 | 0.20 |
| KAST | (KAST%/100) / ref | 0.70 | 0.20 |
| Entry | FKPR / ref | 0.13 | 0.15 |

As dimensões sem dado são omitidas e os pesos renormalizados entre as
restantes; sem rounds → `null`. Formulação em `src/services/analytics/rating.ts`.

### ADR (dano por round)

`ADR = dano causado / rounds jogados` — por jogador e por partida
(`computeAdr`, com 1 casa; sem rounds → `null`). É o correspondente
**por partida** da média ponderada de amostra usada no coaching
(`calculateAdr` em `adr.ts`).

### Metades por lado (DEF/ATK)

O payload v4 não traz o lado inicial. O time atacante de cada half é **inferido
dos plants** (só o atacante planta) e o outro half assume a troca de lados.
Sem plant em nenhum half, ou em partidas com overtime (>24 rounds), o rótulo é
omitido. Em `computeMatchHalves`, sempre na **perspectiva do jogador buscado**
(o time dele é o "aliado"): a página recebe o Riot ID via `?player=` e deriva
W/L, DEF/ATK e a linha "VOCÊ" no scoreboard. Sem `player`, a partida é neutra
(nem DEF/ATK, nem W/L).

### Card do jogador e chip de ranque

O card in-game do MVP (v1 account, `card.large`) é buscado best-effort
(`getPlayerCard`/`getCachedPlayerCard`) e exibido **quadrado** — nunca um
retrato circular de agente. O chip de ranque do scoreboard abrevia o tier real
com `formatRankChip` (`"Immortal 3"` → `IMM 3`). A faixa de MMR do cabeçalho
telemétrico sai de `computeRankRange` (menor–maior tier do scoreboard,
`"DIA 3 — IMM 2"`); sem tier reconhecido, é omitida — nunca fabricada.

### Timeline de rounds (tipo de encerramento, pistolas e placar)

`computeRoundTimeline` (em `match-breakdown.ts`) classifica cada round na
perspectiva do time do jogador buscado:

| Tipo | Regra (dados do payload) |
| --- | --- |
| `defuse` | o round teve `defused` (vitória da defesa) |
| `plant` | o time atacante venceu um round com plant |
| `retake` | a defesa venceu após o plant, sem defuse |
| `elim` | sem plant e o time derrotado foi totalmente eliminado |
| `time` | sem plant e o time derrotado sobreviveu (tempo esgotado) |

O lado (DEF/ATK) reusa a inferência de plants das metades; sem base, o lado é
omitido. Marca os rounds de pistola (1º de cada half regulamentar: R1 e R13) e
acumula o placar progressivo. Resumo: conversão de pistolas, rounds
ganhos/perdidos e aproveitamento — todos derivados dos eventos.

### Eficiência de arsenal

`aggregateWeaponKills(kills, killerPuuid?)` agrega os abates por arma do
jogador buscado (fallback: partida inteira sem `player`): share (%), first
kills (abates que abriram o round) e nº de rounds com abate. Dano e HS por arma
**não** existem no payload → omitidos. O medidor do card mostra o share.

## Do's and Don'ts

### Do

- Reserve `#f5f841` for high-priority CTAs, live callouts and active states.
- Contain modules with `1px` black hairlines instead of blurred shadows.
- Use the type scale for hierarchy — never arbitrary font sizes.
- Apply the micro-radius scale; keep interactive controls at `3px`.
- Use `font-hud` (tabular-nums) for every number.

### Don't

- Don't use `#f5f841` on large fills or body copy.
- Don't introduce a second chromatic accent.
- Don't use blurred/gaussian shadows — only hard offset shadows.
- Don't set display headlines in weights lighter than 600.
- Don't deviate from the border-radius scale.
