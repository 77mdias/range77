import { describe, expect, it } from 'vitest';
import { renderToStaticMarkup } from 'react-dom/server';
import { LiveStatusStrip } from '@/components/home';
import { Button } from '@/components/ui/button';

describe('LiveStatusStrip', () => {
  it('renderiza mini-tiles com dot live no primeiro', () => {
    const html = renderToStaticMarkup(
      <LiveStatusStrip
        items={[
          { label: 'Latência API', value: '12 ms', live: true },
          { label: 'Jogadores indexados', value: '42.890+' },
        ]}
      />,
    );
    expect(html).toContain('data-component="live-status-strip"');
    expect(html).toContain('12 ms');
    expect(html).toContain('42.890+');
    expect(html).toContain('animate-pulse');
  });

  it('renderiza slot de ações', () => {
    const html = renderToStaticMarkup(
      <LiveStatusStrip
        items={[{ label: 'Patch Riot', value: 'v9.11 compat' }]}
        actions={<Button size="sm">Testar perfil demo</Button>}
      />,
    );
    expect(html).toContain('data-live-actions');
    expect(html).toContain('Testar perfil demo');
  });
});
