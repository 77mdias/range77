import { describe, expect, it } from 'vitest';
import { renderToStaticMarkup } from 'react-dom/server';
import { Badge } from '@/components/ui/badge';

/**
 * SUITE TDD — Badge: variantes W/L/accent/neutral.
 */

describe('Badge', () => {
  it('usa neutral por padrão', () => {
    const html = renderToStaticMarkup(<Badge>Tier</Badge>);
    expect(html).toContain('data-variant="neutral"');
    expect(html).toContain('border-line');
  });

  it('renderiza as variantes win/loss/accent com as cores corretas', () => {
    expect(renderToStaticMarkup(<Badge variant="win">W</Badge>)).toContain('text-win');
    expect(renderToStaticMarkup(<Badge variant="loss">L</Badge>)).toContain('text-loss');
    expect(renderToStaticMarkup(<Badge variant="accent">A</Badge>)).toContain('text-accent');
  });

  it('mescla className extra', () => {
    expect(renderToStaticMarkup(<Badge className="extra">X</Badge>)).toContain('extra');
  });
});
