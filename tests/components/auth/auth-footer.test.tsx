import { describe, expect, it } from 'vitest';
import { renderToStaticMarkup } from 'react-dom/server';
import { AuthFooter } from '@/components/auth/auth-footer';

describe('AuthFooter', () => {
  it('traz build, copyright de não-afiliação e os três links do Stitch', () => {
    const html = renderToStaticMarkup(<AuthFooter buildLabel="CONSOLE_BUILD: 2024.11.08-PROD" />);
    expect(html).toContain('data-auth-footer');
    expect(html).toContain('CONSOLE_BUILD: 2024.11.08-PROD');
    expect(html).toContain('Não afiliado à Riot Games');
    expect(html).toContain('Termos de Serviço');
    expect(html).toContain('Privacidade &amp; Telemetria');
    expect(html).toContain('Status do Sistema');
  });
});
