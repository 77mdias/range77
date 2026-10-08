import { describe, expect, it } from 'vitest';
import { renderToStaticMarkup } from 'react-dom/server';
import { Card } from '@/components/ui/card';

/**
 * SUITE TDD — Card: superfície elevada chanfrada com header/corpo.
 */

describe('Card', () => {
  it('usa a técnica aninhada do ChamferBox e a sombra dura', () => {
    const html = renderToStaticMarkup(<Card>corpo</Card>);
    expect(html).toContain('chamfer-box-bordered');
    expect(html).toContain('chamfer-box-inner');
    expect(html).toContain('shadow-hard');
    expect(html).toContain('--chamfer-inner-bg:var(--color-surface-raised)');
  });

  it('renderiza o header com label uppercase e slot de ação', () => {
    const html = renderToStaticMarkup(
      <Card label="Composição" action={<button type="button">Ação</button>}>
        corpo
      </Card>,
    );
    expect(html).toContain('Composição');
    expect(html).toContain('data-card-action');
    expect(html).toContain('Ação');
  });

  it('sem label/ação não renderiza o header', () => {
    expect(renderToStaticMarkup(<Card>corpo</Card>)).not.toContain('data-card-action');
  });

  it('renderiza o corpo', () => {
    expect(renderToStaticMarkup(<Card>conteudo-do-corpo</Card>)).toContain('conteudo-do-corpo');
  });
});
