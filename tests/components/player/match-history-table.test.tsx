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
    // colunas alinhadas com o header (ACS presente antes de HS% e RR)
    expect(html).toContain('287');
    expect(html).toContain('31');
  });

  it('alinha Placar e K/D/A à esquerda (demais colunas numéricas seguem à direita)', () => {
    const html = renderToStaticMarkup(<MatchHistoryTable matches={MATCHES} />);

    const placarHeader = /<th[^>]*>Placar<\/th>/.exec(html)?.[0] ?? '';
    const kdaHeader = /<th[^>]*>K\/D\/A<\/th>/.exec(html)?.[0] ?? '';
    expect(placarHeader).toContain('Placar');
    expect(placarHeader).not.toContain('text-right');
    expect(kdaHeader).toContain('K/D/A');
    expect(kdaHeader).not.toContain('text-right');

    const placarCell = /<td[^>]*>13–9<\/td>/.exec(html)?.[0] ?? '';
    const kdaCell = /<td[^>]*>24\/14\/6<\/td>/.exec(html)?.[0] ?? '';
    expect(placarCell).toContain('font-hud');
    expect(placarCell).not.toContain('text-right');
    expect(kdaCell).toContain('font-hud');
    expect(kdaCell).not.toContain('text-right');

    // ACS (única coluna checada) permanece alinhada à direita
    expect(/<td[^>]*>287<\/td>/.exec(html)?.[0] ?? '').toContain('text-right');
  });

  it('emite HTML de tabela válido (link dentro de <td>, nunca filho de <tr>)', () => {
    const html = renderToStaticMarkup(<MatchHistoryTable matches={MATCHES} />);
    expect(html).toContain('data-match-history-link');
    // o <a> NÃO pode ser filho direto de <tr> (HTML inválido / aviso do React)
    expect(html).not.toMatch(/<tr[^>]*>\s*<a[^>]*data-match-history-link/);
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
