import { describe, expect, it } from 'vitest';
import { renderToStaticMarkup } from 'react-dom/server';
import { AuthDivider } from '@/components/auth/auth-divider';

describe('AuthDivider', () => {
  it('centraliza o rótulo entre duas réguas decorativas', () => {
    const html = renderToStaticMarkup(<AuthDivider label="OU ACESSE COM E-MAIL E SENHA" />);
    expect(html).toContain('data-auth-divider');
    expect(html).toContain('OU ACESSE COM E-MAIL E SENHA');
    expect(html.match(/aria-hidden="true"/g)?.length).toBe(2);
  });
});
