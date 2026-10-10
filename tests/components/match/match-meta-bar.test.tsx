import { describe, expect, it } from 'vitest';
import { renderToStaticMarkup } from 'react-dom/server';
import { MatchMetaBar } from '@/components/match';

describe('MatchMetaBar', () => {
  it('renderiza fila, mapa e detalhes', () => {
    const html = renderToStaticMarkup(
      <MatchMetaBar queue="Competitivo" map="Ascent" details={['35:12', 'São Paulo 1', 'ID 8842']} />,
    );
    expect(html).toContain('data-component="match-meta-bar"');
    expect(html).toContain('Competitivo');
    expect(html).toContain('Ascent');
    expect(html).toContain('35:12');
  });

  it('chip de RR positivo usa acento e negativo usa tinta', () => {
    expect(renderToStaticMarkup(<MatchMetaBar queue="Q" map="M" rrDelta={22} />)).toContain(
      'bg-accent',
    );
    expect(
      renderToStaticMarkup(
        <MatchMetaBar queue="Q" map="M" rrDelta={-18} rrLabel="ASC 3 • 84/100" />,
      ),
    ).toContain('bg-text-primary');
    expect(
      renderToStaticMarkup(<MatchMetaBar queue="Q" map="M" rrDelta={-18} />),
    ).toContain('-18');
  });

  it('omite o chip quando rrDelta ausente', () => {
    expect(renderToStaticMarkup(<MatchMetaBar queue="Q" map="M" />)).not.toContain('data-rr-delta');
  });
});
