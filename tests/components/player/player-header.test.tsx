import { describe, expect, it } from 'vitest';
import { renderToStaticMarkup } from 'react-dom/server';
import { PlayerHeader } from '@/components/player';

describe('PlayerHeader', () => {
  it('renderiza nome#tag com iniciais no avatar', () => {
    const html = renderToStaticMarkup(<PlayerHeader name="TenZ" tag="BR1" />);
    expect(html).toContain('data-component="player-header"');
    expect(html).toContain('TenZ');
    expect(html).toContain('#BR1');
    expect(html).toContain('TE');
  });

  it('exibe badge de nível sobreposto e rank', () => {
    const html = renderToStaticMarkup(
      <PlayerHeader name="TenZ" tag="BR1" level={242} rank="Ascendant 3" verified />,
    );
    expect(html).toContain('LVL 242');
    expect(html).toContain('Ascendant 3');
    expect(html).toContain('Verificado');
  });

  it('renderiza linha de meta com separadores', () => {
    const html = renderToStaticMarkup(
      <PlayerHeader
        name="TenZ"
        tag="BR1"
        meta={[
          { label: 'Região', value: 'BR' },
          { label: 'RR Pool', value: '144 RR' },
        ]}
      />,
    );
    expect(html).toContain('Região');
    expect(html).toContain('144 RR');
  });
});
