import { HENRIKDEV_AFFINITIES } from '@/contracts/henrikdev';

/**
 * Validação compartilhada dos parâmetros de rota de jogador
 * (region/name/tag) entre /api/players/... e /history.
 *
 * Retorna um resultado discriminado (`ok`) em vez de lançar/exceção HTTP:
 * a rota decide como responder, a regra fica pura e testável.
 */

const MAX_NAME_LENGTH = 32;
const RIOT_TAG_PATTERN = /^[a-z0-9]{1,6}$/i;

export interface PlayerRouteParamsInput {
  readonly region?: unknown;
  readonly name?: unknown;
  readonly tag?: unknown;
}

export type PlayerParamsResult =
  | { readonly ok: true; readonly region: string; readonly name: string; readonly tag: string }
  | { readonly ok: false; readonly field: string; readonly message: string };

export function parsePlayerRouteParams(params: PlayerRouteParamsInput): PlayerParamsResult {
  const region = typeof params.region === 'string' ? params.region.trim().toLowerCase() : '';
  if (!(HENRIKDEV_AFFINITIES as readonly string[]).includes(region)) {
    return {
      ok: false,
      field: 'region',
      message: `Região inválida: "${String(params.region)}". Afinidades aceitas: ${HENRIKDEV_AFFINITIES.join(', ')}.`,
    };
  }

  const name = typeof params.name === 'string' ? params.name.trim() : '';
  if (name === '' || name.length > MAX_NAME_LENGTH) {
    return {
      ok: false,
      field: 'name',
      message: `Nome do Riot ID inválido (vazio ou acima de ${MAX_NAME_LENGTH} caracteres).`,
    };
  }

  if (typeof params.tag !== 'string' || !RIOT_TAG_PATTERN.test(params.tag)) {
    return {
      ok: false,
      field: 'tag',
      message: 'Tag do Riot ID inválida (use 1–6 caracteres alfanuméricos).',
    };
  }

  return { ok: true, region, name, tag: params.tag };
}
