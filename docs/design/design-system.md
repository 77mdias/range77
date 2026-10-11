# Design system — Protocol Precision

Direção visual de toda a interface, originada do projeto Stitch
("Valorant Stats Coach Tracker") e adotada como fonte de verdade dos tokens.

> **Fonte canônica completa:** [`DESIGN.md`](../../DESIGN.md) (front-matter com
> tokens + do's/don'ts). A styleguide viva é a rota `/design-system`
> (404 em produção).

## Conceito

Brutalismo tático + minimalismo técnico: contenção estrita, hairlines pretas
de `1px`, elevação quase plana (sombra dura, **sem blur**) e densidade espacial
de telemetria. Canvas off-white contra infraestrutura tipográfica preta,
perfurada por amarelo neon reservado a estados acionáveis.

## Cores

| Papel | Valor | Uso |
| --- | --- | --- |
| `surface` / canvas | `#f9f9f9` | fundo de página |
| `surface-container-lowest` | `#ffffff` | card/modal |
| `canvas-soft` | `#f9fafb` | card de telemetria |
| `primary-container` / accent | `#f5f841` | CTA, chips ativos, estados |
| `primary` (accent-ink) | `#616200` | texto de acento sobre claro |
| `secondary` / ink | `#000000` | tipografia, hairlines, badges |
| `border-hairline` | `#000000` | bordas `1px` |
| `outline` / outline-variant | `#797861` / `#cac8ad` | texto secundário, divisórias fracas |
| `error` / loss | `#ba1a1a` | erro/derrota |
| `tertiary` | `#2c676b` | acento técnico (teal) — contexto |

**Regras de uso:** nunca usar o amarelo em body copy ou grandes preenchimentos;
não introduzir uma segunda cor cromática (status depende de preenchimento preto,
wireframes e amarelo).

## Tipografia

Três famílias **self-hosted** via `next/font/local` (`.woff2` em
`src/app/fonts/`, licença OFL, subset latin):

| Papel | Família | Variável | Exemplos |
| --- | --- | --- | --- |
| Display/títulos | **Space Grotesk** | `--font-display` (`font-display`) | `display-xl`, `headline-lg`, `headline-md` |
| Corpo | **Geist** | `--font-body` (`font-body`) | `body-lg/md/sm` |
| Números/HUD | **JetBrains Mono** | `--font-hud` (`font-hud`) | `label-md/sm/xs` (tabular-nums) |

Pipeline: `localFont` → `--font-space-grotesk` / `--font-jetbrains-mono` /
`--font-geist` → `:root` → `--font-display` / `--font-hud` / `--font-body`
(`src/app/globals.css`). Escala com tamanho+line-height+tracking+peso definidos
em `@theme`. Todos os eyebrows/labels em **UPPERCASE**; todo número em
`font-hud`.

## Elevação e formas

| Nível | Tratamento | Uso |
| --- | --- | --- |
| 0 | `#f9f9f9` plano | fundo |
| 1 | `#f9fafb` + `1px #000` | cards, tabelas |
| 2 | `#fff` + `1px #000` + `2px 2px 0 #000` | elemento ativo/hover |
| 3 | `#fff` + `1px #000` + `3px 3px 0 #000` | dropdown/modal |

Utilitários de sombra dura em `@theme`: `--shadow-hard-1/-2/-3/-4/-6`
(`shadow-hard-*`). Micro-raio: `xs 1px` · `sm 2px` · `md 3px` (universal de
botões/cards) · `lg 6px` · `xl 8px` · `2xl 12px` · `full 9999px`.

## Tokens semânticos

Componentes usam **somente** os tokens semânticos (`@theme inline`), que
resolvem os primitivos no ponto de uso — trocar um primitivo re-mapeia o
sistema:

```
--color-surface  --color-surface-raised  --color-surface-recessed
--color-surface-hover  --color-line  --color-text-primary
--color-text-secondary  --color-accent  --color-accent-hover
--color-accent-ink  --color-on-accent
```

`--color-win`/`--color-loss` são lidos diretamente pelos componentes de status.
Motion: `--duration-fast 120ms` · `--duration-base 200ms` · `--duration-slow 320ms`
· `--ease-out-expo`. `prefers-reduced-motion` zera animações/transições; foco
sempre visível.

## Layout

Desktop 12 colunas (gutters `0.75rem`); tablet 6; mobile fluido (`0.5rem`) com
tabelas densas em scroll horizontal. Componentes de página usam container
full-bleed (`px-4 md:px-6 xl:px-8`).
