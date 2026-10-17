import { describe, expect, it } from 'vitest';
import { renderToStaticMarkup } from 'react-dom/server';
import { InfoRow } from '@/components/auth/info-row';

describe('InfoRow', () => {
  it('mostra ícone, título e descrição', () => {
    const html = renderToStaticMarkup(
      <InfoRow icon="shield" title="Criptografia Local de Tokens">
        Armazenamento zero-knowledge.
      </InfoRow>,
    );
    expect(html).toContain('data-info-row');
    expect(html).toContain('data-icon="shield"');
    expect(html).toContain('Criptografia Local de Tokens');
    expect(html).toContain('zero-knowledge');
  });

  it('funciona sem ícone', () => {
    const { length } = renderToStaticMarkup(<InfoRow title="Só título">corpo</InfoRow>);
    expect(length).toBeGreaterThan(0);
    expect(renderToStaticMarkup(<InfoRow title="Só título">corpo</InfoRow>)).not.toContain('data-icon');
  });
});
