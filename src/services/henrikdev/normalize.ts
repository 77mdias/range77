import {
  COMPETITIVE_QUEUE_ID,
  type HenrikDevMatchV4,
  type HenrikDevPlayerV4,
} from '@/contracts/henrikdev';
import type { MatchCombatStats } from '@/contracts/henrikdev';
import { computePlayerKast } from '@/services/analytics/kast';
import { buildKastInputFromMatch, computeEntryDuels } from './normalize-tracker';

/**
 * PASSO 3 — IMPLEMENTAÇÃO: normalizador HenrikDev v4 → MatchCombatStats.
 *
 * Heavy lifting de extração (tudo que o chatbot NÃO faria sozinho):
 *   - localiza o jogador pelo Riot ID (case-insensitive);
 *   - deriva `roundsPlayed` de `teams[].rounds.won + lost`;
 *   - calcula First Bloods/Deaths REAIS a partir da timeline `kills[]`
 *     (primeiro abate de cada round, desempate por menor tempo);
 *   - filtra: apenas fila competitiva concluída com dados íntegros.
 *
 * Partidas que não passam nos critérios são silenciosamente omitidas —
 * a agregação segue com a amostra válida disponível.
 */

function findPlayerInMatch(
  match: HenrikDevMatchV4,
  name: string,
  tag: string,
): HenrikDevPlayerV4 | undefined {
  const lowerName = name.toLowerCase();
  const lowerTag = tag.toLowerCase();
  return match.players.find(
    (player) =>
      player.name?.toLowerCase() === lowerName &&
      player.tag?.toLowerCase() === lowerTag &&
      player.stats !== null &&
      typeof player.stats === 'object',
  );
}

/** Rounds da partida somando vitórias+derrotas do primeiro time. `null` = indeterminável. */
function computeRoundsPlayed(match: HenrikDevMatchV4): number | null {
  const team = match.teams[0];
  if (team === undefined) {
    return null;
  }
  const rounds = (team.rounds?.won ?? 0) + (team.rounds?.lost ?? 0);
  return Number.isFinite(rounds) && rounds >= 1 ? rounds : null;
}

/**
 * FB/FD a partir da timeline são computados por `computeEntryDuels`
 * (compartilhado com o histórico em `normalize-tracker`) — mantidos aqui no
 * fluxo de combate via `entry`.
 */

/**
 * Converte o histórico bruto da HenrikDev na amostra canônica de combate.
 * Mantém apenas partidas competitivas, concluídas e com dados completos.
 */
export function normalizeMatchesToCombat(
  matches: readonly HenrikDevMatchV4[] | undefined,
  player: { readonly name: string; readonly tag: string },
): MatchCombatStats[] {
  const result: MatchCombatStats[] = [];

  for (const match of matches ?? []) {
    if (match.metadata?.queue?.id?.toLowerCase() !== COMPETITIVE_QUEUE_ID) {
      continue;
    }
    if (match.metadata?.is_completed === false) {
      continue;
    }

    const found = findPlayerInMatch(match, player.name, player.tag);
    if (found === undefined) {
      continue;
    }

    const roundsPlayed = computeRoundsPlayed(match);
    if (roundsPlayed === null) {
      continue;
    }

    const entry = computeEntryDuels(match.kills, found.puuid);
    // KAST do jogador analisado, derivado dos eventos de abate do MESMO payload.
    const kast =
      match.kills !== undefined && match.kills.length > 0
        ? computePlayerKast(buildKastInputFromMatch(match), found.puuid)
        : null;

    result.push({
      kills: found.stats.kills,
      deaths: found.stats.deaths,
      assists: found.stats.assists,
      roundsPlayed,
      headshots: found.stats.headshots,
      bodyshots: found.stats.bodyshots,
      legshots: found.stats.legshots,
      score: found.stats.score,
      ...(kast !== null ? { kast } : {}),
      ...(entry !== null
        ? { firstBloods: entry.firstBloods, firstDeaths: entry.firstDeaths }
        : {}),
      ...(found.stats.damage?.dealt !== undefined
        ? { damageDealt: found.stats.damage.dealt }
        : {}),
    });
  }

  return result;
}
