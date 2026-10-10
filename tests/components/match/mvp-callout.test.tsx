import { describe, expect, it } from 'vitest';
import { renderToStaticMarkup } from 'react-dom/server';
import { MvpCallout } from '@/components/match';

describe('MvpCallout', () => {
  it('renderiza fita MVP, jogador, agente e micro-métricas', () => {
    const html = renderToStaticMarkup(
      <MvpCallout
        playerName="TenZ"
        agent="Jett"
        rank="Ascendant 3"
        stats={[{ label: 'K/D/A', value: '24/14/6' }]}
        metrics={[
          { label: 'ACS', value: '312' },
          { label: 'HS', value: '34.8%' },
          { label: 'KAST', value: '81.8%' },
        ]}
      />,
    );
    expect(html).toContain('data-component="mvp-callout"');
    expect(html).toContain('MVP');
    expect(html).toContain('TenZ');
    expect(html).toContain('Jett');
    expect(html).toContain('312');
    expect(html).toContain('81.8%');
  });
});
