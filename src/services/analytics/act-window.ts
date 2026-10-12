import type { HenrikDevMmrV3SeasonEntry } from '@/contracts/henrikdev';

/**
 * PASSO 3 — IMPLEMENTAÇÃO: janela de amostra do Breakdown por ATO
 * (analytics PURA, 100% coberta).
 * ======================================================================
 *
 * O endpoint de partidas da HenrikDev devolve no máximo 10 por chamada; para
 * a tela Partidas & Breakdown queremos a amostra do ATO que o jogador está
 * jogando. O MMR v3 (`seasonal[]`) traz `games` por temporada — daí derivamos
 * quantas partidas buscar, com um TETO (payload pesado) e um FALLBACK quando
 * não há contagem confiável (mmr v3 indisponível ou ato sem jogos).
 *
 * Nenhum I/O aqui: recebe o `seasonId` da partida mais recente + o `seasonal`
 * já buscados e devolve um inteiro determinístico.
 */

/** Teto padrão da amostra (30 = 3 páginas de 10): equilíbrio payload/latência. */
export const ACT_SAMPLE_CAP = 30;

/** Fallback quando o ato mais recente não tem contagem confiável de partidas. */
export const ACT_SAMPLE_FALLBACK = 15;

export interface ActSampleOptions {
  readonly cap: number;
  readonly fallback: number;
}

/**
 * Nº de partidas a buscar para o ato do jogador: usa `games` do ato cujo
 * `season.id` casa com `seasonId` (a temporada da partida mais recente),
 * limitado a `cap`. Sem `seasonId` válido, sem entrada correspondente ou com
 * contagem inválida/zero → `fallback` (nunca um valor inventado).
 */
export function resolveActMatchSample(
  seasonId: string | null | undefined,
  seasonal: readonly HenrikDevMmrV3SeasonEntry[] | null | undefined,
  options: ActSampleOptions,
): number {
  if (typeof seasonId !== 'string' || seasonId === '') {
    return options.fallback;
  }

  const entry = (seasonal ?? []).find((candidate) => candidate.season?.id === seasonId);
  const games = entry?.games;
  if (typeof games !== 'number' || !Number.isFinite(games) || games <= 0) {
    return options.fallback;
  }

  return Math.min(Math.floor(games), options.cap);
}
