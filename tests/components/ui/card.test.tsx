import { describe, expect, it } from 'vitest';
import { renderToStaticMarkup } from 'react-dom/server';
import { Card } from '@/components/ui/card';

/**
 * SUITE TDD — Card: superfície elevada (fundo canvas-soft, borda hairline,
 * raio discreto) com header/corpo.
 */

describe('Card', () => {
  it('usa a superfície elevada com borda e raio', () => {
    const html = renderToStaticMarkup(<Card>corpo</Card>);
    expect(html).toContain('rounded-lg');
    expect(html).toContain('border-line');
    expect(html).toContain('bg-surface-raised');
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
