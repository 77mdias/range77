import { describe, expect, it } from 'vitest';
import { renderToStaticMarkup } from 'react-dom/server';
import { ScoreboardTable, type ScoreboardTeam } from '@/components/match';

const TEAMS: readonly ScoreboardTeam[] = [
  {
    name: 'Time aliado',
    won: true,
    roundsWon: 13,
    avgRating: 1.18,
    econRating: 74.2,
    totalDamage: 15820,
    players: [
      {
        name: 'TenZ',
        tag: 'BR1',
        rank: 'Ascendant 3',
        rankIconSrc: '/assets/images/ranks/ascendant-3.png',
        agent: 'Jett',
        acs: 287,
        kills: 24,
        deaths: 14,
        assists: 6,
        kdDiff: 10,
        hsPercentage: 31,
      },
      {
        name: 'Derke',
        agent: 'Raze',
        acs: 232,
        kills: 19,
        deaths: 17,
        assists: 4,
        kdDiff: 2,
        hsPercentage: 28,
      },
    ],
  },
];

describe('ScoreboardTable', () => {
  it('exibe o cabeçalho telemétrico com badges e faixa de MMR', () => {
    const html = renderToStaticMarkup(
      <ScoreboardTable teams={TEAMS} rankRange="ASC 1 — IMM 2" />,
    );
    expect(html).toContain('Tabela telemétrica da partida');
    expect(html).toContain('All roles computed');
    expect(html).toContain('ASC 1 — IMM 2');
  });

  it('renderiza header do time com resumo telemétrico', () => {
    const html = renderToStaticMarkup(<ScoreboardTable teams={TEAMS} />);
    expect(html).toContain('data-component="scoreboard-table"');
    expect(html).toContain('13 ROUNDS');
    expect(html).toContain('1.18');
    expect(html).toContain('15.820');
  });

  it('renderiza linhas de jogadores com +/- colorido', () => {
    const html = renderToStaticMarkup(<ScoreboardTable teams={TEAMS} />);
    expect(html).toContain('TenZ');
    expect(html).toContain('#BR1');
    expect(html).toContain('+10');
    expect(html).toContain('text-win');
    // Logo do elo junto ao nickname (chip do ranque).
    expect(html).toContain('/assets/images/ranks/ascendant-3.png');
  });

  it('jogador sem rankIconSrc mantém o chip só de texto (sem img)', () => {
    const html = renderToStaticMarkup(<ScoreboardTable teams={TEAMS} />);
    // Derke não tem rank → nenhum chip; TenZ tem exatamente 1 <img> de elo.
    // (Contamos as tags <img>, não a URL: o React 19 também emite um
    // <link rel="preload" as="image"> para o mesmo asset.)
    const rankImgs = html.match(/<img[^>]*\/assets\/images\/ranks\//g) ?? [];
    expect(rankImgs).toHaveLength(1);
  });

  it('exibe o logo do elo no jogador buscado (VOCÊ) — só o ícone, sem texto duplicado', () => {
    const html = renderToStaticMarkup(
      <ScoreboardTable
        teams={[
          {
            name: 'Time Red',
            label: 'Time aliado',
            isViewerTeam: true,
            players: [
              {
                name: 'TenZ',
                tag: 'BR1',
                rank: 'Immortal 3',
                rankIconSrc: '/assets/images/ranks/immortal-3.png',
                agent: 'Jett',
                agentIconSrc: '/assets/images/agents/jett.png',
                acs: 300,
                kills: 24,
                deaths: 14,
                assists: 6,
                kdDiff: 10,
                adr: 184.2,
                hsPercentage: 30,
                isViewer: true,
              },
            ],
          },
        ]}
      />,
    );
    expect(html).toContain('/assets/images/ranks/immortal-3.png');
    // Ícone SOZINHO ao lado do nickname (maior, com tooltip do tier): o chip
    // abreviado "IMM 3" não é renderizado quando há asset — o tier por extenso
    // já aparece na segunda linha.
    expect(html).not.toContain('IMM 3');
    expect(html).toContain('Immortal 3');
    expect(html).toContain('size-6 shrink-0 object-contain');
    expect(html).toContain('title="Immortal 3"');
  });

  it('renderiza colunas KAST%/FK-FD/ECON com dado real e fallback —', () => {
    const html = renderToStaticMarkup(
      <ScoreboardTable
        teams={[
          {
            name: 'T',
            players: [
              {
                name: 'Real',
                agent: 'Omen',
                acs: 200,
                kills: 15,
                deaths: 10,
                assists: 5,
                kdDiff: 5,
                hsPercentage: 20,
                kastPercentage: 72,
                firstBloods: 3,
                firstDeaths: 1,
                econRating: 68.4,
              },
              {
                name: 'SemDado',
                agent: 'Sova',
                acs: 100,
                kills: 5,
                deaths: 15,
                assists: 2,
                kdDiff: -10,
                hsPercentage: null,
              },
            ],
          },
        ]}
      />,
    );
    expect(html).toContain('KAST %');
    expect(html).toContain('FK / FD');
    expect(html).toContain('ADR');
    expect(html).toContain('ECON');
    expect(html).toContain('3 / 1');
    expect(html).toContain('68.4');
    expect(html).toContain('72%');
    expect(html).toContain('—');
  });

  it('destaca a linha do jogador buscado com VOCÊ e chip abreviado (fallback sem asset)', () => {
    const html = renderToStaticMarkup(
      <ScoreboardTable
        teams={[
          {
            name: 'Time Red',
            label: 'Time aliado',
            isViewerTeam: true,
            players: [
              {
                name: 'TenZ',
                tag: 'BR1',
                rank: 'Immortal 3',
                agent: 'Jett',
                agentIconSrc: '/assets/images/agents/jett.png',
                acs: 300,
                kills: 24,
                deaths: 14,
                assists: 6,
                kdDiff: 10,
                adr: 184.2,
                hsPercentage: 30,
                isViewer: true,
              },
            ],
          },
        ]}
      />,
    );
    expect(html).toContain('VOCÊ');
    expect(html).toContain('data-viewer="true"');
    expect(html).toContain('Time aliado');
    // Sem asset do tier → fallback no chip abreviado + tier por extenso na
    // segunda linha.
    expect(html).toContain('IMM 3');
    expect(html).toContain('Immortal 3');
    // ADR computado exibido.
    expect(html).toContain('184.2');
    // Ícone do agente quadrado (sem raio circular).
    expect(html).toContain('size-6 shrink-0 border border-line object-cover');
    expect(html).not.toContain('rounded-full');
  });

  it('KD negativo usa vermelho', () => {
    const html = renderToStaticMarkup(
      <ScoreboardTable
        teams={[
          {
            name: 'T',
            players: [
              {
                name: 'X',
                agent: 'Omen',
                acs: 120,
                kills: 5,
                deaths: 15,
                assists: 2,
                kdDiff: -10,
                hsPercentage: 10,
              },
            ],
          },
        ]}
      />,
    );
    expect(html).toContain('text-loss');
  });

  it('cabeçalhos de stats são botões ordenáveis (modo automático por padrão)', () => {
    const html = renderToStaticMarkup(<ScoreboardTable teams={TEAMS} />);
    expect(html).toContain('data-sort-key="acs"');
    expect(html).toContain('data-sort-key="adr"');
    expect(html).toContain('data-sort-key="econ"');
    expect(html).toContain('data-sort-mode="auto"');
    expect(html).toContain('aria-sort="none"');
    expect(html).toContain('Ordenar por ACS');
    // Modo automático preserva a ordem original das linhas.
    expect(html.indexOf('TenZ')).toBeLessThan(html.indexOf('Derke'));
  });
});
