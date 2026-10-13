import { describe, expect, it, vi } from 'vitest';
import { renderToStaticMarkup } from 'react-dom/server';

/**
 * SUITE TDD — UpstreamErrorState: decide entre a tela de espera
 * (`UPSTREAM_RATE_LIMITED`) e o `ErrorState` comum.
 */

vi.mock('next/navigation', () => ({ useRouter: () => ({ refresh: vi.fn() }) }));

import { UpstreamErrorState } from '@/components/ui/states';

describe('UpstreamErrorState', () => {
  it('UPSTREAM_RATE_LIMITED → tela de espera com a contagem', () => {
    const html = renderToStaticMarkup(
      <UpstreamErrorState
        error={{ error: { code: 'UPSTREAM_RATE_LIMITED', message: 'Limite atingido.' } }}
        retryAfterSeconds={12}
      />,
    );

    expect(html).toContain('data-state="rate-limit"');
    expect(html).toContain('12s');
    expect(html).not.toContain('role="alert"');
  });

  it('demais erros → ErrorState comum (role=alert)', () => {
    const html = renderToStaticMarkup(
      <UpstreamErrorState
        error={{ error: { code: 'MATCH_NOT_FOUND', message: 'Partida não encontrada.' } }}
      />,
    );

    expect(html).toContain('role="alert"');
    expect(html).toContain('MATCH_NOT_FOUND');
    expect(html).not.toContain('data-state="rate-limit"');
  });
});
