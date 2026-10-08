import { HENRIKDEV_AFFINITIES } from '@/contracts/henrikdev';

/**
 * Validação compartilhada dos parâmetros de partida (region + matchId),
 * usada tanto pela Route Handler `/api/matches/...` quanto pela página
 * `/matches/[matchId]`. Pura e testável (resultado discriminado, sem HTTP).
 */

const MATCH_ID_PATTERN = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;

export type MatchParamsResult =
  | { readonly ok: true; readonly region: string; readonly matchId: string }
  | { readonly ok: false; readonly field: string; readonly message: string };

export function parseMatchRouteParams(region: unknown, matchId: unknown): MatchParamsResult {
  const normalizedRegion = typeof region === 'string' ? region.trim().toLowerCase() : '';
  if (!(HENRIKDEV_AFFINITIES as readonly string[]).includes(normalizedRegion)) {
    return {
      ok: false,
      field: 'region',
      message: `Região inválida: "${String(region)}". Afinidades aceitas: ${HENRIKDEV_AFFINITIES.join(', ')}.`,
    };
  }

  const normalizedMatchId = typeof matchId === 'string' ? matchId.trim() : '';
  if (!MATCH_ID_PATTERN.test(normalizedMatchId)) {
    return { ok: false, field: 'matchId', message: 'matchId inválido: informe o UUID da partida.' };
  }

  return { ok: true, region: normalizedRegion, matchId: normalizedMatchId };
}
