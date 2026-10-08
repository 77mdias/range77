import { describe, expect, it } from 'vitest';
import { renderToStaticMarkup } from 'react-dom/server';
import { Skeleton } from '@/components/ui/skeleton';

/**
 * SUITE TDD — Skeleton: bloco chanfrado pulsante com dimensões.
 */

describe('Skeleton', () => {
  it('renderiza bloco pulsante chanfrado e decorativo', () => {
    const html = renderToStaticMarkup(<Skeleton width="60%" height={16} />);
    expect(html).toContain('data-skeleton');
    expect(html).toContain('animate-pulse');
    expect(html).toContain('chamfer-sm');
    expect(html).toContain('aria-hidden="true"');
  });

  it('aplica largura e altura via style', () => {
    const html = renderToStaticMarkup(<Skeleton width={120} height="2rem" />);
    expect(html).toContain('width:120px');
    expect(html).toContain('height:2rem');
  });
});
