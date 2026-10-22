import { RIOT_LEGAL_NOTICE } from '@/lib/legal';
import { describe, expect, it } from 'vitest';
import { renderToStaticMarkup } from 'react-dom/server';
import { AuthFooter } from '@/components/auth/auth-footer';

describe('AuthFooter', () => {
  it('traz build, copyright de não-afiliação e os três links do Stitch', () => {
    const html = renderToStaticMarkup(<AuthFooter buildLabel="CONSOLE_BUILD: 2024.11.08-PROD" />);
    expect(html).toContain('data-auth-footer');
    expect(html).toContain('CONSOLE_BUILD: 2024.11.08-PROD');
    expect(html).toContain(RIOT_LEGAL_NOTICE.replace(/'/g, '&#x27;'));
    expect(html).toContain('href="/termos"');
    expect(html).toContain('href="/privacidade"');
    expect(html).toContain('Termos de Serviço');
    expect(html).toContain('Privacidade &amp; Telemetria');
    expect(html).toContain('Status do Sistema');
  });
});
