import { describe, expect, it } from 'vitest';
import { parseMatchRouteParams } from '@/lib/validation/match-params';

/**
 * SUITE TDD — validação de parâmetros de partida (region + matchId UUID).
 */

const MATCH_ID = 'a1b2c3d4-e5f6-7890-abcd-ef1234567890';

describe('parseMatchRouteParams', () => {
  it('normaliza a região (trim + minúscula) e aceita UUID', () => {
    expect(parseMatchRouteParams(' BR ', MATCH_ID)).toEqual({
      ok: true,
      region: 'br',
      matchId: MATCH_ID,
    });
  });

  it('rejeita região fora das afinidades', () => {
    const result = parseMatchRouteParams('mars', MATCH_ID);
    expect(result).toMatchObject({ ok: false, field: 'region' });
  });

  it('rejeita matchId que não é UUID', () => {
    expect(parseMatchRouteParams('br', 'not-a-uuid')).toMatchObject({
      ok: false,
      field: 'matchId',
    });
    expect(parseMatchRouteParams('br', undefined)).toMatchObject({ ok: false });
  });
});
