import { describe, expect, it } from 'vitest';
import { renderToStaticMarkup } from 'react-dom/server';
import { SectionHeader } from '@/components/ui/section-header';

describe('SectionHeader', () => {
  it('renderiza título h2 com marcador quadrado por padrão', () => {
    const html = renderToStaticMarkup(<SectionHeader title="Histórico recente" />);
    expect(html).toContain('<h2');
    expect(html).toContain('Histórico recente');
    expect(html).toContain('bg-text-primary');
  });

  it('aceita anotação, marcador acento, meta e heading customizado', () => {
    const html = renderToStaticMarkup(
      <SectionHeader
        as="h3"
        title="Agentes"
        annotation="AGENT_PIPELINE"
        marker="accent"
        meta={<span>69 partidas</span>}
      />,
    );
    expect(html).toContain('<h3');
    expect(html).toContain('AGENT_PIPELINE');
    expect(html).toContain('bg-accent');
    expect(html).toContain('69 partidas');
  });
});
