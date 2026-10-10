import { describe, expect, it } from 'vitest';
import { renderToStaticMarkup } from 'react-dom/server';
import { InfoCallout } from '@/components/ui/info-callout';

describe('InfoCallout', () => {
  it('renderiza label //, corpo e ícone info', () => {
    const html = renderToStaticMarkup(
      <InfoCallout label="PROPRIEDADE ARQUITETURAL">
        A camada 3 reduz o payload em <strong>91%</strong>.
      </InfoCallout>,
    );
    expect(html).toContain('data-component="info-callout"');
    expect(html).toContain('data-icon="info"');
    expect(html).toContain('PROPRIEDADE ARQUITETURAL');
    expect(html).toContain('91%');
  });
});
