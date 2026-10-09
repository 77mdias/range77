import { describe, expect, it } from 'vitest';
import { NextRequest } from 'next/server';
import { proxy } from '@/proxy';

/**
 * SUITE TDD — proxy (Next 16) que protege /dashboard por cookie de sessão.
 * Checagem OPTIMISTA (sem DB): cookie presente segue adiante; a validação
 * real da sessão é responsabilidade das páginas (auth.api.getSession).
 */

const requestAt = (path: string, cookie?: string): NextRequest =>
  new NextRequest(`http://localhost:3000${path}`, {
    headers: cookie === undefined ? {} : { cookie },
  });

describe('proxy — proteção de /dashboard', () => {
  it('redireciona para /login preservando o destino (?next=)', () => {
    const response = proxy(requestAt('/dashboard'));

    expect(response.status).toBe(307);
    expect(response.headers.get('location')).toBe(
      'http://localhost:3000/login?next=%2Fdashboard',
    );
  });

  it('segue adiante quando o cookie de sessão existe', () => {
    const response = proxy(requestAt('/dashboard', 'better-auth.session_token=token-abc'));

    expect(response.headers.get('x-middleware-next')).toBe('1');
  });

  it('trata requisições aninhadas do dashboard', () => {
    const response = proxy(requestAt('/dashboard/settings', 'better-auth.session_token=t'));

    expect(response.headers.get('x-middleware-next')).toBe('1');
  });
});
