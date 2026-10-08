import { describe, expect, it, vi } from 'vitest';
import { renderToStaticMarkup } from 'react-dom/server';

/**
 * SUITE TDD — página do detalhe: validação de params/região (branch síncrona).
 */

vi.mock('@/lib/cache/tracker', () => ({ getCachedMatchDetail: vi.fn() }));

import MatchPage from '@/app/matches/[matchId]/page';

const MATCH_ID = 'a1b2c3d4-e5f6-7890-abcd-ef1234567890';

const render = async (region: string, matchId: string) => {
  const element = await MatchPage({
    params: Promise.resolve({ matchId }),
    searchParams: Promise.resolve({ region }),
  });
  return renderToStaticMarkup(element);
};

describe('MatchPage', () => {
  it('região inválida → ErrorState INVALID_PARAMS', async () => {
    const html = await render('mars', MATCH_ID);
    expect(html).toContain('INVALID_PARAMS');
    expect(html).toContain('Região inválida');
  });

  it('matchId inválido → ErrorState INVALID_PARAMS', async () => {
    expect(await render('br', 'not-a-uuid')).toContain('INVALID_PARAMS');
  });
});
