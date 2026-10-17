import { describe, expect, it } from 'vitest';
import { renderToStaticMarkup } from 'react-dom/server';
import { TelemetryPanel } from '@/components/auth/telemetry-panel';

describe('TelemetryPanel', () => {
  it('renderiza eyebrow com prefixo //, badge, título e corpo', () => {
    const html = renderToStaticMarkup(
      <TelemetryPanel eyebrow="PIPELINE SEGURO 3-LAYER" badge="TELEMETRY ON" title="Rede Ativa">
        corpo
      </TelemetryPanel>,
    );
    expect(html).toContain('data-telemetry-panel');
    expect(html).toContain('//');
    expect(html).toContain('PIPELINE SEGURO 3-LAYER');
    expect(html).toContain('TELEMETRY ON');
    expect(html).toContain('Rede Ativa');
  });

  it('a variante accent ganha barra amarela e sombra dura', () => {
    const html = renderToStaticMarkup(<TelemetryPanel accent eyebrow="X">y</TelemetryPanel>);
    expect(html).toContain('data-accent');
    expect(html).toContain('border-l-accent');
    expect(html).toContain('shadow-hard-2');
  });

  it('aceita um footer', () => {
    const html = renderToStaticMarkup(
      <TelemetryPanel eyebrow="X" footer={<span data-foot />}>y</TelemetryPanel>,
    );
    expect(html).toContain('data-foot');
  });
});
