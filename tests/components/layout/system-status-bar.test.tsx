import { describe, expect, it } from 'vitest';
import { renderToStaticMarkup } from 'react-dom/server';
import { SystemStatusBar } from '@/components/layout/system-status-bar';

describe('SystemStatusBar', () => {
  it('renderiza mensagem tática com dot pulsante', () => {
    const html = renderToStaticMarkup(
      <SystemStatusBar message="MOTOR TÁTICO v4.2 • 3-LAYER PIPELINE" />,
    );
    expect(html).toContain('data-component="system-status-bar"');
    expect(html).toContain('MOTOR TÁTICO v4.2');
    expect(html).toContain('animate-pulse');
  });

  it('renderiza status operacionais com ícones e separador', () => {
    const html = renderToStaticMarkup(
      <SystemStatusBar
        message="X"
        statuses={[
          { icon: 'target', label: 'Latência: <150ms' },
          { icon: 'shield', label: 'Riot v9.11 compliant' },
        ]}
      />,
    );
    expect(html).toContain('data-status-items');
    expect(html).toContain('Latência: &lt;150ms');
    expect(html).toContain('Riot v9.11 compliant');
    expect(html).toContain('data-icon="shield"');
  });
});
