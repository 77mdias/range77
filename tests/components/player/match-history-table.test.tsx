import { describe, expect, it } from 'vitest';
import { renderToStaticMarkup } from 'react-dom/server';
import { MatchHistoryTable, type MatchHistoryEntry } from '@/components/player';

const MATCHES: readonly MatchHistoryEntry[] = [
  {
    id: 'm1',
    agent: 'Jett',
    map: 'Ascent',
    result: 'win',
    scoreTeam: 13,
    scoreEnemy: 9,
    kills: 24,
    deaths: 14,
    assists: 6,
    kd: 1.71,
    acs: 287,
    hsPercentage: 31,
    rrDelta: 22,
  },
  {
    id: 'm2',
    agent: 'Omen',
    map: 'Haven',
    result: 'loss',
    scoreTeam: 9,
    scoreEnemy: 13,
    kills: 11,
    deaths: 19,
    assists: 3,
    kd: 0.58,
    acs: 164,
    hsPercentage: 18,
    rrDelta: -18,
    href: '/matches/m2',
  },
];

describe('MatchHistoryTable', () => {
  it('renderiza colunas e linhas com placar e K/D/A', () => {
    const html = renderToStaticMarkup(<MatchHistoryTable matches={MATCHES} />);
    expect(html).toContain('data-component="match-history-table"');
    expect(html).toContain('13–9');
    expect(html).toContain('24/14/6');
    expect(html).toContain('Ascent');
  });

  it('destaca K/D positivo e RR delta negativo', () => {
    const html = renderToStaticMarkup(<MatchHistoryTable matches={MATCHES} />);
    expect(html).toContain('text-win');
    expect(html).toContain('text-loss');
    expect(html).toContain('-18');
  });

  it('linha com href recebe stretched link acessível', () => {
    const html = renderToStaticMarkup(<MatchHistoryTable matches={MATCHES} />);
    expect(html).toContain('data-match-history-link');
    expect(html).toContain('aria-label="Detalhes da partida em Haven"');
  });

  it('sem partidas renderiza EmptyState', () => {
    const html = renderToStaticMarkup(<MatchHistoryTable matches={[]} />);
    expect(html).not.toContain('match-history-table');
    expect(html).toContain('Sem partidas');
  });
});
