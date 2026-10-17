import { describe, expect, it } from 'vitest';
import { renderToStaticMarkup } from 'react-dom/server';
import { Icon } from '@/components/ui/icon';

describe('ícones de visibilidade', () => {
  it('renderiza eye com pupila (circle) e contorno', () => {
    const html = renderToStaticMarkup(<Icon name="eye" />);
    expect(html).toContain('data-icon="eye"');
    expect(html).toContain('<circle cx="8" cy="8" r="2"');
    expect(html).toContain('<path d="M1.5 8S4 3.5 8 3.5');
  });

  it('renderiza eye-off com a barra diagonal', () => {
    const html = renderToStaticMarkup(<Icon name="eye-off" />);
    expect(html).toContain('data-icon="eye-off"');
    expect(html).toContain('<path d="M2.5 2.5l11 11"');
  });
});
