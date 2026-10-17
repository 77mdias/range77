import { describe, expect, it } from 'vitest';
import { renderToStaticMarkup } from 'react-dom/server';
import { StatStrip } from '@/components/auth/stat-strip';

describe('StatStrip', () => {
  it('renderiza label mono e valor em tabular-nums', () => {
    const html = renderToStaticMarkup(
      <StatStrip
        items={[
          { label: 'RTT LATENCY', value: '<14ms' },
          { label: 'AI CONFIDENCE', value: '99.4%' },
        ]}
      />,
    );
    expect(html).toContain('data-stat-strip');
    expect(html).toContain('RTT LATENCY');
    expect(html).toContain('&lt;14ms');
    expect(html).toContain('99.4%');
    expect(html).toContain('font-hud');
  });
});
