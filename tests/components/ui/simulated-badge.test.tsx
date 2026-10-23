import { describe, expect, it } from 'vitest';
import { renderToStaticMarkup } from 'react-dom/server';
import { SimulatedBadge } from '@/components/ui/simulated-badge';
import { PlayerHeader } from '@/components/player';

describe('SimulatedBadge', () => {
  it('renderiza o texto exato e o data-attribute', () => {
    const html = renderToStaticMarkup(<SimulatedBadge />);
    expect(html).toContain('data-simulated-badge');
    expect(html).toContain('>DADOS SIMULADOS<');
  });

  it('PlayerHeader mostra o selo só quando simulated', () => {
    expect(renderToStaticMarkup(<PlayerHeader name="a" tag="b" simulated />)).toContain(
      'data-simulated-badge',
    );
    expect(renderToStaticMarkup(<PlayerHeader name="a" tag="b" />)).not.toContain(
      'data-simulated-badge',
    );
  });
});
