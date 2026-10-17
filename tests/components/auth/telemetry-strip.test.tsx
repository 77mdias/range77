import { describe, expect, it } from 'vitest';
import { renderToStaticMarkup } from 'react-dom/server';
import { TelemetryStrip } from '@/components/auth/telemetry-strip';

describe('TelemetryStrip', () => {
  it('separa os itens com um pipe decorativo', () => {
    const html = renderToStaticMarkup(
      <TelemetryStrip items={['NODE: SA-BR-01', 'RIOT API RATELIMIT: 99.8% HEALTHY']} />,
    );
    expect(html).toContain('data-telemetry-strip="banner"');
    expect(html).toContain('NODE: SA-BR-01');
    expect(html).toContain('RIOT API RATELIMIT: 99.8% HEALTHY');
    expect(html).toContain('aria-hidden="true">|</span>');
  });

  it('a variante bar aceita um trailing à direita', () => {
    const html = renderToStaticMarkup(
      <TelemetryStrip variant="bar" items={['LATENCY: 12ms (SA-EAST)']} trailing={<em>SYS_ENV</em>} />,
    );
    expect(html).toContain('data-telemetry-strip="bar"');
    expect(html).toContain('<em>SYS_ENV</em>');
  });
});
