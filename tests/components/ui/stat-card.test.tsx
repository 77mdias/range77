import { describe, expect, it } from 'vitest';
import { renderToStaticMarkup } from 'react-dom/server';
import { StatCard } from '@/components/ui/stat-card';

/**
 * SUITE TDD — StatCard: valor em font-hud, delta ▲/▼ e slot de sparkline.
 */

describe('StatCard', () => {
  it('renderiza label e valor em font-hud', () => {
    const html = renderToStaticMarkup(<StatCard label="K/D" value="1.34" />);
    expect(html).toContain('K/D');
    expect(html).toContain('1.34');
    expect(html).toContain('font-hud');
  });

  it('delta positivo usa tendência up e seta ▲', () => {
    const html = renderToStaticMarkup(<StatCard label="ACS" value="248" delta={12} />);
    expect(html).toContain('data-trend="up"');
    expect(html).toContain('▲');
    expect(html).toContain('text-win');
  });

  it('delta negativo usa tendência down e seta ▼', () => {
    const html = renderToStaticMarkup(<StatCard label="ACS" value="248" delta={-15} deltaSuffix="pp" />);
    expect(html).toContain('data-trend="down"');
    expect(html).toContain('▼');
    expect(html).toContain('text-loss');
    expect(html).toContain('15pp');
  });

  it('sem delta não renderiza indicador', () => {
    expect(renderToStaticMarkup(<StatCard label="X" value="1" />)).not.toContain('data-trend');
  });

  it('renderiza o slot de sparkline quando fornecido', () => {
    const html = renderToStaticMarkup(
      <StatCard label="HS%" value="27" sparkline={<span>SPARK</span>} />,
    );
    expect(html).toContain('SPARK');
  });
});
