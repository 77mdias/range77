import { describe, expect, it } from 'vitest';
import { renderToStaticMarkup } from 'react-dom/server';
import { Icon } from '@/components/ui/icon';

describe('Icon', () => {
  it('renderiza o glifo com aria-hidden e data-icon', () => {
    const html = renderToStaticMarkup(<Icon name="search" />);
    expect(html).toContain('data-icon="search"');
    expect(html).toContain('aria-hidden="true"');
  });

  it('aplica os tamanhos', () => {
    expect(renderToStaticMarkup(<Icon name="bot" />)).toContain('size-3.5');
    expect(renderToStaticMarkup(<Icon name="bot" size="xs" />)).toContain('size-3');
    expect(renderToStaticMarkup(<Icon name="bot" size="md" />)).toContain('size-4');
  });
});
