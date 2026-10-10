import { describe, expect, it } from 'vitest';
import { renderToStaticMarkup } from 'react-dom/server';
import { AppFooter } from '@/components/layout/app-footer';

describe('AppFooter', () => {
  it('renderiza protocolo padrão e copyright da Riot', () => {
    const html = renderToStaticMarkup(<AppFooter />);
    expect(html).toContain('data-component="app-footer"');
    expect(html).toContain('Não afiliado à Riot Games');
  });

  it('aceita protocolo customizado e métricas de telemetria', () => {
    const html = renderToStaticMarkup(
      <AppFooter protocolText="VALCOACH // V4" metrics={['Latência: 12ms', 'Sync ok']} />,
    );
    expect(html).toContain('VALCOACH // V4');
    expect(html).toContain('Latência: 12ms');
    expect(html).toContain('Sync ok');
  });
});
