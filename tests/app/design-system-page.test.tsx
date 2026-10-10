import { describe, expect, it } from 'vitest';
import { renderToStaticMarkup } from 'react-dom/server';
import DesignSystemPage from '@/app/design-system/page';

/**
 * SUITE TDD — styleguide viva (/design-system): renderiza todos os
 * componentes fora de produção e bloqueia (404) em produção.
 */

describe('DesignSystemPage', () => {
  it('renderiza a styleguide quando APP_ENV != prod', () => {
    const html = renderToStaticMarkup(<DesignSystemPage />);
    expect(html).toContain('data-design-system');
    expect(html).toContain('STYLEGUIDE VIVA');

    for (const section of [
      'Paleta',
      'Tipografia',
      'Formas',
      'Button',
      'Badge',
      'Table',
      'Tabs',
      'SearchBar',
      'MatchRow',
      'Skeleton',
      'Estados',
    ]) {
      expect(html).toContain(section);
    }
  });

  it('bloqueia com notFound em produção', () => {
    const previous = process.env.APP_ENV;
    process.env.APP_ENV = 'prod';
    try {
      expect(() => renderToStaticMarkup(<DesignSystemPage />)).toThrow();
    } finally {
      if (previous === undefined) {
        delete process.env.APP_ENV;
      } else {
        process.env.APP_ENV = previous;
      }
    }
  });
});
