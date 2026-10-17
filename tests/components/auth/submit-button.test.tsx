import { describe, expect, it } from 'vitest';
import { renderToStaticMarkup } from 'react-dom/server';
import { SubmitButton } from '@/components/auth/submit-button';

describe('SubmitButton', () => {
  it('é type=submit e full-width com sombra dura', () => {
    const html = renderToStaticMarkup(<SubmitButton>ENTRAR</SubmitButton>);
    expect(html).toContain('data-submit-button');
    expect(html).toContain('type="submit"');
    expect(html).toContain('w-full');
    expect(html).toContain('shadow-hard-3');
    expect(html).toContain('ENTRAR');
  });

  it('desabilita e marca aria-busy ao carregar', () => {
    const html = renderToStaticMarkup(<SubmitButton loading>ENTRAR</SubmitButton>);
    expect(html).toContain('disabled');
    expect(html).toContain('aria-busy="true"');
  });
});
