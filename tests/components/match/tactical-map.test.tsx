import { describe, expect, it } from 'vitest';
import { renderToStaticMarkup } from 'react-dom/server';
import { TacticalMap } from '@/components/match';

describe('TacticalMap', () => {
  it('renderiza título, zonas, rota e nós', () => {
    const html = renderToStaticMarkup(
      <TacticalMap
        title="Posicionamento & Kills (Ascent)"
        meta="Camada: Round 4"
        zones={[{ x: 10, y: 10, width: 60, height: 40, label: 'A-Site' }]}
        path={[
          { x: 20, y: 20 },
          { x: 80, y: 60 },
        ]}
        kills={[{ x: 100, y: 100, label: 'You' }]}
        deaths={[{ x: 200, y: 150 }]}
        enemies={[{ x: 250, y: 60 }]}
      />,
    );
    expect(html).toContain('data-component="tactical-map"');
    expect(html).toContain('A-Site');
    expect(html).toContain('Camada: Round 4');
    expect(html).toContain('stroke-dasharray="3 3"');
  });

  it('exibe legenda e botão de heatmap', () => {
    const html = renderToStaticMarkup(<TacticalMap title="Mapa" />);
    expect(html).toContain('Kill');
    expect(html).toContain('Morte');
    expect(html).toContain('aria-pressed="false"');
  });

  it('sem rota não desenha path', () => {
    const html = renderToStaticMarkup(<TacticalMap title="Mapa" />);
    expect(html).not.toContain('stroke-dasharray="4 2"');
  });
});
