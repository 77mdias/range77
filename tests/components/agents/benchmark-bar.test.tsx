import { describe, expect, it } from 'vitest';
import { renderToStaticMarkup } from 'react-dom/server';
import { BenchmarkBar } from '@/components/agents';

describe('BenchmarkBar', () => {
  it('acima da referência usa fill acento e marcador do elo', () => {
    const html = renderToStaticMarkup(
      <BenchmarkBar
        label="K/D"
        playerValue="1.34"
        eloValue="1.05"
        playerPercent={67}
        eloPercent={52.5}
        above
        scale={['0.00', '1.05', '2.00']}
      />,
    );
    expect(html).toContain('data-component="benchmark-bar"');
    expect(html).toContain('data-testid="benchmark-player"');
    // O fill precisa ser bloco (div), senão inline ignora width/height e some.
    expect(html).toMatch(/<div[^>]*data-testid="benchmark-player"/);
    expect(html).toContain('width:67%');
    expect(html).toContain('left:52.5%');
    expect(html).toContain('bg-accent');
    expect(html).toContain('1.34 player');
    expect(html).toContain('2.00');
    // Track neutro (cinza do Stitch `secondary-fixed`) — o fill preto/amarelo precisa contrastar.
    expect(html).toContain('bg-surface-highest');
    expect(html).not.toContain('bg-line');
  });

  it('abaixo da referência usa fill tinta e chip vermelho', () => {
    const html = renderToStaticMarkup(
      <BenchmarkBar
        label="Headshot"
        playerValue="21%"
        eloValue="26%"
        playerPercent={40}
        eloPercent={52.5}
        above={false}
      />,
    );
    expect(html).toContain('bg-text-primary');
    expect(html).toContain('text-loss');
  });
});
