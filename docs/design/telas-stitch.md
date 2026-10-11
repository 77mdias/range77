# Telas Stitch

Mapeamento entre as telas de referência do Google Stitch (projeto
`10337952812821192130`) e as rotas do app.

## Inventário

| # | Tela Stitch | screen id | Rota no app | Arquivo-chave |
| --- | --- | --- | --- | --- |
| 1 | Busca de Jogador & Apresentação do Ecossistema | `27e682689ef64c95971120332c86960c` | `/` | `src/app/home-landing.tsx` |
| 2 | Visão Geral do Jogador & AI Coaching Hub | `0afd6f3231cc4b2499b4336e9e12b049` | `/players/[region]/[name]/[tag]` | `.../profile-view.tsx` |
| 3 | Desempenho por Agente & Mapa | `0d982740f8b547b7bf8e8a811a6730ae` | seções `#agentes` / `#mapas` | `.../agents-maps-sections.tsx` |
| 4 | Histórico & Análise Profunda de Partida | `5d74c25c05b247e5a9be99ff50b76def` | `/matches/[matchId]` | `.../match-view.tsx` |
| 5 | Console API & IA Coaching Assistant | `7d1c0b3db8e14fbfa48e49556314ab86` | `/console` | `src/app/console/console-view.tsx` |
| — | DESIGN.md (referência de tokens) | `667638550059620293` | [`DESIGN.md`](../../DESIGN.md) / `/design-system` | — |

`design-stitch/` guarda os HTML de referência:
`player-search.html`, `partidas-breakdown.html`, `match.html`.

## Como reobter as referências

```
tools.stitch.list_screens({ projectId: '10337952812821192130' })
tools.stitch.get_screen({ name: 'projects/10337952812821192130/screens/<id>' })
```

Baixar `screenshot.downloadUrl` (PNG) e `htmlCode.downloadUrl` (HTML com o
Tailwind config dos tokens).

## Onde o app se afasta do Stitch (e por quê)

O Stitch é um dashboard de **um** jogador conectado; o app é público e
per-jogador. Campos sem suporte na HenrikDev **não** são simulados.

| Bloco do Stitch | Decisão no app |
| --- | --- |
| Replay telemétrico (scoreboard) | affordance **não** exibida como funcional |
| Tags econômicas por round | omitidas (não deriváveis) |
| Probabilidade de vitória (pré/pós-lance) | sem cálculo → omitida |
| ECON rating / ECON por jogador | `—` |
| Narrativa de IA por round | omitida (sem backend) |
| Benchmark por elo / médias / percentis | omitido |
| Peak rank | omitido |
| Perfis demo fictícios (4) | **1** perfil real (`twmz#tower`) por decisão do dono |
| Nav "chip do jogador conectado" | só existe com sessão real (Riot vinculado) |
| Fonte "FORMATO RIOT V3" | corrigida para a fonte real (**HenrikDev v4**) |

## Fases de implementação (histórico)

0. Fundação de tokens → A. Partida → B. Agentes & Mapas → C. Visão Geral →
D. Shell/Landing/Console. Detalhes em
[`plan/stitch-protocol-precision.md`](../../plan/stitch-protocol-precision.md).

Backlog de cálculos reais (campos `—`/omitidos) descrito em
[decisões](../arquitetura/decisoes.md).
