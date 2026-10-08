import { describe, expect, it } from 'vitest';
import { renderToStaticMarkup } from 'react-dom/server';
import { MatchRow } from '@/components/ui/match-row';

/**
 * SUITE TDD — MatchRow: mapa, Badge W/L, K/D/A, ACS, HS% e data relativa.
 */

const NOW = new Date('2026-10-08T18:00:00.000Z');
const PLAYED_AT = '2026-10-06T18:00:00.000Z';

describe('MatchRow', () => {
  it('renderiza mapa, resultado, K/D/A, ACS, HS% e tempo relativo', () => {
    const html = renderToStaticMarkup(
      <MatchRow
        map="Ascent"
        result="win"
        kills={24}
        deaths={14}
        assists={6}
        acs={287}
        hsPercentage={31}
        playedAt={PLAYED_AT}
        now={NOW}
      />,
    );

    expect(html).toContain('Ascent');
    expect(html).toContain('>W<');
    expect(html).toContain('24/14/6');
    expect(html).toContain('287');
    expect(html).toContain('31%');
    expect(html).toContain('há 2 d');
  });

  it('derrota usa Badge de loss com L', () => {
    const html = renderToStaticMarkup(
      <MatchRow
        map="Haven"
        result="loss"
        kills={11}
        deaths={19}
        assists={3}
        acs={164}
        playedAt={PLAYED_AT}
        now={NOW}
      />,
    );
    expect(html).toContain('data-variant="loss"');
    expect(html).toContain('>L<');
  });

  it('com href vira link para o detalhe da partida', () => {
    const html = renderToStaticMarkup(
      <MatchRow
        map="Ascent"
        result="win"
        kills={1}
        deaths={1}
        assists={1}
        acs={100}
        playedAt={PLAYED_AT}
        now={NOW}
        href="/matches/abc"
      />,
    );
    expect(html).toContain('<a');
    expect(html).toContain('href="/matches/abc"');
  });

  it('sem HS% não renderiza a métrica', () => {
    const html = renderToStaticMarkup(
      <MatchRow
        map="Ascent"
        result="win"
        kills={1}
        deaths={1}
        assists={1}
        acs={100}
        playedAt={PLAYED_AT}
        now={NOW}
      />,
    );
    expect(html).not.toContain('%');
  });
});
