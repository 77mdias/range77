import { describe, expect, it } from 'vitest';
import { renderToStaticMarkup } from 'react-dom/server';
import { AuthTerminal } from '@/components/auth/auth-terminal';

describe('AuthTerminal', () => {
  it('abre com a linha de protocolo e o badge de porta', () => {
    const html = renderToStaticMarkup(
      <AuthTerminal protocolLine="// PROTOCOLO DE ACESSO" metaBadge="PORT: 443">
        <span data-body />
      </AuthTerminal>,
    );
    expect(html).toContain('data-auth-terminal');
    expect(html).toContain('// PROTOCOLO DE ACESSO');
    expect(html).toContain('PORT: 443');
    expect(html).toContain('data-body');
    expect(html).toContain('shadow-hard-3');
  });
});
