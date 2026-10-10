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
});
